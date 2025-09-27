#!/usr/bin/env python3
"""
routes/auth.py
Authentication and Authorization Routes with JWT Support
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Cookie
from fastapi.security import HTTPBasic
from fastapi.responses import JSONResponse
import base64
import logging

from .auth_module import AuthenticationManager, AuthMethod


from .connection_handlers import ConnectionHandlers

# Import JWT utilities
from .jwt_handler import jwt_handler
from .auth_dependencies import AuthDependencies, AuthUser

logger = logging.getLogger(__name__)


def create_auth_routes(auth_manager: AuthenticationManager, connection_handlers: ConnectionHandlers):
    """Factory function to create auth routes with JWT and session support"""

    router = APIRouter(prefix="/api/auth", tags=["authentication"])
    security = HTTPBasic()

    # Create auth dependencies for this router
    auth_deps = AuthDependencies(connection_handlers)

    def get_current_user_from_session(session: str = Cookie(None)) -> str:
        """Get current user from session cookie (legacy support)"""
        if not session:
            raise HTTPException(status_code=401, detail="Session required")

        username = connection_handlers.session_manager.get_session_user(session)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        return username

    @router.post("/login")
    async def login(request: Request):
        """Enhanced login with multiple auth methods (session-based, legacy)"""
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
                # Create session for authenticated user (backward compatibility)
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

    @router.post("/token")
    async def login_for_access_token(request: Request):
        """JWT-based login endpoint - creates JWT tokens"""
        try:
            username = ""
            password = ""
            auth_method = "local"
            domain = ""

            # Parse authentication details (same logic as /login)
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Basic "):
                try:
                    encoded = auth_header[6:]
                    decoded = base64.b64decode(encoded).decode('utf-8')
                    username, password = decoded.split(':', 1)
                except Exception as e:
                    logger.warning(f"Failed to decode Basic Auth: {e}")

            if not username:
                try:
                    body = await request.json()
                    username = body.get('username', '').strip()
                    password = body.get('password', '')
                    auth_method = body.get('auth_method', 'local')
                    domain = body.get('domain', '')
                except Exception as e:
                    logger.warning(f"Failed to parse JSON body: {e}")

            # Validate input
            if not username or not password:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Username and password required"}
                )

            # Convert string to enum
            try:
                method_enum = AuthMethod(auth_method)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Invalid auth method: {auth_method}"}
                )

            # Authenticate using the same auth manager
            auth_result = auth_manager.authenticate(
                username=username,
                password=password,
                method=method_enum,
                domain=domain
            )

            if auth_result.success:
                # Create JWT tokens
                access_token = jwt_handler.create_access_token(
                    username=auth_result.username,
                    groups=auth_result.groups
                )
                refresh_token = jwt_handler.create_refresh_token(auth_result.username)

                # Also create session for backward compatibility (WebSockets)
                session_id = connection_handlers.session_manager.create_session(auth_result.username)

                response = JSONResponse({
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "expires_in": jwt_handler.access_token_expire_minutes * 60,  # seconds
                    "username": auth_result.username,
                    "groups": auth_result.groups,
                    "auth_method": auth_method
                })

                # Set session cookie for WebSocket compatibility
                response.set_cookie(
                    key="session",
                    value=session_id,
                    httponly=True,
                    secure=False,  # Set to True in production with HTTPS
                    samesite="lax",
                    max_age=3600
                )

                logger.info(f"JWT login successful for {auth_result.username}")
                return response

            else:
                logger.warning(f"JWT authentication failed for {username}: {auth_result.error}")
                return JSONResponse(
                    status_code=401,
                    content={"error": auth_result.error or "Authentication failed"}
                )

        except Exception as e:
            logger.error(f"JWT token login error: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )

    @router.post("/refresh")
    async def refresh_token(request: Request):
        """Refresh access token using refresh token"""
        try:
            body = await request.json()
            refresh_token_str = body.get("refresh_token")

            if not refresh_token_str:
                raise HTTPException(
                    status_code=400,
                    detail="refresh_token is required"
                )

            # Verify refresh token and create new tokens
            new_access_token, new_refresh_token = jwt_handler.refresh_access_token(refresh_token_str)

            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer",
                "expires_in": jwt_handler.access_token_expire_minutes * 60
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise HTTPException(
                status_code=500,
                detail="Token refresh failed"
            )

    @router.get("/verify")
    async def verify_token(current_user: AuthUser = Depends(auth_deps.get_current_user_jwt_with_info)):
        """Verify JWT token (useful for frontend token validation)"""
        return {
            "valid": True,
            "username": current_user.username,
            "groups": current_user.groups,
            "auth_method": current_user.auth_method,
            "message": "Token is valid"
        }

    @router.get("/me")
    async def get_current_user_info(current_user: AuthUser = Depends(auth_deps.get_current_user_with_info)):
        """Get current user information (supports both JWT and session auth)"""
        return {
            "username": current_user.username,
            "groups": current_user.groups,
            "auth_method": current_user.auth_method,
            "authenticated": True
        }

    @router.get("/methods")
    async def get_auth_methods():
        """Get available authentication methods"""
        try:
            available_methods = auth_manager.get_available_methods()
            auth_info = auth_manager.get_auth_info()

            return {
                "available_methods": [method.value for method in available_methods],
                "default_method": "local",
                "system_info": auth_info,
                "requires_domain": auth_info.get('system') == 'Windows',
                "jwt_enabled": True,
                "supported_auth_types": ["session", "jwt", "basic"]
            }
        except Exception as e:
            logger.error(f"Error getting auth methods: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to get authentication methods"}
            )

    @router.get("/status")
    async def auth_status(current_user: AuthUser = Depends(auth_deps.get_current_user_with_info)):
        """Get current authentication status (supports both JWT and session)"""
        return {
            "authenticated": True,
            "username": current_user.username,
            "auth_method": current_user.auth_method,
            "groups": current_user.groups
        }

    @router.post("/logout")
    async def logout(
            current_user: AuthUser = Depends(auth_deps.get_current_user_with_info),
            session: str = Cookie(None)
    ):
        """Logout and invalidate session (JWT tokens are stateless)"""
        if current_user.auth_method == "session" and session:
            connection_handlers.session_manager.invalidate_session(session)

        response = JSONResponse({
            "status": "success",
            "message": "Logged out",
            "note": "JWT tokens remain valid until expiration" if current_user.auth_method == "jwt" else None
        })

        # Clear session cookie
        response.delete_cookie("session")
        return response

    @router.get("/config")
    async def get_auth_config():
        """Get authentication configuration (non-sensitive)"""
        config = {
            "methods": [method.value for method in auth_manager.get_available_methods()],
            "default_method": "local",
            "system": auth_manager.get_auth_info(),
            "jwt_enabled": True,
            "jwt_access_token_expire_minutes": jwt_handler.access_token_expire_minutes,
            "jwt_refresh_token_expire_days": jwt_handler.refresh_token_expire_days
        }

        # Add LDAP server info if configured (no credentials)
        auth_config = getattr(auth_manager, 'config', {})
        if 'ldap' in auth_config:
            config['ldap_server'] = auth_config['ldap'].get('server', 'Not configured')

        return config

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