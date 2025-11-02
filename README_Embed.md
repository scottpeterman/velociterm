# VelociTerm Embedded Terminal (VelociTerm NB)

A lightweight, iframe-friendly SSH terminal component designed for seamless integration with NetBox and other web applications.

## Overview

VelociTerm NB (NetBox) is a production-ready embedded terminal that provides secure SSH access through a modern web interface. It uses JWT authentication for the UI and session cookies for WebSocket connections, providing the best of both worlds: stateless REST API calls and persistent WebSocket sessions.

## Architecture

### Dual Authentication System

VelociTerm uses a sophisticated dual-authentication architecture that solves cross-origin authentication challenges:

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User Login (JWT Authentication)
   ├─ Frontend → POST /api/auth/token
   ├─ Backend authenticates (Windows/LDAP/PAM)
   ├─ Backend creates JWT access token (15 min)
   ├─ Backend creates JWT refresh token (7 days)
   ├─ Backend ALSO creates session cookie (1 hour, for WebSocket)
   └─ Frontend stores tokens in localStorage

2. REST API Calls (JWT)
   ├─ Frontend sends: Authorization: Bearer <jwt_token>
   ├─ Backend validates JWT signature
   └─ Works perfectly cross-origin (localhost:3000 → localhost:8050)

3. WebSocket Connection (Session Cookie)
   ├─ Browser auto-sends session cookie with WebSocket upgrade
   ├─ Backend validates session
   └─ Maintains persistent SSH connection

4. Token Refresh (Automatic)
   ├─ Frontend detects 401 on API call
   ├─ Frontend → POST /api/auth/refresh with refresh_token
   ├─ Backend returns new access_token
   └─ Frontend retries original request
```

### Why This Architecture?

| Challenge | Solution | Benefit |
|-----------|----------|---------|
| Cross-origin REST API calls | JWT tokens in localStorage | Works across different ports/domains |
| WebSocket authentication | Session cookies (httponly) | Secure, automatic, browser-handled |
| Token expiration | Automatic refresh with refresh_token | Seamless UX, no re-login needed |
| Security | JWT for stateless APIs, sessions for stateful WS | Best of both worlds |

### Authentication State Management

```javascript
// Frontend State Components

1. localStorage (Persistent)
   ├─ access_token: "eyJhbGc..." (JWT, 15 min)
   ├─ refresh_token: "eyJhbGc..." (JWT, 7 days)  
   └─ velociterm_user: "DESKTOP-MACHINE$username" (for SSH key lookup)

2. Session Cookie (Automatic, httponly)
   ├─ session: "abc123..." (backend-managed, 1 hour)
   ├─ HttpOnly: true (JavaScript cannot read)
   └─ Used automatically by browser for WebSocket

3. React State (In-memory, UI only)
   ├─ isAuthenticated: true/false
   ├─ username: "username"
   └─ Lost on page refresh (validated via checkAuthStatus)
```

### Page Refresh Flow

```
Browser Refresh
      ↓
React state lost (isAuthenticated = false)
      ↓
useEffect runs on mount
      ↓
checkAuthStatus() called
      ↓
Checks localStorage for access_token
      ↓
fetch('/api/auth/status', {
  headers: { 'Authorization': 'Bearer <token>' },
  credentials: 'include'
})
      ↓
Backend validates JWT token
      ↓
Returns { authenticated: true, username, auth_method: "jwt" }
      ↓
React state updated (isAuthenticated = true)
      ↓
✅ User stays logged in!
```

## Project Structure

```
velocitermnb-frontend/
├── public/
│   └── index.html                    # React HTML template
├── src/
│   ├── EmbedApp.jsx                  # Main app component
│   ├── EmbedApp.css                  # App styles
│   ├── index.js                      # React entry point
│   ├── index.css                     # Global styles
│   ├── components/
│   │   ├── TerminalEmbed.jsx         # Terminal with xterm.js + WebSocket
│   │   ├── TerminalEmbed.css         # Terminal styles
│   │   ├── LoginOverlay.jsx          # JWT authentication overlay
│   │   └── LoginOverlay.css          # Login styles
│   ├── utils/
│   │   └── embedUtils.js             # Auth utilities & helpers
│   └── setupProxy.js                 # Development proxy configuration
├── package.json                      # Dependencies and scripts
└── README.md                         # This file
```

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- VelociTerm backend running on `localhost:8050`
- Windows (with pywin32) or Linux/macOS (with PAM or SSH)

### 1. Install Dependencies

```bash
npm install
```

Key dependencies:
- `react` - UI framework
- `xterm` - Terminal emulator
- `xterm-addon-fit` - Terminal auto-sizing
- `xterm-addon-web-links` - Clickable URLs in terminal
- `http-proxy-middleware` - Development proxy

### 2. Development Server

```bash
npm start
```

Frontend runs on: `http://localhost:3000`

The `setupProxy.js` configuration automatically proxies:
- `/api/*` → `http://localhost:8050`
- `/ws/*` → `ws://localhost:8050`

This makes all requests appear same-origin to the browser, solving CORS issues.

### 3. Backend Requirements

Your VelociTerm backend must have:

#### JWT Configuration (routes/jwt_handler.py)
```python
jwt_handler = JWTHandler(
    secret_key="your-secret-key-min-32-chars",
    access_token_expire_minutes=15,
    refresh_token_expire_days=7
)
```

#### CORS Configuration (main.py)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # React dev server
        "http://localhost:8050",    # Backend
    ],
    allow_credentials=True,          # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Authentication Endpoints (routes/auth.py)
- `POST /api/auth/token` - JWT login (returns tokens)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/methods` - Get available auth methods
- `POST /api/auth/logout` - Logout (invalidate session)

#### WebSocket Endpoint (main.py)
```python
@app.websocket("/ws/terminal/{window_id}")
async def terminal_websocket(websocket: WebSocket, window_id: str):
    # Validates session cookie automatically
    # No explicit authentication dependency needed
    await connection_handlers.ssh_manager.handle_websocket(websocket, window_id)
```

## Complete Authentication Flow

### 1. Initial Login

```
User opens: http://localhost:3000/?host=10.0.0.108&port=22&name=Device
     ↓
EmbedApp mounts → checkAuthStatus()
     ↓
No token in localStorage → authenticated = false
     ↓
LoginOverlay displays
     ↓
User enters credentials → POST /api/auth/token
     ↓
Backend validates (Windows/LDAP/PAM)
     ↓
Backend response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 900,
  "username": "DESKTOP-MACHINE$speterman",
  "groups": []
}
     ↓
+ Set-Cookie: session=abc123...; HttpOnly; Max-Age=3600
     ↓
Frontend stores:
  - localStorage.setItem('access_token', ...)
  - localStorage.setItem('refresh_token', ...)
  - localStorage.setItem('velociterm_user', ...)
  - Browser stores session cookie automatically
     ↓
✅ User authenticated!
```

### 2. SSH Connection

```
LoginOverlay → onAuthSuccess()
     ↓
TerminalEmbed displays SSH credential form
     ↓
User enters SSH username/password
     ↓
WebSocket connection:
ws://localhost:8050/ws/terminal/embed-{timestamp}
     ↓
Browser automatically sends session cookie
     ↓
Backend validates session cookie
     ↓
Backend's SimpleWindowTracker registers window
     ↓
WebSocket sends:
{
  "type": "connect",
  "hostname": "10.0.0.108",
  "port": 22,
  "username": "speterman",
  "password": "********",
  "velociterm_user": "DESKTOP-MACHINE$speterman"
}
     ↓
Backend locates SSH key:
/workspace/DESKTOP-MACHINE$speterman/keys/id_rsa
     ↓
Backend connects via SSH (key + password fallback)
     ↓
Backend sends:
{
  "type": "ssh_output",
  "data": "base64_encoded_terminal_output"
}
     ↓
Frontend decodes and writes to xterm.js terminal
     ↓
✅ SSH session established!
```

### 3. Page Refresh (Persistence)

```
User refreshes page (F5)
     ↓
React state lost (isAuthenticated = false)
     ↓
EmbedApp mounts → useEffect runs
     ↓
checkAuthStatus() called
     ↓
Reads access_token from localStorage
     ↓
fetch('/api/auth/status', {
  headers: { 'Authorization': 'Bearer <token>' },
  credentials: 'include'
})
     ↓
Backend validates JWT token signature
     ↓
Returns { authenticated: true, username, auth_method: "jwt" }
     ↓
React state updates: setAuthenticated(true)
     ↓
✅ User stays logged in! Terminal reconnects.
```

### 4. Token Refresh (Automatic)

```
Access token expires (after 15 minutes)
     ↓
User makes API call with expired token
     ↓
Backend returns 401 Unauthorized
     ↓
Frontend detects 401 in authenticatedFetch()
     ↓
Frontend → POST /api/auth/refresh
{
  "refresh_token": "eyJhbGc..."
}
     ↓
Backend validates refresh token
     ↓
Backend creates new access token
     ↓
Backend response:
{
  "access_token": "eyJhbGc... (new)",
  "refresh_token": "eyJhbGc... (rotated)",
  "token_type": "bearer"
}
     ↓
Frontend updates localStorage
     ↓
Frontend retries original request with new token
     ↓
✅ Seamless token refresh, no re-login needed!
```

## Key Implementation Details

### 1. LoginOverlay Component

**JWT-only authentication (simplified from dual-mode)**

```javascript
// Always uses JWT endpoint
const response = await fetch('http://localhost:8050/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Ensures session cookie is set
  body: JSON.stringify({ username, password, auth_method: 'local' })
});

// Store tokens
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
localStorage.setItem('velociterm_user', data.username);
```

**Why `credentials: 'include'`?**
Even though we're using JWT for authentication, we still need the session cookie for WebSocket connections. The backend creates both JWT tokens AND a session cookie in the same response.

### 2. embedUtils.js - checkAuthStatus()

```javascript
export async function checkAuthStatus() {
  const token = localStorage.getItem('access_token');
  
  let headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch('/api/auth/status', {
    method: 'GET',
    headers,
    credentials: 'include'  // Also checks session cookie as fallback
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.authenticated === true;
  }
  
  return false;
}
```

**Dual-check logic:**
1. First checks JWT token (if present in Authorization header)
2. Falls back to session cookie (if JWT not present)
3. Returns authenticated status

This supports both authentication methods seamlessly.

### 3. TerminalEmbed - WebSocket Connection

```javascript
const connectWebSocket = useCallback((username, password) => {
  const windowId = `embed-${Date.now()}`;
  const wsUrl = `ws://localhost:8050/ws/terminal/${windowId}`;
  
  const ws = new WebSocket(wsUrl);
  // Browser automatically includes session cookie
  
  ws.onopen = () => {
    // Get VelociTerm username for SSH key lookup
    const velociTermUser = localStorage.getItem('velociterm_user');
    
    ws.send(JSON.stringify({
      type: 'connect',
      hostname: connectionParams.host,
      port: connectionParams.port,
      username: username,           // SSH device username
      password: password,            // SSH device password
      velociterm_user: velociTermUser  // For SSH key path
    }));
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'ssh_output':
        // Backend sends base64 encoded data
        const decoded = atob(message.data);
        terminalInstance.current.write(decoded);
        break;
      case 'status':
        console.log('Status:', message.message);
        break;
      case 'error':
        console.error('Error:', message.message);
        break;
    }
  };
}, [connectionParams]);
```

**Critical details:**
- WebSocket uses session cookie for authentication (not JWT)
- `velociterm_user` is used to locate SSH keys: `/workspace/{velociterm_user}/keys/`
- Backend sends SSH output as base64 (must decode with `atob()`)
- No explicit window registration API call needed (automatic)

### 4. EmbedApp - Auth State Management

```javascript
function EmbedApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check authentication on mount (handles page refresh)
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuthed = await checkAuthStatus();
      setAuthenticated(isAuthed);
    } catch (err) {
      console.error('Auth check failed:', err);
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return <LoadingSpinner />;
  }

  if (!authenticated) {
    return <LoginOverlay onAuthSuccess={() => setAuthenticated(true)} />;
  }

  return <TerminalEmbed connectionParams={connectionParams} />;
}
```

**State flow:**
1. Mount → checking = true (show loading)
2. Call checkAuthStatus() → validates JWT or session
3. Update state → checking = false, authenticated = true/false
4. Render → LoginOverlay or TerminalEmbed

## URL Parameters

### Required (one of):
- `session=session-name` - Load from user's saved sessions
- `host=10.0.0.108` - Direct connection to host

### Optional:
- `port=22` - SSH port (default: 22)
- `name=DeviceName` - Display name for terminal
- `theme=cyberpunk-teal` - Terminal theme
- `username=admin` - Pre-fill SSH username
- `auth=jwt` - Authentication preference (always jwt now)

### Examples:

```
# Direct connection
http://localhost:3000/?host=10.0.0.108&port=22&name=T1000

# From saved session
http://localhost:3000/?session=prod-switch-01

# With theme and pre-filled username
http://localhost:3000/?host=192.168.1.1&name=Router&theme=matrix-green&username=admin

# NetBox integration (iframe)
<iframe 
  src="http://velocitermnb.local/embed?host={{ device.primary_ip }}&name={{ device.name }}"
  width="100%" 
  height="600px"
  frameborder="0"
></iframe>
```

## Development Workflow

### Terminal 1 - Backend
```bash
cd /path/to/velociterm-backend
python main.py
```
Backend runs on: `http://localhost:8050`

### Terminal 2 - Frontend
```bash
cd /path/to/velocitermnb-frontend
npm start
```
Frontend runs on: `http://localhost:3000`

### Test URLs
```
# Basic test
http://localhost:3000/?host=10.0.0.108&port=22&name=TestDevice

# Test with your lab device
http://localhost:3000/?host=192.168.1.1&name=Router&username=admin
```

## Production Build

```bash
# Build optimized production bundle
npm run build

# Output: build/ directory
# - Contains optimized JS, CSS, HTML
# - Ready to serve from any static host
# - Can be embedded in Django/Flask/FastAPI
```

### Serving from Backend

```python
# In your FastAPI backend (main.py)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve embed HTML
@app.get("/embed")
async def serve_embed():
    return FileResponse('static/index.html')
```

Then access at: `http://your-backend/embed?host=...`

## Troubleshooting

### Issue: Login works but page refresh logs out

**Cause:** JWT token not being stored or checkAuthStatus() not being called

**Fix:**
1. Check browser DevTools → Application → Local Storage
2. Should see: `access_token`, `refresh_token`, `velociterm_user`
3. Check console for "AUTH STATUS CHECK" logs
4. Verify `useEffect` is calling `checkAuth()` on mount

---

### Issue: WebSocket connection fails

**Symptoms:**
```
WebSocket connection to 'ws://localhost:8050/ws/terminal/...' failed
```

**Fixes:**
1. **Backend not running**: Verify `http://localhost:8050` is accessible
2. **Wrong WebSocket URL**: Check console logs for WebSocket URL
3. **Session cookie not set**: Login might have failed, check Network tab
4. **CORS issues**: Verify CORS allows credentials

---

### Issue: SSH connection refused (Error 10061)

**Cause:** Target host not reachable or SSH not running

**Fixes:**
1. Test SSH from command line: `ssh username@host`
2. Check firewall: `Test-NetConnection -ComputerName X.X.X.X -Port 22`
3. Verify SSH service running: `sudo systemctl status ssh` (Linux)
4. Check network connectivity between backend and target

---

### Issue: JWT token expired but no refresh

**Cause:** Refresh token missing or refresh endpoint not called

**Fixes:**
1. Check `authenticatedFetch()` handles 401 responses
2. Verify refresh token stored: `localStorage.getItem('refresh_token')`
3. Check backend `/api/auth/refresh` endpoint exists
4. Look for refresh errors in console

---

### Issue: "Cannot read properties of undefined (reading 'dimensions')"

**Cause:** FitAddon trying to resize before terminal is ready

**Fix:** Terminal constructor should include default dimensions:
```javascript
const terminal = new Terminal({
  rows: 24,    // IMPORTANT: Default dimensions
  cols: 80,
  // ... other options
});
```

---

### Issue: SSH key not found

**Symptoms:**
```
Backend logs: "No SSH key found for user DESKTOP-MACHINE$speterman"
```

**Cause:** SSH key not in expected location

**Fixes:**
1. Check key path: `/workspace/{velociterm_user}/keys/`
2. Verify `velociterm_user` stored correctly in localStorage
3. Generate key if missing: `ssh-keygen -t rsa -b 4096`
4. Place key in workspace directory with correct permissions

---

## Security Considerations

### JWT Tokens

✅ **Pros:**
- Stateless (backend doesn't store sessions)
- Works cross-origin (different ports/domains)
- Can include claims (username, groups, permissions)
- Short expiry (15 min) limits exposure

⚠️ **Cons:**
- Stored in localStorage (accessible to JavaScript)
- Vulnerable to XSS attacks
- Cannot be revoked until expiry

**Mitigations:**
- Short access token lifetime (15 min)
- Refresh token rotation
- HttpOnly session cookie for WebSocket (not accessible to JS)
- HTTPS in production (prevents token interception)

### Session Cookies

✅ **Pros:**
- HttpOnly (JavaScript cannot access)
- SameSite protection
- Server-controlled (can invalidate)
- Automatic browser handling

⚠️ **Cons:**
- Only works same-origin (or with complex CORS)
- CSRF vulnerability (mitigated by SameSite)
- Backend must maintain session state

**Mitigations:**
- HttpOnly flag (prevents XSS)
- SameSite=Lax (prevents CSRF)
- Secure flag in production (HTTPS only)
- Short expiry (1 hour)

### Best Practices

1. **Always use HTTPS in production**
   - Prevents token interception
   - Required for secure cookies
   - Required for iframe in secure contexts

2. **Set proper CORS**
   ```python
   allow_origins=["https://yourdomain.com"],  # Not "*"
   allow_credentials=True,
   ```

3. **Validate tokens server-side**
   - Never trust client-side validation
   - Check JWT signature
   - Verify expiration
   - Check token claims

4. **Rotate refresh tokens**
   - Issue new refresh token on refresh
   - Invalidate old refresh token
   - Prevents long-lived token reuse

5. **Sanitize user input**
   - Especially in terminal output
   - Prevent XSS via SSH banner injection
   - Validate all connection parameters

## Performance Optimization

### Frontend
- Lazy load xterm.js addons
- Debounce terminal resize events
- Minimize state updates
- Use React.memo for static components

### Backend
- Connection pooling for SSH
- Compress WebSocket messages
- Rate limit authentication attempts
- Cache session lookups

### Network
- Enable gzip compression
- Use CDN for static assets (production)
- WebSocket compression
- HTTP/2 for multiple resources

## Architecture Diagrams

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Frontend (Port 3000)                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ EmbedApp.jsx │  │LoginOverlay  │  │TerminalEmbed │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  │         │                 │                  │          │ │
│  │         └─────────────────┴──────────────────┘          │ │
│  │                           │                             │ │
│  └───────────────────────────┼─────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────┼─────────────────────────────┐ │
│  │         localStorage       │      Session Cookie         │ │
│  │  - access_token            │  - session (httponly)       │ │
│  │  - refresh_token           │  - auto-sent with requests  │ │
│  │  - velociterm_user         │                             │ │
│  └────────────────────────────┴─────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                 JWT Token  Session     WebSocket
              (Authorization) Cookie   (ws://)
                    │           │           │
                    ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Port 8050)                     │
│  ┌──────────────────────────────────────────────────────────┤
│  │  Auth Routes (routes/auth.py)                            │
│  │  - POST /api/auth/token → JWT login                      │
│  │  - POST /api/auth/refresh → Refresh token                │
│  │  - GET /api/auth/status → Check auth                     │
│  ├──────────────────────────────────────────────────────────┤
│  │  WebSocket Handler (main.py)                             │
│  │  - ws://host/ws/terminal/{id} → SSH session              │
│  ├──────────────────────────────────────────────────────────┤
│  │  Auth Module (routes/auth_module.py)                     │
│  │  - LocalAuthenticator (Windows/PAM/SSH)                  │
│  │  - LDAPAuthenticator (Active Directory)                  │
│  └──────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              SSH Connections                                 │
│  - Paramiko SSH client                                       │
│  - Key-based authentication (/workspace/{user}/keys/)        │
│  - Password fallback                                         │
│  - Connection pooling                                        │
└─────────────────────────────────────────────────────────────┘
```

### Authentication State Machine

```
     [Start]
        │
        ▼
   ┌─────────┐
   │ Loading │  ← Page load, checking auth status
   └────┬────┘
        │
        ├───► checkAuthStatus()
        │         │
        │         ├─ Has JWT token? → Validate with backend
        │         ├─ Has session? → Validate with backend
        │         └─ None → authenticated = false
        │
        ▼
    ┌────────────┐
    │Not Authed  │  ← Show LoginOverlay
    └─────┬──────┘
          │
          ├───► User enters credentials
          │         │
          │         ▼
          │     POST /api/auth/token
          │         │
          │         ├─ Success → Store JWT + session cookie
          │         └─ Failure → Show error
          │
          ▼
    ┌──────────────┐
    │ Authenticated │  ← Show TerminalEmbed
    └───────┬──────┘
            │
            ├───► REST API calls
            │     (Use JWT token)
            │
            ├───► WebSocket connection
            │     (Use session cookie)
            │
            ├───► Token expires
            │     ├─ 401 detected
            │     ├─ Call /api/auth/refresh
            │     ├─ Success → Update token, retry
            │     └─ Failure → Logout
            │
            └───► Page refresh
                  └─ Re-validate via checkAuthStatus()
                      └─ Success → Stay authenticated
```

## Success Criteria

You know it's working when:

1. ✅ **Login overlay appears** when not authenticated
2. ✅ **JWT tokens stored** in localStorage after login
3. ✅ **Session cookie set** (check DevTools → Application → Cookies)
4. ✅ **SSH credentials prompt** shows after VelociTerm login
5. ✅ **WebSocket connects** (check Console for "WebSocket connected")
6. ✅ **SSH session established** (terminal shows MOTD and prompt)
7. ✅ **Can type commands** and see output in real-time
8. ✅ **Page refresh works** (stays logged in, reconnects terminal)
9. ✅ **Token refresh works** (after 15 min, automatically refreshes)
10. ✅ **SSH key used** (if available, no password prompt on SSH)

## Files Reference

Key implementation files:

```
src/
├── EmbedApp.jsx              # Main app, auth state management
├── components/
│   ├── LoginOverlay.jsx      # JWT authentication form
│   └── TerminalEmbed.jsx     # xterm.js + WebSocket SSH session
└── utils/
    └── embedUtils.js         # checkAuthStatus(), token management
```

All working implementation files are also in `/mnt/user-data/outputs/` from the development session.

## License

Same as parent VelociTerm project.

## Contributing

This embedded terminal is part of the VelociTerm ecosystem. For contributions, please refer to the main VelociTerm repository.

## Support

For issues, questions, or feature requests, please use the VelociTerm issue tracker or contact the development team.

---

