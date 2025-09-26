# VelociTerm NB

**Professional Terminal Session Management for Network Engineers**

![VelociTerm NB Demo](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/slides2.gif)

VelociTerm NB is a web-based platform that organizes and manages SSH connections to network devices, with advanced session filtering, NetBox integration, and multi-terminal capabilities. Built specifically for network professionals managing complex infrastructure.

## What is VelociTerm NB?

VelociTerm NB solves the common problem of managing dozens or hundreds of network device connections. Instead of juggling multiple SSH clients, remembering IP addresses, and manually organizing connections, VelociTerm provides:

### Core Capabilities

**Advanced Session Management:**
- Organize network devices in folders by site, function, or custom criteria
- Real-time filtering across device names, IPs, types, and platforms
- Complete CRUD operations for sessions and folders
- Bulk import from NetBox with automatic organization

**Professional Multi-Terminal Interface:**
- Multiple simultaneous SSH sessions in floating windows
- Full terminal functionality with colors, interactive prompts, and proper sizing
- 13+ professional themes including CRT, Matrix, and Solarized variants
- Live theme switching without disconnecting active sessions

**NetBox Integration:**
- Direct integration with NetBox DCIM for device discovery
- Search and filter devices by site, platform, and status
- Automatic session creation with proper metadata
- Encrypted per-user API token storage

**Legacy Format Compatibility:**
- Works seamlessly with existing session files from other tools
- Reads and writes standard YAML formats without disruption
- No migration required for existing workflows

## Who Should Use VelociTerm NB?

**Primary Users:**
- Network Engineers managing router/switch infrastructure
- NOC teams needing organized device access
- System Administrators with server fleets
- DevOps teams managing cloud and on-premises infrastructure

**Use Cases:**
- Daily network device management and troubleshooting
- Organized access to lab and production environments  
- NetBox-driven device lifecycle management
- Team environments requiring consistent device organization
- Migration from traditional SSH client workflows

## Current Project Status

**Demo Ready:** VelociTerm NB is fully functional for demonstration and pilot deployments. Core functionality is production-quality with some authentication enhancements planned.

**Architecture:**
- **Frontend:** React 18 with modern hooks, xterm.js terminals, WebSocket communication
- **Backend:** Python FastAPI with real-time WebSocket support, encrypted storage, NetBox API integration
- **Security:** Session-based authentication, encrypted credentials, per-user workspaces

**Production Readiness:**
- Core session management: Production ready
- Multi-terminal SSH: Production ready  
- NetBox integration: Production ready
- User interface: Production ready
- Authentication: POC level (enhancement roadmap available)

## Quick Start

### Prerequisites

- **Python 3.12+** with venv support
- **Node.js v20+** (tested with v20.9.0)
- **Git** for cloning the repository

### Setup Instructions

**1. Clone the Development Repository:**
```bash
git clone https://github.com/scottpeterman/velociterm.git
cd velociterm
git checkout dev
```

**2. Backend Setup:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend server
python main.py
```
Backend will run on `http://localhost:8050`

**3. Frontend Setup (new terminal):**
```bash
# Navigate to frontend directory
cd vtnb_fe

# Install dependencies
npm install

# Start development server
npm start
```
Frontend will open automatically at `http://localhost:3000`

**That's it!** VelociTerm NB is now running and ready to use.

![Login Interface](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/login.png)

### First Steps

1. **Login:** Use any username/password (POC authentication)
2. **Configure NetBox (optional):** Add your NetBox API token in Settings
3. **Add Sessions:** Create your first session or import from NetBox
4. **Connect:** Click any session to open an SSH terminal

![Virtual Desktop View](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/virtual_desktop.png)

## Key Features in Detail

### Advanced Session Organization

![Settings Interface](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/settings_cyber.png)

**Smart Filtering:**
- Search across device names, IP addresses, device types, platforms, and folders
- Auto-expand behavior: folders expand when filtering, collapse when cleared
- Real-time results with performance optimization for large device collections
- Result counting with contextual empty states

**Folder Management:**
- Hierarchical organization with visual connection status indicators
- Create, rename, and delete folders with validation
- Move sessions between folders with drag-and-drop support
- Automatic organization by NetBox site information

### Professional Terminal Experience

![Multi-Terminal with Different Themes](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/multi_window_multi_theme.png)

**Multi-Terminal Support:**
- Open multiple SSH sessions simultaneously in floating windows
- Each terminal maintains independent configuration and theme
- Proper window management with drag, resize, minimize, and focus handling
- Real-time connection status tracking

![Three Terminal Windows](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/3window.png)

**Terminal Features:**
- Full xterm.js integration with addon support (search, web links, fit)
- True color support and proper terminal emulation
- Dynamic resizing and font configuration
- Connection error handling with auto-reconnect logic

### Professional Theme System

![Corporate Theme](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/corp_theme.png)

![Monospace Theme](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/mono_theme.png)

![Theme Selection](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/settings_theme_list.png)

**13+ Professional Themes:**
- CRT variants (Cyber, Amber, Green, Mono)
- Corporate themes for professional environments
- Light themes for daytime usage
- Forest and paper themes for comfortable viewing
- Live theme switching without disconnecting sessions

### NetBox Integration Excellence

![NetBox Device Search](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/device_search_cyber.png)

![NetBox Device Login](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/netbox_device_login.png)

![Per-User Token Management](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/per_user_token_mgmt.png)

**Device Discovery:**
- Real-time device search with site, platform, and status filtering
- Compact and card view modes for different workflows
- Bulk device selection and import capabilities
- Connection testing and API validation

**Seamless Workflow:**
1. Configure encrypted NetBox API token
2. Search and filter devices by criteria
3. Select devices for import (single or bulk)
4. Sessions created automatically with NetBox metadata
5. Connect immediately or organize in custom folders

### Legacy Compatibility

**Existing Tool Integration:**
VelociTerm NB works with existing session files from other network tools:

```yaml
# Your existing format works unchanged
- folder_name: "Lab Network"
  sessions:
    - DeviceType: cisco_ios      # Automatically mapped internally
      display_name: usa-rtr-1
      host: 172.16.1.1
      port: '22'                 # String ports handled correctly
```

**Theme Consistency Across All Interfaces:**

![Settings - Cyber Theme](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/settings_cyber.png)

![Settings - Light Theme](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/settings_light.png)

**Benefits:**
- No migration required for existing workflows
- Maintains compatibility with other tools in your ecosystem
- Preserves investment in current session organization
- Complete theme integration across all application interfaces

## Architecture Overview

### Component Structure

**Backend (Python/FastAPI):**
- Session-authenticated API with comprehensive CRUD operations
- Real-time WebSocket SSH terminal management
- Encrypted per-user workspaces with secure credential storage  
- NetBox API integration with error handling and validation
- Tool execution framework for network utilities

**Frontend (React):**
- Modern component architecture with performance optimization
- Advanced session management with real-time filtering
- Professional window management with floating terminals
- Complete theme system with 13+ variants
- Responsive design supporting desktop and tablet usage

### Security Model

**Current Implementation:**
- Session-based authentication with secure cookie management
- Per-user encrypted workspaces using PBKDF2 key derivation
- No credential persistence in browser storage
- IP-based WebSocket validation for terminal access
- Automatic session cleanup and security timeouts

**Production Roadmap:**
- User-controlled master passwords
- LDAP/Active Directory integration
- Multi-factor authentication support
- Role-based access control
- Comprehensive audit logging

## Development and Deployment

### Development Environment

The development setup is designed for immediate productivity:

**Hot Reload:**
- Backend auto-reloads on Python file changes
- Frontend hot-reloads on React component updates
- WebSocket connections maintained during development

**Debugging:**
- Comprehensive logging with configurable levels
- Browser developer tools integration
- WebSocket message inspection
- Error boundary reporting

### Production Deployment Considerations

**Scaling Characteristics:**
- Supports 50+ concurrent users tested
- 100+ simultaneous SSH sessions per user
- Handles thousands of saved sessions efficiently
- Low resource overhead (~50MB base + 5MB per active SSH session)

**Deployment Options:**
- Single-server deployment for teams up to 100 users
- Container-ready with Docker support planned
- Reverse proxy compatible (nginx, Apache)
- SSL/HTTPS support for production security

## Contributing and Support

### Repository Structure

```
velociterm/
├── main.py                 # Backend entry point
├── requirements.txt        # Python dependencies
├── models.py              # Data models and schemas
├── workspace_manager.py   # Session and workspace management
├── connection_handlers.py # WebSocket and SSH management
├── README_Backend.md      # Backend documentation
└── vtnb_fe/              # Frontend application
    ├── package.json      # Node.js dependencies
    ├── src/              # React components and logic
    └── README_Frontend.md # Frontend documentation
```

### Development Workflow

**Getting Started:**
1. Fork the repository and create a feature branch
2. Follow the setup instructions above
3. Make changes and test locally
4. Submit pull requests with detailed descriptions

**Code Standards:**
- Python: Follow PEP 8 with comprehensive error handling
- React: Component-based architecture with performance optimization
- Documentation: Update READMEs for significant changes
- Testing: Include test cases for new functionality

## Roadmap

### Near-Term Enhancements

**Authentication & Security:**
- Enhanced authentication with LDAP/AD support
- User-controlled encryption keys
- Multi-factor authentication integration
- Role-based access control

**User Experience:**
- Mobile-responsive improvements
- Additional theme variants
- Session templates and cloning
- Connection scheduling

### Medium-Term Goals

**Enterprise Features:**
- Multi-tenant support with organization isolation
- Team collaboration and session sharing
- Comprehensive audit logging and compliance reporting
- High availability deployment options

**Integration Expansion:**
- Additional DCIM platform support (Device42, etc.)
- Configuration management integration
- Monitoring system connectivity
- API extensibility for custom integrations

## License and Acknowledgments

VelociTerm NB is developed for network professionals who need efficient, organized access to infrastructure devices. The project builds on excellent open-source libraries including React, xterm.js, FastAPI, and Paramiko.

**Key Dependencies:**
- **xterm.js:** Professional terminal emulation
- **React:** Modern user interface framework  
- **FastAPI:** High-performance Python web framework
- **Paramiko:** Pure Python SSH implementation

---

*VelociTerm NB - Streamlining network device management for infrastructure professionals*

**Repository:** https://github.com/scottpeterman/velociterm/tree/dev  
**Demo Ready:** Clone, install, and run in under 5 minutes