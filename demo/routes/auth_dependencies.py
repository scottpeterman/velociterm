#!/usr/bin/env python3
"""
utils/auth_dependencies.py
Enhanced authentication dependencies supporting both session and JWT
"""

from fastapi import Depends, HTTPException, status, Cookie, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import logging

from .jwt_handler import jwt_handler
from .connection_handlers import ConnectionHandlers

logger = logging.getLogger(__name__)

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer(auto_error=False)


class AuthUser:
    """User information from authentication"""

    def __init__(self, username: str, auth_method: str, groups: list = None, extra_data: dict = None):
        self.username = username
        self.auth_method = auth_method  # "jwt", "session", "api_key"
        self.groups = groups or []
        self.extra_data = extra_data or {}


class AuthDependencies:
    """Unified authentication dependencies supporting multiple methods"""

    def __init__(self, connection_handlers: ConnectionHandlers):
        self.connection_handlers = connection_handlers

    async def get_current_user_flexible(
            self,
            authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
            session: Optional[str] = Cookie(None),
            x_api_key: Optional[str] = Header(None, alias="X-API-Key")
    ) -> str:
        """
        Flexible authentication supporting multiple methods:
        1. JWT Bearer token (Authorization header) - PREFERRED
        2. Session cookie (backward compatibility)
        3. API key header (for integrations)

        Returns username for backward compatibility with existing code
        """
        auth_user = await self._authenticate_user(authorization, session, x_api_key)
        return auth_user.username

    async def get_current_user_with_info(
            self,
            authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
            session: Optional[str] = Cookie(None),
            x_api_key: Optional[str] = Header(None, alias="X-API-Key")
    ) -> AuthUser:
        """
        Same as flexible auth but returns full user information
        Useful for new endpoints that need auth method details
        """
        return await self._authenticate_user(authorization, session, x_api_key)

    async def get_current_user_jwt_only(
            self,
            authorization: HTTPAuthorizationCredentials = Depends(security)
    ) -> str:
        """
        Strict JWT-only authentication (for new endpoints requiring JWT)
        Returns username for compatibility
        """
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt_handler.verify_token(authorization.credentials, "access")
            username = payload["sub"]
            logger.debug(f"JWT-only authentication successful for {username}")
            return username

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"JWT-only authentication failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    async def get_current_user_jwt_with_info(
            self,
            authorization: HTTPAuthorizationCredentials = Depends(security)
    ) -> AuthUser:
        """
        Strict JWT-only authentication returning full user info
        """
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt_handler.verify_token(authorization.credentials, "access")
            return AuthUser(
                username=payload["sub"],
                auth_method="jwt",
                groups=payload.get("groups", []),
                extra_data={"token_payload": payload}
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"JWT-only authentication failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    async def _authenticate_user(
            self,
            authorization: Optional[HTTPAuthorizationCredentials],
            session: Optional[str],
            x_api_key: Optional[str]
    ) -> AuthUser:
        """Internal method to handle multi-method authentication"""

        # Method 1: JWT Bearer token (PREFERRED)
        if authorization and authorization.credentials:
            try:
                payload = jwt_handler.verify_token(authorization.credentials, "access")
                username = payload["sub"]
                logger.debug(f"Authenticated user {username} via JWT")

                return AuthUser(
                    username=username,
                    auth_method="jwt",
                    groups=payload.get("groups", []),
                    extra_data={"token_payload": payload}
                )

            except HTTPException as e:
                logger.debug(f"JWT authentication failed: {e.detail}")
                # Don't raise here, try next method
            except Exception as e:
                logger.warning(f"JWT authentication error: {e}")
                # Don't raise here, try next method

        # Method 2: Session cookie (backward compatibility)
        if session:
            try:
                username = self.connection_handlers.session_manager.get_session_user(session)
                if username:
                    logger.debug(f"Authenticated user {username} via session cookie")

                    return AuthUser(
                        username=username,
                        auth_method="session",
                        groups=[],  # Sessions don't store group info
                        extra_data={"session_id": session}
                    )

            except Exception as e:
                logger.debug(f"Session authentication failed: {e}")
                # Don't raise here, try next method

        # Method 3: API key (for integrations - implement as needed)
        if x_api_key:
            try:
                # TODO: Implement API key validation
                # For now, just log and skip
                logger.debug("API key authentication not yet implemented")

                # Example implementation:
                # if self._validate_api_key(x_api_key):
                #     return AuthUser(
                #         username="api_user",
                #         auth_method="api_key",
                #         groups=["api_users"],
                #         extra_data={"api_key_id": "..."}
                #     )

            except Exception as e:
                logger.debug(f"API key authentication error: {e}")

        # If all methods fail
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Provide JWT token or valid session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    def _validate_api_key(self, api_key: str) -> bool:
        """
        Validate API key (implement as needed)

        Example implementation:
        - Check against database of valid API keys
        - Verify key format and signature
        - Check key permissions and expiration
        """
        # TODO: Implement actual API key validation
        return False


# Convenience functions for backward compatibility
def create_auth_dependencies(connection_handlers: ConnectionHandlers) -> AuthDependencies:
    """Factory function to create auth dependencies"""
    return AuthDependencies(connection_handlers)


# Type hints for dependency injection
FlexibleAuth = AuthDependencies.get_current_user_flexible
JWTOnlyAuth = AuthDependencies.get_current_user_jwt_only
FlexibleAuthWithInfo = AuthDependencies.get_current_user_with_info
JWTOnlyAuthWithInfo = AuthDependencies.get_current_user_jwt_with_info