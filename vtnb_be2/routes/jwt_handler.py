#!/usr/bin/env python3
"""
utils/jwt_handler.py
JWT token management with refresh support
"""

import jwt
import secrets
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


class JWTHandler:
    """JWT token management with refresh support"""

    def __init__(self, secret_key: Optional[str] = None, algorithm: str = "HS256"):
        # In production, get from environment variable
        self.secret_key = secret_key or os.getenv("JWT_SECRET_KEY") or self._generate_secret()
        self.algorithm = algorithm
        self.access_token_expire_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "2880"))
        self.refresh_token_expire_days = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

        # Log warning if using generated secret (development only)
        if not os.getenv("JWT_SECRET_KEY"):
            logger.warning("Using generated JWT secret key. Set JWT_SECRET_KEY environment variable for production.")

    def _generate_secret(self) -> str:
        """Generate a random secret key for development"""
        return secrets.token_urlsafe(32)

    def create_access_token(self, username: str, groups: list = None, extra_claims: dict = None) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)

        payload = {
            "sub": username,  # Subject (username)
            "exp": expire,  # Expiration time
            "iat": datetime.utcnow(),  # Issued at
            "type": "access",
            "groups": groups or []
        }

        # Add any extra claims (useful for permissions, etc.)
        if extra_claims:
            payload.update(extra_claims)

        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, username: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)

        payload = {
            "sub": username,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
            "jti": secrets.token_urlsafe(16)  # JWT ID for token revocation
        }

        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def refresh_access_token(self, refresh_token: str) -> tuple[str, str]:
        """Create new access token from refresh token, return (access_token, new_refresh_token)"""
        try:
            payload = self.verify_token(refresh_token, "refresh")
            username = payload["sub"]

            # Create new access token
            new_access_token = self.create_access_token(username, [])

            # Create new refresh token (optional - for enhanced security)
            new_refresh_token = self.create_refresh_token(username)

            return new_access_token, new_refresh_token

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token refresh failed",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def get_token_expiry_info(self, token: str) -> Dict[str, Any]:
        """Get token expiration information without validating"""
        try:
            # Decode without verification to get expiry info
            payload = jwt.decode(token, options={"verify_signature": False})
            exp = payload.get("exp")
            iat = payload.get("iat")

            if exp:
                exp_datetime = datetime.fromtimestamp(exp)
                time_remaining = exp_datetime - datetime.utcnow()

                return {
                    "expires_at": exp_datetime.isoformat(),
                    "issued_at": datetime.fromtimestamp(iat).isoformat() if iat else None,
                    "time_remaining_seconds": int(time_remaining.total_seconds()),
                    "is_expired": time_remaining.total_seconds() <= 0
                }

            return {"error": "No expiration information found"}

        except Exception as e:
            return {"error": f"Could not decode token: {str(e)}"}


# Global JWT handler instance
jwt_handler = JWTHandler()