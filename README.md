# Velociterm
Velociterm is a modern, web-based SSH terminal manager with a sleek cyber-themed interface. It provides centralized management of SSH sessions with support for both personal and system-wide session configurations.

![Velociterm Demo](https://raw.githubusercontent.com/scottpeterman/velociterm/main/screenshots/slides1.gif)

## ⚠️ Important Notice
Velociterm is currently in Proof of Concept (POC) stage and is under active development. While functional, it is not yet recommended for production environments. The codebase and features are subject to significant changes. Feel free to test, contribute, and provide feedback, but please exercise caution in production or security-critical environments.



## Features

### Terminal Management
- Multi-tab SSH terminal interface
- Real-time terminal resizing and fit-to-window
- Session persistence
- Tab management with context menu options
- WebSocket-based live terminal updates

### Session Management
- Support for both system-wide and personal session configurations
- YAML-based session configuration
- Folder organization for sessions
- Quick connect functionality for one-off connections
- Search functionality across all session properties

### NetBox Integration
- Optional NetBox device search integration
- Real-time device discovery
- Direct connection to NetBox-managed devices
- Automatic session configuration from NetBox data

### Themes
- Multiple built-in themes:
  - CRT Cyber (dark blue cyberpunk theme)
  - CRT Green (classic terminal green)
  - CRT Amber (amber monochrome)
  - CRT Mono (monochrome display)
  - Light (light mode theme)
  - Default (dark mode)

### Authentication & Security
- User authentication system
- LDAP integration support
- Secure credential management
- SSL/TLS support for secure connections
- Session isolation

### User Settings
- Persistent user preferences
- Theme selection
- Session configuration source selection (System vs Personal)
- Custom YAML session configuration editor
- YAML validation

## Configuration

### Session Configuration Format
```yaml
- folder_name: Group Name
  sessions:
    - DeviceType: device_type
      Model: device_model
      SerialNumber: serial_number
      SoftwareVersion: sw_version
      Vendor: vendor_name
      display_name: friendly_name
      host: hostname_or_ip
      port: '22'
```

### User Settings
Users can configure:
- Theme preference
- Session file location (system or personal)
- Custom session configurations
- NetBox integration settings

## Technical Details

Built with:
- Backend: Python/FastAPI
- Frontend: HTML5/JavaScript
- WebSocket for real-time terminal communication
- YAML for configuration
- Optional NetBox API integration

## System Requirements
- Modern web browser with WebSocket support
- Python 3.9+
- Network access to target SSH hosts
- Optional: NetBox instance for device discovery

## Setup
1. Install dependencies
2. Configure server settings
3. Set up authentication
4. Configure session files
5. (Optional) Configure NetBox integration

## Security Considerations
- All credentials are transmitted securely
- Support for SSL/TLS
- Session isolation between users
- LDAP integration for enterprise environments

## Usage Tips
- Use the search function to quickly find sessions
- Organize sessions into logical folders
- Take advantage of the quick connect feature for temporary connections
- Use personal session files for user-specific connections
- Leverage NetBox integration for large infrastructure environments

## Themes
The application comes with several themes optimized for different use cases:
- CRT themes for classic terminal feel
- Cyber theme for modern aesthetic
- Light theme for high-contrast environments
