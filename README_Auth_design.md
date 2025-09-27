# VelociTerm Authentication & Configuration Guide

**Complete guide to configuring authentication backends and JWT settings**

This document provides detailed configuration instructions for VelociTerm's dual authentication system, covering JWT tokens, Windows authentication, LDAP integration, and security settings.

## Authentication Architecture Overview

VelociTerm supports a hybrid authentication model:

- **JWT Tokens**: For REST API calls (preferred for modern applications)
- **Session Cookies**: For WebSocket connections and backward compatibility
- **Multiple Backends**: Windows local authentication, LDAP/Active Directory
- **Configurable Security**: Token expiration, secret management, and encryption

## Configuration File Structure

### config.yaml

Create a `config.yaml` file in your project root to configure authentication backends:

```yaml
# Authentication configuration
authentication:
  # Default authentication method
  default_method: "local"  # Options: "local", "ldap"
  
  # JWT Configuration
  jwt:
    # Secret key (override with JWT_SECRET_KEY environment variable)
    secret_key: null  # Use environment variable in production
    algorithm: "HS256"
    access_token_expire_minutes: 2880  # 48 hours (development)
    refresh_token_expire_days: 7
  
  # Local OS authentication (Windows/Linux)
  local:
    enabled: true
    # Windows-specific settings
    domain_required: false  # Set to true to require domain specification
    use_computer_name_as_domain: true  # Use computer name if no domain provided
    
  # LDAP/Active Directory configuration
  ldap:
    enabled: false
    server: "ldap.company.com"
    port: 389
    use_ssl: false  # Set to true for LDAPS (port 636)
    base_dn: "dc=company,dc=com"
    user_dn_template: "uid={username},ou=users,dc=company,dc=com"
    # Alternative template for Active Directory:
    # user_dn_template: "{username}@company.com"
    
    # Group lookup configuration (optional)
    search_groups: false
    group_base_dn: "ou=groups,dc=company,dc=com"
    group_filter: "(&(objectClass=group)(member={user_dn}))"
    
    # Connection settings
    timeout: 10
    max_retries: 3

# Server configuration
server:
  host: "0.0.0.0"
  port: 8050
  workers: 1  # Set to 4+ for production
  log_level: "info"  # debug, info, warning, error
  
  # Session settings
  session_timeout_minutes: 120
  session_cleanup_interval: 300  # 5 minutes
  
  # Security settings
  cors_origins: ["http://localhost:3000"]  # Add your frontend URLs
  workspace_dir: "./workspaces"
  encryption_iterations: 100000  # PBKDF2 iterations for workspace encryption

# WebSocket settings
websocket:
  heartbeat_interval: 30
  max_connections_per_user: 20
  window_validation: true
  ip_validation: true
```

## Environment Variables

Environment variables override config file settings and are recommended for production:

### JWT Configuration

```bash
# JWT Secret (REQUIRED for production)
export JWT_SECRET_KEY="your-256-bit-secret-key-here"

# Token expiration settings
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60    # 1 hour (production)
export JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# JWT Algorithm (optional, defaults to HS256)
export JWT_ALGORITHM="HS256"
```

### Server Configuration

```bash
# Server settings
export VELOCITERM_HOST="0.0.0.0"
export VELOCITERM_PORT=8050
export VELOCITERM_WORKERS=4

# Logging
export LOG_LEVEL="info"  # debug, info, warning, error

# CORS settings
export CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

### Authentication Backend Settings

```bash
# Default authentication method
export AUTH_DEFAULT_METHOD="local"  # local, ldap

# LDAP settings (if using LDAP)
export LDAP_SERVER="ldap.company.com"
export LDAP_PORT=389
export LDAP_BASE_DN="dc=company,dc=com"
export LDAP_USER_DN_TEMPLATE="uid={username},ou=users,dc=company,dc=com"
export LDAP_USE_SSL=false

# Session settings
export SESSION_TIMEOUT_MINUTES=120
export WORKSPACE_DIR="./workspaces"
```

## Authentication Backend Configuration

### Windows Local Authentication

**Automatic Configuration:**
- Automatically detects Windows environment
- Uses `win32security` for authentication
- Requires `pywin32` package: `pip install pywin32`

**Features:**
- Domain authentication support
- Group membership extraction
- Username format: `COMPUTER@username` (filesystem-safe)

**Example Configuration:**
```yaml
authentication:
  default_method: "local"
  local:
    enabled: true
    domain_required: false
    use_computer_name_as_domain: true
```

**Testing Windows Authentication:**
```bash
curl -X POST http://localhost:8050/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"speterman\",\"password\":\"your_password\",\"auth_method\":\"local\",\"domain\":\"WORKGROUP\"}"
```

### Linux/macOS Local Authentication

**Automatic Configuration:**
- Uses PAM (Pluggable Authentication Modules)
- Requires `python-pam` package: `pip install python-pam`

**Features:**
- System user authentication
- Group membership extraction
- Username format: standard Unix username

**Example Configuration:**
```yaml
authentication:
  default_method: "local"
  local:
    enabled: true
```

### LDAP/Active Directory Authentication

**Configuration Steps:**

1. **Install LDAP dependencies:**
```bash
pip install ldap3
```

2. **Configure LDAP settings:**
```yaml
authentication:
  default_method: "ldap"
  ldap:
    enabled: true
    server: "ldap.company.com"
    port: 389
    use_ssl: false
    base_dn: "dc=company,dc=com"
    user_dn_template: "uid={username},ou=users,dc=company,dc=com"
    search_groups: true
    group_base_dn: "ou=groups,dc=company,dc=com"
```

3. **Active Directory Example:**
```yaml
authentication:
  ldap:
    enabled: true
    server: "ad.company.com"
    port: 389
    use_ssl: false
    base_dn: "dc=company,dc=com"
    user_dn_template: "{username}@company.com"  # AD format
    search_groups: true
    group_base_dn: "dc=company,dc=com"
    group_filter: "(&(objectClass=group)(member=CN={username},OU=Users,DC=company,DC=com))"
```

4. **LDAPS (Secure LDAP) Example:**
```yaml
authentication:
  ldap:
    enabled: true
    server: "ldaps.company.com"
    port: 636
    use_ssl: true
    base_dn: "dc=company,dc=com"
    user_dn_template: "uid={username},ou=users,dc=company,dc=com"
```

**Testing LDAP Authentication:**
```bash
curl -X POST http://localhost:8050/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"jdoe\",\"password\":\"ldap_password\",\"auth_method\":\"ldap\"}"
```

## JWT Configuration Details

### Token Types and Usage

**Access Tokens:**
- Purpose: API authentication
- Default expiration: 48 hours (development), 1 hour (production)
- Contains: username, groups, issued/expiry times
- Usage: `Authorization: Bearer <access_token>`

**Refresh Tokens:**
- Purpose: Generate new access tokens
- Default expiration: 7 days
- Contains: username, unique JWT ID
- Usage: `POST /api/auth/refresh` with token in body

### Security Best Practices

**Production JWT Configuration:**
```bash
# Use a strong, random secret key (256-bit)
export JWT_SECRET_KEY=$(openssl rand -base64 32)

# Shorter token expiration for production
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60  # 1 hour

# Secure refresh token expiration
export JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Secret Key Generation:**
```bash
# Generate a secure random key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or using OpenSSL
openssl rand -base64 32
```

## Development vs Production Configuration

### Development Configuration

**config.yaml for development:**
```yaml
authentication:
  default_method: "local"
  jwt:
    access_token_expire_minutes: 2880  # 48 hours
    refresh_token_expire_days: 30
  local:
    enabled: true

server:
  host: "127.0.0.1"
  port: 8050
  workers: 1
  log_level: "debug"
  cors_origins: ["http://localhost:3000"]
```

**Environment variables:**
```bash
# Development - JWT secret can be auto-generated
export LOG_LEVEL="debug"
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=2880
```

### Production Configuration

**Environment variables (production):**
```bash
# Production JWT settings
export JWT_SECRET_KEY="your-production-secret-key"
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
export JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Production server settings
export VELOCITERM_HOST="0.0.0.0"
export VELOCITERM_PORT=8050
export VELOCITERM_WORKERS=4
export LOG_LEVEL="info"

# Security settings
export CORS_ALLOWED_ORIGINS="https://yourdomain.com"
export SESSION_TIMEOUT_MINUTES=60
```

**Production config.yaml:**
```yaml
authentication:
  default_method: "ldap"  # Use LDAP in production
  jwt:
    access_token_expire_minutes: 60  # Override with env var
  ldap:
    enabled: true
    server: "ldap.company.com"
    use_ssl: true
    base_dn: "dc=company,dc=com"
    user_dn_template: "uid={username},ou=users,dc=company,dc=com"

server:
  workers: 4
  log_level: "info"
  cors_origins: []  # Set via environment variable
```

## Testing Authentication Configuration

### Check Available Authentication Methods

```bash
curl -X GET http://localhost:8050/api/auth/methods
```

**Expected Response:**
```json
{
  "available_methods": ["local"],
  "default_method": "local",
  "system_info": {
    "system": "Windows",
    "available_methods": ["local"],
    "local_auth": {
      "windows_available": true,
      "pam_available": false
    },
    "ldap_configured": false,
    "ldap_available": false
  },
  "requires_domain": true,
  "jwt_enabled": true,
  "supported_auth_types": ["session", "jwt", "basic"]
}
```

### Test Authentication Flow

**1. Test authentication backend:**
```bash
# Local authentication
curl -X POST http://localhost:8050/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"testpass\",\"auth_method\":\"local\"}"
```

**2. Verify JWT token:**
```bash
curl -X GET http://localhost:8050/api/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Test session compatibility:**
```bash
curl -X POST http://localhost:8050/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"testpass\"}"
```

## Troubleshooting Authentication Issues

### Common Windows Authentication Issues

**Problem: `win32security` module not found**
```bash
# Solution: Install pywin32
pip install pywin32
```

**Problem: Authentication fails with correct credentials**
```bash
# Check Windows event logs
# Verify domain settings in config
# Test with computer name as domain
```

**Problem: Username format issues**
```bash
# VelociTerm automatically converts DOMAIN\username to DOMAIN@username
# Check workspace folder creation with: ls ./workspaces/
```

### Common LDAP Issues

**Problem: LDAP connection fails**
```bash
# Test LDAP connectivity
ldapsearch -x -H ldap://ldap.company.com -D "uid=testuser,ou=users,dc=company,dc=com" -W

# Check server and port settings
# Verify SSL/TLS configuration
```

**Problem: User authentication succeeds but no groups**
```bash
# Check group search configuration
# Verify group_base_dn and group_filter settings
# Test group search manually
```

**Problem: SSL certificate issues**
```bash
# For development, set use_ssl: false
# For production, ensure proper SSL certificates
# Check LDAP server SSL configuration
```

### JWT Token Issues

**Problem: Token signature verification fails**
```bash
# Ensure JWT_SECRET_KEY is consistent across restarts
# Check for special characters in secret key
# Verify secret key is properly base64 encoded if needed
```

**Problem: Token expires too quickly**
```bash
# Check JWT_ACCESS_TOKEN_EXPIRE_MINUTES setting
# Verify system clock synchronization
# Test token refresh flow
```

**Problem: Token not accepted by API**
```bash
# Verify Authorization header format: "Bearer <token>"
# Check token for corruption or truncation
# Test with jwt.io to decode token manually
```

## Security Considerations

### JWT Security

**Secret Key Management:**
- Use a cryptographically secure random key (256-bit minimum)
- Store in environment variables, never in code
- Rotate keys periodically in production
- Use different keys for different environments

**Token Expiration:**
- Production: 15-60 minutes for access tokens
- Development: 1-48 hours for convenience
- Refresh tokens: 7-30 days maximum
- Implement token refresh in frontend applications

### Session Security

**Workspace Encryption:**
- Uses PBKDF2 with 100,000 iterations
- Per-user encryption keys
- Encrypted credential storage
- No plaintext passwords on disk

**WebSocket Security:**
- Session-based authentication (more suitable for real-time)
- Window ownership validation
- IP address validation
- Automatic cleanup on disconnect

### Network Security

**HTTPS/SSL:**
- Always use HTTPS in production
- Configure SSL certificates properly
- Set secure cookie flags
- Use HSTS headers

**CORS Configuration:**
- Restrict allowed origins in production
- Never use `"*"` for CORS origins in production
- Configure proper allowed methods and headers

## Configuration Examples

### Small Organization (Windows Domain)

```yaml
authentication:
  default_method: "local"
  jwt:
    access_token_expire_minutes: 480  # 8 hours
  local:
    enabled: true
    domain_required: true

server:
  workers: 2
  cors_origins: ["https://velocterm.company.local"]
```

### Enterprise (LDAP + High Security)

```yaml
authentication:
  default_method: "ldap"
  jwt:
    access_token_expire_minutes: 30  # 30 minutes
    refresh_token_expire_days: 1     # 1 day
  ldap:
    enabled: true
    server: "ldaps.company.com"
    port: 636
    use_ssl: true
    base_dn: "dc=company,dc=com"
    user_dn_template: "{username}@company.com"
    search_groups: true

server:
  workers: 8
  session_timeout_minutes: 30
  cors_origins: ["https://velocterm.company.com"]
```

### Development Environment

```yaml
authentication:
  default_method: "local"
  jwt:
    access_token_expire_minutes: 2880  # 48 hours
  local:
    enabled: true

server:
  host: "127.0.0.1"
  workers: 1
  log_level: "debug"
  cors_origins: ["http://localhost:3000", "http://127.0.0.1:3000"]
```

---

## Summary

VelociTerm's authentication system provides flexible configuration options for different organizational needs:

- **Multiple Backends**: Windows, Linux/macOS, LDAP/Active Directory
- **Dual Authentication**: JWT tokens for APIs, sessions for WebSockets
- **Flexible Configuration**: Environment variables and config files
- **Security Features**: Encryption, token management, session isolation
- **Production Ready**: Proper secret management and security practices

Configure authentication backends based on your organization's infrastructure, use environment variables for production secrets, and test thoroughly before deployment.

For additional support, consult the main README.md and API documentation at `/docs` when the server is running.