# VelociTerm Authentication System

**Enterprise-grade authentication with LDAP3 and local user management for VelociTerm**

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Integration](#integration)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

The VelociTerm Authentication System provides enterprise-ready user authentication and authorization for the VelociTerm terminal management platform. It supports both LDAP3 integration for enterprise environments and SQLite-based local authentication for development and smaller deployments.

### Key Features

- **Dual Authentication Providers**: LDAP3 (Active Directory) and SQLite local authentication
- **JWT Token-Based Security**: Stateless authentication with configurable expiration
- **Group-Based Authorization**: Role-based access control with user and admin groups
- **React Admin Interface**: Web-based user management and administration
- **Seamless Integration**: Minimal changes to existing VelociTerm codebase
- **Production Ready**: Comprehensive security features and deployment options

### Components

1. **Auth Service** (`auth-service/`): FastAPI-based authentication backend
2. **User Management App** (`auth-frontend/`): React-based administration interface  
3. **Integration Layer**: Middleware for existing VelociTerm backend
4. **Configuration**: Environment-based configuration for all components

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VelociTerm Authentication System              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐ │
│  │  User Mgmt      │    │   Auth Service   │    │ VelociTerm  │ │
│  │  React App      │◄───┤   FastAPI        │◄───┤  Backend    │ │
│  │  :3001          │    │   :8080          │    │  :8050      │ │
│  └─────────────────┘    └──────────────────┘    └─────────────┘ │
│            │                       │                    │       │
│            │              ┌────────▼────────┐           │       │
│            │              │   Auth Providers │           │       │
│            │              │                  │           │       │
│            │              │ ┌──────────────┐ │           │       │
│            └──────────────┤ │    SQLite    │ │           │       │
│                           │ │   Local Auth │ │           │       │
│                           │ └──────────────┘ │           │       │
│                           │                  │           │       │
│                           │ ┌──────────────┐ │           │       │
│                           │ │    LDAP3     │ │           │       │
│                           │ │ Active Dir   │ │           │       │
│                           │ └──────────────┘ │           │       │
│                           └─────────────────┘           │       │
│                                                         │       │
│  ┌─────────────────────────────────────────────────────▼─────┐ │
│  │               VelociTerm Frontend                          │ │
│  │                    :3000                                   │ │
│  │              (Minimal Changes)                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **User Login**: User authenticates via User Management App or VelociTerm
2. **Provider Selection**: Local SQLite or LDAP authentication
3. **Token Generation**: JWT token issued with user info and groups
4. **API Access**: Token validates access to VelociTerm resources
5. **WebSocket Auth**: Terminal connections authenticate via JWT
6. **Group Authorization**: Admin vs user permissions enforced

## Prerequisites

### System Requirements

- **Python 3.12+ ** with pip and venv
- **Node.js 20+** with npm
- **Git** for cloning repositories

### Optional Requirements

- **LDAP Server** (Active Directory, OpenLDAP, etc.) for enterprise authentication
- **SSL Certificates** for production HTTPS deployment
- **Reverse Proxy** (nginx, Apache) for production deployment

## Quick Start

### 1. Clone and Setup Directory Structure

```bash
# From your VelociTerm project root
mkdir -p auth-service/auth/providers
mkdir -p auth-service/database  
mkdir -p auth-frontend/src/{components,contexts,services}

# Copy your existing structure
cp -r vtnb_be auth-service/
cp -r vtnb_fe auth-frontend/
```

### 2. Auth Service Setup

```bash
cd auth-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.4.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-ldap3==2.9.1
httpx==0.25.0
python-multipart==0.0.6
sqlite3
EOF

pip install -r requirements.txt

# Create basic environment config
cat > .env << EOF
JWT_SECRET=change-this-in-production-$(openssl rand -hex 32)
REQUIRED_GROUPS=velocterm_users
ADMIN_GROUPS=velocterm_admins
DEFAULT_ADMIN_PASSWORD=admin123
EOF

# Start auth service
python main.py
```

The auth service will start on `http://localhost:8080` with:
- API documentation at `/docs`
- Health check at `/api/health`
- Default admin user: `admin` / `admin123`

### 3. User Management App Setup

```bash
cd auth-frontend

# Initialize React app
npx create-react-app . --template minimal
npm install react-router-dom lucide-react

# Create environment config
cat > .env << EOF
REACT_APP_AUTH_API_URL=http://localhost:8080
REACT_APP_VELOCTERM_URL=http://localhost:3000
EOF

# Start development server
npm start
```

The user management app will start on `http://localhost:3001`.

### 4. Test the System

1. **Access Admin Panel**: http://localhost:3001
2. **Login**: admin / admin123 (default local account)
3. **Create Users**: Add test users via admin interface
4. **Verify API**: Check http://localhost:8080/docs for API testing

## Detailed Setup

### Auth Service Configuration

#### Environment Variables

Create `auth-service/.env`:

```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24

# Access Control
REQUIRED_GROUPS=velocterm_users
ADMIN_GROUPS=velocterm_admins

# Local Authentication
DEFAULT_ADMIN_PASSWORD=secure-admin-password
SQLITE_DB_PATH=auth.db

# LDAP Configuration (Optional)
LDAP_SERVER=ldap://dc.company.com
LDAP_BASE_DN=DC=company,DC=com
LDAP_SERVICE_USER=CN=svc-velocterm,OU=Service Accounts,DC=company,DC=com
LDAP_SERVICE_PASSWORD=service-account-password
LDAP_USER_FILTER=(sAMAccountName={username})
LDAP_USERS_GROUP=CN=VelociTerm Users,OU=Groups,DC=company,DC=com
LDAP_ADMINS_GROUP=CN=VelociTerm Admins,OU=Groups,DC=company,DC=com

# Service Configuration
AUTH_SERVICE_HOST=0.0.0.0
AUTH_SERVICE_PORT=8080
AUTH_SERVICE_WORKERS=4

# Security Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_ENABLED=true
SESSION_TIMEOUT_MINUTES=60
```

#### File Structure

```
auth-service/
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
├── .env                        # Environment configuration
├── auth.db                     # SQLite database (auto-created)
├── auth/
│   ├── __init__.py
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base_provider.py    # Abstract auth provider
│   │   ├── local_provider.py   # SQLite authentication
│   │   └── ldap_provider.py    # LDAP3 authentication
│   └── middleware.py           # Auth middleware
├── database/
│   ├── __init__.py
│   ├── models.py              # SQLite database models
│   └── migrations/            # Database migrations
└── tests/                     # Unit tests
    ├── test_auth.py
    ├── test_providers.py
    └── test_api.py
```

### User Management App Configuration

#### Environment Variables

Create `auth-frontend/.env`:

```bash
# API Configuration
REACT_APP_AUTH_API_URL=http://localhost:8080
REACT_APP_VELOCTERM_URL=http://localhost:3000

# Application Settings
REACT_APP_NAME=VelociTerm User Management
REACT_APP_VERSION=1.0.0
REACT_APP_SUPPORT_EMAIL=support@company.com

# Feature Flags
REACT_APP_LDAP_ENABLED=true
REACT_APP_LOCAL_AUTH_ENABLED=true
REACT_APP_REGISTRATION_ENABLED=false

# Security Settings
REACT_APP_TOKEN_STORAGE=localStorage
REACT_APP_AUTO_LOGOUT_MINUTES=60
```

#### File Structure

```
auth-frontend/
├── package.json               # Node.js dependencies
├── .env                       # Environment configuration
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js                 # Main React application
│   ├── App.css               # Application styles
│   ├── index.js              # React entry point
│   ├── components/
│   │   ├── Login.jsx         # Login form component
│   │   ├── Dashboard.jsx     # User dashboard
│   │   ├── Profile.jsx       # User profile management
│   │   ├── AdminPanel.jsx    # Admin user management
│   │   └── ProtectedRoute.jsx # Route authorization
│   ├── contexts/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── services/
│   │   └── authAPI.js        # API client
│   └── utils/
│       ├── validators.js     # Form validation
│       └── formatters.js     # Data formatting
└── build/                     # Production build (generated)
```

## Configuration

### LDAP Integration

For Active Directory integration, configure these settings in your environment:

#### Basic LDAP Setup

```bash
# LDAP Server Configuration
LDAP_SERVER=ldap://domain-controller.company.com:389
LDAP_BASE_DN=DC=company,DC=com
LDAP_USE_SSL=false
LDAP_USE_TLS=true

# Service Account (for user lookups)
LDAP_SERVICE_USER=CN=svc-velocterm,OU=Service Accounts,DC=company,DC=com
LDAP_SERVICE_PASSWORD=SecureServicePassword123

# User Search Configuration
LDAP_USER_SEARCH_BASE=OU=Users,DC=company,DC=com
LDAP_USER_FILTER=(sAMAccountName={username})
LDAP_USER_ATTRIBUTES=displayName,mail,memberOf

# Group Mapping
LDAP_USERS_GROUP=CN=VelociTerm Users,OU=Security Groups,DC=company,DC=com
LDAP_ADMINS_GROUP=CN=VelociTerm Admins,OU=Security Groups,DC=company,DC=com
```

#### Advanced LDAP Configuration

```bash
# Connection Settings
LDAP_CONNECT_TIMEOUT=10
LDAP_RECEIVE_TIMEOUT=30
LDAP_POOL_SIZE=10
LDAP_POOL_LIFETIME=600

# Search Optimization
LDAP_SEARCH_PAGING=true
LDAP_PAGE_SIZE=1000
LDAP_SIZE_LIMIT=2000

# Group Search (if using nested groups)
LDAP_GROUP_SEARCH_BASE=OU=Security Groups,DC=company,DC=com
LDAP_GROUP_FILTER=(member:1.2.840.113556.1.4.1941:={user_dn})
LDAP_NESTED_GROUPS=true

# Attribute Mapping
LDAP_USERNAME_ATTR=sAMAccountName
LDAP_DISPLAYNAME_ATTR=displayName
LDAP_EMAIL_ATTR=mail
LDAP_GROUPS_ATTR=memberOf
```

### Local SQLite Configuration

For development and small deployments:

```bash
# Database Configuration
SQLITE_DB_PATH=auth.db
SQLITE_BACKUP_ENABLED=true
SQLITE_BACKUP_INTERVAL_HOURS=24
SQLITE_BACKUP_RETENTION_DAYS=30

# Default Users (created on first run)
CREATE_DEFAULT_ADMIN=true
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@company.com

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_UPPERCASE=true
REQUIRE_LOWERCASE=true  
REQUIRE_NUMBERS=true
REQUIRE_SYMBOLS=false
```

### Security Configuration

Production security settings:

```bash
# JWT Security
JWT_SECRET=generate-strong-256-bit-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=8
JWT_REFRESH_ENABLED=true
JWT_REFRESH_EXPIRY_DAYS=7

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900  # 15 minutes
RATE_LIMIT_STORAGE=memory

# Session Management
SESSION_TIMEOUT_MINUTES=60
CONCURRENT_SESSIONS_LIMIT=5
SESSION_CLEANUP_INTERVAL=300

# CORS Configuration
CORS_ORIGINS=https://velocterm.company.com,https://admin.company.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE
CORS_HEADERS=Authorization,Content-Type

# SSL/TLS Settings (for production)
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/velocterm.crt
SSL_KEY_PATH=/etc/ssl/private/velocterm.key
SSL_VERIFY_MODE=CERT_REQUIRED
```

## Integration

### VelociTerm Backend Integration

Modify your existing `vtnb_be/main.py`:

#### 1. Add Authentication Middleware

```python
# Add to imports
from auth_middleware import VelociTermAuthMiddleware
import httpx

class VelociTermBackend:
    def __init__(self):
        # ... existing initialization ...
        
        # Add auth middleware
        self.auth_middleware = VelociTermAuthMiddleware(
            auth_service_url=os.getenv("AUTH_SERVICE_URL", "http://localhost:8080")
        )
```

#### 2. Replace Authentication Routes

```python
@self.app.post("/api/auth/login")
async def login_proxy(credentials: dict):
    """Proxy login to auth service"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{self.auth_middleware.auth_service_url}/api/auth/login",
            json=credentials,
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            json_response = JSONResponse({
                "status": "success", 
                "user": data["user"]
            })
            json_response.set_cookie(
                key="auth_token",
                value=data["access_token"],
                httponly=True,
                secure=True,  # HTTPS only in production
                samesite="strict",
                max_age=data["expires_in"]
            )
            return json_response
        else:
            raise HTTPException(status_code=401, detail="Authentication failed")
```

#### 3. Update Route Dependencies

Replace existing authentication dependencies:

```python
# Old:
@self.app.get("/api/sessions")
async def get_sessions(username: str = Depends(get_current_user_from_session)):

# New:
@self.app.get("/api/sessions")
async def get_sessions(user_data: dict = Depends(self.auth_middleware.require_user_access)):
    username = user_data['username']
    # ... rest of implementation
```

#### 4. WebSocket Authentication Update

```python
@self.app.websocket("/ws/terminal/{window_id}")
async def websocket_terminal(websocket: WebSocket, window_id: str):
    await websocket.accept()
    
    try:
        # Wait for auth message first
        auth_data = await websocket.receive_json()
        if auth_data.get('type') != 'auth':
            await websocket.send_json({'type': 'error', 'message': 'Authentication required'})
            return
        
        # Verify token
        user_data = await self.auth_middleware.verify_token_direct(auth_data.get('token'))
        username = user_data['username']
        
        # Check permissions
        if 'velocterm_users' not in user_data.get('groups', []):
            await websocket.send_json({'type': 'error', 'message': 'Insufficient permissions'})
            return
            
        await websocket.send_json({'type': 'auth_success', 'username': username})
        
        # Continue with existing WebSocket logic...
    except Exception as e:
        logger.error(f"WebSocket auth error: {e}")
        await websocket.close()
```

### VelociTerm Frontend Integration

Minimal changes to your existing React app:

#### 1. Update Login Component

```javascript
// In vtnb_fe/src/components/Login.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        provider: 'local'  // or let user choose 'ldap'
      })
    });

    if (response.ok) {
      const result = await response.json();
      onLogin({ success: true, user: result.user });
    } else {
      const error = await response.json();
      setError(error.detail || 'Login failed');
    }
  } catch (error) {
    setError('Connection error');
  }
  
  setLoading(false);
};
```

#### 2. Update WebSocket Authentication

```javascript
// In vtnb_fe/src/components/TerminalWindow.jsx
useEffect(() => {
  const connectWebSocket = async () => {
    const authToken = getCookie('auth_token');
    if (!authToken) {
      setConnectionStatus('error');
      return;
    }

    const ws = new WebSocket(`ws://localhost:8050/ws/terminal/${windowId}`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        token: authToken
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'auth_success') {
        setConnectionStatus('connected');
        // Continue with terminal operations
      } else if (data.type === 'error') {
        setConnectionStatus('error');
        setConnectionError(data.message);
      }
    };

    setWebSocket(ws);
  };

  connectWebSocket();
}, [windowId]);
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string", 
  "provider": "local|ldap"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "username": "admin",
    "display_name": "Administrator",
    "groups": ["velocterm_users", "velocterm_admins"],
    "provider": "local",
    "is_admin": true
  }
}
```

#### GET /api/auth/verify
Verify JWT token and return user info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "username": "admin",
  "display_name": "Administrator", 
  "groups": ["velocterm_users", "velocterm_admins"],
  "provider": "local",
  "is_admin": true
}
```

#### POST /api/auth/refresh
Refresh JWT token with extended expiry.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": { /* user object */ }
}
```

### User Management Endpoints (Admin Only)

#### GET /api/auth/users
List all users.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "display_name": "Administrator",
    "email": "admin@company.com",
    "groups": ["velocterm_users", "velocterm_admins"],
    "active": true,
    "created_at": "2024-01-15T10:30:00"
  }
]
```

#### POST /api/auth/users
Create new user.

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "newuser",
  "password": "SecurePass123",
  "display_name": "New User",
  "groups": ["velocterm_users"]
}
```

#### PUT /api/auth/users/{username}
Update existing user.

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "display_name": "Updated Name",
  "groups": ["velocterm_users", "velocterm_admins"],
  "password": "NewPassword123"  // optional
}
```

#### DELETE /api/auth/users/{username}
Delete user.

**Headers:**
```
Authorization: Bearer <admin-token>
```

### System Endpoints

#### GET /api/auth/config
Get authentication configuration.

**Response:**
```json
{
  "providers": {
    "local": true,
    "ldap": true
  },
  "default_provider": "local",
  "required_groups": ["velocterm_users"],
  "admin_groups": ["velocterm_admins"]
}
```

#### GET /api/auth/groups
List available groups.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "groups": [
    "velocterm_users",
    "velocterm_admins"
  ]
}
```

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "providers": {
    "local": true,
    "ldap": true
  }
}
```

## Security

### JWT Token Security

- **Algorithm**: HS256 with 256-bit secret key
- **Expiration**: Configurable (default 24 hours)
- **Claims**: Username, groups, provider, issued/expiry times
- **Storage**: HttpOnly cookies for web, localStorage for SPA
- **Refresh**: Optional refresh token mechanism

### Password Security

- **Hashing**: bcrypt with configurable rounds (default 12)
- **Requirements**: Configurable complexity rules
- **Storage**: Never stored in plaintext
- **Transmission**: HTTPS only in production

### LDAP Security

- **Authentication**: Service account with minimal privileges
- **Connection**: TLS encryption for data in transit
- **Queries**: Parameterized to prevent LDAP injection
- **Credentials**: Service account password stored securely

### API Security

- **CORS**: Configurable allowed origins
- **Rate Limiting**: Configurable per-endpoint limits
- **Input Validation**: Pydantic models for all requests
- **Error Handling**: No sensitive data in error responses

### Session Security

- **Timeout**: Configurable session timeout
- **Cleanup**: Automatic cleanup of expired sessions
- **Concurrency**: Optional concurrent session limits
- **Tracking**: Session activity logging

## Deployment

### Development Deployment

Quick development setup:

```bash
# 1. Start all services
./scripts/dev-start.sh

# 2. Or start individually:

# Auth Service
cd auth-service && python main.py &

# User Management App  
cd auth-frontend && npm start &

# VelociTerm Backend (modified)
cd vtnb_be && python main.py &

# VelociTerm Frontend (modified)
cd vtnb_fe && npm start &
```

### Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  auth-service:
    build: ./auth-service
    ports:
      - "8080:8080"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - LDAP_SERVER=${LDAP_SERVER}
      - LDAP_BASE_DN=${LDAP_BASE_DN}
    volumes:
      - ./auth-service/auth.db:/app/auth.db
    restart: unless-stopped

  auth-frontend:
    build: ./auth-frontend
    ports:
      - "3001:80"
    environment:
      - REACT_APP_AUTH_API_URL=http://auth-service:8080
    depends_on:
      - auth-service
    restart: unless-stopped

  velocterm-backend:
    build: ./vtnb_be
    ports:
      - "8050:8050"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:8080
    depends_on:
      - auth-service
    volumes:
      - ./workspaces:/app/workspaces
    restart: unless-stopped

  velocterm-frontend:
    build: ./vtnb_fe
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://velocterm-backend:8050
    depends_on:
      - velocterm-backend
    restart: unless-stopped

networks:
  default:
    name: velocterm-network
```

### Production Deployment

Production deployment with nginx:

```nginx
# /etc/nginx/sites-available/velocterm
server {
    listen 443 ssl http2;
    server_name velocterm.company.com;
    
    ssl_certificate /etc/ssl/certs/velocterm.crt;
    ssl_certificate_key /etc/ssl/private/velocterm.key;
    
    # VelociTerm Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # VelociTerm Backend API
    location /api/ {
        proxy_pass http://localhost:8050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket connections
    location /ws/ {
        proxy_pass http://localhost:8050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.velocterm.company.com;
    
    ssl_certificate /etc/ssl/certs/velocterm.crt;
    ssl_certificate_key /etc/ssl/private/velocterm.key;
    
    # User Management App
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Auth Service API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Systemd Services

Create systemd service files:

```ini
# /etc/systemd/system/velocterm-auth.service
[Unit]
Description=VelociTerm Auth Service
After=network.target

[Service]
Type=simple
User=velocterm
Group=velocterm
WorkingDirectory=/opt/velocterm/auth-service
Environment=PATH=/opt/velocterm/auth-service/venv/bin
ExecStart=/opt/velocterm/auth-service/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable velocterm-auth
sudo systemctl start velocterm-auth
sudo systemctl status velocterm-auth
```

### Monitoring and Logging

Configure logging in production:

```python
# auth-service/main.py
import logging
from logging.handlers import RotatingFileHandler

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('/var/log/velocterm/auth.log', maxBytes=10485760, backupCount=10),
        logging.StreamHandler()
    ]
)
```

Health check endpoint for monitoring:

```bash
# Add to monitoring system
curl -f http://localhost:8080/api/health || exit 1
```

## Troubleshooting

### Common Issues

#### Auth Service Won't Start

**Error**: `ModuleNotFoundError: No module named 'ldap3'`

**Solution**:
```bash
cd auth-service
source venv/bin/activate
pip install python-ldap3
```

**Error**: `JWT_SECRET not found`

**Solution**: Create proper `.env` file:
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

#### LDAP Connection Issues

**Error**: `LDAP connection failed`

**Diagnosis**:
```bash
# Test LDAP connectivity
ldapsearch -x -H ldap://your-server -b "DC=company,DC=com" -D "CN=service,DC=company,DC=com" -W "(sAMAccountName=testuser)"
```

**Common Solutions**:
- Check LDAP server URL and port
- Verify service account credentials
- Check network connectivity and firewall rules
- Validate Base DN format
- Test with LDAP browser tool

#### WebSocket Authentication Fails

**Error**: `WebSocket authentication failed`

**Diagnosis**:
```javascript
// Check token in browser console
console.log('Token:', getCookie('auth_token'));

// Test token validation
fetch('/api/auth/verify', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Solutions**:
- Verify JWT token format and expiration
- Check CORS configuration for WebSocket origins
- Ensure token is being sent correctly in WebSocket auth message

#### Database Issues

**Error**: `SQLite database locked`

**Solution**:
```bash
# Check for processes using the database
lsof auth.db

# Restart auth service
sudo systemctl restart velocterm-auth
```

**Error**: `User creation fails`

**Diagnosis**: Check database permissions and integrity:
```bash
sqlite3 auth.db ".schema"
sqlite3 auth.db "SELECT * FROM users;"
```

### Debugging Tools

#### Enable Debug Logging

```bash
# In auth-service/.env
LOG_LEVEL=DEBUG
DEBUG_SQL=true
DEBUG_LDAP=true
```

#### API Testing

Use curl or httpie for API testing:

```bash
# Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","provider":"local"}'

# Test token verification
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/auth/verify

# Test user creation (admin token required)
curl -X POST http://localhost:8080/api/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"username":"testuser","password":"test123","groups":["velocterm_users"]}'
```

#### Database Debugging

```bash
# Connect to SQLite database
sqlite3 auth.db

# Common queries
.schema
SELECT * FROM users;
SELECT * FROM groups;
SELECT u.username, g.name FROM users u 
  JOIN user_groups ug ON u.id = ug.user_id 
  JOIN groups g ON ug.group_id = g.id;

# Reset admin password
UPDATE users SET password_hash = '$2b$12$hash...' WHERE username = 'admin';
```

### Performance Tuning

#### Auth Service Optimization

```bash
# In auth-service/.env
WORKERS=4
WORKER_CONNECTIONS=1000
KEEPALIVE=2
MAX_REQUESTS=1000
MAX_REQUESTS_JITTER=50

# Database connection pooling
DB_POOL_SIZE=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

#### LDAP Optimization

```bash
# LDAP connection pooling
LDAP_POOL_SIZE=10
LDAP_POOL_LIFETIME=600
LDAP_CONNECT_TIMEOUT=10
LDAP_RECEIVE_TIMEOUT=30

# Search optimization
LDAP_SEARCH_PAGING=true
LDAP_PAGE_SIZE=1000
LDAP_SIZE_LIMIT=2000
```

### Maintenance

#### Database Backup

```bash
#!/bin/bash
# backup-auth-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/velocterm/backups"
DB_FILE="/opt/velocterm/auth-service/auth.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_FILE ".backup $BACKUP_DIR/auth_$DATE.db"

# Keep only last 30 backups
find $BACKUP_DIR -name "auth_*.db" -mtime +30 -delete
```

#### Log Rotation

```bash
# /etc/logrotate.d/velocterm
/var/log/velocterm/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 velocterm velocterm
    postrotate
        systemctl reload velocterm-auth
    endscript
}
```

#### Security Updates

```bash
#!/bin/bash
# update-dependencies.sh

# Update Python dependencies
cd auth-service
source venv/bin/activate
pip list --outdated
pip install --upgrade -r requirements.txt

# Update Node.js dependencies  
cd ../auth-frontend
npm audit
npm update
npm audit fix

# Restart services
sudo systemctl restart velocterm-auth
```

## Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/auth-enhancement`
3. Set up development environment:

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run tests
cd auth-service
python -m pytest tests/

cd ../auth-frontend
npm test
```

### Code Standards

- **Python**: Follow PEP 8, use Black formatter
- **JavaScript**: Use ESLint and Prettier
- **Documentation**: Update README for all changes
- **Tests**: Write tests for new features
- **Security**: Security review for all authentication changes

### Submitting Changes

1. Ensure all tests pass
2. Update documentation  
3. Create pull request with detailed description
4. Address code review feedback
5. Squash commits before merge

---

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: GitHub Issues for bug reports
- **Documentation**: Wiki for additional guides  
- **Community**: Discord server for discussions
- **Enterprise**: Contact sales for enterprise support

---

**VelociTerm Authentication System v1.0**

Built for enterprise network management with security, scalability, and ease of use.


Phase 1: Core Authentication Backend

Implement the auth service with SQLite local authentication
Build JWT token generation and validation
Create basic user CRUD operations
Keep the current POC system running in parallel for testing

Phase 2: Frontend Integration

Update the existing Login component to work with the new auth service
Implement JWT token storage and management in React
Update WebSocket authentication in TerminalWindow
Test thoroughly with existing sessions and NetBox integration

Phase 3: Admin Interface

Build the React admin app as a separate service
Implement user management UI
Add group/role management features

Phase 4: LDAP and Production Features

Add LDAP provider to the auth service
Implement advanced security features
Prepare production deployment configurations

