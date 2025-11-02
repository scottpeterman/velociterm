# VelociTerm Demo - Ready-to-Run Package

A complete, self-contained FastAPI server that serves both the React frontend and provides backend API/WebSocket functionality for terminal management, SSH connections, and NetBox integration. **No Node.js installation required.**

## Architecture Overview

This demo implementation uses a **unified server design** where a single FastAPI process handles:

- **Static File Serving**: Pre-built React frontends (main app + embeddable terminal)
- **REST API Endpoints**: Session management, NetBox integration, user settings  
- **Dual Authentication**: JWT tokens + Session cookies with user choice
- **WebSocket Connections**: Real-time SSH terminals and tool execution
- **User Workspaces**: Encrypted per-user data storage
- **Embedded Terminal Support**: Lightweight embeddable terminal component

### Design Benefits

- **Zero Frontend Dependencies**: No Node.js, npm, or build tools required
- **Single Process**: One server handles all functionality
- **Single Port**: Everything accessible via port 8050
- **No CORS Issues**: Frontend and backend share the same origin
- **Simple Deployment**: No reverse proxy or separate frontend server needed
- **Resource Efficient**: Lower overhead than multi-service architectures
- **Dual Frontend Support**: Full app AND embeddable terminal in one package

## File Structure

```
demo/
├── main.py                      # FastAPI server with JWT + static serving
├── models.py                    # Pydantic data models
├── workspace_manager.py         # User data and NetBox integration
├── ssh_manager.py              # SSH connection handling
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
├── static/                     # Pre-built main React app
│   ├── index.html             # Main app entry point
│   ├── static/                # Compiled CSS/JS assets
│   │   ├── css/
│   │   └── js/
│   └── themes/                # UI theme files (13 themes)
├── static_embed/              # Pre-built embeddable terminal
│   ├── index.html             # Minimal embed entry point
│   └── themes/                # Matching theme files
└── workspaces/                # Per-user data storage
    └── <username>/
        ├── sessions.yaml        # User's session definitions
        ├── settings.yaml        # User preferences  
        ├── netbox_config.json.enc # Encrypted NetBox API token
        └── ssh_key/            # User's SSH keys
            ├── id_rsa
            └── id_rsa.pub
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
cd <repository-name>/demo

# Option 2: Download demo folder directly
# Extract demo folder to your desired location
cd path/to/demo
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

**Main Application:**  
Open your browser to: **http://localhost:8050**

**Embedded Terminal (Direct SSH):**  
http://localhost:8050/embed/?host=10.0.0.108&port=22&name=MyDevice&bep=3000

### That's It!

No Node.js, no npm install, no build process required. Both React frontends are pre-built and included in the demo package.

## Deployment Modes

### 1. Full Application Mode (Default)

Access: **http://localhost:8050**

Complete VelociTerm experience with:
- Session management interface
- NetBox device search
- Multi-window terminal support
- Settings and configuration
- Theme selection
- User workspace management

### 2. Embedded Terminal Mode

Access: **http://localhost:8050/embed/?host=HOST&port=PORT&name=NAME&bep=PORT**

Lightweight terminal component that can be embedded in:
- Network monitoring dashboards
- Documentation sites
- Custom web applications
- NetBox plugins
- Wiki pages

#### Embed URL Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `host` | Yes | Target SSH host IP or hostname | `10.0.0.108` |
| `port` | No | SSH port (default: 22) | `22` |
| `name` | No | Display name for terminal | `Router-01` |
| `bep` | **Yes** | Backend port for API/WebSocket | `3000` or `8050` |

#### The `bep` Parameter (Backend Endpoint Port)

The `bep` parameter is **critical** for embedded terminals and solves several architectural challenges:

**Purpose:**
- Tells the embedded terminal which port the VelociTerm backend is running on
- Enables the embed to work when hosted on a different port than the backend
- Allows embedding VelociTerm terminals in external applications

**Why It's Needed:**

1. **Cross-Port Communication**: The embedded terminal (served from port 3000) needs to communicate with the backend (running on port 8050 or 3000)

2. **Flexible Deployment**: Supports scenarios like:
   - Embed hosted on port 3000, backend on port 8050
   - Both on the same port (8050)
   - Backend behind a reverse proxy

3. **CORS Handling**: Properly configures WebSocket and API endpoints to avoid CORS issues

**Examples:**

```bash
# Backend on default port (8050), embed also on 8050
http://localhost:8050/embed/?host=10.0.0.108&port=22&bep=8050

# Backend on alternate port (3000)
http://localhost:3000/embed/?host=10.0.0.108&port=22&bep=3000

# Embed in external site, backend on 8050
http://my-dashboard.com/terminal.html?host=10.0.0.108&bep=8050
```

**Technical Details:**

When `bep=3000` is specified:
```javascript
// Embed terminal configures:
const wsUrl = `ws://localhost:${bep}/ws/terminal/${windowId}`;
const apiUrl = `http://localhost:${bep}/api/`;
```

Without `bep`, the embed would try to connect to the wrong port, causing:
- ❌ WebSocket connection failures
- ❌ API 404 errors  
- ❌ Authentication issues

With `bep`:
- ✅ Correct WebSocket endpoint
- ✅ Proper API communication
- ✅ Successful authentication flow

#### Embedding in External Applications

**HTML Embedding:**
```html
<iframe 
  src="http://localhost:8050/embed/?host=10.0.0.108&port=22&name=Router-01&bep=8050"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

**NetBox Plugin Integration:**
```python
# In your NetBox plugin template
terminal_url = f"http://velocit## (Continued from part 1)

**NetBox Plugin Integration:**
```python
# In your NetBox plugin template
terminal_url = f"http://velociterm-server:8050/embed/?host={device.primary_ip}&port=22&name={device.name}&bep=8050"
```

**React/JavaScript Integration:**
```javascript
const EmbeddedTerminal = ({ host, port, name }) => {
  const backendPort = 8050;  // VelociTerm backend port
  const embedUrl = `http://localhost:${backendPort}/embed/?host=${host}&port=${port}&name=${name}&bep=${backendPort}`;
  
  return (
    <iframe 
      src={embedUrl}
      style={{ width: '100%', height: '600px', border: 'none' }}
    />
  );
};
```

**Documentation Site Integration:**
```markdown
## Access the Lab Router

<iframe 
  src="http://lab-terminal.company.com/embed/?host=192.168.1.1&port=22&name=Lab-Router&bep=8050"
  width="800" 
  height="500">
</iframe>
```

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

#### Main Application
1. **Access Login**: Navigate to http://localhost:8050
2. **Choose Auth Mode**: Toggle between Session and JWT authentication  
3. **Select Method**: Choose local or LDAP authentication
4. **Login**: Enter your system credentials or LDAP credentials

#### Embedded Terminal
1. **Access Embed URL**: Navigate to embed URL with parameters
2. **Authentication Prompt**: Embedded terminal shows login overlay
3. **Workspace Auth**: Enter VelociTerm credentials (authenticates to backend)
4. **SSH Auth**: Enter device SSH credentials
5. **Connected**: Terminal connects to target device

**Two-Layer Authentication in Embed Mode:**
1. **Backend Authentication**: Login to VelociTerm workspace (your Windows/Linux credentials)
2. **Device Authentication**: SSH credentials for the target device

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
- **Embedded Mode**: Lightweight single-terminal embedding
- **Session Authentication**: Optimized WebSocket auth using session cookies

### 3. NetBox Integration
- **Device Discovery**: Search NetBox devices with filtering
- **Bulk Import**: Convert NetBox devices to sessions
- **Encrypted Token Storage**: Secure API token management
- **Site Organization**: Automatic folder creation by site
- **API Authentication**: Secured with user's chosen auth method
- **Direct Device Access**: Generate embed URLs from NetBox data

### 4. Professional User Interface
- **13 Theme Variants**: Professional dark/light themes including CRT styles
- **Responsive Design**: Works on desktop and tablet
- **Real-time Updates**: Live session status and filtering
- **Modern UI**: Professional terminal interface with dual auth support
- **Consistent Theming**: Embed and main app share theme system

## Network Architecture

### Full Application Mode
```
Browser (port 8050)
    ↓
FastAPI Server
    ├── Static Files (/static/, /themes/) → Pre-built main React app
    ├── REST API (/api/*) → JWT or Session authenticated
    ├── WebSockets (/ws/*) → Session authenticated for performance
    └── React App (/ - catch-all) → Client-side routing
```

### Embedded Terminal Mode
```
Browser (any port)
    ↓
External Website/Dashboard
    ↓
<iframe src="localhost:8050/embed/?host=X&bep=8050">
    ↓
FastAPI Server
    ├── Embed Static (/embed/) → Minimal terminal React app
    ├── REST API (/api/*) → Backend auth
    ├── WebSockets (/ws/*) → SSH connection
    └── Target Device (SSH) → Final destination
```

### Request Flow - Embedded Mode

1. **Load Embed Page**: Browser fetches `/embed/` → Returns minimal terminal HTML/JS
2. **Parse URL Parameters**: Extract `host`, `port`, `name`, `bep` from URL
3. **Backend Authentication**: User logs into VelociTerm workspace
4. **WebSocket Connection**: Connect to `ws://localhost:{bep}/ws/terminal/{id}`
5. **SSH Authentication**: Provide device credentials
6. **Terminal Active**: Real-time terminal I/O through WebSocket

## Important URLs

### Main Application
- **Main Application**: http://localhost:8050
- **API Documentation**: http://localhost:8050/docs  
- **Authentication Status**: http://localhost:8050/api/auth/status
- **JWT Token Login**: http://localhost:8050/api/auth/token
- **Session Login**: http://localhost:8050/api/auth/login
- **System Stats**: http://localhost:8050/api/system/stats

### Embedded Terminal
- **Basic Embed**: http://localhost:8050/embed/?host=HOST&port=22&bep=8050
- **With Custom Name**: http://localhost:8050/embed/?host=HOST&port=22&name=MyDevice&bep=8050
- **Non-standard Port**: http://localhost:8050/embed/?host=HOST&port=2222&name=MyDevice&bep=8050

## Usage Guide

### Initial Login (Main App)
1. Navigate to http://localhost:8050
2. Choose authentication mode (Session or JWT)
3. Select authentication method (Local or LDAP)
4. **Local Mode**: Enter your Windows/Linux system username and password
5. User workspace created automatically upon first login

### Using Embedded Terminals

#### Quick Test
1. Start the demo: `python main.py`
2. Open: http://localhost:8050/embed/?host=127.0.0.1&port=22&bep=8050
3. Login to VelociTerm (your system credentials)
4. Login to device (SSH credentials)
5. Terminal connects!

#### Integration Workflow
1. **Identify Target**: Determine host IP and SSH port
2. **Build URL**: `http://your-server:8050/embed/?host={ip}&port={port}&name={name}&bep=8050`
3. **Embed**: Add to your website/dashboard via iframe
4. **Test**: Verify authentication and connection flow

#### Advanced Usage
```bash
# Local device with custom name
http://localhost:8050/embed/?host=localhost&port=22&name=LocalServer&bep=8050

# Network device
http://localhost:8050/embed/?host=192.168.1.1&port=22&name=Gateway&bep=8050

# High port
http://localhost:8050/embed/?host=10.0.0.50&port=8022&name=Container&bep=8050

# Behind reverse proxy
https://terminal.company.com/embed/?host=prod-db-01&port=22&name=Production-DB&bep=443
```

### Session Management
1. **View Sessions**: Expand folders in left sidebar
2. **Filter Sessions**: Use search box to find sessions instantly  
3. **Connect to Session**: Click session → Enter credentials → Terminal opens
4. **Create Session**: Use "+" button or session manager interface
5. **Edit Sessions**: Right-click sessions for edit options
6. **Generate Embed URL**: Right-click session → "Copy Embed URL"

### NetBox Integration
1. **Configure Token**: Go to NetBox Setup → Enter API URL and token
2. **Search Devices**: Use Device Search tab with filters
3. **Import Devices**: Select devices → Import → Sessions created automatically
4. **Connect to Device**: Click imported session to open terminal
5. **Generate Embed**: Right-click NetBox device → "Generate Embed URL"

### Terminal Features  
- **Multiple Terminals**: Open multiple SSH sessions simultaneously (main app)
- **Single Terminal**: Focused experience (embedded mode)
- **Theme Switching**: Change themes without disconnecting (13 themes available)
- **Window Management**: Drag, resize, minimize terminals (main app only)
- **Real-time I/O**: Full terminal functionality with colors
- **Authentication**: Terminals use optimized session authentication
- **Copy/Paste**: Standard terminal copy/paste support

### Authentication Testing
1. **Session Mode**: Traditional cookie-based authentication (default)
2. **JWT Mode**: Toggle to JWT for modern token-based authentication
3. **API Integration**: Both modes provide identical functionality
4. **Token Management**: JWT mode includes automatic token refresh
5. **Embed Auth**: Test two-layer authentication in embedded mode

## Technical Implementation

### Embedded Terminal Architecture

**Static File Structure:**
```
static_embed/
├── index.html              # Minimal embed entry point
├── static/
│   ├── css/
│   │   └── main.{hash}.css # Bundled terminal CSS
│   └── js/
│       └── main.{hash}.js  # Bundled terminal JavaScript
└── themes/                 # Same 13 themes as main app
    ├── theme-cyber.css
    ├── theme-amber.css
    └── ...
```

**URL Parameter Parsing:**
```javascript
// Embed app reads URL parameters on load
const params = new URLSearchParams(window.location.search);
const config = {
  host: params.get('host'),           // Required
  port: params.get('port') || 22,     // Default: 22
  name: params.get('name') || 'Terminal',  // Default: 'Terminal'
  bep: params.get('bep') || window.location.port  // Backend port
};

// Configure API and WebSocket endpoints
const apiBase = `${window.location.protocol}//${window.location.hostname}:${config.bep}`;
const wsBase = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:${config.bep}`;
```

**Connection Flow:**
1. Parse URL parameters (including `bep`)
2. Render authentication overlay
3. User authenticates to VelociTerm backend using `bep` port
4. Establish WebSocket to `/ws/terminal/{id}` on `bep` port
5. Send SSH connection request with `host` and `port` from URL
6. Prompt for device SSH credentials
7. Terminal becomes active

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
- **Embed Sessions**: Embedded terminals use session cookies for simplicity

### Static File Serving

FastAPI's `StaticFiles` middleware serves pre-built React assets:
- `/static/` → Main app CSS/JS bundles (pre-compiled)
- `/embed/` → Embedded terminal CSS/JS bundles (pre-compiled)
- `/themes/` → Theme files shared by both apps (13 complete themes)
- Catch-all route → `index.html` for client-side routing (main app)
- `/embed/` route → `index.html` for embedded terminal

### Data Storage

- **File-based**: YAML sessions, encrypted JSON for sensitive data
- **Per-user**: Isolated workspaces in `/workspaces/{username}/`
- **Encryption**: PBKDF2 key derivation for user-specific encryption
- **Cross-platform**: Windows/Linux compatible file handling
- **SSH Keys**: Per-user SSH key storage for passwordless authentication

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

# Configure CORS for embed support
export CORS_ALLOWED_ORIGINS="https://dashboard.company.com,https://netbox.company.com"

# Start production server
python main.py
```

### Embedded Terminal CORS Configuration

For embedding in external sites, configure CORS in `config.yaml`:

```yaml
cors:
  allowed_origins:
    - "https://dashboard.company.com"
    - "https://netbox.company.com"
    - "https://wiki.company.com"
  allow_credentials: true
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
- Verify `static_embed/index.html` exists for embed support
- Check FastAPI logs for static file errors
- Ensure all static assets are present in respective directories

**WebSocket Connection Issues**
- Verify WebSocket URL uses correct port (8050 or bep value)
- Check browser developer tools for connection errors
- Ensure no firewall blocking WebSocket connections
- Verify `bep` parameter is correct in embed URL

**Embed-Specific Issues**

**Problem: "Failed to connect to backend"**
```
Solution: Check the bep parameter matches your backend port
# If backend is on port 3000:
http://localhost:8050/embed/?host=X&bep=3000  ❌ Wrong
http://localhost:3000/embed/?host=X&bep=3000  ✅ Correct
```

**Problem: CORS errors in browser console**
```
Solution: Add the embedding site to CORS configuration
# In config.yaml:
cors:
  allowed_origins:
    - "https://your-dashboard.com"
```

**Problem: "bep parameter is required"**
```
Solution: Always include bep parameter in embed URLs
http://localhost:8050/embed/?host=X  ❌ Missing bep
http://localhost:8050/embed/?host=X&bep=8050  ✅ Correct
```

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

# Configure CORS for production domains
export CORS_ALLOWED_ORIGINS="https://dashboard.company.com,https://netbox.company.com"

# Enable HTTPS (recommended)
uvicorn main:app --host 0.0.0.0 --port 8050 \
  --ssl-keyfile=key.pem --ssl-certfile=cert.pem
```

### Deployment Options

- **Systemd Service**: Run as system service on Linux
- **Docker Container**: Containerized deployment
- **Reverse Proxy**: Use nginx for SSL termination and load balancing
- **Cloud Deployment**: AWS/Azure/GCP hosting
- **CDN Integration**: Serve static assets via CDN for better performance

### Example Nginx Configuration (with Embed Support)

```nginx
server {
    listen 443 ssl http2;
    server_name terminal.company.com;

    ssl_certificate /etc/ssl/certs/terminal.crt;
    ssl_certificate_key /etc/ssl/private/terminal.key;

    # Main application
    location / {
        proxy_pass http://localhost:8050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Embedded terminal
    location /embed/ {
        proxy_pass http://localhost:8050/embed/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS headers for embedding
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:8050/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8050/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Validation Tests

### Authentication Testing
```bash
# Test available authentication methods  
curl http://localhost:8050/api/auth/methods

# Test JWT authentication
curl -X POST http://localhost:8050/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password","auth_method":"local"}'

# Test session authentication
curl -X POST http://localhost:8050/api/auth/login \
  -H "Authorization: Basic $(echo -n 'your_username:your_password' | base64)"

# Test API with JWT
curl -X GET http://localhost:8050/api/sessions \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Embedded Terminal Testing

1. **Basic Connection Test**
```bash
# Start server
python main.py

# Open in browser
http://localhost:8050/embed/?host=localhost&port=22&bep=8050
```

2. **Different Ports Test**
```bash
# Test with different backend ports
http://localhost:8050/embed/?host=localhost&port=22&bep=8050
http://localhost:3000/embed/?host=localhost&port=22&bep=3000
```

3. **iframe Embedding Test**
Create `test-embed.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>VelociTerm Embed Test</title>
</head>
<body>
    <h1>Embedded Terminal Test</h1>
    <iframe 
        src="http://localhost:8050/embed/?host=localhost&port=22&name=TestTerminal&bep=8050"
        width="100%" 
        height="600px"
        frameborder="0">
    </iframe>
</body>
</html>
```

4. **Multiple Embeds Test**
```html
<!-- Test multiple embedded terminals on one page -->
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <iframe src="http://localhost:8050/embed/?host=host1&bep=8050"></iframe>
    <iframe src="http://localhost:8050/embed/?host=host2&bep=8050"></iframe>
</div>
```

### Frontend Integration

#### Main Application Tests
1. Login with both Session and JWT modes
2. Navigate different UI sections
3. Create/edit sessions with both auth modes
4. Test NetBox integration
5. Verify terminal WebSocket connections
6. Test theme switching (13 themes available)

#### Embedded Terminal Tests
1. Load embed URL with all parameters
2. Verify authentication overlay appears
3. Login to VelociTerm workspace
4. Enter SSH credentials
5. Verify terminal connection
6. Test input/output
7. Test theme application
8. Test multiple simultaneous embeds

### Terminal Testing
1. Create or select a session
2. Enter SSH credentials  
3. Verify terminal connects and displays correctly
4. Test multiple simultaneous terminals (main app)
5. Test window management (drag, resize, minimize - main app only)
6. Test embedded terminal in iframe
7. Test embedded terminal with different themes

---

## Summary

This demo package provides a complete, production-ready VelociTerm implementation that requires only Python to run. The unified FastAPI architecture with pre-built React frontends (main app + embeddable terminal) eliminates all Node.js dependencies while providing enterprise-grade features including dual authentication, advanced session management, NetBox integration, and flexible embedding options.

**Key Benefits:**
- ✅ Zero frontend build requirements (React pre-built)
- ✅ Single Python dependency for complete functionality
- ✅ Dual authentication system (JWT + Session)
- ✅ Two deployment modes (Full app + Embeddable terminal)
- ✅ Flexible embedding with `bep` parameter
- ✅ Production-ready security features
- ✅ Enterprise-scale NetBox integration
- ✅ Professional UI with 13 themes (shared across both modes)
- ✅ Multi-platform compatibility (Windows/Linux)
- ✅ Simple iframe integration for dashboards

**Quick Start Summary:**
1. Download demo folder
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `python main.py`
5. Open http://localhost:8050 (main app)
6. Or http://localhost:8050/embed/?host=HOST&port=22&bep=8050 (embedded)

**Embedded Terminal Use Cases:**
- 🎯 Network device quick access from monitoring dashboards
- 🎯 Documentation sites with live terminal examples
- 🎯 NetBox plugin integration for direct device access
- 🎯 Custom web applications requiring SSH terminals
- 🎯 Training environments with embedded lab access
- 🎯 IT support portals with quick device access

The demo successfully validates VelociTerm's architecture as a production-ready solution for enterprise terminal management with modern authentication capabilities and flexible deployment options.

## Additional Resources

- **Main Documentation**: See parent README.md
- **Frontend Guide**: See README_Frontend.md
- **Backend API**: See README_Backend.md
- **Authentication Design**: See README_Auth_design.md
- **Embed Guide**: See README_Embed.md
- **API Documentation**: http://localhost:8050/docs (when running)