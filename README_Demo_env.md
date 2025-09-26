# VelociTerm Demo Server

A unified FastAPI server that serves both the React frontend and provides backend API/WebSocket functionality for terminal management, SSH connections, and NetBox integration.

## Architecture Overview

This demo implementation uses a **unified server design** where a single FastAPI process handles:

- **Static File Serving**: React build files (HTML, CSS, JS, themes)
- **REST API Endpoints**: Session management, NetBox integration, user settings
- **WebSocket Connections**: Real-time SSH terminals and tool execution
- **User Workspaces**: Encrypted per-user data storage

### Design Benefits

- **Single Process**: One server handles all functionality
- **Single Port**: Everything accessible via port 8050
- **No CORS Issues**: Frontend and backend share the same origin
- **Simple Deployment**: No reverse proxy or separate frontend server needed
- **Resource Efficient**: Lower overhead than multi-service architectures

## File Structure

```
demo/velociterm_web/
├── main.py                    # FastAPI server with static file serving
├── models.py                  # Pydantic data models
├── workspace_manager.py       # User data and NetBox integration
├── ssh_manager.py            # SSH connection handling
├── connection_handlers.py    # WebSocket management
├── requirements.txt          # Python dependencies
├── static/                   # React build files
│   ├── index.html           # Main React app entry point
│   ├── static/              # Compiled CSS/JS assets
│   │   ├── css/
│   │   └── js/
│   └── themes/              # UI theme files
└── workspaces/              # Per-user data storage
    └── <username>/
        ├── sessions.yaml        # User's session definitions
        ├── settings.yaml        # User preferences
        └── netbox_config.json.enc # Encrypted NetBox API token
```

## Key Features Demonstrated

### 1. Session Management
- **CRUD Operations**: Create, read, update, delete sessions and folders
- **Legacy Format Support**: Compatible with existing session files
- **Folder Organization**: Hierarchical session organization
- **Real-time Filtering**: Search across session properties

### 2. SSH Terminal Management  
- **WebSocket-based Terminals**: Real-time SSH connections
- **Multi-terminal Support**: Multiple simultaneous sessions
- **Window Management**: Floating, resizable terminal windows
- **Connection Status**: Live connection indicators

### 3. NetBox Integration
- **Device Discovery**: Search NetBox devices with filtering
- **Bulk Import**: Convert NetBox devices to sessions
- **Encrypted Token Storage**: Secure API token management
- **Site Organization**: Automatic folder creation by site

### 4. User Interface
- **13 Theme Variants**: Professional dark/light themes
- **Responsive Design**: Works on desktop and tablet
- **Real-time Updates**: Live session status and filtering
- **Professional UI**: Modern terminal interface

## Setup Instructions

### Prerequisites

- Python 3.12+
- Node.js 20+ (for building React frontend)
- Git

### Step 1: Prepare the Frontend Build

```bash
# Build the React frontend (from project root)
cd vtnb_fe
npm install
npm run build
```

### Step 2: Set Up Demo Environment

```bash
# Create demo directory structure
mkdir -p demo/velociterm_web/static

# Copy backend files to demo
cp main.py models.py workspace_manager.py ssh_manager.py connection_handlers.py requirements.txt demo/velociterm_web/

# Copy React build to static directory  
cp -r vtnb_fe/build/* demo/velociterm_web/static/

# Navigate to demo directory
cd demo/velociterm_web
```

### Step 3: Modify FastAPI for Static Serving

Add these imports to `main.py`:
```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
```

Add this method to the `VelociTermBackend` class:
```python
def setup_static_files(self):
    """Setup static file serving for React build"""
    
    # Mount static directories
    self.app.mount("/static", StaticFiles(directory="static/static"), name="assets")
    self.app.mount("/themes", StaticFiles(directory="static/themes"), name="themes")
    
    # Serve React app for non-API routes
    @self.app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        # Skip API and WebSocket routes
        if catchall.startswith(("api/", "ws/")):
            raise HTTPException(status_code=404)
        
        # Serve index.html for all other routes (client-side routing)
        return FileResponse("static/index.html")
```

Call the method in `__init__`:
```python
def __init__(self, config_path: str = "config.yaml"):
    # ... existing code ...
    self.setup_middleware()
    self.setup_routes()
    self.setup_static_files()  # Add this line
```

### Step 4: Install Dependencies and Run

```bash
# Install Python dependencies
pip install -r requirements.txt
pip install aiofiles  # For static file serving

# Start the server
python main.py
```

### Step 5: Access the Demo

Open your browser to: **http://localhost:8050**

# VelociTerm Demo

A FastAPI/React web-based SSH terminal application with NetBox integration and multi-session management.

## Quick Start

### Prerequisites
- Python 3.8+ installed on your system
- Internet connection for package installation

### Installation & Setup

1. **Download the Demo**
   ```bash
   # Option 1: Clone the full repository and navigate to demo
   git clone <repository-url>
   cd <repository-name>/demo/velociterm_web
   
   # Option 2: Download just the demo folder
   # Extract the demo folder to your desired location
   cd path/to/demo/velociterm_web
   ```

2. **Create Virtual Environment**
   
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

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Application**
   ```bash
   python main.py
   ```

5. **Access the Application**
   - Open your web browser
   - Navigate to: `http://localhost:8050/index.html`

### Important URLs
- **Main Application**: http://localhost:8050/index.html
- **API Documentation**: http://localhost:8050/docs
- **Backend API**: http://localhost:8050
- **Auth Status**: http://localhost:8050/api/auth/status
- **System Stats**: http://localhost:8050/api/system/stats

## Usage Guide

### Initial Login
- Use any username/password combination (POC authentication mode)
- User workspace will be created automatically

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
- **Theme Switching**: Change themes without disconnecting
- **Window Management**: Drag, resize, minimize terminals
- **Real-time I/O**: Full terminal functionality with colors

## Features

- **Web-based SSH Terminal**: No need for separate terminal applications
- **Multi-session Management**: Handle multiple SSH connections simultaneously
- **NetBox Integration**: Import devices directly from NetBox
- **Theme Support**: Multiple terminal themes including CRT and paper styles
- **Session Persistence**: Sessions are saved and can be reconnected
- **Real-time Terminal**: Full terminal functionality with color support
- **Responsive Design**: Works on desktop and mobile devices

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# If port 8050 is busy, kill the process or change the port in main.py
netstat -ano | findstr :8050  # Windows
lsof -ti:8050 | xargs kill    # Linux/macOS
```

**Module Not Found Errors**
```bash
# Ensure virtual environment is activated and dependencies installed
pip install -r requirements.txt
```

**Permission Denied (Linux/macOS)**
```bash
# Make sure you have proper permissions
chmod +x main.py
```

**Browser Can't Connect**
- Check that the application is running (look for "Uvicorn running" message)
- Verify you're using the correct URL: `http://localhost:8050/index.html`
- Try refreshing the page or clearing browser cache

### Development Mode
The application runs with auto-reload enabled, so code changes will automatically restart the server.

## File Structure

```
velociterm_web/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies  
├── models.py           # Data models
├── connection_handlers.py # SSH connection logic
├── ssh_manager.py      # SSH session management
├── workspace_manager.py # User workspace handling
├── static/             # Built React frontend
│   ├── index.html     # Main HTML entry point
│   ├── static/        # CSS/JS assets
│   └── themes/        # Terminal themes
└── workspaces/        # User data storage
    └── [username]/    # Individual user workspaces
```

## Support

This is a demonstration version of VelociTerm. For questions or issues:
1. Check the troubleshooting section above
2. Review the API documentation at http://localhost:8050/docs
3. Check the browser console for error messages

---

**Note**: This demo uses simplified authentication for testing purposes. In production, implement proper security measures.
## Network Architecture

```
Browser (port 8050)
    ↓
FastAPI Server
    ├── Static Files (/static/, /themes/)
    ├── REST API (/api/*)  
    ├── WebSockets (/ws/*)
    └── React App (/ - catch-all)
```

### Request Flow

1. **Static Assets**: CSS/JS served directly from `/static/` and `/themes/`
2. **API Calls**: Frontend makes requests to `/api/*` endpoints
3. **WebSocket**: Terminals connect to `/ws/terminal/{window_id}`
4. **Client Routing**: All other URLs serve React's `index.html`

## Technical Implementation

### Static File Serving

FastAPI's `StaticFiles` middleware serves React build assets:
- `/static/` → CSS/JS bundles  
- `/themes/` → Theme files
- Catch-all route → `index.html` for client-side routing

### WebSocket Architecture

```python
# Terminal WebSocket connection
ws://localhost:8050/ws/terminal/{window_id}

# Message types:
{"type": "connect", "hostname": "10.0.1.1", "username": "admin", "password": "***"}
{"type": "input", "data": "show version\n"}
{"type": "resize", "cols": 120, "rows": 30}
```

### Data Storage

- **File-based**: YAML sessions, encrypted JSON for sensitive data
- **Per-user**: Isolated workspaces in `/workspaces/{username}/`
- **Encryption**: PBKDF2 key derivation for user-specific encryption

## Validation Tests

### Basic Functionality
```bash
# Test static serving
curl http://localhost:8050/

# Test API endpoints  
curl http://localhost:8050/api/health
curl -u test:test http://localhost:8050/api/auth/login

# Test theme serving
curl http://localhost:8050/themes/theme-cyber.css
```

### Frontend Integration
1. Login with any credentials
2. Navigate different UI sections
3. Create/edit sessions
4. Search and filter functionality
5. Theme switching

### Terminal Testing
1. Create or select a session
2. Enter SSH credentials  
3. Verify terminal connects and displays correctly
4. Test multiple simultaneous terminals
5. Test window management (drag, resize)

## Troubleshooting

### Server Won't Start
- Check port 8050 availability: `lsof -i :8050`
- Verify all Python dependencies installed
- Check for import errors in logs

### Static Files Not Loading
- Ensure React build copied to `static/` directory
- Verify `static/index.html` exists
- Check FastAPI logs for static file errors

### WebSocket Connection Issues
- Verify WebSocket URL uses correct port (8050)
- Check browser developer tools for connection errors
- Ensure no firewall blocking WebSocket connections

### NetBox Integration Problems
- Verify NetBox URL and token configuration
- Check SSL certificate settings (demo disables SSL verification)
- Review FastAPI logs for API request errors

## Production Considerations

### Security Enhancements Needed
- Replace POC authentication with proper user management
- Implement user-controlled master passwords
- Add session token rotation
- Enable SSL/TLS for production deployment

### Scalability Improvements
- Consider database storage for large user bases
- Implement connection pooling for SSH sessions
- Add horizontal scaling capabilities
- Implement proper logging and monitoring

### Deployment Options
- **Systemd Service**: Run as system service on Linux
- **Docker Container**: Containerized deployment
- **Reverse Proxy**: Use nginx for SSL termination and load balancing
- **Cloud Deployment**: AWS/Azure/GCP hosting

## Development Notes

### Code Organization
- Backend logic remains modular and testable
- Static serving added with minimal changes to existing code
- Clear separation between API routes and static routes

### Performance Characteristics
- Single process reduces deployment complexity
- StaticFiles middleware provides efficient asset serving
- WebSocket connections handle real-time terminal I/O effectively

### Maintenance
- React builds can be updated by copying new build files
- Backend updates require server restart
- User data persists across server restarts

---

## Summary

This demo server design successfully validates the unified FastAPI approach for serving both React frontend and backend functionality. The architecture provides a production-ready foundation with room for security and scalability enhancements as requirements grow.

**Key Validation Points:**
- ✅ React build integration successful
- ✅ API endpoints function correctly  
- ✅ WebSocket terminals work reliably
- ✅ NetBox integration operational
- ✅ User workspace persistence confirmed
- ✅ Multi-theme support functional

The single-server design simplifies deployment while maintaining all core functionality, making it an effective solution for both demonstration and production use cases.