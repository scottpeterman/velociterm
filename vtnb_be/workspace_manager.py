#!/usr/bin/env python3
"""
VelociTerm Backend - Workspace Management
Enhanced workspace management with NetBox integration and session support
"""

import json
import secrets
import time  # Added missing import
import yaml
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

import httpx
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

# Changed to absolute import
from models import *
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logger = logging.getLogger(__name__)


class WorkspaceManager:
    """Enhanced workspace management with session support"""

    def __init__(self, base_dir: str = "./workspaces"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)

    def _get_user_dir(self, username: str) -> Path:
        """Get user workspace directory"""
        user_dir = self.base_dir / username
        user_dir.mkdir(exist_ok=True)
        return user_dir

    def _get_encryption_key(self, username: str) -> bytes:
        """Generate encryption key for user workspace"""
        # For POC, use deterministic key based on username
        # In production, this would be derived from user's master password
        password = f"poc_password_{username}".encode()
        salt = b"poc_salt_12345678"  # Fixed salt for POC
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key

    def save_netbox_config(self, username: str, config: NetBoxTokenConfig, update_validated: bool = False) -> bool:
        """Save encrypted NetBox configuration"""
        try:
            user_dir = self._get_user_dir(username)
            config_file = user_dir / "netbox_config.json.enc"

            # Encrypt the token
            key = self._get_encryption_key(username)
            fernet = Fernet(key)

            config_data = {
                "api_url": config.api_url,
                "api_token": config.api_token,
                "description": config.description,
                "created_at": datetime.utcnow().isoformat(),
                "last_validated": datetime.utcnow().isoformat() if update_validated else None
            }

            encrypted_data = fernet.encrypt(json.dumps(config_data).encode())

            with open(config_file, "wb") as f:
                f.write(encrypted_data)

            logger.info(f"Saved NetBox config for user {username}")
            return True

        except Exception as e:
            logger.error(f"Failed to save NetBox config for {username}: {e}")
            return False

    def load_netbox_config(self, username: str) -> Optional[Dict[str, Any]]:
        """Load and decrypt NetBox configuration"""
        try:
            user_dir = self._get_user_dir(username)
            config_file = user_dir / "netbox_config.json.enc"

            if not config_file.exists():
                return None

            key = self._get_encryption_key(username)
            fernet = Fernet(key)

            with open(config_file, "rb") as f:
                encrypted_data = f.read()

            decrypted_data = fernet.decrypt(encrypted_data)
            config_data = json.loads(decrypted_data.decode())

            return config_data

        except Exception as e:
            logger.error(f"Failed to load NetBox config for {username}: {e}")
            return None

    def save_user_settings(self, username: str, settings: UserSettings) -> bool:
        """Save user settings"""
        try:
            user_dir = self._get_user_dir(username)
            settings_file = user_dir / "settings.yaml"

            with open(settings_file, "w") as f:
                yaml.dump(settings.dict(), f)

            logger.info(f"Saved settings for user {username}")
            return True

        except Exception as e:
            logger.error(f"Failed to save settings for {username}: {e}")
            return False

    def load_user_settings(self, username: str) -> UserSettings:
        """Load user settings with defaults"""
        try:
            user_dir = self._get_user_dir(username)
            settings_file = user_dir / "settings.yaml"

            if settings_file.exists():
                with open(settings_file, "r") as f:
                    data = yaml.safe_load(f) or {}
                return UserSettings(**data)
            else:
                # Return defaults
                return UserSettings()

        except Exception as e:
            logger.error(f"Failed to load settings for {username}: {e}")
            return UserSettings()

    def get_sessions_file_path(self, username: str) -> Path:
        """Return the canonical sessions file path for a user."""
        user_dir = self._get_user_dir(username)
        # Prefer .yaml, fall back to .yml if needed.
        yaml_path = user_dir / "sessions.yaml"
        if yaml_path.exists():
            return yaml_path
        yml_path = user_dir / "sessions.yml"
        return yml_path

    def load_sessions_for_user(self, username: str, sessions_file: Optional[str] = None) -> List[SessionFolder]:
        """Load session data for user with legacy format support"""
        try:
            # Default to the user's workspace sessions file if not provided
            file_path = None
            if sessions_file:
                file_path = Path(sessions_file)
            else:
                file_path = self.get_sessions_file_path(username)

            if file_path and file_path.exists():
                with open(file_path, "r") as f:
                    data = yaml.safe_load(f)
                if data is None:
                    data = []

                folders = []

                # Convert to SessionFolder objects with legacy support
                for folder_data in data:
                    if isinstance(folder_data, dict):
                        sessions = []
                        raw_sessions = folder_data.get("sessions", [])
                        for session_data in raw_sessions:
                            # Handle legacy field names and missing data
                            normalized_session = self._normalize_session_data(session_data,
                                                                              folder_data.get("folder_name", "Unknown"))
                            session = SessionData(**normalized_session)
                            sessions.append(session)

                        folder = SessionFolder(
                            folder_name=folder_data.get("folder_name", "Unknown"),
                            sessions=sessions
                        )
                        folders.append(folder)

                logger.info(f"Loaded {len(folders)} session folders for user {username}")
                return folders

            logger.info(f"No sessions file found for user {username} at {file_path}")
            return []

        except Exception as e:
            logger.error(f"Failed to load sessions for {username}: {e}", exc_info=True)
            return []

    def _normalize_session_data(self, session_data: dict, folder_name: str) -> dict:
        """Normalize session data from legacy format to current format"""
        import hashlib

        normalized = {}

        # Handle field name mappings from legacy format
        field_mappings = {
            'DeviceType': 'device_type',
            'Model': 'model',
            'SerialNumber': 'serial_number',
            'SoftwareVersion': 'software_version',
            'Vendor': 'vendor',
            'credsid': 'credentials_id'
        }

        # Apply field mappings
        for legacy_field, new_field in field_mappings.items():
            if legacy_field in session_data:
                normalized[new_field] = session_data[legacy_field]

        # Copy direct fields
        direct_fields = ['display_name', 'host', 'platform', 'id', 'status', 'created_at', 'last_sync', 'netbox_id',
                         'site']
        for field in direct_fields:
            if field in session_data:
                normalized[field] = session_data[field]

        # Handle port - convert string to int if needed
        if 'port' in session_data:
            try:
                normalized['port'] = int(session_data['port']) if session_data['port'] else 22
            except (ValueError, TypeError):
                normalized['port'] = 22
        else:
            normalized['port'] = 22

        # Generate deterministic ID if missing - based on display_name, host, and port
        # This ensures the same session always gets the same ID
        if 'id' not in normalized or not normalized['id']:
            display_name = normalized.get('display_name', session_data.get('display_name', 'unknown'))
            host = normalized.get('host', session_data.get('host', 'unknown'))
            port = normalized.get('port', 22)

            # Create deterministic ID based on session identity
            id_string = f"{display_name}:{host}:{port}:{folder_name}"
            id_hash = hashlib.md5(id_string.encode()).hexdigest()[:12]
            normalized['id'] = f"session-{id_hash}"

        # Set defaults for required fields
        defaults = {
            'device_type': 'linux',
            'status': 'disconnected',
            'folder_name': folder_name,
            'platform': '',
            'model': None,
            'serial_number': None,
            'software_version': None,
            'vendor': None,
            'credentials_id': None,
            'created_at': None,
            'last_sync': None,
            'netbox_id': None,
            'site': None
        }

        for field, default_value in defaults.items():
            if field not in normalized or normalized[field] == '':
                normalized[field] = default_value

        return normalized

    def save_sessions_for_user(self, username: str, folders: List[SessionFolder]) -> bool:
        """Save complete sessions data for user in legacy-compatible format"""
        try:
            sessions_file = self.get_sessions_file_path(username)

            # Convert SessionFolder objects to legacy format for YAML
            folder_dicts = []
            for folder in folders:
                folder_dict = {
                    "folder_name": folder.folder_name,
                    "sessions": [self._convert_to_legacy_format(session.dict()) for session in folder.sessions]
                }
                folder_dicts.append(folder_dict)

            with open(sessions_file, 'w') as f:
                yaml.dump(folder_dicts, f, default_flow_style=False)

            logger.info(f"Saved {len(folders)} session folders for user {username}")
            return True

        except Exception as e:
            logger.error(f"Failed to save sessions for {username}: {e}")
            return False

    def _convert_to_legacy_format(self, session_dict: dict) -> dict:
        """Convert internal session format back to legacy format for compatibility"""
        legacy = {}

        # Reverse field mappings to maintain compatibility
        field_mappings = {
            'device_type': 'DeviceType',
            'model': 'Model',
            'serial_number': 'SerialNumber',
            'software_version': 'SoftwareVersion',
            'vendor': 'Vendor',
            'credentials_id': 'credsid'
        }

        # Apply reverse mappings
        for new_field, legacy_field in field_mappings.items():
            if new_field in session_dict and session_dict[new_field] is not None:
                legacy[legacy_field] = session_dict[new_field]
            else:
                legacy[legacy_field] = ''  # Maintain empty string format

        # Copy direct fields that don't change
        direct_fields = ['display_name', 'host', 'platform']
        for field in direct_fields:
            if field in session_dict:
                legacy[field] = session_dict[field]

        # Convert port back to string to maintain compatibility
        if 'port' in session_dict:
            legacy['port'] = str(session_dict['port'])

        # Note: We don't save 'id' to maintain legacy format compatibility
        # The ID will be regenerated on load if needed

        return legacy

    def create_session_for_user(self, username: str, session_data: SessionData) -> bool:
        """Create a new session for user"""
        try:
            folders = self.load_sessions_for_user(username)

            # Find or create the target folder
            target_folder = None
            for folder in folders:
                if folder.folder_name == session_data.folder_name:
                    target_folder = folder
                    break

            if not target_folder:
                # Create new folder if it doesn't exist
                target_folder = SessionFolder(
                    folder_name=session_data.folder_name,
                    sessions=[]
                )
                folders.append(target_folder)

            # Add unique ID if not present
            if not hasattr(session_data, 'id') or not session_data.id:
                session_data.id = f"session-{int(time.time())}-{secrets.token_urlsafe(4)}"

            # Add timestamps
            session_data.created_at = datetime.utcnow().isoformat()
            session_data.status = "disconnected"

            # Add session to folder
            target_folder.sessions.append(session_data)

            # Save back to file
            return self.save_sessions_for_user(username, folders)

        except Exception as e:
            logger.error(f"Failed to create session for {username}: {e}")
            return False

    def update_session_for_user(self, username: str, session_id: str, updated_data: dict) -> bool:
        """Update an existing session for user"""
        try:
            folders = self.load_sessions_for_user(username)

            # Find the session to update
            target_session = None
            target_folder = None

            for folder in folders:
                for session in folder.sessions:
                    if getattr(session, 'id', None) == session_id:
                        target_session = session
                        target_folder = folder
                        break
                if target_session:
                    break

            if not target_session:
                logger.warning(f"Session {session_id} not found for user {username}")
                return False

            # Update session data
            for key, value in updated_data.items():
                if hasattr(target_session, key):
                    setattr(target_session, key, value)

            # Handle folder moves
            if 'folder_name' in updated_data and updated_data['folder_name'] != target_folder.folder_name:
                # Remove from current folder
                target_folder.sessions.remove(target_session)

                # Find or create new folder
                new_folder = None
                for folder in folders:
                    if folder.folder_name == updated_data['folder_name']:
                        new_folder = folder
                        break

                if not new_folder:
                    new_folder = SessionFolder(
                        folder_name=updated_data['folder_name'],
                        sessions=[]
                    )
                    folders.append(new_folder)

                # Add to new folder
                new_folder.sessions.append(target_session)

                # Clean up empty folders
                if len(target_folder.sessions) == 0:
                    folders.remove(target_folder)

            # Save changes
            return self.save_sessions_for_user(username, folders)

        except Exception as e:
            logger.error(f"Failed to update session {session_id} for {username}: {e}")
            return False

    def delete_session_for_user(self, username: str, session_id: str) -> bool:
        """Delete a session for user"""
        try:
            folders = self.load_sessions_for_user(username)

            # Find and remove the session
            for folder in folders:
                for session in folder.sessions:
                    if getattr(session, 'id', None) == session_id:
                        folder.sessions.remove(session)

                        # Remove empty folders
                        if len(folder.sessions) == 0:
                            folders.remove(folder)

                        # Save changes
                        return self.save_sessions_for_user(username, folders)

            logger.warning(f"Session {session_id} not found for user {username}")
            return False

        except Exception as e:
            logger.error(f"Failed to delete session {session_id} for {username}: {e}")
            return False

    def create_folder_for_user(self, username: str, folder_name: str) -> bool:
        """Create a new empty folder for user"""
        try:
            folders = self.load_sessions_for_user(username)

            # Check if folder already exists
            for folder in folders:
                if folder.folder_name == folder_name:
                    logger.warning(f"Folder {folder_name} already exists for user {username}")
                    return False

            # Create new folder
            new_folder = SessionFolder(folder_name=folder_name, sessions=[])
            folders.append(new_folder)

            # Save changes
            return self.save_sessions_for_user(username, folders)

        except Exception as e:
            logger.error(f"Failed to create folder {folder_name} for {username}: {e}")
            return False

    def rename_folder_for_user(self, username: str, old_name: str, new_name: str) -> bool:
        """Rename a folder for user"""
        try:
            folders = self.load_sessions_for_user(username)

            # Find the folder to rename
            target_folder = None
            for folder in folders:
                if folder.folder_name == old_name:
                    target_folder = folder
                    break

            if not target_folder:
                logger.warning(f"Folder {old_name} not found for user {username}")
                return False

            # Check if new name already exists
            for folder in folders:
                if folder.folder_name == new_name:
                    logger.warning(f"Folder {new_name} already exists for user {username}")
                    return False

            # Rename folder
            target_folder.folder_name = new_name

            # Save changes
            return self.save_sessions_for_user(username, folders)

        except Exception as e:
            logger.error(f"Failed to rename folder {old_name} to {new_name} for {username}: {e}")
            return False

    def delete_folder_for_user(self, username: str, folder_name: str) -> bool:
        """Delete an empty folder for user"""
        try:
            folders = self.load_sessions_for_user(username)

            # Find the folder to delete
            target_folder = None
            for folder in folders:
                if folder.folder_name == folder_name:
                    target_folder = folder
                    break

            if not target_folder:
                logger.warning(f"Folder {folder_name} not found for user {username}")
                return False

            # Check if folder is empty
            if len(target_folder.sessions) > 0:
                logger.warning(f"Cannot delete non-empty folder {folder_name} for user {username}")
                return False

            # Remove folder
            folders.remove(target_folder)

            # Save changes
            return self.save_sessions_for_user(username, folders)

        except Exception as e:
            logger.error(f"Failed to delete folder {folder_name} for {username}: {e}")
            return False

    def save_credential_set(self, username: str, credentials: dict, description: str = "") -> str:
        """Save encrypted credentials and return ID"""
        creds_id = secrets.token_urlsafe(8)

        user_dir = self._get_user_dir(username)
        creds_file = user_dir / f"credentials_{creds_id}.enc"

        # Encrypt credentials
        key = self._get_encryption_key(username)
        fernet = Fernet(key)

        creds_data = {
            "id": creds_id,
            "username": credentials["username"],
            "password": credentials["password"],
            "enable_password": credentials.get("enable_password"),
            "description": description,
            "created_at": datetime.utcnow().isoformat()
        }

        encrypted_data = fernet.encrypt(json.dumps(creds_data).encode())

        with open(creds_file, "wb") as f:
            f.write(encrypted_data)

        logger.info(f"Saved credential set {creds_id} for user {username}")
        return creds_id

    def load_credential_set(self, username: str, credentials_id: str) -> Optional[dict]:
        """Load and decrypt specific credential set"""
        try:
            user_dir = self._get_user_dir(username)
            creds_file = user_dir / f"credentials_{credentials_id}.enc"

            if not creds_file.exists():
                return None

            key = self._get_encryption_key(username)
            fernet = Fernet(key)

            with open(creds_file, "rb") as f:
                encrypted_data = f.read()

            decrypted_data = fernet.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())

        except Exception as e:
            logger.error(f"Failed to load credentials {credentials_id} for {username}: {e}")
            return None

    def list_credential_sets(self, username: str) -> List[dict]:
        """List all credential sets for user (without passwords)"""
        user_dir = self._get_user_dir(username)
        credentials = []

        for creds_file in user_dir.glob("credentials_*.enc"):
            creds_id = creds_file.stem.replace("credentials_", "")
            creds_data = self.load_credential_set(username, creds_id)

            if creds_data:
                # Remove sensitive data for listing
                safe_creds = {
                    "id": creds_data["id"],
                    "username": creds_data["username"],
                    "description": creds_data["description"],
                    "created_at": creds_data["created_at"],
                    "has_enable_password": bool(creds_data.get("enable_password"))
                }
                credentials.append(safe_creds)

        return credentials

    def create_session_from_netbox_device(self, username: str, device: NetBoxDeviceResponse,
                                          credentials_id: Optional[str] = None) -> SessionData:
        """Convert NetBox device to session entry"""
        return SessionData(
            display_name=device.name,
            host=device.primary_ip or device.name,
            port=22,
            device_type=self._map_netbox_platform_to_device_type(device.platform),
            # NetBox metadata
            netbox_id=device.id,
            site=device.site,
            model=device.device_type,
            vendor=self._extract_vendor_from_model(device.device_type),
            platform=device.platform,
            # Credential and tracking
            credentials_id=credentials_id,
            created_at=datetime.utcnow().isoformat(),
            last_sync=datetime.utcnow().isoformat(),
            status="disconnected"
        )

    def _map_netbox_platform_to_device_type(self, platform: Optional[str]) -> str:
        """Map NetBox platform to device type"""
        if not platform:
            return "Server"

        platform_lower = platform.lower()
        if "cisco" in platform_lower:
            return "cisco_ios"
        elif "juniper" in platform_lower:
            return "juniper_junos"
        elif "arista" in platform_lower:
            return "arista_eos"
        elif "linux" in platform_lower:
            return "linux"
        else:
            return "Server"

    def _extract_vendor_from_model(self, model: Optional[str]) -> str:
        """Extract vendor from device model"""
        if not model:
            return "Unknown"

        model_lower = model.lower()
        if "cisco" in model_lower or "catalyst" in model_lower:
            return "Cisco"
        elif "juniper" in model_lower or "ex" in model_lower or "mx" in model_lower:
            return "Juniper"
        elif "arista" in model_lower:
            return "Arista"
        else:
            return "Unknown"

    def add_session_to_workspace(self, username: str, session: SessionData) -> bool:
        """Add session to user's workspace, organized by site"""
        try:
            # Load existing sessions
            sessions_file = self._get_user_dir(username) / "sessions.yaml"
            folders = self.load_sessions_for_user(username, str(sessions_file))

            # Find or create folder for the site
            site_name = session.site or "Unknown"
            target_folder = None

            for folder in folders:
                if folder.folder_name == site_name:
                    target_folder = folder
                    break

            if not target_folder:
                target_folder = SessionFolder(folder_name=site_name, sessions=[])
                folders.append(target_folder)

            # Add session to folder
            target_folder.sessions.append(session)

            # Save back to file
            folder_dicts = []
            for folder in folders:
                folder_dict = {
                    "folder_name": folder.folder_name,
                    "sessions": [session.dict() for session in folder.sessions]
                }
                folder_dicts.append(folder_dict)

            with open(sessions_file, 'w') as f:
                yaml.dump(folder_dicts, f, default_flow_style=False)

            logger.info(f"Added session {session.display_name} to site folder {site_name} for user {username}")
            return True

        except Exception as e:
            logger.error(f"Failed to add session to workspace for {username}: {e}")
            return False


# In workspace_manager.py - Update the NetBoxClient class

class NetBoxClient:
    """NetBox API client with enhanced error handling and SSL verification disabled for POC"""

    def __init__(self, api_url: str, api_token: str, verify_ssl: bool = False):
        self.api_url = api_url.rstrip('/')
        self.api_token = api_token
        self.verify_ssl = verify_ssl  # Default to False for POC
        self.headers = {
            'Authorization': f'Token {api_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    async def test_connection(self) -> Dict[str, Any]:
        """Test NetBox API connection with SSL verification disabled"""
        try:
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                response = await client.get(
                    f"{self.api_url}/api/",
                    headers=self.headers,
                    timeout=10.0
                )

                if response.status_code == 200:
                    return {
                        "status": "success",
                        "message": "NetBox API connection successful",
                        "api_root": "accessible",
                        "ssl_verification": self.verify_ssl
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"HTTP {response.status_code}: {response.text}"
                    }

        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def search_devices(self, filters: DeviceFilter) -> NetBoxSearchResponse:
        """Search NetBox devices with filters - SSL verification disabled"""
        try:
            params = {
                "limit": filters.limit,
                "status": filters.status or "active"
            }

            if filters.search:
                params["q"] = filters.search
            if filters.site:
                params["site"] = filters.site
            if filters.platform:
                params["platform"] = filters.platform

            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                response = await client.get(
                    f"{self.api_url}/api/dcim/devices/",
                    headers=self.headers,
                    params=params,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()

                    logger.info(f"NetBox API returned {len(data.get('results', []))} devices")

                    # Process results with enhanced error handling
                    devices = []
                    for i, device in enumerate(data.get("results", [])):
                        if device is None:
                            logger.warning(f"Skipping None device at index {i}")
                            continue

                        if not isinstance(device, dict):
                            logger.warning(f"Skipping non-dict device at index {i}: {type(device)}")
                            continue

                        try:
                            # Safely handle primary_ip which might be None
                            primary_ip = None
                            primary_ip_obj = device.get("primary_ip")
                            if primary_ip_obj and isinstance(primary_ip_obj, dict):
                                ip_address = primary_ip_obj.get("address", "")
                                if ip_address:
                                    primary_ip = str(ip_address).split("/")[0]

                            # Safely extract nested values with defaults
                            site_obj = device.get("site")
                            site_name = site_obj.get("name") if isinstance(site_obj, dict) else None

                            platform_obj = device.get("platform")
                            platform_name = platform_obj.get("name") if isinstance(platform_obj, dict) else None

                            device_type_obj = device.get("device_type")
                            device_type_model = device_type_obj.get("model") if isinstance(device_type_obj,
                                                                                           dict) else None

                            status_obj = device.get("status")
                            status_label = status_obj.get("label") if isinstance(status_obj, dict) else None

                            rack_obj = device.get("rack")
                            rack_name = rack_obj.get("name") if isinstance(rack_obj, dict) else None

                            processed_device = NetBoxDeviceResponse(
                                id=device.get("id"),
                                name=device.get("name", "Unknown"),
                                display_name=device.get("display", device.get("name", "Unknown")),
                                primary_ip=primary_ip,
                                site=site_name,
                                platform=platform_name,
                                device_type=device_type_model,
                                status=status_label,
                                rack=rack_name
                            )

                            devices.append(processed_device)

                        except Exception as device_error:
                            logger.error(f"Error processing device at index {i}: {device_error}")
                            continue

                    logger.info(f"Successfully processed {len(devices)} devices")

                    return NetBoxSearchResponse(
                        status="success",
                        count=data.get("count", 0),
                        devices=devices
                    )
                else:
                    error_msg = f"HTTP {response.status_code}"
                    try:
                        error_details = response.json()
                        if isinstance(error_details, dict):
                            error_msg += f": {error_details.get('detail', response.text)}"
                        else:
                            error_msg += f": {response.text}"
                    except:
                        error_msg += f": {response.text}"

                    return NetBoxSearchResponse(
                        status="error",
                        count=0,
                        devices=[]
                    )

        except httpx.TimeoutException:
            logger.error("NetBox API timeout")
            return NetBoxSearchResponse(
                status="error",
                count=0,
                devices=[]
            )
        except httpx.RequestError as e:
            logger.error(f"NetBox API request error: {e}")
            return NetBoxSearchResponse(
                status="error",
                count=0,
                devices=[]
            )
        except Exception as e:
            logger.error(f"Device search failed: {e}", exc_info=True)
            return NetBoxSearchResponse(
                status="error",
                count=0,
                devices=[]
            )

    async def get_sites(self) -> List[Dict[str, Any]]:
        """Get available sites - with pagination support and SSL verification disabled"""
        try:
            all_sites = []
            next_url = f"{self.api_url}/api/dcim/sites/"

            while next_url:
                # Add limit parameter for first request only
                params = {"limit": 1000} if next_url == f"{self.api_url}/api/dcim/sites/" else {}

                async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                    response = await client.get(
                        next_url,
                        headers=self.headers,
                        params=params,
                        timeout=30.0
                    )

                    if response.status_code == 200:
                        data = response.json()

                        # Add sites from this page
                        sites_page = [{"id": site["id"], "name": site["name"]}
                                      for site in data.get("results", [])]
                        all_sites.extend(sites_page)

                        # Check if there's a next page
                        next_url = data.get("next")

                        logger.info(f"Loaded {len(sites_page)} sites from current page, total: {len(all_sites)}")

                        # Safety check - don't load more than 5000 sites
                        if len(all_sites) > 5000:
                            logger.warning(f"Hit site limit safety check at {len(all_sites)} sites")
                            break
                    else:
                        logger.error(f"Failed to get sites: HTTP {response.status_code}")
                        break

            logger.info(f"Total sites loaded: {len(all_sites)}")
            return all_sites

        except Exception as e:
            logger.error(f"Failed to get sites: {e}")
            return []

    async def get_device_by_id(self, device_id: int) -> Optional[NetBoxDeviceResponse]:
        """Get specific device by ID - SSL verification disabled"""
        try:
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                response = await client.get(
                    f"{self.api_url}/api/dcim/devices/{device_id}/",
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code == 200:
                    device_data = response.json()

                    # Process same as in search_devices
                    primary_ip = None
                    primary_ip_obj = device_data.get("primary_ip")
                    if primary_ip_obj and isinstance(primary_ip_obj, dict):
                        ip_address = primary_ip_obj.get("address", "")
                        if ip_address:
                            primary_ip = str(ip_address).split("/")[0]

                    site_obj = device_data.get("site")
                    site_name = site_obj.get("name") if isinstance(site_obj, dict) else None

                    platform_obj = device_data.get("platform")
                    platform_name = platform_obj.get("name") if isinstance(platform_obj, dict) else None

                    device_type_obj = device_data.get("device_type")
                    device_type_model = device_type_obj.get("model") if isinstance(device_type_obj, dict) else None

                    return NetBoxDeviceResponse(
                        id=device_data.get("id"),
                        name=device_data.get("name", "Unknown"),
                        display_name=device_data.get("display", device_data.get("name", "Unknown")),
                        primary_ip=primary_ip,
                        site=site_name,
                        platform=platform_name,
                        device_type=device_type_model,
                        status=device_data.get("status", {}).get("label"),
                        rack=device_data.get("rack", {}).get("name") if device_data.get("rack") else None
                    )
                else:
                    return None

        except Exception as e:
            logger.error(f"Failed to get device {device_id}: {e}")
            return None


# Also add this configuration option to suppress urllib3 warnings a
