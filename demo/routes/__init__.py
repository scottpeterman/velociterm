# routes/__init__.py
"""
VelociTerm Backend Routes Package
"""

# routes/auth.py
"""
Authentication and Authorization Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import JSONResponse
from datetime import datetime
import base64
import logging

from .auth_module import AuthenticationManager, AuthMethod
from .connection_handlers import ConnectionHandlers

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["authentication"])


def create_auth_routes(auth_manager: AuthenticationManager, connection_handlers: ConnectionHandlers):
    """Factory function to create auth routes with dependencies"""

    security = HTTPBasic()

    def get_current_user_from_session(session: str = Cookie(None)) -> str:
        """Get current user from session cookie"""
        if not session:
            raise HTTPException(status_code=401, detail="Session required")

        username = connection_handlers.session_manager.get_session_user(session)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        return username

    @router.post("/login")
    async def login(request: Request):
        """Enhanced login with multiple auth methods"""
        try:
            username = ""
            password = ""
            auth_method = "local"
            domain = ""

            # Check if Basic Auth is provided
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Basic "):
                try:
                    encoded = auth_header[6:]
                    decoded = base64.b64decode(encoded).decode('utf-8')
                    username, password = decoded.split(':', 1)
                    logger.info(f"Using Basic Auth for user: {username}")
                except Exception as e:
                    logger.warning(f"Failed to decode Basic Auth: {e}")

            # If no Basic Auth, try JSON body
            if not username:
                try:
                    body = await request.json()
                    username = body.get('username', '').strip()
                    password = body.get('password', '')
                    auth_method = body.get('auth_method', 'local')
                    domain = body.get('domain', '')
                    logger.info(f"Using JSON auth for user: {username}")
                except Exception as e:
                    logger.warning(f"Failed to parse JSON body: {e}")

            # Validate input
            if not username or not password:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": "Username and password required"}
                )

            # Convert string to enum
            try:
                method_enum = AuthMethod(auth_method)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": f"Invalid auth method: {auth_method}"}
                )

            # Authenticate
            auth_result = auth_manager.authenticate(
                username=username,
                password=password,
                method=method_enum,
                domain=domain
            )

            if auth_result.success:
                # Create session for authenticated user
                session_id = connection_handlers.session_manager.create_session(auth_result.username)

                response = JSONResponse({
                    "status": "success",
                    "username": auth_result.username,
                    "groups": auth_result.groups,
                    "auth_method": auth_method,
                    "session_id": session_id[:8] + "..." if session_id else None
                })

                response.set_cookie(
                    key="session",
                    value=session_id,
                    httponly=True,
                    secure=False,
                    samesite="lax",
                    max_age=3600
                )

                logger.info(f"User {auth_result.username} authenticated via {auth_method}")
                return response
            else:
                logger.warning(f"Authentication failed for {username} via {auth_method}: {auth_result.error}")
                return JSONResponse(
                    status_code=401,
                    content={
                        "status": "error",
                        "message": auth_result.error or "Authentication failed"
                    }
                )

        except Exception as e:
            logger.error(f"Login error: {e}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Internal server error"}
            )

    @router.get("/methods")
    async def get_auth_methods():
        """Get available authentication methods"""
        try:
            available_methods = auth_manager.get_available_methods()
            auth_info = auth_manager.get_auth_info()

            return {
                "available_methods": [method.value for method in available_methods],
                "default_method": "local",  # TODO: Get from config
                "system_info": auth_info,
                "requires_domain": auth_info.get('system') == 'Windows'
            }
        except Exception as e:
            logger.error(f"Error getting auth methods: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to get authentication methods"}
            )

    @router.get("/status")
    async def auth_status(username: str = Depends(get_current_user_from_session)):
        """Get current authentication status"""
        return {
            "authenticated": True,
            "username": username,
            "auth_method": "session"
        }

    @router.post("/logout")
    async def logout(session: str = Cookie(None)):
        """Logout and invalidate session"""
        if session:
            connection_handlers.session_manager.invalidate_session(session)

        response = JSONResponse({"status": "success", "message": "Logged out"})
        response.delete_cookie("session")
        return response

    # POC fallback - remove in production
    @router.post("/poc-login")
    async def poc_login(request: Request):
        """POC fallback login - remove in production"""
        try:
            body = await request.json()
            username = body.get('username', '').strip()

            if not username:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": "Username required"}
                )

            # Create session (POC mode accepts any credentials)
            session_id = connection_handlers.session_manager.create_session(username)

            response = JSONResponse({
                "status": "success",
                "username": username,
                "auth_method": "poc",
                "message": "POC mode - any credentials accepted",
                "session_id": session_id[:8] + "..." if session_id else None
            })

            response.set_cookie(
                key="session",
                value=session_id,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=3600
            )

            logger.info(f"POC login for {username}")
            return response

        except Exception as e:
            logger.error(f"POC login error: {e}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Internal server error"}
            )

    return router