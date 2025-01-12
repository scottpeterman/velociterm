# velociterm/helpers/config.py
from pydantic import Field, BaseModel
from pydantic_settings import BaseSettings
from typing import Optional, List, Set
from pathlib import Path
import yaml
import os


class LDAPConfig(BaseModel):
    enabled: bool = False
    server: str = Field("ldap://localhost", description="LDAP server URI")
    base_dn: str = Field("dc=example,dc=com", description="Base DN for LDAP searches")
    user_dn_template: str = Field("uid={username},ou=users,dc=example,dc=com")
    search_base: str = Field("ou=users,dc=example,dc=com")
    search_filter: str = Field("(uid={username})")

    # Group requirements
    required_groups: List[str] = Field(default=[],
                                       description="List of groups user must be member of")

    # User whitelist
    allowed_users: Set[str] = Field(default_factory=set,
                                    description="Set of explicitly allowed usernames")

    # Certificate settings
    ca_cert_path: Optional[Path] = Field(None,
                                         description="Path to CA certificate for LDAP TLS")
    client_cert_path: Optional[Path] = Field(None,
                                             description="Path to client certificate")
    client_key_path: Optional[Path] = Field(None,
                                            description="Path to client key")

    # Service account
    bind_dn: Optional[str] = None
    bind_password: Optional[str] = None


class NetBoxConfig(BaseModel):
    enabled: bool = Field(False, description="Enable NetBox integration")
    host: str = Field("http://localhost:8000", description="NetBox server URL")
    token: str = Field("", description="NetBox API token")
    verify_ssl: bool = Field(False, description="Verify SSL certificates")
    timeout: int = Field(30, description="API request timeout in seconds")
    retries: int = Field(3, description="Number of retries for failed requests")

class ServerConfig(BaseModel):
    host: str = Field("127.0.0.1", description="Host to bind to")
    port: int = Field(8000, description="Port to listen on")
    workers: int = Field(4, description="Number of worker processes")

    # SSL/TLS Configuration
    ssl_enabled: bool = False
    ssl_cert_path: Optional[Path] = None
    ssl_key_path: Optional[Path] = None

    # CORS settings
    cors_origins: List[str] = Field(default=["http://localhost:8000"])


class AppConfig(BaseSettings):
    # Basic app settings
    app_name: str = "Velociterm"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///velociterm_users.db"

    # Security
    secret_key: str = Field(..., description="JWT secret key")
    token_expiry_minutes: int = 30

    # Server configuration
    server: ServerConfig = ServerConfig()

    # LDAP configuration
    ldap: LDAPConfig = LDAPConfig()

    netbox: NetBoxConfig = NetBoxConfig()


    # Session paths
    sessions_dir: Path = Field(
        Path("sessions"),
        description="Directory for session files"
    )

    @classmethod
    def load_from_yaml(cls, config_path: str = "config.yaml") -> 'AppConfig':
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config_data = yaml.safe_load(f)
                return cls.model_validate(config_data)
        return cls.model_validate({})