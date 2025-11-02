#!/usr/bin/env python3
"""
routes/sessions.py
Session Management Routes - CRUD operations for user sessions
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, Form, File
from fastapi.responses import Response
from datetime import datetime
from typing import List
import logging
import secrets
import time
import csv
import io
import yaml

from models import SessionData, SessionFolder, CreateSessionFromNetBoxRequest
from workspace_manager import WorkspaceManager

logger = logging.getLogger(__name__)


def create_sessions_routes(workspace_manager: WorkspaceManager, get_current_user):
    """Factory function to create session routes with dependencies"""

    router = APIRouter(prefix="/api/sessions", tags=["sessions"])

    @router.get("")
    async def get_sessions(username: str = Depends(get_current_user)):
        """Get sessions data for user"""
        try:
            user_sessions_file = workspace_manager.get_sessions_file_path(username)
            folders = workspace_manager.load_sessions_for_user(username, str(user_sessions_file))

            # Convert to dict format expected by frontend
            result = []
            for folder in folders:
                folder_dict = {
                    "folder_name": folder.folder_name,
                    "sessions": []
                }
                for session in folder.sessions:
                    # Exclude folder_name from session dict - it's redundant (already in folder)
                    session_dict = session.dict(exclude={'folder_name'})
                    folder_dict["sessions"].append(session_dict)
                result.append(folder_dict)

            logger.info(f"Loaded {len(result)} session folders for user {username}")
            return result

        except Exception as e:
            logger.error(f"Failed to load sessions for {username}: {e}")
            raise HTTPException(status_code=500, detail="Failed to load sessions")

    @router.post("")
    async def create_session(
            session_data: dict,
            username: str = Depends(get_current_user)
    ):
        """Create a new session"""
        try:
            # Validate required fields
            required_fields = ['display_name', 'host']
            for field in required_fields:
                if not session_data.get(field):
                    raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

            # Set default folder if not provided
            folder_name = session_data.get('folder_name', 'Default')

            # Create SessionData object with folder_name
            new_session = SessionData(
                id=f"session-{int(time.time())}-{secrets.token_urlsafe(4)}",
                display_name=session_data['display_name'],
                host=session_data['host'],
                port=session_data.get('port', 22),
                device_type=session_data.get('device_type', 'Server'),
                platform=session_data.get('platform', ''),
                folder_name=folder_name,
                status='disconnected',
                created_at=datetime.utcnow().isoformat()
            )

            # Save to workspace
            success = workspace_manager.create_session_for_user(username, new_session)

            if success:
                return {"status": "success", "session_id": new_session.id, "message": "Session created"}
            else:
                raise HTTPException(status_code=500, detail="Failed to create session")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating session for {username}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/{session_id}")
    async def update_session(
            session_id: str,
            update_data: dict,
            username: str = Depends(get_current_user)
    ):
        """Update an existing session"""
        try:
            success = workspace_manager.update_session_for_user(username, session_id, update_data)

            if success:
                return {"status": "success", "message": "Session updated"}
            else:
                raise HTTPException(status_code=404, detail="Session not found")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating session {session_id} for {username}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/{session_id}")
    async def delete_session(
            session_id: str,
            username: str = Depends(get_current_user)
    ):
        """Delete a session"""
        try:
            success = workspace_manager.delete_session_for_user(username, session_id)

            if success:
                return {"status": "success", "message": "Session deleted"}
            else:
                raise HTTPException(status_code=404, detail="Session not found")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting session {session_id} for {username}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/folders")
    async def create_folder(
            folder_data: dict,
            username: str = Depends(get_current_user)
    ):
        """Create a new folder"""
        try:
            folder_name = folder_data.get('folder_name')
            if not folder_name or not folder_name.strip():
                raise HTTPException(status_code=400, detail="folder_name is required")

            success = workspace_manager.create_folder_for_user(username, folder_name.strip())

            if success:
                return {"status": "success", "message": "Folder created"}
            else:
                raise HTTPException(status_code=400, detail="Folder already exists or creation failed")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating folder for {username}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/folders/{folder_name}")
    async def rename_folder(
            folder_name: str,
            rename_data: dict,
            username: str = Depends(get_current_user)
    ):
        """Rename a folder"""
        try:
            from urllib.parse import unquote
            folder_name = unquote(folder_name)

            new_name = rename_data.get('new_name')
            if not new_name or not new_name.strip():
                raise HTTPException(status_code=400, detail="new_name is required")

            success = workspace_manager.rename_folder_for_user(username, folder_name, new_name.strip())

            if success:
                return {"status": "success", "message": "Folder renamed"}
            else:
                raise HTTPException(status_code=400, detail="Folder not found or new name already exists")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error renaming folder {folder_name} for {username}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/folders/{folder_name}")
    async def delete_folder(
            folder_name: str,
            username: str = Depends(get_current_user)
    ):
        """Delete an empty folder"""
        try:
            from urllib.parse import unquote
            folder_name = unquote(folder_name)

            success = workspace_manager.delete_folder_for_user(username, folder_name)

            if success:
                return {"status": "success", "message": "Folder deleted"}
            else:
                raise HTTPException(status_code=400, detail="Folder not found or not empty")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting folder {folder_name} for {username}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/bulk")
    async def bulk_session_operations(
            operations: dict,
            username: str = Depends(get_current_user)
    ):
        """Perform bulk operations on sessions"""
        try:
            operation_type = operations.get('type')
            session_ids = operations.get('session_ids', [])

            if operation_type == 'delete':
                success_count = 0
                for session_id in session_ids:
                    if workspace_manager.delete_session_for_user(username, session_id):
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
                    if workspace_manager.update_session_for_user(username, session_id, {'folder_name': target_folder}):
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

    @router.get("/export")
    async def export_sessions(username: str = Depends(get_current_user)):
        """Export sessions as YAML file"""
        try:
            folders = workspace_manager.load_sessions_for_user(username)

            if not folders:
                raise HTTPException(status_code=404, detail="No sessions found to export")

            # Convert to YAML format
            yaml_lines = []

            for folder in folders:
                yaml_lines.append(f"- folder_name: \"{folder.folder_name}\"")
                yaml_lines.append("  sessions:")

                for session in folder.sessions:
                    yaml_lines.append(f"    - display_name: \"{session.display_name}\"")
                    yaml_lines.append(f"      host: \"{session.host}\"")
                    yaml_lines.append(f"      port: \"{session.port}\"")
                    yaml_lines.append(f"      DeviceType: \"{session.device_type}\"")

                    if hasattr(session, 'platform') and session.platform:
                        yaml_lines.append(f"      platform: \"{session.platform}\"")

                    yaml_lines.append("      credsid: \"\"")

                yaml_lines.append("")

            yaml_content = "\n".join(yaml_lines)

            # Generate filename with timestamp
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"velocitiem_sessions_{timestamp}.yaml"

            return Response(
                content=yaml_content,
                media_type="application/x-yaml",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        except Exception as e:
            logger.error(f"Export failed for {username}: {e}")
            raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    return router