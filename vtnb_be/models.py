#!/usr/bin/env python3
"""
VelociTerm Backend - Data Models and Types
Pydantic models for API requests, responses, and configuration
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# Authentication Models
class LoginCredentials(BaseModel):
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class SessionInfo(BaseModel):
    username: str
    created_at: float
    last_activity: float
    session_id: Optional[str] = None


# NetBox Integration Models
class NetBoxTokenConfig(BaseModel):
    api_url: str = Field(..., description="NetBox API URL")
    api_token: str = Field(..., description="User's NetBox API token")
    description: Optional[str] = Field(None, description="Token description")


class DeviceFilter(BaseModel):
    search: Optional[str] = None
    site: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = "active"
    limit: int = Field(default=50, le=200)


# User Settings Models
class UserSettings(BaseModel):
    theme: str = Field(default="cyber", description="UI theme")
    default_ssh_username: Optional[str] = None
    session_preferences: Dict[str, Any] = Field(default_factory=dict)


# Terminal Session Models
class SSHConnectionConfig(BaseModel):
    hostname: str
    port: int = 22
    username: str
    password: str


class TerminalResize(BaseModel):
    cols: int
    rows: int


class TerminalInput(BaseModel):
    data: str


# Tool Configuration Models
class ToolConfig(BaseModel):
    tool: str
    rows: Optional[int] = 24
    cols: Optional[int] = 80


class PingConfig(ToolConfig):
    host: str = "8.8.8.8"
    count: str = "continuous"


class TracerouteConfig(ToolConfig):
    host: str = "8.8.8.8"


class SNMPScannerConfig(ToolConfig):
    target: Optional[str] = None
    timeout: Optional[int] = None
    ports: Optional[str] = None


# Ansible Configuration Models
class AnsibleCredentials(BaseModel):
    username: str
    password: str
    enablePassword: Optional[str] = None


class AnsibleOperation(BaseModel):
    type: str = Field(default="backup", description="Operation type")
    customPlaybook: Optional[str] = None
    outputDir: str = Field(default="./backups", description="Output directory")


class AnsibleDevice(BaseModel):
    name: str
    host: str
    port: str = "22"
    type: str = "cisco_ios"
    enabled: bool = True


class AnsibleConfig(BaseModel):
    credentials: AnsibleCredentials
    operation: AnsibleOperation
    devices: List[AnsibleDevice]


# WebSocket Message Types
class WebSocketMessage(BaseModel):
    type: str
    data: Optional[Any] = None


class SSHOutputMessage(WebSocketMessage):
    type: str = "ssh_output"
    data: str
    tabId: Optional[str] = None


class TUIOutputMessage(WebSocketMessage):
    type: str = "tui_output"
    data: str


class StatusMessage(WebSocketMessage):
    type: str = "status"
    message: str
    pid: Optional[int] = None


class ErrorMessage(WebSocketMessage):
    type: str = "error"
    message: str


# API Response Models
class APIResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Any] = None


class NetBoxDeviceResponse(BaseModel):
    id: int
    name: str
    display_name: str
    primary_ip: Optional[str] = None
    site: Optional[str] = None
    platform: Optional[str] = None
    device_type: Optional[str] = None
    status: Optional[str] = None
    rack: Optional[str] = None


class NetBoxSearchResponse(BaseModel):
    status: str
    count: int
    devices: List[NetBoxDeviceResponse]


class ToolDefinition(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    directLaunch: bool
    defaultConfig: Dict[str, Any] = Field(default_factory=dict)


class ToolSchema(BaseModel):
    configSchema: Dict[str, Any]


# Session Management Models




# Health Check Model
class HealthCheck(BaseModel):
    status: str = "healthy"
    timestamp: str
    version: str = "0.2.0"
    service: str = "VelociTerm Backend"


class SessionData(BaseModel):
    display_name: str
    host: str
    port: int
    username: Optional[str] = None
    device_type: Optional[str] = "Server"
    status: str = "disconnected"

    id: Optional[str] = None

    # NetBox integration fields
    netbox_id: Optional[int] = None
    site: Optional[str] = None
    model: Optional[str] = None
    vendor: Optional[str] = None
    serial_number: Optional[str] = None
    software_version: Optional[str] = None
    platform: Optional[str] = None

    # Credential management
    credentials_id: Optional[str] = None

    # Metadata
    created_at: Optional[str] = None
    last_connected: Optional[str] = None
    last_sync: Optional[str] = None



class SessionFolder(BaseModel):
    folder_name: str
    sessions: List[SessionData]

class CredentialSet(BaseModel):
    id: str
    username: str
    password: str
    enable_password: Optional[str] = None
    description: str = ""
    created_at: str


class CreateSessionFromNetBoxRequest(BaseModel):
    device_id: int
    credentials_id: Optional[str] = None
    custom_port: Optional[int] = 22