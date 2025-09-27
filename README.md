# VelociTerm NB

> **⚠️ ALPHA SOFTWARE - NOT FOR PRODUCTION USE**
> 
> VelociTerm NB is currently in alpha development phase. While fully functional for testing and evaluation, it should **NOT** be used in production environments. The authentication system has been significantly enhanced for secure testing, but additional security hardening and features are planned before production readiness.

**Professional Terminal Session Management for Network Engineers**

![VelociTerm NB Demo](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/slides3.gif)

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

**Enterprise Authentication:**
- Dual authentication system: JWT tokens and session cookies
- Local system authentication (Windows/Linux credentials)
- LDAP/Active Directory integration ready
- Secure token management with automatic refresh

**Legacy Format Compatibility:**
- Works seamlessly with existing session files from other tools
- Reads and writes standard YAML formats without disruption
- No migration required for existing workflows

## Current Project Status

> **🔬 ALPHA RELEASE - EVALUATION READY**
> 
> VelociTerm NB is fully functional for testing, evaluation, and development environments. The enhanced authentication system provides secure access for testing purposes, but production deployment requires additional security hardening and features currently in development.

**Development Status:**
- **Core Functionality**: Fully operational and stable
- **Authentication**: Enhanced security with dual JWT/Session system
- **User Interface**: Production-quality experience
- **NetBox Integration**: Complete and tested
- **Multi-Terminal SSH**: Stable and performant

**Architecture:**
- **Frontend:** React 18 with modern hooks, xterm.js terminals, WebSocket communication
- **Backend:** Python FastAPI with real-time WebSocket support, encrypted storage, NetBox API integration
- **Security:** Enhanced dual authentication (JWT + Session), encrypted credentials, per-user workspaces

**Alpha Status Features:**
- Core session management: ✅ Fully functional
- Multi-terminal SSH: ✅ Stable and tested
- NetBox integration: ✅ Complete
- User interface: ✅ Production-quality
- Authentication: ✅ Enhanced security for testing
- Production hardening: 🚧 In development

## Security Notice

**Enhanced for Testing:**
- Real system authentication required (Windows/Linux credentials)
- JWT token management with automatic refresh
- Encrypted per-user workspaces
- Session-based WebSocket security
- No demonstration/POC authentication modes

**Production Readiness Roadmap:**
- Advanced user management and role-based access control
- Comprehensive audit logging and compliance features
- Multi-factor authentication integration
- Enterprise-grade session management
- Security certification and penetration testing

## Quick Start

### Prerequisites

- **Python 3.12+** with venv support
- **Node.js v20+** (tested with v20.9.0) 
- **Git** for cloning the repository
- **System Credentials**: Windows or Linux user account for authentication

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

# Optional: Configure JWT settings for testing
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=2880  # 48 hours for testing

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

**Authentication:**
- Use your **actual system credentials** (Windows/Linux username and password)
- Toggle between JWT Token mode and Session Cookie mode
- User workspace created automatically on first login

![Login Interface](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/login.png)

### First Steps

1. **Login:** Enter your Windows/Linux system username and password
2. **Choose Auth Mode:** Toggle between Session and JWT authentication
3. **Configure NetBox (optional):** Add your NetBox API token in Settings
4. **Add Sessions:** Create your first session or import from NetBox
5. **Connect:** Click any session to open an SSH terminal

![Virtual Desktop View](https://raw.githubusercontent.com/scottpeterman/velociterm/refs/heads/dev/screenshots/virtual_desktop.png)

## Key Features in Detail

### Enhanced Authentication System

**Dual Authentication Modes:**
- **JWT Token Authentication**: Modern stateless authentication with automatic token refresh
- **Session Cookie Authentication**: Traditional authentication optimized for WebSocket connections
- **User Choice**: Toggle between authentication methods on login screen
- **Secure Fallback**: Automatic fallback between authentication modes

**Authentication Methods:**
- **Local Authentication**: Windows/Linux system credentials with secure validation
- **LDAP Integration**: Enterprise directory authentication (configurable)
- **Real Credentials Required**: No demonstration modes - actual system authentication only

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
- Secure per-user token management

## Architecture Overview

### Component Structure

**Backend (Python/FastAPI):**
- Enhanced dual authentication API (JWT + Session)
- Real-time WebSocket SSH terminal management
- Encrypted per-user workspaces with secure credential storage  
- NetBox API integration with error handling and validation
- Modular authentication system supporting multiple backends

**Frontend (React):**
- Modern component architecture with performance optimization
- Advanced session management with real-time filtering
- Professional window management with floating terminals
- Complete theme system with 13+ variants
- Authentication mode selection and transparent token management

### Security Model

**Current Alpha Implementation:**
- Enhanced dual authentication system (JWT + Session)
- Real system credential validation (Windows/Linux)
- Per-user encrypted workspaces using PBKDF2 key derivation
- Automatic JWT token refresh with graceful fallback
- IP-based WebSocket validation for terminal access
- Secure cookie management and session cleanup

**Production Security Roadmap:**
- Multi-factor authentication support
- Role-based access control with granular permissions
- Comprehensive audit logging and compliance reporting
- Advanced session management with timeout policies
- Security certification and penetration testing

## Deployment Options

### Development/Testing Environment

The current setup is designed for development and secure testing:

**Development Features:**
- Hot reload for both backend and frontend
- Comprehensive logging with configurable levels
- Browser developer tools integration
- WebSocket message inspection and debugging

**Testing Security:**
- Real authentication required (no demo modes)
- Encrypted workspace storage
- Secure token management
- Session isolation and cleanup

### Alpha Testing Deployment

**Single-Server Testing:**
```bash
# Production build testing
cd vtnb_fe
npm run build
cp -r build/* ../static/

# Run with enhanced security
export JWT_SECRET_KEY="$(openssl rand -base64 32)"
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
python main.py
```

**Security Considerations for Testing:**
- Use HTTPS in any networked testing environment
- Implement proper firewall rules
- Monitor authentication logs
- Limit access to authorized test users only

## Contributing and Support

### Repository Structure

```
velociterm/
├── main.py                      # Backend entry point with JWT support
├── requirements.txt             # Python dependencies
├── config.yaml                  # Authentication configuration
├── models.py                   # Data models and schemas
├── workspace_manager.py        # Session and workspace management
├── routes/                     # Modular authentication system
│   ├── auth.py                # JWT + Session authentication
│   ├── jwt_handler.py         # JWT token management
│   └── auth_dependencies.py   # Dual authentication support
├── README_Backend.md           # Backend documentation
└── vtnb_fe/                   # Frontend application
    ├── package.json           # Node.js dependencies
    ├── src/                   # React components with auth support
    └── README_Frontend.md     # Frontend documentation
```

### Development Workflow

**Getting Started:**
1. Fork the repository and create a feature branch
2. Follow the setup instructions above
3. Test with both JWT and Session authentication modes
4. Submit pull requests with detailed descriptions

**Code Standards:**
- Python: Follow PEP 8 with comprehensive error handling
- React: Component-based architecture with performance optimization
- Authentication: Test both JWT and Session modes
- Documentation: Update READMEs for significant changes

## Alpha Testing Guidelines

### Recommended Testing Environments

**Suitable for Alpha Testing:**
- Development and staging environments
- Internal testing and evaluation
- Proof-of-concept deployments
- Educational and training use

**NOT Suitable (Production Environments):**
- Customer-facing systems
- Business-critical infrastructure
- Uncontrolled network access
- Production device management

### Reporting Issues

When reporting issues during alpha testing:
1. Include authentication mode used (JWT vs Session)
2. Specify authentication method (Local vs LDAP)
3. Provide browser and system information
4. Include relevant console errors
5. Document steps to reproduce

## Roadmap to Production

### Near-Term (Current Development)

**Security Enhancements:**
- Advanced user management and role-based access control
- Multi-factor authentication integration
- Comprehensive audit logging
- Enhanced session management policies

**Enterprise Features:**
- LDAP/Active Directory production integration
- Team collaboration and session sharing
- Configuration management integration
- High availability deployment options

### Medium-Term Goals

**Production Readiness:**
- Security certification and penetration testing
- Performance optimization for enterprise scale
- Container deployment with orchestration
- Backup and disaster recovery features

**Integration Expansion:**
- Additional DCIM platform support
- Monitoring system connectivity
- API extensibility for custom integrations
- Mobile application development

## License and Acknowledgments

VelociTerm NB is developed for network professionals who need efficient, organized access to infrastructure devices. The project builds on excellent open-source libraries including React, xterm.js, FastAPI, and Paramiko.

**Key Dependencies:**
- **xterm.js:** Professional terminal emulation
- **React:** Modern user interface framework  
- **FastAPI:** High-performance Python web framework
- **Paramiko:** Pure Python SSH implementation
- **PyJWT:** JSON Web Token implementation

---

> **⚠️ ALPHA SOFTWARE REMINDER**
> 
> VelociTerm NB is currently in alpha development. While fully functional and significantly more secure than initial versions, it is not ready for production deployment. Use only in testing, development, and evaluation environments.

*VelociTerm NB - Alpha Release for Testing and Evaluation*

**Repository:** https://github.com/scottpeterman/velociterm/tree/dev  
**Status:** Alpha - Functional for testing, enhanced security, not production-ready  
**Setup Time:** Clone, install, and run in under 5 minutes