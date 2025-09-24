#!/usr/bin/env python3
"""
VelociTerm Backend - Enhanced Main FastAPI Application
Session-authenticated backend with comprehensive feature integration
"""
import asyncio
import os
import logging
import time

import psutil
import platform
from datetime import datetime
from pathlib import Path
from typing import Optional
import traceback
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import *
from workspace_manager import WorkspaceManager, NetBoxClient
from connection_handlers import ConnectionHandlers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VelociTermBackend:
    """Enhanced VelociTerm backend with comprehensive feature set"""

    def __init__(self, config_path: str = "config.yaml"):
        self.app = FastAPI(
            title="VelociTerm Backend API",
            description="Enhanced session-authenticated backend for VelociTerm with comprehensive tooling",
            version="0.3.0"
        )

        # Initialize managers
        self.workspace_manager = WorkspaceManager()
        self.connection_handlers = ConnectionHandlers(self.workspace_manager)

        # Setup application
        self.setup_middleware()
        self.setup_routes()

    def setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:3000",  # React dev server
                "http://localhost:5173",  # Vite dev server
                "http://localhost:5174",  # Alternative Vite port
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174"
            ],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def setup_routes(self):
        """Setup all API routes with enhanced features"""

        # Authentication dependency for HTTP endpoints
        security = HTTPBasic()

        def get_current_user_from_session(session: str = Cookie(None)) -> str:
            """Get current user from session cookie"""
            if not session:
                raise HTTPException(status_code=401, detail="Session required")

            username = self.connection_handlers.session_manager.get_session_user(session)
            if not username:
                raise HTTPException(status_code=401, detail="Invalid or expired session")

            return username

        def get_current_user_from_basic_auth(credentials: HTTPBasicCredentials = Depends(security)) -> str:
            """Simple authentication for HTTP endpoints - POC mode"""
            return credentials.username

        # Authentication routes
        @self.app.post("/api/auth/login")
        async def login(credentials: HTTPBasicCredentials = Depends(security)):
            """Login and create session"""
            username = credentials.username

            # Create session
            session_id = self.connection_handlers.session_manager.create_session(username)

            response = JSONResponse({
                "status": "success",
                "username": username,
                "session_id": session_id[:8] + "..." if session_id else None  # Partial for debugging
            })

            response.set_cookie(
                key="session",
                value=session_id,
                httponly=True,
                secure=False,  # True in production with HTTPS
                samesite="lax",
                max_age=3600  # 1 hour
            )

            logger.info(f"User {username} logged in, session: {session_id[:8]}...")
            return response

        @self.app.post("/api/auth/logout")
        async def logout(session: str = Cookie(None)):
            """Logout and invalidate session"""
            if session:
                self.connection_handlers.session_manager.invalidate_session(session)
                logger.info(f"Session invalidated: {session[:8]}...")

            response = JSONResponse({"status": "success"})
            response.delete_cookie("session")
            return response

        @self.app.get("/api/auth/status")
        async def auth_status(session: str = Cookie(None)):
            """Check authentication status"""
            if not session:
                return {"authenticated": False}

            session_info = self.connection_handlers.session_manager.get_session_info(session)
            if not session_info:
                return {"authenticated": False}

            return {
                "authenticated": True,
                "username": session_info.username,
                "session_id": session[:8] + "...",
                "created_at": session_info.created_at,
                "last_activity": session_info.last_activity
            }

        @self.app.get("/api/user/info")
        async def get_user_info(username: str = Depends(get_current_user_from_session)):
            """Get current user information"""
            return {
                "username": username,
                "workspace_exists": True,
                "authentication": "session_based"
            }

        # Window management routes
        @self.app.post("/api/windows/register")
        async def register_window(
                window_data: dict,
                username: str = Depends(get_current_user_from_session),
                session: str = Cookie(None)
        ):
            """Register a new window for the session"""
            window_id = window_data.get("window_id")
            if not window_id:
                raise HTTPException(status_code=400, detail="window_id required")

            success = self.connection_handlers.register_window(session, window_id)
            if success:
                return {"status": "success", "window_id": window_id}
            else:
                raise HTTPException(status_code=500, detail="Failed to register window")

        @self.app.get("/api/windows/validate/{window_id}")
        async def validate_window(
                window_id: str,
                username: str = Depends(get_current_user_from_session),
                session: str = Cookie(None)
        ):
            """Validate window access"""
            is_valid = self.connection_handlers.validate_window_access(session, window_id)
            return {"valid": is_valid, "window_id": window_id}

        # Session management routes
        # vtnb_be/main.py  (PATCH)
        # — fix /api/sessions to read the actual per-user sessions.yaml in ./workspaces/<user>/

        from pathlib import Path

        # ...inside VelociTermBackend.setup_routes()

        @self.app.get("/api/sessions")
        async def get_sessions(username: str = Depends(get_current_user_from_session)):
            """Get sessions data for user"""
            try:
                # 🔧 FIX: load the per-user sessions.yaml in ./workspaces/<username>/sessions.yaml
                user_sessions_file = self.workspace_manager.get_sessions_file_path(username)

                folders = self.workspace_manager.load_sessions_for_user(
                    username,
                    str(user_sessions_file)
                )

                # Convert to dict format expected by frontend (no comprehensions)
                result = []
                for folder in folders:
                    folder_dict = {
                        "folder_name": folder.folder_name,
                        "sessions": []
                    }
                    for session in folder.sessions:
                        folder_dict["sessions"].append(session.dict())
                    result.append(folder_dict)

                logger.info(f"Loaded {len(result)} session folders for user {username}")
                return result

            except Exception as e:
                logger.error(f"Failed to load sessions for {username}: {e}")
                raise HTTPException(status_code=500, detail="Failed to load sessions")

        # System monitoring routes
        @self.app.get("/api/system/stats")
        async def get_system_stats():
            """Get real system statistics"""
            try:
                return {
                    "cpu": {
                        "usage": psutil.cpu_percent(interval=1),
                        "cores": psutil.cpu_count(),
                        "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else 0,
                        "temperature": 0  # Requires additional sensors
                    },
                    "memory": dict(psutil.virtual_memory()._asdict()),
                    "disk": dict(psutil.disk_usage('/')._asdict()),
                    "network": dict(psutil.net_io_counters()._asdict()),
                    "system": {
                        "hostname": platform.node(),
                        "uptime": psutil.boot_time(),
                        "processes": len(psutil.pids()),
                        "load_avg": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
                    }
                }
            except Exception as e:
                return {"error": str(e)}

        # Workspace management routes
        @self.app.get("/api/workspace/settings")
        async def get_settings(username: str = Depends(get_current_user_from_session)):
            """Get user workspace settings"""
            settings = self.workspace_manager.load_user_settings(username)
            return settings

        @self.app.put("/api/workspace/settings")
        async def update_settings(
                settings: UserSettings,
                username: str = Depends(get_current_user_from_session)
        ):
            """Update user workspace settings"""
            success = self.workspace_manager.save_user_settings(username, settings)
            if success:
                return {"status": "success"}
            else:
                raise HTTPException(status_code=500, detail="Failed to save settings")

        # NetBox integration routes
        @self.app.get("/api/netbox/token/status")
        async def get_netbox_token_status(username: str = Depends(get_current_user_from_session)):
            """Check NetBox token configuration status"""
            config = self.workspace_manager.load_netbox_config(username)

            if config:
                return {
                    "configured": True,
                    "api_url": config.get("api_url"),
                    "description": config.get("description"),
                    "created_at": config.get("created_at"),
                    "last_validated": config.get("last_validated")
                }
            else:
                return {"configured": False}

        @self.app.post("/api/netbox/token/configure")
        async def configure_netbox_token(
                config: NetBoxTokenConfig,
                username: str = Depends(get_current_user_from_session)
        ):
            # Test the token first
            client = NetBoxClient(config.api_url, config.api_token)
            test_result = await client.test_connection()

            if test_result["status"] == "error":
                raise HTTPException(
                    status_code=400,
                    detail=f"NetBox connection failed: {test_result['message']}"
                )

            # FIXED: Update the config with validation timestamp
            config_with_timestamp = NetBoxTokenConfig(
                api_url=config.api_url,
                api_token=config.api_token,
                description=config.description or "VelociTerm Integration Token"
            )

            # Save the configuration WITH last_validated timestamp
            success = self.workspace_manager.save_netbox_config(username, config_with_timestamp, update_validated=True)

            if success:
                return {
                    "status": "success",
                    "message": "NetBox token configured successfully"
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to save NetBox configuration")

        @self.app.post("/api/netbox/token/validate")
        async def validate_netbox_token(username: str = Depends(get_current_user_from_session)):
            """Validate existing NetBox token"""
            config = self.workspace_manager.load_netbox_config(username)

            if not config:
                raise HTTPException(status_code=404, detail="NetBox token not configured")

            client = NetBoxClient(config["api_url"], config["api_token"])
            result = await client.test_connection()

            if result["status"] == "success":
                # Update last validated timestamp
                config["last_validated"] = datetime.utcnow().isoformat()
                updated_config = NetBoxTokenConfig(**config)
                self.workspace_manager.save_netbox_config(username, updated_config)

            return result

        @self.app.get("/api/netbox/devices")
        async def search_devices(
                search: Optional[str] = None,
                site: Optional[str] = None,
                platform: Optional[str] = None,
                status: str = "active",
                limit: int = 50,
                username: str = Depends(get_current_user_from_session)
        ):
            """Search NetBox devices"""
            config = self.workspace_manager.load_netbox_config(username)

            if not config:
                raise HTTPException(status_code=404, detail="NetBox token not configured")

            client = NetBoxClient(config["api_url"], config["api_token"])
            filters = DeviceFilter(
                search=search,
                site=site,
                platform=platform,
                status=status,
                limit=min(limit, 200)
            )

            result = await client.search_devices(filters)

            if result.status == "error":
                raise HTTPException(status_code=400, detail="Device search failed")

            return result

        @self.app.get("/api/netbox/sites")
        async def get_sites(username: str = Depends(get_current_user_from_session)):
            """Get available NetBox sites"""
            config = self.workspace_manager.load_netbox_config(username)

            if not config:
                raise HTTPException(status_code=404, detail="NetBox token not configured")

            client = NetBoxClient(config["api_url"], config["api_token"])
            sites = await client.get_sites()

            return {"sites": sites}

        # Session CRUD endpoints
        @self.app.post("/api/sessions")
        async def create_session(
                session_data: dict,
                username: str = Depends(get_current_user_from_session)
        ):
            """Create a new session"""
            try:
                # Validate required fields
                required_fields = ['display_name', 'host', 'folder_name']
                for field in required_fields:
                    if not session_data.get(field):
                        raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

                # Create SessionData object
                new_session = SessionData(
                    id=f"session-{int(time.time())}-{secrets.token_urlsafe(4)}",
                    display_name=session_data['display_name'],
                    host=session_data['host'],
                    port=session_data.get('port', 22),
                    device_type=session_data.get('device_type', 'linux'),
                    platform=session_data.get('platform', ''),
                    folder_name=session_data['folder_name'],
                    status='disconnected',
                    created_at=datetime.utcnow().isoformat()
                )

                # Save to workspace
                success = self.workspace_manager.create_session_for_user(username, new_session)

                if success:
                    return {"status": "success", "session_id": new_session.id, "message": "Session created"}
                else:
                    raise HTTPException(status_code=500, detail="Failed to create session")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error creating session for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.put("/api/sessions/{session_id}")
        async def update_session(
                session_id: str,
                update_data: dict,
                username: str = Depends(get_current_user_from_session)
        ):
            """Update an existing session"""
            try:
                success = self.workspace_manager.update_session_for_user(username, session_id, update_data)

                if success:
                    return {"status": "success", "message": "Session updated"}
                else:
                    raise HTTPException(status_code=404, detail="Session not found")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error updating session {session_id} for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.delete("/api/sessions/{session_id}")
        async def delete_session(
                session_id: str,
                username: str = Depends(get_current_user_from_session)
        ):
            """Delete a session"""
            try:
                success = self.workspace_manager.delete_session_for_user(username, session_id)

                if success:
                    return {"status": "success", "message": "Session deleted"}
                else:
                    raise HTTPException(status_code=404, detail="Session not found")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error deleting session {session_id} for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Folder management endpoints
        @self.app.post("/api/sessions/folders")
        async def create_folder(
                folder_data: dict,
                username: str = Depends(get_current_user_from_session)
        ):
            """Create a new folder"""
            try:
                folder_name = folder_data.get('folder_name')
                if not folder_name or not folder_name.strip():
                    raise HTTPException(status_code=400, detail="folder_name is required")

                success = self.workspace_manager.create_folder_for_user(username, folder_name.strip())

                if success:
                    return {"status": "success", "message": "Folder created"}
                else:
                    raise HTTPException(status_code=400, detail="Folder already exists or creation failed")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error creating folder for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.put("/api/sessions/folders/{folder_name}")
        async def rename_folder(
                folder_name: str,
                rename_data: dict,
                username: str = Depends(get_current_user_from_session)
        ):
            """Rename a folder"""
            try:
                # URL decode the folder name
                from urllib.parse import unquote
                folder_name = unquote(folder_name)

                new_name = rename_data.get('new_name')
                if not new_name or not new_name.strip():
                    raise HTTPException(status_code=400, detail="new_name is required")

                success = self.workspace_manager.rename_folder_for_user(username, folder_name, new_name.strip())

                if success:
                    return {"status": "success", "message": "Folder renamed"}
                else:
                    raise HTTPException(status_code=400, detail="Folder not found or new name already exists")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error renaming folder {folder_name} for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.delete("/api/sessions/folders/{folder_name}")
        async def delete_folder(
                folder_name: str,
                username: str = Depends(get_current_user_from_session)
        ):
            """Delete an empty folder"""
            try:
                # URL decode the folder name
                from urllib.parse import unquote
                folder_name = unquote(folder_name)

                success = self.workspace_manager.delete_folder_for_user(username, folder_name)

                if success:
                    return {"status": "success", "message": "Folder deleted"}
                else:
                    raise HTTPException(status_code=400, detail="Folder not found or not empty")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error deleting folder {folder_name} for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Bulk operations endpoint
        @self.app.post("/api/sessions/bulk")
        async def bulk_session_operations(
                operations: dict,
                username: str = Depends(get_current_user_from_session)
        ):
            """Perform bulk operations on sessions"""
            try:
                operation_type = operations.get('type')
                session_ids = operations.get('session_ids', [])

                if operation_type == 'delete':
                    success_count = 0
                    for session_id in session_ids:
                        if self.workspace_manager.delete_session_for_user(username, session_id):
                            success_count += 1

                    return {
                        "status": "success",
                        "message": f"Deleted {success_count} of {len(session_ids)} sessions"
                    }

                elif operation_type == 'move':
                    target_folder = operations.get('target_folder')
                    if not target_folder:
                        raise HTTPException(status_code=400, detail="target_folder is required for move operation")

                    success_count = 0
                    for session_id in session_ids:
                        if self.workspace_manager.update_session_for_user(username, session_id,
                                                                          {'folder_name': target_folder}):
                            success_count += 1

                    return {
                        "status": "success",
                        "message": f"Moved {success_count} of {len(session_ids)} sessions"
                    }

                else:
                    raise HTTPException(status_code=400, detail="Unknown operation type")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error performing bulk operation for {username}: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Enhanced tool integration routes
        @self.app.get("/api/tools")
        async def get_available_tools():
            """Get comprehensive list of available tools"""
            return {
                "tools": [
                    {
                        "id": "system_dashboard",
                        "name": "System Monitor",
                        "description": "Real-time system monitoring dashboard",
                        "icon": "Monitor",
                        "directLaunch": True,
                        "defaultConfig": {}
                    },
                    {
                        "id": "go_scan_tui",
                        "name": "Go Network Scanner",
                        "description": "Advanced network scanning TUI built in Go",
                        "icon": "Radar",
                        "directLaunch": True,
                        "defaultConfig": {}
                    },
                    {
                        "id": "snmp_scanner",
                        "name": "SNMP Scanner",
                        "description": "SNMP network device scanner TUI",
                        "icon": "Wifi",
                        "directLaunch": True,
                        "defaultConfig": {}
                    },
                    {
                        "id": "ping",
                        "name": "Ping",
                        "description": "Ping a host continuously",
                        "icon": "Activity",
                        "directLaunch": False,
                        "defaultConfig": {
                            "host": "8.8.8.8",
                            "count": "continuous"
                        }
                    },
                    {
                        "id": "traceroute",
                        "name": "Traceroute",
                        "description": "Trace network path to host",
                        "icon": "GitBranch",
                        "directLaunch": False,
                        "defaultConfig": {
                            "host": "8.8.8.8"
                        }
                    },
                    {
                        "id": "htop",
                        "name": "htop",
                        "description": "Interactive process viewer",
                        "icon": "Activity",
                        "directLaunch": True,
                        "defaultConfig": {}
                    },
                    {
                        "id": "network_tui_python",
                        "name": "Network Config TUI",
                        "description": "Textual-based network device configuration",
                        "icon": "Network",
                        "directLaunch": True,
                        "defaultConfig": {}
                    },
                    {
                        "id": "ansible_web_runner",
                        "name": "Ansible Web Runner",
                        "description": "Web-based Ansible playbook execution",
                        "icon": "Settings",
                        "directLaunch": False,
                        "defaultConfig": {
                            "operation": {"type": "backup", "outputDir": "./backups"},
                            "devices": []
                        }
                    },
                    {
                        "id": "nmap",
                        "name": "Nmap Scanner",
                        "description": "Network discovery and security auditing",
                        "icon": "Shield",
                        "directLaunch": False,
                        "defaultConfig": {
                            "target": "192.168.1.0/24",
                            "scan_type": "-sn"
                        }
                    }
                ]
            }

        @self.app.get("/api/plugins/{tool_type}/schema")
        async def get_tool_schema(tool_type: str):
            """Get configuration schema for tools that need configuration"""
            schemas = {
                "ping": {
                    "configSchema": {
                        "type": "object",
                        "properties": {
                            "host": {
                                "type": "string",
                                "title": "Target Host",
                                "description": "Hostname or IP to ping",
                                "default": "8.8.8.8"
                            },
                            "count": {
                                "type": "string",
                                "title": "Count",
                                "description": "Number of pings or 'continuous'",
                                "default": "continuous"
                            }
                        }
                    }
                },
                "traceroute": {
                    "configSchema": {
                        "type": "object",
                        "properties": {
                            "host": {
                                "type": "string",
                                "title": "Target Host",
                                "description": "Hostname or IP to trace",
                                "default": "8.8.8.8"
                            }
                        }
                    }
                },
                "nmap": {
                    "configSchema": {
                        "type": "object",
                        "properties": {
                            "target": {
                                "type": "string",
                                "title": "Target",
                                "description": "Target host or network range",
                                "default": "192.168.1.0/24"
                            },
                            "scan_type": {
                                "type": "string",
                                "title": "Scan Type",
                                "description": "Type of nmap scan to perform",
                                "enum": ["-sn", "-sS", "-sT", "-sU", "-sA"],
                                "default": "-sn"
                            }
                        }
                    }
                },
                "ansible_web_runner": {
                    "configSchema": {
                        "type": "object",
                        "properties": {
                            "credentials": {
                                "type": "object",
                                "properties": {
                                    "username": {
                                        "type": "string",
                                        "title": "Username",
                                        "description": "Device login username",
                                        "default": "admin"
                                    },
                                    "password": {
                                        "type": "string",
                                        "title": "Password",
                                        "description": "Device login password",
                                        "format": "password"
                                    },
                                    "enablePassword": {
                                        "type": "string",
                                        "title": "Enable Password",
                                        "description": "Device enable password (optional)",
                                        "format": "password"
                                    }
                                },
                                "required": ["username", "password"]
                            },
                            "operation": {
                                "type": "object",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "title": "Operation Type",
                                        "enum": ["backup", "facts", "interface_status", "health_check", "custom"],
                                        "default": "backup"
                                    },
                                    "customPlaybook": {
                                        "type": "string",
                                        "title": "Custom Playbook Path"
                                    },
                                    "outputDir": {
                                        "type": "string",
                                        "title": "Output Directory",
                                        "default": "./backups"
                                    }
                                }
                            },
                            "devices": {
                                "type": "array",
                                "title": "Network Devices",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string", "title": "Device Name"},
                                        "host": {"type": "string", "title": "Host/IP Address"},
                                        "port": {"type": "string", "title": "SSH Port", "default": "22"},
                                        "type": {
                                            "type": "string",
                                            "title": "Device Type",
                                            "enum": ["cisco_ios", "cisco_ios_xe", "arista_eos", "linux"],
                                            "default": "cisco_ios"
                                        },
                                        "enabled": {"type": "boolean", "title": "Enabled", "default": True}
                                    },
                                    "required": ["name", "host", "port", "type"]
                                }
                            }
                        }
                    }
                }
            }

            if tool_type not in schemas:
                raise HTTPException(status_code=404, detail=f"Schema for {tool_type} not found")

            return schemas[tool_type]

        # WebSocket routes with enhanced debugging
        @self.app.websocket("/ws/terminal/{window_id}")
        async def websocket_terminal(websocket: WebSocket, window_id: str):
            """Enhanced WebSocket with detailed logging"""

            # Log the incoming connection attempt
            logger.info(f"=== WebSocket Connection Attempt ===")
            logger.info(f"Window ID: {window_id}")
            logger.info(f"WebSocket State: {websocket.client_state}")
            logger.info(f"Client Host: {websocket.client.host if websocket.client else 'Unknown'}")
            logger.info(f"Headers: {dict(websocket.headers) if websocket.headers else 'None'}")

            try:
                logger.info("Attempting to accept WebSocket connection...")
                await websocket.accept()
                logger.info(f"SUCCESS: WebSocket accepted for {window_id}")

                # Initialize SSH manager
                logger.info("Creating SSH client...")
                await self.connection_handlers.ssh_manager.create_client(window_id)
                logger.info("SSH client created successfully")

                # Start output listener
                logger.info("Starting SSH output listener...")
                listen_task = asyncio.create_task(
                    self.connection_handlers.ssh_manager.listen_to_ssh_output(window_id, websocket)
                )
                logger.info("SSH output listener started")

                # Send initial status to frontend
                await websocket.send_json({
                    'type': 'status',
                    'message': 'WebSocket connected successfully'
                })
                logger.info("Sent initial status message")

                # Main message loop
                while True:
                    try:
                        logger.info("Waiting for WebSocket message...")
                        data = await websocket.receive_json()
                        logger.info(f"Received message: {data.get('type', 'unknown')}")

                        if data.get('type') == 'connect':
                            logger.info(f"Processing SSH connect to {data.get('hostname')}:{data.get('port')}")
                            await self.connection_handlers.ssh_manager.connect(
                                window_id,
                                data.get('hostname'),
                                data.get('port', 22),
                                data.get('username'),
                                data.get('password'),
                                websocket
                            )
                            logger.info("SSH connect command sent")

                        elif data.get('type') == 'input':
                            input_data = data.get('data', '')
                            logger.debug(f"Sending input: {len(input_data)} chars")
                            await self.connection_handlers.ssh_manager.send_input(window_id, input_data)

                        elif data.get('type') == 'resize':
                            cols = data.get('cols', 80)
                            rows = data.get('rows', 24)
                            logger.info(f"Resizing terminal: {cols}x{rows}")
                            await self.connection_handlers.ssh_manager.resize_terminal(window_id, cols, rows)

                        else:
                            logger.warning(f"Unknown message type: {data.get('type')}")

                    except WebSocketDisconnect:
                        logger.info(f"WebSocket disconnected normally for {window_id}")
                        break
                    except Exception as msg_error:
                        logger.error(f"Error processing WebSocket message: {msg_error}")
                        logger.error(f"Message error traceback: {traceback.format_exc()}")
                        break

            except Exception as connection_error:
                logger.error(f"=== WebSocket Connection FAILED ===")
                logger.error(f"Window ID: {window_id}")
                logger.error(f"Error Type: {type(connection_error).__name__}")
                logger.error(f"Error Message: {str(connection_error)}")
                logger.error(f"Full traceback: {traceback.format_exc()}")

                # Try to determine what went wrong
                if hasattr(connection_error, 'code'):
                    logger.error(f"Error Code: {connection_error.code}")
                if hasattr(connection_error, 'reason'):
                    logger.error(f"Error Reason: {connection_error.reason}")

                # Check WebSocket state
                try:
                    logger.error(f"WebSocket State at error: {websocket.client_state}")
                    logger.error(f"WebSocket Application State: {websocket.application_state}")
                except:
                    logger.error("Could not get WebSocket state info")

                # Try to send error to client if possible
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json({
                            'type': 'error',
                            'message': f'Connection failed: {str(connection_error)}'
                        })
                        await websocket.close()
                except:
                    logger.error("Could not send error message to client")

            finally:
                # Cleanup
                logger.info(f"Cleaning up WebSocket connection for {window_id}")
                try:
                    if 'listen_task' in locals():
                        listen_task.cancel()
                        await listen_task
                except:
                    pass
                try:
                    await self.connection_handlers.ssh_manager.disconnect(window_id)
                except:
                    pass
                logger.info(f"Cleanup completed for {window_id}")

        # Add a middleware to catch WebSocket errors at the FastAPI level
        @self.app.middleware("http")
        async def log_requests(request: Request, call_next):
            """Log all requests for debugging"""
            start_time = time.time()

            logger.info(f"=== HTTP Request ===")
            logger.info(f"Method: {request.method}")
            logger.info(f"URL: {request.url}")
            logger.info(f"Client: {request.client.host if request.client else 'Unknown'}")
            logger.info(f"Headers: {dict(request.headers)}")

            try:
                response = await call_next(request)
                process_time = time.time() - start_time
                logger.info(f"Response Status: {response.status_code}")
                logger.info(f"Process Time: {process_time:.4f}s")
                return response
            except Exception as e:
                logger.error(f"Request processing failed: {e}")
                logger.error(f"Request error traceback: {traceback.format_exc()}")
                raise

        # Also add WebSocket-specific middleware if possible
        from starlette.middleware.base import BaseHTTPMiddleware

        class WebSocketLoggingMiddleware(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                if request.url.path.startswith("/ws/"):
                    logger.info(f"=== WebSocket Middleware ===")
                    logger.info(f"Path: {request.url.path}")
                    logger.info(f"Query: {request.url.query}")
                    logger.info(f"Client: {request.client.host if request.client else 'Unknown'}")
                    logger.info(f"Scope Type: {request.scope.get('type')}")

                try:
                    response = await call_next(request)
                    return response
                except Exception as e:
                    if request.url.path.startswith("/ws/"):
                        logger.error(f"WebSocket middleware error: {e}")
                        logger.error(f"WebSocket middleware traceback: {traceback.format_exc()}")
                    raise

        # Add this middleware to your app setup
        # In setup_middleware method, add:
        self.app.add_middleware(WebSocketLoggingMiddleware)

        # Health check
        @self.app.get("/api/health")
        async def health_check():
            """Health check endpoint"""
            return HealthCheck(
                timestamp=datetime.utcnow().isoformat()
            )

        # Development info
        @self.app.get("/")
        async def dev_info():
            """Development info page"""
            return {
                "message": "VelociTerm Backend API v0.3.0",
                "authentication": "session-based",
                "security": "enhanced window management",
                "features": [
                    "SSH terminals with session auth",
                    "TUI tools with window ownership",
                    "Ansible automation runner",
                    "Real-time system monitoring",
                    "NetBox integration",
                    "Multi-window management",
                    "Enhanced tool ecosystem"
                ],
                "endpoints": {
                    "login": "/api/auth/login",
                    "auth_status": "/api/auth/status",
                    "sessions": "/api/sessions",
                    "system_stats": "/api/system/stats",
                    "window_register": "/api/windows/register",
                    "window_validate": "/api/windows/validate/{window_id}",
                    "websocket_ssh": "/ws/terminal/{window_id}",
                    "websocket_tui": "/ws/tui/{window_id}",
                    "websocket_ansible": "/ws/ansible/{window_id}",
                    "tools": "/api/tools",
                    "netbox": "/api/netbox/*",
                    "health": "/api/health"
                }
            }


def create_app() -> FastAPI:
    """Factory function to create FastAPI app"""
    backend = VelociTermBackend()
    return backend.app


# Create app instance
app = create_app()


def run_server():
    """Run the backend server"""
    print("Starting VelociTerm Backend v0.3.0...")
    print("Enhanced session-based authentication with comprehensive tooling")
    print("Backend API: http://localhost:8050")
    print("API Documentation: http://localhost:8050/docs")
    print("Auth Status: http://localhost:8050/api/auth/status")
    print("System Stats: http://localhost:8050/api/system/stats")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8050,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    run_server()