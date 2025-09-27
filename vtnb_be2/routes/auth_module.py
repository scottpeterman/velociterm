#!/usr/bin/env python3
"""
Enhanced Authentication Module for VelociTerm NB
Supports local OS authentication and LDAP with conditional imports
"""

import logging
import platform
import os
from typing import Optional, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class AuthMethod(Enum):
    LOCAL = "local"
    LDAP = "ldap"


class AuthResult:
    def __init__(self, success: bool, username: str = None, error: str = None, groups: list = None):
        self.success = success
        self.username = username
        self.error = error
        self.groups = groups or []


class LocalAuthenticator:
    """Local OS authentication with conditional imports"""

    def __init__(self):
        self.system = platform.system().lower()
        self._init_auth_modules()

    def _init_auth_modules(self):
        """Initialize OS-specific authentication modules"""
        self.win32_available = False
        self.pam_available = False

        if self.system == "windows":
            try:
                import win32security
                import win32con
                import win32api
                self.win32security = win32security
                self.win32con = win32con
                self.win32api = win32api
                self.win32_available = True
                logger.info("Windows authentication module loaded")
            except ImportError:
                logger.warning("Windows authentication modules not available (install pywin32)")

        elif self.system in ["linux", "darwin"]:  # darwin = macOS
            try:
                import pam
                self.pam = pam
                self.pam_available = True
                logger.info(f"{self.system.title()} PAM authentication module loaded")
            except ImportError:
                logger.warning("PAM module not available (install python-pam)")

    def authenticate(self, username: str, password: str, domain: str = None) -> AuthResult:
        """Authenticate against local OS"""

        if self.system == "windows" and self.win32_available:
            return self._authenticate_windows(username, password, domain)
        elif self.system in ["linux", "darwin"] and self.pam_available:
            return self._authenticate_unix(username, password)
        else:
            return AuthResult(
                success=False,
                error=f"Local authentication not available on {self.system}"
            )

    def _authenticate_windows(self, username: str, password: str, domain: str = None) -> AuthResult:
        """Windows authentication using win32security"""
        try:
            # Use current computer name as domain if none provided
            if not domain:
                domain = self.win32api.GetComputerName()

            logger.debug(f"Attempting Windows auth for {domain}@{username}")  # Changed \ to @

            # Attempt logon
            handle = self.win32security.LogonUser(
                username,
                domain,
                password,
                self.win32con.LOGON32_LOGON_NETWORK,
                self.win32con.LOGON32_PROVIDER_DEFAULT
            )

            # Get user groups (optional)
            groups = []
            try:
                # This is more complex - simplified for now
                groups = ["Users"]  # Default group
            except Exception as group_error:
                logger.debug(f"Could not get groups: {group_error}")
                groups = ["Users"]

            # Close handle - FIXED: use win32api, not win32security
            self.win32api.CloseHandle(handle)

            logger.info(f"Windows authentication successful for {domain}@{username}")  # Changed \ to @
            return AuthResult(
                success=True,
                username=f"{domain}@{username}",  # Changed \ to @ for filesystem safety
                groups=groups
            )

        except self.win32security.error as e:
            # Specific win32 error
            error_code = e.winerror if hasattr(e, 'winerror') else 'unknown'
            logger.warning(f"Windows authentication failed for {username}: {e} (code: {error_code})")
            return AuthResult(
                success=False,
                error="Invalid username or password"
            )
        except Exception as e:
            logger.error(f"Windows authentication error for {username}: {e}")
            return AuthResult(
                success=False,
                error=f"Authentication system error: {e}"
            )
    def _authenticate_unix(self, username: str, password: str) -> AuthResult:
        """Unix/Linux/macOS authentication using PAM"""
        try:
            p = self.pam.pam()
            success = p.authenticate(username, password)

            if success:
                # Get user groups (optional)
                groups = []
                try:
                    import grp
                    import pwd
                    user_info = pwd.getpwnam(username)
                    groups = [g.gr_name for g in grp.getgrall() if username in g.gr_mem]
                    # Add primary group
                    primary_group = grp.getgrgid(user_info.pw_gid)
                    if primary_group.gr_name not in groups:
                        groups.append(primary_group.gr_name)
                except Exception:
                    groups = ["users"]  # Default group

                logger.info(f"Unix authentication successful for {username}")
                return AuthResult(
                    success=True,
                    username=username,
                    groups=groups
                )
            else:
                logger.warning(f"Unix authentication failed for {username}")
                return AuthResult(
                    success=False,
                    error="Invalid username or password"
                )

        except Exception as e:
            logger.error(f"Unix authentication error for {username}: {e}")
            return AuthResult(
                success=False,
                error="Authentication system error"
            )


class LDAPAuthenticator:
    """LDAP authentication using ldap3"""

    def __init__(self, config: Dict[str, Any]):
        self.ldap_available = False
        self.config = config

        try:
            import ldap3
            self.ldap3 = ldap3
            self.ldap_available = True
            logger.info("LDAP authentication module loaded")
        except ImportError:
            logger.warning("LDAP module not available (install ldap3)")

    def authenticate(self, username: str, password: str) -> AuthResult:
        """Authenticate against LDAP server"""

        if not self.ldap_available:
            return AuthResult(
                success=False,
                error="LDAP authentication not available"
            )

        try:
            # Build user DN
            user_dn = self._build_user_dn(username)

            # Create server object
            server = self.ldap3.Server(
                self.config['server'],
                port=self.config.get('port', 389),
                use_ssl=self.config.get('use_ssl', False),
                get_info=self.ldap3.ALL
            )

            # Attempt bind (authentication)
            conn = self.ldap3.Connection(
                server,
                user=user_dn,
                password=password,
                authentication=self.ldap3.SIMPLE,
                auto_bind=True
            )

            # Get user groups (optional)
            groups = []
            if self.config.get('search_groups', False):
                groups = self._get_user_groups(conn, username)

            conn.unbind()

            logger.info(f"LDAP authentication successful for {username}")
            return AuthResult(
                success=True,
                username=username,
                groups=groups
            )

        except Exception as e:
            logger.warning(f"LDAP authentication failed for {username}: {e}")
            return AuthResult(
                success=False,
                error="Invalid username or password"
            )

    def _build_user_dn(self, username: str) -> str:
        """Build user DN from username and config"""
        user_dn_template = self.config.get('user_dn_template', 'uid={username},ou=users,{base_dn}')
        return user_dn_template.format(
            username=username,
            base_dn=self.config.get('base_dn', '')
        )

    def _get_user_groups(self, conn, username: str) -> list:
        """Get user groups from LDAP"""
        try:
            search_base = self.config.get('group_base_dn', self.config.get('base_dn', ''))
            search_filter = f"(&(objectClass=group)(member=*{username}*))"

            conn.search(
                search_base=search_base,
                search_filter=search_filter,
                attributes=['cn']
            )

            groups = []
            for entry in conn.entries:
                groups.append(str(entry.cn))

            return groups

        except Exception as e:
            logger.warning(f"Failed to get groups for {username}: {e}")
            return []


class AuthenticationManager:
    """Unified authentication manager"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.local_auth = LocalAuthenticator()

        # Initialize LDAP if configured
        self.ldap_auth = None
        if 'ldap' in self.config:
            self.ldap_auth = LDAPAuthenticator(self.config['ldap'])

    def authenticate(self, username: str, password: str, method: AuthMethod, **kwargs) -> AuthResult:
        """Authenticate user with specified method"""

        if method == AuthMethod.LOCAL:
            domain = kwargs.get('domain')
            return self.local_auth.authenticate(username, password, domain)

        elif method == AuthMethod.LDAP:
            if not self.ldap_auth:
                return AuthResult(
                    success=False,
                    error="LDAP authentication not configured"
                )
            return self.ldap_auth.authenticate(username, password)

        else:
            return AuthResult(
                success=False,
                error=f"Unknown authentication method: {method}"
            )

    def get_available_methods(self) -> list:
        """Get list of available authentication methods"""
        methods = []

        # Check local auth availability
        if self.local_auth.win32_available or self.local_auth.pam_available:
            methods.append(AuthMethod.LOCAL)

        # Check LDAP availability
        if self.ldap_auth and self.ldap_auth.ldap_available:
            methods.append(AuthMethod.LDAP)

        return methods

    def get_auth_info(self) -> Dict[str, Any]:
        """Get authentication system information"""
        return {
            "system": platform.system(),
            "available_methods": [method.value for method in self.get_available_methods()],
            "local_auth": {
                "windows_available": getattr(self.local_auth, 'win32_available', False),
                "pam_available": getattr(self.local_auth, 'pam_available', False)
            },
            "ldap_configured": self.ldap_auth is not None,
            "ldap_available": getattr(self.ldap_auth, 'ldap_available', False) if self.ldap_auth else False
        }


# Example configuration
EXAMPLE_CONFIG = {
    "ldap": {
        "server": "ldap.company.com",
        "port": 389,
        "use_ssl": False,
        "base_dn": "dc=company,dc=com",
        "user_dn_template": "uid={username},ou=users,dc=company,dc=com",
        "search_groups": True,
        "group_base_dn": "ou=groups,dc=company,dc=com"
    }
}

# Usage example:
if __name__ == "__main__":
    # Initialize auth manager
    auth_mgr = AuthenticationManager()

    # Show available methods
    print("Available authentication methods:", auth_mgr.get_available_methods())
    print("Auth system info:", auth_mgr.get_auth_info())

    # Test local authentication
    result = auth_mgr.authenticate("speterman", "letme1n", AuthMethod.LOCAL)
    print(f"Local auth result: {result.success}, error: {result.error}")