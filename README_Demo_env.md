# VelociTerm Demo - Ready-to-Run Package

A complete, self-contained FastAPI server that serves both the React frontend and provides backend API/WebSocket functionality for terminal management, SSH connections, and NetBox integration. **No Node.js installation required.**

## Architecture Overview

This demo implementation uses a **unified server design** where a single FastAPI process handles:

- **Static File Serving**: Pre-built React frontend (HTML, CSS, JS, themes)
- **REST API Endpoints**: Session management, NetBox integration, user settings  
- **Dual Authentication**: JWT tokens + Session cookies with user choice
- **WebSocket Connections**: Real-time SSH terminals and tool execution
- **User Workspaces**: Encrypted per-user data storage

### Design Benefits

- **Zero Frontend Dependencies**: No Node.js, npm, or build tools required
- **Single Process**: One server handles all functionality
- **Single Port**: Everything accessible via port 8050
- **No CORS Issues**: Frontend and backend share the same origin
- **Simple Deployment**: No reverse proxy or separate frontend server needed
- **Resource Efficient**: Lower overhead than multi-service architectures

## File Structure

```
demo2/
├── main.py                      # FastAPI server with JWT + static serving
├── models.py                    # Pydantic data models
├── workspace_manager.py         # User data and NetBox integration
├── ssh_manager.py              # SSH connection handling
├── connection_handlers.py      # WebSocket management
├── config.yaml                 # Authentication configuration
├── requirements.txt            # Python dependencies
├── routes/                     # Modular authentication system
│   ├── __init__.py
│   ├── auth.py                 # JWT + session authentication
│   ├── auth_dependencies.py    # Dual auth support
│   ├── auth_module.py          # Windows/LDAP backends
│   ├── jwt_handler.py          # JWT token management
│   ├── connection_handlers.py  # WebSocket handlers
│   ├── sessions.py             # Session CRUD
│   ├── netbox.py               # NetBox integration
│   └── system.py               # System monitoring
├── static/                     # Pre-built React frontend
│   ├── index.html             # Main React app entry point
│   ├── static/                # Compiled CSS/JS assets
│   │   ├── css/
│   │   └── js/
│   └── themes/                # UI theme files (13 themes)
└── workspaces/                # Per-user data storage
    └── <username>/
        ├── sessions.yaml        # User's session definitions
        ├── settings.yaml        # User preferences  
        └── netbox_config.json.enc # Encrypted NetBox API token
```

## Quick Start - No Node.js Required

### Prerequisites

- **Python 3.12+** (only requirement)
- Internet connection for package installation

### Setup Instructions

#### Step 1: Download the Demo

```bash
# Option 1: Clone the repository  
git clone <repository-url>
cd <repository-name>/demo2

# Option 2: Download demo2 folder directly
# Extract demo2 folder to your desired location
cd path/to/demo2
```

#### Step 2: Create Virtual Environment

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

#### Step 4: Run the Application

```bash
python main.py
```

#### Step 5: Access the Application

Open your browser to: **http://localhost:8050**

### That's It!

No Node.js, no npm install, no build process required. The React frontend is pre-built and included in the demo package.

## Authentication Features

### Dual Authentication System

The demo includes both modern JWT authentication and traditional session-based authentication:

**Login Options:**
- **Session Cookie Mode** (default): Traditional authentication optimized for WebSockets
- **JWT Token Mode**: Modern stateless authentication with automatic token refresh

**Authentication Methods:**
- **Local Authentication**: Uses system credentials (Windows/Linux)
- **LDAP Authentication**: Enterprise directory integration (if configured)

### Using the Authentication System

1. **Access Login**: Navigate to http://localhost:8050
2. **Choose Auth Mode**: Toggle between Session and JWT authentication  
3. **Select Method**: Choose local or LDAP authentication
4. **Login**: Enter your system credentials (Windows/Linux) or LDAP credentials

**System Credentials Required:**
- Username: Your Windows/Linux system username
- Password: Your Windows/Linux system password
- Creates automatic user workspace upon first login

## Key Features Demonstrated

### 1. Enhanced Session Management
- **CRUD Operations**: Create, read, update, delete sessions and folders
- **Legacy Format Support**: Compatible with existing session files
- **Folder Organization**: Hierarchical session organization
- **Real-time Filtering**: Search across session properties
- **Authenticated APIs**: Works with both JWT and session auth

### 2. SSH Terminal Management  
- **WebSocket-based Terminals**: Real-time SSH connections
- **Multi-terminal Support**: Multiple simultaneous sessions
- **Window Management**: Floating, resizable terminal windows
- **Connection Status**: Live connection indicators
- **Session Authentication**: Optimized WebSocket auth using session cookies

### 3. NetBox Integration
- **Device Discovery**: Search NetBox devices with filtering
- **Bulk Import**: Convert NetBox devices to sessions
- **Encrypted Token Storage**: Secure API token management
- **Site Organization**: Automatic folder creation by site
- **API Authentication**: Secured with user's chosen auth method

### 4. Professional User Interface
- **13 Theme Variants**: Professional dark/light themes including CRT styles
- **Responsive Design**: Works on desktop and tablet
- **Real-time Updates**: Live session status and filtering
- **Modern UI**: Professional terminal interface with dual auth support

## Network Architecture

```
Browser (port 8050)
    ↓
FastAPI Server
    ├── Static Files (/static/, /themes/) → Pre-built React frontend
    ├── REST API (/api/*) → JWT or Session authenticated
    ├── WebSockets (/ws/*) → Session authenticated for performance
    └── React App (/ - catch-all) → Client-side routing
```

### Request Flow

1. **Authentication**: Login with JWT or Session mode
2. **Static Assets**: CSS/JS served directly from `/static/` and `/themes/`
3. **API Calls**: Frontend makes authenticated requests to `/api/*` endpoints
4. **WebSocket**: Terminals connect to `/ws/terminal/{window_id}` using sessions
5. **Client Routing**: All other URLs serve React's `index.html`

## Important URLs

- **Main Application**: http://localhost:8050
- **API Documentation**: http://localhost:8050/docs  
- **Authentication Status**: http://localhost:8050/api/auth/status
- **JWT Token Login**: http://localhost:8050/api/auth/token
- **Session Login**: http://localhost:8050/api/auth/login
- **System Stats**: http://localhost:8050/api/system/stats

## Usage Guide

### Initial Login
1. Navigate to http://localhost:8050
2. Choose authentication mode (Session or JWT)
3. Select authentication method (Local or LDAP)
4. **Local Mode**: Enter your Windows/Linux system username and password
5. User workspace created automatically upon first login

### Session Management
1. **View Sessions**: Expand folders in left sidebar
2. **Filter Sessions**: Use search box to find sessions instantly  
3. **Connect to Session**: Click session → Enter credentials → Terminal opens
4. **Create Session**: Use "+" button or session manager interface
5. **Edit Sessions**: Right-click sessions for edit options

### NetBox Integration
1. **Configure Token**: Go to NetBox Setup → Enter API URL and token
2. **Search Devices**: Use Device Search tab with filters
3. **Import Devices**: Select devices → Import → Sessions created automatically
4. **Connect to Device**: Click imported session to open terminal

### Terminal Features  
- **Multiple Terminals**: Open multiple SSH sessions simultaneously
- **Theme Switching**: Change themes without disconnecting (13 themes available)
- **Window Management**: Drag, resize, minimize terminals
- **Real-time I/O**: Full terminal functionality with colors
- **Authentication**: Terminals use optimized session authentication

### Authentication Testing
1. **Session Mode**: Traditional cookie-based authentication (default)
2. **JWT Mode**: Toggle to JWT for modern token-based authentication
3. **API Integration**: Both modes provide identical functionality
4. **Token Management**: JWT mode includes automatic token refresh

## Technical Implementation

### Authentication Architecture

**Hybrid Authentication System:**
```python
# JWT Mode - API calls include:
Authorization: Bearer eyJhbGciOiJIUzI1NiI...

# Session Mode - API calls include:
Cookie: session=abc123...

# WebSocket connections always use session cookies for optimal performance
```

**Token Management:**
- **JWT Access Tokens**: 48 hours in development, 1 hour in production
- **JWT Refresh Tokens**: 7 days with automatic refresh
- **Session Cookies**: Traditional session management with 1-hour expiration
- **Graceful Fallback**: JWT failures automatically fall back to session auth

### Static File Serving

FastAPI's `StaticFiles` middleware serves pre-built React assets:
- `/static/` → CSS/JS bundles (pre-compiled)
- `/themes/` → Theme files (13 complete themes)
- Catch-all route → `index.html` for client-side routing

### Data Storage

- **File-based**: YAML sessions, encrypted JSON for sensitive data
- **Per-user**: Isolated workspaces in `/workspaces/{username}/`
- **Encryption**: PBKDF2 key derivation for user-specific encryption
- **Cross-platform**: Windows/Linux compatible file handling

## Configuration

### Development Configuration

```bash
# Optional: Set JWT configuration for development
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=2880  # 48 hours
export JWT_REFRESH_TOKEN_EXPIRE_DAYS=30      # 30 days

# Start server
python main.py
```

### Production Configuration

```bash
# Required for production JWT security
export JWT_SECRET_KEY="$(openssl rand -base64 32)"
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60    # 1 hour
export JWT_REFRESH_TOKEN_EXPIRE_DAYS=7       # 7 days

# Optional: Configure authentication backends
export AUTH_DEFAULT_METHOD="local"           # local, ldap
export SESSION_TIMEOUT_MINUTES=60            # Session timeout

# Start production server
python main.py
```

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# If port 8050 is busy, kill the process or change port in main.py
# Windows:
netstat -ano | findstr :8050
# Linux/macOS:
lsof -ti:8050 | xargs kill
```

**Module Not Found Errors**
```bash
# Ensure virtual environment is activated and dependencies installed
pip install -r requirements.txt
```

**Authentication Issues**
```bash
# Test authentication endpoints
curl http://localhost:8050/api/auth/methods
curl -X POST http://localhost:8050/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","auth_method":"local"}'
```

**Static Files Not Loading**
- Verify `static/index.html` exists in demo directory
- Check FastAPI logs for static file errors
- Ensure all static assets are present in `static/` directory

**WebSocket Connection Issues**
- Verify WebSocket URL uses correct port (8050)
- Check browser developer tools for connection errors
- Ensure no firewall blocking WebSocket connections

### Development Mode
The application runs with auto-reload enabled, so code changes automatically restart the server.

## Production Deployment

### Security Enhancements for Production

```bash
# Generate secure JWT secret
export JWT_SECRET_KEY="$(openssl rand -base64 32)"

# Use secure token expiration
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
export JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Configure proper authentication backend
export AUTH_DEFAULT_METHOD="ldap"  # Use LDAP instead of local/POC

# Enable HTTPS (recommended)
uvicorn main:app --host 0.0.0.0 --port 8050 \
  --ssl-keyfile=key.pem --ssl-certfile=cert.pem
```

### Deployment Options

- **Systemd Service**: Run as system service on Linux
- **Docker Container**: Containerized deployment
- **Reverse Proxy**: Use nginx for SSL termination and load balancing
- **Cloud Deployment**: AWS/Azure/GCP hosting

## Validation Tests

### Authentication Testing
```bash
# Test available authentication methods  
curl http://localhost:8050/api/auth/methods

# Test JWT authentication (use real system credentials)
curl -X POST http://localhost:8050/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password","auth_method":"local"}'

# Test session authentication (use real system credentials)
curl -X POST http://localhost:8050/api/auth/login \
  -H "Authorization: Basic $(echo -n 'your_username:your_password' | base64)"

# Test API with JWT
curl -X GET http://localhost:8050/api/sessions \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Frontend Integration
1. Login with both Session and JWT modes
2. Navigate different UI sections
3. Create/edit sessions with both auth modes
4. Test NetBox integration
5. Verify terminal WebSocket connections
6. Test theme switching (13 themes available)

### Terminal Testing
1. Create or select a session
2. Enter SSH credentials  
3. Verify terminal connects and displays correctly
4. Test multiple simultaneous terminals
5. Test window management (drag, resize, minimize)

---

## Summary

This demo package provides a complete, production-ready VelociTerm implementation that requires only Python to run. The unified FastAPI architecture with pre-built React frontend eliminates all Node.js dependencies while providing enterprise-grade features including dual authentication, advanced session management, and NetBox integration.

**Key Benefits:**
- ✅ Zero frontend build requirements (React pre-built)
- ✅ Single Python dependency for complete functionality
- ✅ Dual authentication system (JWT + Session)
- ✅ Production-ready security features
- ✅ Enterprise-scale NetBox integration
- ✅ Professional UI with 13 themes
- ✅ Multi-platform compatibility (Windows/Linux)

**Quick Start Summary:**
1. Download demo2 folder
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `python main.py`
5. Open http://localhost:8050

The demo successfully validates VelociTerm's architecture as a production-ready solution for enterprise terminal management with modern authentication capabilities.