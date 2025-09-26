#!/usr/bin/env python3
"""
VelociTerm Backend - Enhanced Main FastAPI Application
Session-authenticated backend with comprehensive feature integration
"""
import asyncio
import os
import logging
import secrets
import time

import psutil
import platform
from datetime import datetime
from pathlib import Path
from typing import Optional
import traceback

import yaml
from fastapi import WebSocket, WebSocketDisconnect, UploadFile, Form, File, Response
from starlette.websockets import WebSocketState
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import *
from workspace_manager import WorkspaceManager, NetBoxClient
from connection_handlers import ConnectionHandlers
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

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
        self.setup_static_files()

    def setup_static_files(self):
        """Setup static file serving for React build"""
        import os
        from pathlib import Path

        # Determine the static directory path
        static_dir = Path("static")

        # Check if static directory exists
        if not static_dir.exists():
            logger.warning(f"Static directory '{static_dir}' not found. Run 'npm run build' first.")
            return

        # Mount static assets from the build
        # React build typically creates static/js/, static/css/, etc.
        if (static_dir / "static").exists():
            # Standard React build structure: static/static/js/, static/static/css/
            self.app.mount("/static", StaticFiles(directory=str(static_dir / "static")), name="static")
        else:
            # Alternative structure where assets are directly in static/
            self.app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

        # Serve other common assets
        for asset_dir in ["assets", "images", "icons"]:
            asset_path = static_dir / asset_dir
            if asset_path.exists():
                self.app.mount(f"/{asset_dir}", StaticFiles(directory=str(asset_path)), name=asset_dir)

        # Serve manifest.json, favicon.ico, etc. from root of static
        @self.app.get("/manifest.json")
        async def get_manifest():
            manifest_path = static_dir / "manifest.json"
            if manifest_path.exists():
                from fastapi.responses import FileResponse
                return FileResponse(manifest_path, media_type="application/json")
            raise HTTPException(status_code=404, detail="Manifest not found")

        @self.app.get("/favicon.ico")
        async def get_favicon():
            favicon_path = static_dir / "favicon.ico"
            if favicon_path.exists():
                from fastapi.responses import FileResponse
                return FileResponse(favicon_path, media_type="image/x-icon")
            raise HTTPException(status_code=404, detail="Favicon not found")

        # Handle service worker
        @self.app.get("/sw.js")
        async def get_service_worker():
            sw_path = static_dir / "sw.js"
            if sw_path.exists():
                from fastapi.responses import FileResponse
                return FileResponse(sw_path, media_type="application/javascript")
            raise HTTPException(status_code=404, detail="Service worker not found")

        # Serve React app for all non-API routes (client-side routing)
        @self.app.get("/{catchall:path}")
        async def serve_react_app(catchall: str):
            # Skip API and WebSocket routes
            if catchall.startswith(("api/", "ws/", "static/")):
                raise HTTPException(status_code=404)

            # Serve index.html for all other routes
            index_path = static_dir / "index.html"
            if index_path.exists():
                from fastapi.responses import FileResponse
                return FileResponse(index_path, media_type="text/html")
            else:
                raise HTTPException(status_code=404, detail="React app not built. Run 'npm run build'")

    # Also add this helper method to debug static file structure:
    def debug_static_structure(self):
        """Debug helper to show static file structure"""
        static_dir = Path("static")
        if static_dir.exists():
            logger.info("Static directory structure:")
            for root, dirs, files in os.walk(static_dir):
                level = root.replace(str(static_dir), '').count(os.sep)
                indent = ' ' * 2 * level
                logger.info(f"{indent}{os.path.basename(root)}/")
                sub_indent = ' ' * 2 * (level + 1)
                for file in files:
                    logger.info(f"{sub_indent}{file}")
        else:
            logger.error("Static directory does not exist")

    def setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "*"

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
            client = NetBoxClient(config.api_url, config.api_token, verify_ssl=False)
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

            client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
            result = await client.test_connection()

            if result["status"] == "success":
                # Update last validated timestamp
                config["last_validated"] = datetime.utcnow().isoformat()
                updated_config = NetBoxTokenConfig(**config)
                self.workspace_manager.save_netbox_config(username, updated_config)

            return result

        # Add this to your main.py imports at the top
        import csv
        import io
        from typing import Union

        # Replace the existing /api/sessions/import endpoint in main.py with this enhanced version:

        @self.app.post("/api/sessions/import")
        async def import_sessions(
                file: UploadFile = File(...),
                merge_mode: str = Form("merge"),  # "merge" or "replace"
                import_mode: str = Form("yaml"),  # "yaml", "generic", or "netbox"
                username: str = Depends(get_current_user_from_session)
        ):
            """Import sessions from YAML or CSV file with merge support"""
            try:
                # Validate file type based on import mode
                if import_mode in ["generic", "netbox"]:
                    if not file.filename.endswith(('.csv', '.CSV')):
                        raise HTTPException(status_code=400,
                                            detail="CSV files (.csv) are required for this import mode")
                elif import_mode == "yaml":
                    if not file.filename.endswith(('.yaml', '.yml')):
                        raise HTTPException(status_code=400,
                                            detail="Only YAML files (.yaml, .yml) are supported for YAML import")

                # Read file content
                content = await file.read()

                # Parse based on import mode
                if import_mode == "yaml":
                    import_data = await parse_yaml_import(content, username)
                elif import_mode == "generic":
                    import_data = await parse_generic_csv_import(content, username)
                elif import_mode == "netbox":
                    import_data = await parse_netbox_csv_import(content, username)
                else:
                    raise HTTPException(status_code=400, detail="Invalid import mode")

                if not isinstance(import_data, list):
                    raise HTTPException(status_code=400, detail="Invalid file format")

                # Load existing sessions
                existing_folders = self.workspace_manager.load_sessions_for_user(username)

                if merge_mode == "replace":
                    # Replace mode: completely replace existing sessions
                    final_folders = []
                else:
                    # Merge mode: start with existing sessions
                    final_folders = existing_folders.copy()

                # Process imported folders
                import_stats = {
                    "folders_processed": 0,
                    "sessions_imported": 0,
                    "sessions_merged": 0,
                    "sessions_skipped": 0
                }

                for folder_data in import_data:
                    if not isinstance(folder_data, dict) or 'folder_name' not in folder_data:
                        continue

                    folder_name = folder_data['folder_name']
                    imported_sessions = folder_data.get('sessions', [])

                    import_stats["folders_processed"] += 1

                    # Find existing folder or create new one
                    target_folder = None
                    for folder in final_folders:
                        if folder.folder_name == folder_name:
                            target_folder = folder
                            break

                    if not target_folder:
                        # Create new folder
                        target_folder = SessionFolder(folder_name=folder_name, sessions=[])
                        final_folders.append(target_folder)

                    # Process sessions in this folder
                    existing_session_keys = set()
                    for session in target_folder.sessions:
                        key = f"{session.display_name}:{session.host}:{session.port}"
                        existing_session_keys.add(key)

                    for session_data in imported_sessions:
                        try:
                            # Normalize the session data
                            normalized_session = self.workspace_manager._normalize_session_data(
                                session_data, folder_name
                            )

                            # Create session key for duplicate detection
                            session_key = f"{normalized_session['display_name']}:{normalized_session['host']}:{normalized_session['port']}"

                            if session_key in existing_session_keys:
                                import_stats["sessions_skipped"] += 1
                                continue

                            # Create SessionData object
                            session = SessionData(**normalized_session)
                            target_folder.sessions.append(session)
                            existing_session_keys.add(session_key)

                            if merge_mode == "merge":
                                import_stats["sessions_merged"] += 1
                            else:
                                import_stats["sessions_imported"] += 1

                        except Exception as session_error:
                            logger.warning(f"Failed to import session: {session_error}")
                            import_stats["sessions_skipped"] += 1
                            continue

                # Save the final session structure
                success = self.workspace_manager.save_sessions_for_user(username, final_folders)

                if not success:
                    raise HTTPException(status_code=500, detail="Failed to save imported sessions")

                return {
                    "status": "success",
                    "message": f"Successfully imported sessions in {merge_mode} mode",
                    "stats": import_stats
                }

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Session import failed for {username}: {e}")
                raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

        # Add these helper functions to main.py:

        async def parse_yaml_import(content: bytes, username: str) -> list:
            """Parse YAML import content"""
            try:
                import_data = yaml.safe_load(content.decode('utf-8'))
            except yaml.YAMLError as e:
                raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")
            return import_data

        async def parse_generic_csv_import(content: bytes, username: str) -> list:
            """Parse generic CSV import content"""
            try:
                csv_content = content.decode('utf-8')
                csv_reader = csv.DictReader(io.StringIO(csv_content))

                # Required columns for generic CSV
                required_columns = ['display_name', 'host', 'folder_name']

                # Check if required columns exist
                if not csv_reader.fieldnames:
                    raise HTTPException(status_code=400, detail="CSV file appears to be empty or invalid")

                missing_columns = [col for col in required_columns if col not in csv_reader.fieldnames]
                if missing_columns:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Missing required columns: {', '.join(missing_columns)}. Required: {', '.join(required_columns)}"
                    )

                # Group sessions by folder
                folders_dict = {}

                for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because of header
                    try:
                        # Skip empty rows
                        if not any(row.values()):
                            continue

                        # Validate required fields
                        for field in required_columns:
                            if not row.get(field, '').strip():
                                logger.warning(f"Row {row_num}: Missing required field '{field}', skipping")
                                continue

                        folder_name = row['folder_name'].strip()

                        # Create session data
                        session_data = {
                            'display_name': row['display_name'].strip(),
                            'host': row['host'].strip(),
                            'port': int(row.get('port', 22)) if row.get('port', '').strip() else 22,
                            'device_type': row.get('device_type', 'linux').strip() or 'linux',
                            'platform': row.get('platform', '').strip(),
                        }

                        # Add to folder
                        if folder_name not in folders_dict:
                            folders_dict[folder_name] = {
                                'folder_name': folder_name,
                                'sessions': []
                            }

                        folders_dict[folder_name]['sessions'].append(session_data)

                    except ValueError as e:
                        logger.warning(f"Row {row_num}: Invalid data - {str(e)}")
                        continue
                    except Exception as e:
                        logger.warning(f"Row {row_num}: Error processing row - {str(e)}")
                        continue

                return list(folders_dict.values())

            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")
            except Exception as e:
                logger.error(f"CSV parsing error: {e}")
                raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

        async def parse_netbox_csv_import(content: bytes, username: str) -> list:
            """Parse NetBox CSV export content"""
            try:
                csv_content = content.decode('utf-8')
                csv_reader = csv.DictReader(io.StringIO(csv_content))

                if not csv_reader.fieldnames:
                    raise HTTPException(status_code=400, detail="CSV file appears to be empty or invalid")

                # NetBox CSV might have different column names, try common variations
                column_mappings = {
                    # NetBox export columns -> our columns
                    'name': 'display_name',
                    'Name': 'display_name',
                    'primary_ip': 'host',
                    'Primary IP': 'host',
                    'primary_ip4': 'host',
                    'Primary IPv4': 'host',
                    'site': 'site',
                    'Site': 'site',
                    'platform': 'platform',
                    'Platform': 'platform',
                    'device_type': 'device_type',
                    'Device Type': 'device_type',
                    'model': 'device_type',
                    'Model': 'device_type',
                    'status': 'status',
                    'Status': 'status'
                }

                # Find which columns we have
                available_columns = {}
                for csv_col in csv_reader.fieldnames:
                    if csv_col in column_mappings:
                        available_columns[column_mappings[csv_col]] = csv_col

                # Check for required columns (we need at least name and host/ip)
                if 'display_name' not in available_columns:
                    raise HTTPException(
                        status_code=400,
                        detail="NetBox CSV must contain a 'name' or 'Name' column"
                    )

                # Group sessions by site (or create default folder)
                folders_dict = {}

                for row_num, row in enumerate(csv_reader, start=2):
                    try:
                        # Skip empty rows
                        if not any(row.values()):
                            continue

                        display_name = row.get(available_columns['display_name'], '').strip()
                        if not display_name:
                            continue

                        # Try to get host/IP
                        host = ''
                        if 'host' in available_columns:
                            host = row.get(available_columns['host'], '').strip()
                            # Clean IP address (remove /24 notation if present)
                            if '/' in host:
                                host = host.split('/')[0]

                        # If no host found, use display_name as host
                        if not host:
                            host = display_name

                        # Determine folder (use site if available, otherwise 'NetBox Import')
                        folder_name = 'NetBox Import'
                        if 'site' in available_columns:
                            site_name = row.get(available_columns['site'], '').strip()
                            if site_name:
                                folder_name = site_name

                        # Determine device type
                        device_type = 'linux'  # default
                        if 'device_type' in available_columns:
                            dt = row.get(available_columns['device_type'], '').strip().lower()
                            if 'cisco' in dt:
                                device_type = 'cisco_ios'
                            elif 'juniper' in dt:
                                device_type = 'juniper_junos'
                            elif 'arista' in dt:
                                device_type = 'arista_eos'
                            elif dt:
                                device_type = dt

                        # Get platform
                        platform = ''
                        if 'platform' in available_columns:
                            platform = row.get(available_columns['platform'], '').strip()

                        # Create session data
                        session_data = {
                            'display_name': display_name,
                            'host': host,
                            'port': 22,
                            'device_type': device_type,
                            'platform': platform
                        }

                        # Add to folder
                        if folder_name not in folders_dict:
                            folders_dict[folder_name] = {
                                'folder_name': folder_name,
                                'sessions': []
                            }

                        folders_dict[folder_name]['sessions'].append(session_data)

                    except Exception as e:
                        logger.warning(f"Row {row_num}: Error processing NetBox row - {str(e)}")
                        continue

                return list(folders_dict.values())

            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")
            except Exception as e:
                logger.error(f"NetBox CSV parsing error: {e}")
                raise HTTPException(status_code=400, detail=f"Failed to parse NetBox CSV: {str(e)}")

        # Add this simple export endpoint to your main.py in the setup_routes() method

        @self.app.get("/api/sessions/export")
        async def export_sessions(username: str = Depends(get_current_user_from_session)):
            """Export sessions as YAML file"""
            try:
                # Load user sessions
                folders = self.workspace_manager.load_sessions_for_user(username)

                if not folders:
                    raise HTTPException(status_code=404, detail="No sessions found to export")

                # Convert to YAML format (same format as the sessions.yaml file)
                yaml_lines = []

                for folder in folders:
                    # Folder header
                    yaml_lines.append(f"- folder_name: \"{folder.folder_name}\"")
                    yaml_lines.append("  sessions:")

                    # Sessions in the format that matches your current sessions.yaml
                    for session in folder.sessions:
                        yaml_lines.append(f"    - display_name: \"{session.display_name}\"")
                        yaml_lines.append(f"      host: \"{session.host}\"")
                        yaml_lines.append(f"      port: \"{session.port}\"")
                        yaml_lines.append(f"      DeviceType: \"{session.device_type}\"")

                        # Add platform if it exists
                        if hasattr(session, 'platform') and session.platform:
                            yaml_lines.append(f"      platform: \"{session.platform}\"")

                        # Keep the legacy credsid field for compatibility
                        yaml_lines.append("      credsid: \"\"")

                    yaml_lines.append("")  # Empty line between folders

                yaml_content = "\n".join(yaml_lines)

                # Generate filename with timestamp
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                filename = f"velocitiem_sessions_{timestamp}.yaml"

                # Return as file download
                from fastapi.responses import Response
                return Response(
                    content=yaml_content,
                    media_type="application/x-yaml",
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}"
                    }
                )

            except Exception as e:
                logger.error(f"Export failed for {username}: {e}")
                raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")



        @self.app.get("/api/netbox/devices")
        async def search_devices(
                search: Optional[str] = None,
                site: Optional[str] = None,
                platform: Optional[str] = None,
                status: str = "active",
                limit: int = 100,
                username: str = Depends(get_current_user_from_session)
        ):
            """Search NetBox devices"""
            config = self.workspace_manager.load_netbox_config(username)

            if not config:
                raise HTTPException(status_code=404, detail="NetBox token not configured")

            client = NetBoxClient(config["api_url"], config["api_token"],verify_ssl=False)
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

            client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
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

        @self.app.get("/api/netbox/connection/test")
        async def test_netbox_connection(username: str = Depends(get_current_user_from_session)):
            """Quick connection test without updating timestamps"""
            config = self.workspace_manager.load_netbox_config(username)

            if not config:
                return {"status": "not_configured"}

            try:
                client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
                result = await client.test_connection()

                return {
                    "status": "connected" if result["status"] == "success" else "error",
                    "message": result.get("message", ""),
                    "api_url": config["api_url"]
                }
            except Exception as e:
                return {
                    "status": "error",
                    "message": str(e),
                    "api_url": config["api_url"]
                }
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
    print("Running Demo: http://localhost:8050/index.html")
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