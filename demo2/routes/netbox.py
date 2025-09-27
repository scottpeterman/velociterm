#!/usr/bin/env python3
"""
routes/netbox.py
NetBox Integration Routes - Device discovery and configuration
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime
import logging

from models import NetBoxTokenConfig, DeviceFilter, CreateSessionFromNetBoxRequest
from workspace_manager import WorkspaceManager, NetBoxClient

logger = logging.getLogger(__name__)


def create_netbox_routes(workspace_manager: WorkspaceManager, get_current_user):
    """Factory function to create NetBox routes with dependencies"""

    router = APIRouter(prefix="/api/netbox", tags=["netbox"])

    @router.get("/token/status")
    async def get_netbox_token_status(username: str = Depends(get_current_user)):
        """Check NetBox token configuration status"""
        config = workspace_manager.load_netbox_config(username)

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

    @router.post("/token/configure")
    async def configure_netbox_token(
            config: NetBoxTokenConfig,
            username: str = Depends(get_current_user)
    ):
        """Configure NetBox API token"""
        # Test the token first
        client = NetBoxClient(config.api_url, config.api_token, verify_ssl=False)
        test_result = await client.test_connection()

        if test_result["status"] == "error":
            raise HTTPException(
                status_code=400,
                detail=f"NetBox connection failed: {test_result['message']}"
            )

        # Save the configuration WITH last_validated timestamp
        success = workspace_manager.save_netbox_config(username, config, update_validated=True)

        if success:
            return {
                "status": "success",
                "message": "NetBox token configured successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save NetBox configuration")

    @router.post("/token/validate")
    async def validate_netbox_token(username: str = Depends(get_current_user)):
        """Validate existing NetBox token"""
        config = workspace_manager.load_netbox_config(username)

        if not config:
            raise HTTPException(status_code=404, detail="NetBox token not configured")

        client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
        result = await client.test_connection()

        if result["status"] == "success":
            # Update last validated timestamp
            config["last_validated"] = datetime.utcnow().isoformat()
            updated_config = NetBoxTokenConfig(**config)
            workspace_manager.save_netbox_config(username, updated_config)

        return result

    @router.get("/connection/test")
    async def test_netbox_connection(username: str = Depends(get_current_user)):
        """Quick connection test without updating timestamps"""
        config = workspace_manager.load_netbox_config(username)

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

    @router.get("/devices")
    async def search_devices(
            search: Optional[str] = None,
            site: Optional[str] = None,
            platform: Optional[str] = None,
            status: str = "active",
            limit: int = 100,
            username: str = Depends(get_current_user)
    ):
        """Search NetBox devices"""
        config = workspace_manager.load_netbox_config(username)

        if not config:
            raise HTTPException(status_code=404, detail="NetBox token not configured")

        client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
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

    @router.get("/sites")
    async def get_sites(username: str = Depends(get_current_user)):
        """Get available NetBox sites"""
        config = workspace_manager.load_netbox_config(username)

        if not config:
            raise HTTPException(status_code=404, detail="NetBox token not configured")

        client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
        sites = await client.get_sites()

        return {"sites": sites}

    @router.get("/devices/{device_id}")
    async def get_device_by_id(
            device_id: int,
            username: str = Depends(get_current_user)
    ):
        """Get specific device by ID"""
        config = workspace_manager.load_netbox_config(username)

        if not config:
            raise HTTPException(status_code=404, detail="NetBox token not configured")

        client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)
        device = await client.get_device_by_id(device_id)

        if device:
            return device
        else:
            raise HTTPException(status_code=404, detail="Device not found")

    @router.post("/devices/import")
    async def import_devices_from_netbox(
            device_ids: list[int],
            folder_name: Optional[str] = None,
            username: str = Depends(get_current_user)
    ):
        """Import selected devices as sessions"""
        config = workspace_manager.load_netbox_config(username)

        if not config:
            raise HTTPException(status_code=404, detail="NetBox token not configured")

        client = NetBoxClient(config["api_url"], config["api_token"], verify_ssl=False)

        imported_sessions = []
        errors = []

        for device_id in device_ids:
            try:
                device = await client.get_device_by_id(device_id)
                if device:
                    # Create session from NetBox device
                    session = workspace_manager.create_session_from_netbox_device(username, device)

                    # Override folder name if provided
                    if folder_name:
                        session.folder_name = folder_name

                    # Add to workspace
                    success = workspace_manager.add_session_to_workspace(username, session)
                    if success:
                        imported_sessions.append(session.display_name)
                    else:
                        errors.append(f"Failed to save session for device {device.name}")
                else:
                    errors.append(f"Device {device_id} not found")

            except Exception as e:
                errors.append(f"Error importing device {device_id}: {str(e)}")

        return {
            "status": "success" if imported_sessions else "error",
            "imported": len(imported_sessions),
            "sessions": imported_sessions,
            "errors": errors
        }

    return router