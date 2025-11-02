#!/usr/bin/env python3
"""
routes/system.py
System Monitoring and Tools Routes
"""
from fastapi import APIRouter, HTTPException, Depends
import logging
import psutil
import platform
from datetime import datetime

from models import UserSettings, HealthCheck, ToolDefinition, ToolSchema
from workspace_manager import WorkspaceManager

logger = logging.getLogger(__name__)


def create_system_routes(workspace_manager: WorkspaceManager, get_current_user):
    """Factory function to create system routes with dependencies"""

    router = APIRouter(prefix="/api", tags=["system"])

    @router.get("/health")
    async def health_check():
        """Health check endpoint"""
        return HealthCheck(timestamp=datetime.utcnow().isoformat())

    @router.get("/system/stats")
    async def get_system_stats():
        """Get real system statistics"""
        try:
            return {
                "cpu": {
                    "usage": psutil.cpu_percent(interval=1),
                    "cores": psutil.cpu_count(),
                    "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else 0,
                    "temperature": 0
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

    @router.get("/user/info")
    async def get_user_info(username: str = Depends(get_current_user)):
        """Get current user information"""
        return {
            "username": username,
            "workspace_exists": True,
            "authentication": "session_based"
        }

    @router.get("/workspace/settings")
    async def get_settings(username: str = Depends(get_current_user)):
        """Get user workspace settings"""
        settings = workspace_manager.load_user_settings(username)
        return settings

    @router.put("/workspace/settings")
    async def update_settings(
            settings: UserSettings,
            username: str = Depends(get_current_user)
    ):
        """Update user workspace settings"""
        success = workspace_manager.save_user_settings(username, settings)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")

    @router.get("/tools")
    async def get_available_tools():
        """Get comprehensive list of available tools"""
        tools = [
            ToolDefinition(
                id="system_dashboard",
                name="System Monitor",
                description="Real-time system monitoring dashboard",
                icon="Monitor",
                directLaunch=True,
                defaultConfig={}
            ),
            ToolDefinition(
                id="go_scan_tui",
                name="Go Network Scanner",
                description="Advanced network scanning TUI built in Go",
                icon="Radar",
                directLaunch=True,
                defaultConfig={}
            ),
            ToolDefinition(
                id="snmp_scanner",
                name="SNMP Scanner",
                description="SNMP network device scanner TUI",
                icon="Wifi",
                directLaunch=True,
                defaultConfig={}
            ),
            ToolDefinition(
                id="ping",
                name="Ping",
                description="Ping a host continuously",
                icon="Activity",
                directLaunch=False,
                defaultConfig={
                    "host": "8.8.8.8",
                    "count": "continuous"
                }
            ),
            ToolDefinition(
                id="traceroute",
                name="Traceroute",
                description="Trace network path to host",
                icon="GitBranch",
                directLaunch=False,
                defaultConfig={
                    "host": "8.8.8.8"
                }
            ),
            ToolDefinition(
                id="htop",
                name="htop",
                description="Interactive process viewer",
                icon="Activity",
                directLaunch=True,
                defaultConfig={}
            ),
            ToolDefinition(
                id="network_tui_python",
                name="Network Config TUI",
                description="Textual-based network device configuration",
                icon="Network",
                directLaunch=True,
                defaultConfig={}
            ),
            ToolDefinition(
                id="ansible_web_runner",
                name="Ansible Web Runner",
                description="Web-based Ansible playbook execution",
                icon="Settings",
                directLaunch=False,
                defaultConfig={
                    "operation": {"type": "backup", "outputDir": "./backups"},
                    "devices": []
                }
            ),
            ToolDefinition(
                id="nmap",
                name="Nmap Scanner",
                description="Network discovery and security auditing",
                icon="Shield",
                directLaunch=False,
                defaultConfig={
                    "target": "192.168.1.0/24",
                    "scan_type": "-sn"
                }
            )
        ]

        return {"tools": [tool.dict() for tool in tools]}

    @router.get("/plugins/{tool_type}/schema")
    async def get_tool_schema(tool_type: str):
        """Get configuration schema for tools that need configuration"""
        schemas = {
            "ping": ToolSchema(
                configSchema={
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
            ),
            "traceroute": ToolSchema(
                configSchema={
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
            ),
            "nmap": ToolSchema(
                configSchema={
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
            ),
            "ansible_web_runner": ToolSchema(
                configSchema={
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
            )
        }

        if tool_type not in schemas:
            raise HTTPException(status_code=404, detail=f"Schema for {tool_type} not found")

        return schemas[tool_type].dict()

    return router