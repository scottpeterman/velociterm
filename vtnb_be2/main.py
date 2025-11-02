#!/usr/bin/env python3
"""
VelociTerm Backend - JWT-Enhanced Main Application
Clean separation of concerns with JWT and session authentication
"""
import asyncio
import logging
import time
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Cookie, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.websockets import WebSocketState
from starlette.middleware.base import BaseHTTPMiddleware

# Import models and managers
from routes.auth_module import AuthenticationManager
from workspace_manager import WorkspaceManager
from routes.connection_handlers import ConnectionHandlers

# Import JWT utilities
from routes.auth_dependencies import AuthDependencies

# Import route modules
from routes.auth import create_auth_routes
from routes.sessions import create_sessions_routes
from routes.netbox import create_netbox_routes
from routes.system import create_system_routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VelociTermBackend:
    """JWT-enhanced VelociTerm backend with dual authentication support"""

    # Updated main.py - Config-driven CORS setup

    def load_auth_config(self, config_path: str) -> dict:
        """Load configuration from file"""
        import yaml
        config_file = Path(config_path)
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = yaml.safe_load(f)
                return config
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")

        # Default configuration
        return {
            "authentication": {
                "default_method": "local",
                "poc_mode": False
            },
            "cors": {
                "mode": "dynamic",
                "allow_credentials": True,
                "dynamic": {
                    "allow_localhost": True,
                    "allow_same_host": True,
                    "additional_hosts": []
                }
            },
            "ldap": {
                "server": "ldap.company.com",
                "port": 389,
                "use_ssl": False,
                "base_dn": "dc=company,dc=com",
                "user_dn_template": "uid={username},ou=users,dc=company,dc=com"
            }
        }

    def setup_middleware(self):
        """Setup CORS - dead simple version"""

        # Load CORS config
        cors_config = self.auth_config.get('cors', {})
        allowed_origins = cors_config.get('allowed_origins', [])

        # If no origins specified, allow common development origins
        if not allowed_origins:
            allowed_origins = [
                "http://localhost:3000",
                "http://localhost:8050",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:8050",
                "http://10.0.0.108:3000",  # React frontend
                "http://10.0.0.108:8080"
            ]

        logger.info(f"CORS allowed origins: {allowed_origins}")

        # Use FastAPI's built-in CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    def __init__(self, config_path: str = "config.yaml"):
        self.app = FastAPI(
            title="VelociTerm Backend API",
            description="Production-ready JWT and session-authenticated backend for VelociTerm",
            version="0.5.0"
        )

        # Initialize core managers
        self.workspace_manager = WorkspaceManager()
        self.connection_handlers = ConnectionHandlers(self.workspace_manager)

        # Load configuration (now includes CORS, auth, etc.)
        self.auth_config = self.load_auth_config(config_path)

        # Initialize auth manager with auth section of config
        auth_section = self.auth_config.get('authentication', {})
        auth_section['ldap'] = self.auth_config.get('ldap', {})
        self.auth_manager = AuthenticationManager(auth_section)

        # Initialize auth dependencies with JWT support
        self.auth_deps = AuthDependencies(self.connection_handlers)

        # Setup application
        self.setup_middleware()  # Now reads from config!
        self.setup_route_modules()
        self.setup_websocket_routes()
        self.setup_window_management()
        self.setup_static_files()



    def setup_route_modules(self):
        """Setup modular route handlers with dual authentication support"""

        # Use flexible authentication that supports both JWT and sessions
        get_current_user_flexible = self.auth_deps.get_current_user_flexible

        # For new endpoints that specifically need JWT, use JWT-only auth
        get_current_user_jwt_only = self.auth_deps.get_current_user_jwt_only

        # Create and include route modules
        auth_router = create_auth_routes(self.auth_manager, self.connection_handlers)

        # Use flexible auth for existing routes (maintains compatibility)
        sessions_router = create_sessions_routes(self.workspace_manager, get_current_user_flexible)
        netbox_router = create_netbox_routes(self.workspace_manager, get_current_user_flexible)
        system_router = create_system_routes(self.workspace_manager, get_current_user_flexible)

        # Include routers in the main app
        self.app.include_router(auth_router)
        self.app.include_router(sessions_router)
        self.app.include_router(netbox_router)
        self.app.include_router(system_router)

    def setup_window_management(self):
        """Setup window management routes (session-based for WebSocket compatibility)"""

        # Use session-based auth for window management (WebSocket compatibility)
        def get_current_user_from_session(session: str = Cookie(None)) -> str:
            if not session:
                raise HTTPException(status_code=401, detail="Session required")
            username = self.connection_handlers.session_manager.get_session_user(session)
            if not username:
                raise HTTPException(status_code=401, detail="Invalid or expired session")
            return username

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

    def setup_websocket_routes(self):
        """Setup WebSocket routes for terminals (session-based authentication)"""

        @self.app.websocket("/ws/terminal/{window_id}")
        async def websocket_terminal(websocket: WebSocket, window_id: str):
            """WebSocket handler for SSH terminals (session-based auth)"""
            logger.info(f"WebSocket connection attempt for window {window_id}")

            try:
                await websocket.accept()
                logger.info(f"WebSocket accepted for {window_id}")

                # Initialize SSH manager
                await self.connection_handlers.ssh_manager.create_client(window_id)

                # Start output listener
                listen_task = asyncio.create_task(
                    self.connection_handlers.ssh_manager.listen_to_ssh_output(window_id, websocket)
                )

                # Send initial status
                await websocket.send_json({
                    'type': 'status',
                    'message': 'WebSocket connected successfully'
                })

                # Main message loop
                while True:
                    try:
                        data = await websocket.receive_json()

                        if data.get('type') == 'connect':
                            ssh_username = data.get('username')  # SSH device username
                            velociterm_user = data.get('velociterm_user')  # VelociTerm workspace user

                            logger.info(f"=== SSH Connection Request ===")
                            logger.info(f"VelociTerm user: {velociterm_user}")
                            logger.info(f"SSH device user: {ssh_username}")

                            # NEW: Get SSH key file path instead of loading bytes
                            ssh_key_path = None
                            if velociterm_user:
                                from pathlib import Path
                                key_dir = Path("./workspaces") / velociterm_user / "ssh_key"

                                logger.info(f"Looking for SSH key in: {key_dir}")

                                # Try common key files in order
                                for key_filename in ["id_rsa", "id_ed25519", "id_ecdsa"]:
                                    key_path = key_dir / key_filename
                                    if key_path.exists():
                                        ssh_key_path = str(key_path)
                                        logger.info(f"✓ Found SSH key: {ssh_key_path}")
                                        break

                                if not ssh_key_path:
                                    logger.info(f"No SSH key found in {key_dir}")
                            else:
                                logger.warning("No VelociTerm user provided - cannot locate SSH key")

                            await self.connection_handlers.ssh_manager.connect(
                                window_id,
                                data.get('hostname'),
                                data.get('port', 22),
                                ssh_username,  # SSH device username
                                data.get('password'),
                                websocket,
                                ssh_key_path=ssh_key_path  # Pass PATH instead of bytes
                            )

                        elif data.get('type') == 'input':
                            await self.connection_handlers.ssh_manager.send_input(
                                window_id, data.get('data', '')
                            )

                        elif data.get('type') == 'resize':
                            await self.connection_handlers.ssh_manager.resize_terminal(
                                window_id, data.get('cols', 80), data.get('rows', 24)
                            )

                    except WebSocketDisconnect:
                        logger.info(f"WebSocket disconnected for {window_id}")
                        break
                    except Exception as msg_error:
                        logger.error(f"WebSocket message error: {msg_error}")
                        break

            except Exception as connection_error:
                logger.error(f"WebSocket connection failed for {window_id}: {connection_error}")

                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json({
                            'type': 'error',
                            'message': f'Connection failed: {str(connection_error)}'
                        })
                        await websocket.close()
                except:
                    pass

            finally:
                # Cleanup
                try:
                    if 'listen_task' in locals():
                        listen_task.cancel()
                        try:
                            await listen_task
                        except asyncio.CancelledError:
                            pass
                    await self.connection_handlers.ssh_manager.disconnect(window_id)
                except:
                    pass
    def setup_static_files(self):
        """Setup static file serving for React build"""
        static_dir = Path("static")

        if not static_dir.exists():
            logger.warning(f"Static directory '{static_dir}' not found.")
            return

        # Mount static assets
        if (static_dir / "static").exists():
            self.app.mount("/static", StaticFiles(directory=str(static_dir / "static")), name="static")
        else:
            self.app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

        # Serve manifest and favicon
        @self.app.get("/manifest.json")
        async def get_manifest():
            manifest_path = static_dir / "manifest.json"
            if manifest_path.exists():
                return FileResponse(manifest_path, media_type="application/json")
            raise HTTPException(status_code=404, detail="Manifest not found")

        @self.app.get("/favicon.ico")
        async def get_favicon():
            favicon_path = static_dir / "favicon.ico"
            if favicon_path.exists():
                return FileResponse(favicon_path, media_type="image/x-icon")
            raise HTTPException(status_code=404, detail="Favicon not found")

        # Serve React app for client-side routing
        @self.app.get("/{catchall:path}")
        async def serve_react_app(catchall: str):
            if catchall.startswith(("api/", "ws/", "static/")):
                raise HTTPException(status_code=404)

            index_path = static_dir / "index.html"
            if index_path.exists():
                return FileResponse(index_path, media_type="text/html")
            else:
                raise HTTPException(status_code=404, detail="React app not built")

        # Development info
        @self.app.get("/")
        async def dev_info():
            """Development info page"""
            return {
                "message": "VelociTerm Backend API v0.5.0",
                "authentication": "JWT + Session dual authentication",
                "architecture": "modular route handlers",
                "status": "JWT-enhanced",
                "features": [
                    "JWT token authentication for REST APIs",
                    "Session authentication for WebSocket connections",
                    "Dual authentication support during transition",
                    "Refresh token support",
                    "Windows/LDAP authentication backends"
                ],
                "endpoints": {
                    "jwt_login": "/api/auth/token",
                    "jwt_refresh": "/api/auth/refresh",
                    "jwt_verify": "/api/auth/verify",
                    "session_login": "/api/auth/login",
                    "user_info": "/api/auth/me",
                    "sessions": "/api/sessions/*",
                    "netbox": "/api/netbox/*",
                    "system": "/api/system/*",
                    "websockets": "/ws/terminal/{window_id}"
                }
            }


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request logging with JWT token info"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log authentication method for debugging
        auth_method = "none"
        if "Authorization" in request.headers:
            auth_method = "jwt"
        elif "session" in request.cookies:
            auth_method = "session"

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            if not request.url.path.startswith("/ws/"):
                logger.debug(
                    f"{request.method} {request.url.path} [{auth_method}] - {response.status_code} - {process_time:.4f}s")

            return response

        except Exception as e:
            logger.error(f"Request processing failed: {e}")
            raise


def create_app() -> FastAPI:
    """Factory function to create FastAPI app"""
    backend = VelociTermBackend()
    return backend.app


# Create app instance
app = create_app()


def run_server():
    """Run the backend server"""
    print("Starting VelociTerm Backend v0.5.0...")
    print("Authentication: JWT + Session dual support")
    print("Backend API: http://localhost:8050")
    print("API Documentation: http://localhost:8050/docs")
    print("Health Check: http://localhost:8050/api/health")
    print("")
    print("JWT Endpoints:")
    print("  Token Login:  POST /api/auth/token")
    print("  Refresh:      POST /api/auth/refresh")
    print("  Verify:       GET /api/auth/verify")
    print("  User Info:    GET /api/auth/me")
    print("")
    print("Session Endpoints (backward compatibility):")
    print("  Session Login: POST /api/auth/login")
    print("  Auth Status:   GET /api/auth/status")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8050,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    run_server()