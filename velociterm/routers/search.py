from fastapi import APIRouter, Depends, HTTPException, Query
from velociterm.helpers.auth_helper import get_current_user
from velociterm.helpers.config import AppConfig
from pathlib import Path
import yaml
import pynetbox

router = APIRouter()

BASE_WORKSPACE_DIR = Path("./workspaces")


def get_user_settings(username: str) -> dict:
    """Get user settings from their profile"""
    settings_file = BASE_WORKSPACE_DIR / username / "profile_settings.yaml"

    if settings_file.exists():
        try:
            with open(settings_file, 'r') as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            print(f"Error reading user settings: {e}")
    return {}


def get_user_session_file(username: str) -> Path:
    """Get the appropriate session file path based on user settings"""
    settings = get_user_settings(username)
    session_settings = settings.get('sessions', {})
    use_system_file = session_settings.get('use_system_file', True)
    personal_file = session_settings.get('personal_file', 'sessions.yaml')

    if use_system_file:
        return Path("./velociterm/sessions/sessions.yaml")  # Use direct path instead of config
    else:
        return BASE_WORKSPACE_DIR / username / personal_file


def load_sessions_for_user(username: str) -> list:
    """Load sessions from the appropriate file based on user preferences"""
    session_file = get_user_session_file(username)
    print(f"Attempting to load sessions from: {session_file}")

    if session_file.exists():
        try:
            with open(session_file, 'r') as f:
                data = yaml.safe_load(f)
                return data if isinstance(data, list) else []
        except Exception as e:
            print(f"Error loading sessions from {session_file}: {e}")
            return []
    print(f"Session file not found: {session_file}")
    return []


@router.get("/search")
async def search_sessions(
        query: str = Query(None, min_length=1),
        username: str = Depends(get_current_user)
):
    """Search sessions in user's preferred session file"""
    if not query:
        return []

    try:
        sessions = load_sessions_for_user(username)
        matching_sessions = []

        # Search through session folders
        for folder in sessions:
            if not isinstance(folder, dict):
                continue

            for session in folder.get("sessions", []):
                if not isinstance(session, dict):
                    continue

                search_terms = [
                    str(value).lower() for key, value in session.items()
                    if value and key in {
                        'display_name', 'host', 'DeviceType',
                        'Model', 'port', 'Vendor'
                    }
                ]

                if any(query.lower() in term for term in search_terms):
                    formatted_session = {
                        'display_name': session.get('display_name', session.get('host', 'Unknown')),
                        'host': session.get('host', ''),
                        'port': session.get('port', '22'),
                        'Model': session.get('Model', ''),
                        'DeviceType': session.get('DeviceType', ''),
                        'SerialNumber': session.get('SerialNumber', ''),
                        'SoftwareVersion': session.get('SoftwareVersion', ''),
                        'Vendor': session.get('Vendor', '')
                    }
                    matching_sessions.append(formatted_session)

        return matching_sessions

    except Exception as e:
        print(f"Error searching sessions: {e}")
        return []


@router.get("/search-netbox")
async def search_netbox(query: str = Query(None, min_length=3)):
    config = AppConfig.get_instance()

    if not config.netbox.enabled:
        raise HTTPException(
            status_code=400,
            detail="NetBox integration is not enabled"
        )

    if query:
        try:
            nb = pynetbox.api(config.netbox.host, token=config.netbox.token)
            nb.http_session.verify = config.netbox.verify_ssl

            devices = nb.dcim.devices.filter(q=query)
            sessions_result = [
                {
                    'DeviceType': str(device.platform),
                    'Model': str(device.device_type.model) or '',
                    'SerialNumber': str(device.serial) or '',
                    'SoftwareVersion': 'unknown',
                    'Vendor': str(device.device_type.manufacturer.name) if device.device_type.manufacturer else '',
                    'display_name': str(device.name),
                    'host': device.primary_ip.address.strip("/32") if device.primary_ip else 'unknown',
                    'port': '22'
                }
                for device in devices
            ]
            return sessions_result
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error connecting to NetBox: {str(e)}"
            )
    return []