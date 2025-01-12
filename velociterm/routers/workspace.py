import os
from typing import List, Dict, Any

import yaml
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pathlib import Path
from starlette.responses import FileResponse
from velociterm.helpers.auth_helper import get_current_user

# Define the router
router = APIRouter()

# Base directory for storing user-specific session files
BASE_WORKSPACE_DIR = Path("./workspaces")
SYSTEM_SESSIONS_FILE = Path(os.path.join(os.path.dirname(os.path.dirname(__file__)), "sessions", "sessions.yaml"))


def get_sessions_file(username: str) -> Path:
    """Get the appropriate sessions file for a user.
    Returns user's personal file if it exists, otherwise system default."""
    user_workspace = BASE_WORKSPACE_DIR / username
    user_sessions = user_workspace / "sessions.yaml"

    if user_sessions.exists():
        return user_sessions
    return SYSTEM_SESSIONS_FILE


def load_sessions_for_user(username: str, sessions_file: str) -> list:
    """
    Load sessions from either system or personal sessions file.

    Args:
        username: str - Username of the current user
        sessions_file: str - Path to the sessions file to load

    Returns:
        list - List of session folders and their sessions
    """
    try:
        # Convert to absolute path if not already
        full_path = os.path.abspath(sessions_file)

        print(f"Attempting to load sessions from: {full_path}")  # Debug print

        # Check if file exists
        if not os.path.exists(full_path):
            print(f"Warning: Sessions file not found at {full_path}")
            return []

        # Load and parse YAML file
        with open(full_path, 'r', encoding='utf-8') as f:
            sessions_data = yaml.safe_load(f)

        # If sessions_data is None or not a list, return empty list
        if not isinstance(sessions_data, list):
            print(f"Warning: Invalid sessions data format in {full_path}")
            return []

        return sessions_data

    except Exception as e:
        print(f"Error loading sessions file: {str(e)}")
        return []

# In routers/workspace.py
def create_workspace_for_user(username: str):
    user_workspace = BASE_WORKSPACE_DIR / username
    user_workspace.mkdir(parents=True, exist_ok=True)

    # Path to user profile settings
    profile_settings_path = user_workspace / "profile_settings.yaml"

    # Default settings with sessions configuration
    default_settings = {
        "theme": "theme-default.css",
        "sessions": {
            "use_system_file": True,
            "personal_file": "sessions.yaml"
        }
    }

    # If profile settings exist, load and update structure if needed
    if profile_settings_path.exists():
        with open(profile_settings_path, 'r') as f:
            user_settings = yaml.safe_load(f)

        # Migrate old settings format to new format if needed
        if 'sessions' not in user_settings:
            user_settings['sessions'] = {
                "use_system_file": True,
                "personal_file": user_settings.get('default_sessions_file', 'sessions.yaml')
            }
            # Remove old key if it exists
            user_settings.pop('default_sessions_file', None)

            # Save updated settings
            with open(profile_settings_path, 'w') as f:
                yaml.dump(user_settings, f)
    else:
        # Create new settings file
        user_settings = default_settings
        with open(profile_settings_path, 'w') as f:
            yaml.dump(user_settings, f)

    return user_workspace, user_settings

@router.get("/settings")
async def get_user_settings(username: str = Depends(get_current_user)):
    _, user_settings = create_workspace_for_user(username)
    return user_settings


@router.post("/settings")
async def save_user_settings(settings: dict, username: str = Depends(get_current_user)):
    user_workspace, user_settings = create_workspace_for_user(username)
    profile_settings_path = user_workspace / "profile_settings.yaml"

    # Update settings
    user_settings.update(settings)

    with open(profile_settings_path, 'w') as f:
        yaml.dump(user_settings, f)

    return {"status": "success"}


@router.get("/settings/sessions")
async def get_session_config(username: str = Depends(get_current_user)):
    sessions_file = get_sessions_file(username)

    try:
        with open(sessions_file, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add this with your other routes in workspace.py
@router.get("/sessions.yaml")
async def get_system_sessions_file():
    """Serve the system-wide sessions.yaml file"""
    if SYSTEM_SESSIONS_FILE.exists():
        return FileResponse(SYSTEM_SESSIONS_FILE)
    else:
        # Create default sessions file if it doesn't exist
        default_sessions = [
            {
                "folder_name": "Default",
                "sessions": []
            }
        ]
        SYSTEM_SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SYSTEM_SESSIONS_FILE, 'w') as f:
            yaml.dump(default_sessions, f)
        return FileResponse(SYSTEM_SESSIONS_FILE)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
import yaml
from velociterm.helpers.auth_helper import get_current_user
from pathlib import Path

router = APIRouter()

# Base directory for storing user-specific settings
BASE_WORKSPACE_DIR = Path("./workspaces")


@router.get("/settings")
async def get_user_settings(username: str = Depends(get_current_user)):
    """Get user settings including theme and session file preferences"""
    user_workspace = BASE_WORKSPACE_DIR / username
    settings_path = user_workspace / "profile_settings.yaml"

    # Create default settings if they don't exist
    if not settings_path.exists():
        default_settings = {
            "theme": "theme-default.css",
            "default_sessions_file": "sessions.yaml"
        }
        user_workspace.mkdir(parents=True, exist_ok=True)
        with open(settings_path, 'w') as f:
            yaml.safe_dump(default_settings, f)
        return JSONResponse(content=default_settings)

    # Return existing settings
    try:
        with open(settings_path, 'r') as f:
            settings = yaml.safe_load(f)
            return JSONResponse(content=settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load settings: {str(e)}")


@router.post("/settings")
async def save_user_settings(settings: dict, username: str = Depends(get_current_user)):
    """Save user settings"""
    user_workspace = BASE_WORKSPACE_DIR / username
    settings_path = user_workspace / "profile_settings.yaml"

    try:
        user_workspace.mkdir(parents=True, exist_ok=True)
        with open(settings_path, 'w') as f:
            yaml.safe_dump(settings, f)
        return JSONResponse(content={"status": "success"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


@router.get("/settings/sessions")
async def get_session_config(username: str = Depends(get_current_user)):
    """Get user's session configuration"""
    user_workspace = BASE_WORKSPACE_DIR / username
    sessions_path = user_workspace / "sessions.yaml"

    try:
        if not sessions_path.exists():
            # Return default sessions if no user-specific file exists
            with open("sessions.yaml", 'r') as f:
                return yaml.safe_load(f)

        with open(sessions_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sessions: {str(e)}")


@router.post("/settings/sessions")
async def save_session_config(config: List[Dict[str, Any]], username: str = Depends(get_current_user)):
    """Save user's session configuration"""
    user_workspace = Path("./workspaces") / username
    sessions_path = user_workspace / "sessions.yaml"

    try:
        # Ensure the config matches expected format
        formatted_config = []
        for item in config:
            if isinstance(item, dict) and "folder_name" in item and "sessions" in item:
                formatted_config.append({
                    "folder_name": item["folder_name"],
                    "sessions": item["sessions"]
                })
            else:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid session configuration format"
                )

        # Save the formatted config
        user_workspace.mkdir(parents=True, exist_ok=True)
        with open(sessions_path, 'w') as f:
            yaml.safe_dump(formatted_config, f)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save sessions: {str(e)}"
        )


@router.post("/validate-yaml")
async def validate_yaml(content: Dict[str, str]):
    """Validate YAML content"""
    try:
        if not isinstance(content.get('content'), str):
            return {"valid": False, "error": "Content must be a string"}

        # Parse YAML
        parsed = yaml.safe_load(content['content'])

        # Validate structure
        if not isinstance(parsed, list):
            return {"valid": False, "error": "Root must be a list"}

        for item in parsed:
            if not isinstance(item, dict):
                return {"valid": False, "error": "Each item must be an object"}
            if "folder_name" not in item:
                return {"valid": False, "error": "Missing folder_name"}
            if "sessions" not in item:
                return {"valid": False, "error": "Missing sessions"}
            if not isinstance(item["sessions"], list):
                return {"valid": False, "error": "Sessions must be a list"}

        return {"valid": True}
    except yaml.YAMLError as e:
        return {"valid": False, "error": str(e)}

# File management routes
@router.get("/workspace/files")
async def list_files(username: str = Depends(get_current_user)):
    user_workspace = create_workspace_for_user(username)[0]
    files = [f.name for f in user_workspace.iterdir() if f.is_file()]
    return {"files": files}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), username: str = Depends(get_current_user)):
    user_workspace = create_workspace_for_user(username)[0]
    file_path = user_workspace / file.filename
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"filename": file.filename}


@router.get("/download/{filename}")
async def download_file(filename: str, username: str = Depends(get_current_user)):
    user_workspace = create_workspace_for_user(username)[0]
    file_path = user_workspace / filename

    if file_path.exists():
        return FileResponse(path=file_path, filename=filename)
    else:
        raise HTTPException(status_code=404, detail="File not found")