import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import './TerminalEmbed.css';

function TerminalEmbed({ connectionParams, onError }) {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [credentials, setCredentials] = useState(null);
  const [showCredPrompt, setShowCredPrompt] = useState(true);

  const initTerminal = useCallback(() => {
    // Check if DOM element exists
    if (!terminalRef.current) {
      console.warn('Terminal ref not ready');
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
      theme: {
        background: '#0a0e14',
        foreground: '#00d9ff',
        cursor: '#00d9ff',
        cursorAccent: '#0a0e14',
        selection: 'rgba(0, 217, 255, 0.3)',
      },
      allowTransparency: true,
      scrollback: 10000,
      rows: 24,
      cols: 80
    });

    fitAddon.current = new FitAddon();
    terminal.loadAddon(fitAddon.current);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(terminalRef.current);

    // Fit after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (fitAddon.current) {
        try {
          fitAddon.current.fit();
        } catch (err) {
          console.warn('FitAddon fit failed:', err);
        }
      }
    }, 100);

    terminalInstance.current = terminal;
  }, []);

  const connectWebSocket = useCallback((username, password) => {
    setStatus('connecting');

    // Generate window ID (same as full app)
    const windowId = `embed-${Date.now()}`;

    // Build WebSocket URL with bep parameter support
    const params = new URLSearchParams(window.location.search);
    const backendPort = params.get('bep');
    const port = backendPort || '8050';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const wsUrl = `${protocol}//${hostname}:${port}/ws/terminal/${windowId}`;

    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');

      // NEW: Get VelociTerm username from localStorage
      const velociTermUser = localStorage.getItem('velociterm_user');

      if (velociTermUser) {
        console.log(`✓ VelociTerm user: ${velociTermUser}`);
        console.log(`✓ SSH device user: ${username}`);
        console.log(`✓ SSH key authentication available`);
      } else {
        console.warn('⚠ No VelociTerm user found in localStorage');
        console.warn('⚠ SSH key authentication unavailable - will use password only');
      }

      // Send connect message with BOTH usernames
      const connectMessage = {
        type: 'connect',
        hostname: connectionParams.host,
        port: connectionParams.port || 22,
        username: username,  // SSH device username (e.g., "speterman")
        password: password || '',
        velociterm_user: velociTermUser || null  // VelociTerm workspace user (e.g., "DESKTOP-ORUUBP9@speterman")
      };
      ws.send(JSON.stringify(connectMessage));

      // Handle terminal input
      terminalInstance.current.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'input',
            data: data
          }));
        }
      });
    };

    ws.onmessage = (event) => {
      try {
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
            console.error('Terminal error:', message.message);
            setStatus('error');
            if (onError) {
              onError(message.message);
            }
            break;
          case 'process_ended':
            setStatus('disconnected');
            terminalInstance.current.write('\r\n\x1b[33m' + message.message + '\x1b[0m\r\n');
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
      if (onError) {
        onError('WebSocket connection failed');
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setStatus('disconnected');
      terminalInstance.current.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
    };
  }, [connectionParams, onError]);

  // Initialize terminal and connect when credentials are provided
  useEffect(() => {
    if (!credentials) return;

    // Initialize terminal first
    initTerminal();

    // Then connect WebSocket
    connectWebSocket(credentials.username, credentials.password);

    const handleResize = () => {
      if (fitAddon.current && terminalInstance.current) {
        try {
          fitAddon.current.fit();
          // Send resize to backend
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const dims = fitAddon.current.proposeDimensions();
            if (dims) {
              wsRef.current.send(JSON.stringify({
                type: 'resize',
                cols: dims.cols,
                rows: dims.rows
              }));
            }
          }
        } catch (err) {
          console.warn('Resize failed:', err);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials]);

  const handleCredSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setCredentials({
      username: formData.get('username'),
      password: formData.get('password') || ''  // Default to empty string if blank
    });
    setShowCredPrompt(false);
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'connecting':
        return <span className="status-indicator status-connecting">⟳ Connecting...</span>;
      case 'connected':
        return <span className="status-indicator status-connected">● Connected</span>;
      case 'disconnected':
        return <span className="status-indicator status-disconnected">○ Disconnected</span>;
      case 'error':
        return <span className="status-indicator status-error">✕ Error</span>;
      default:
        return null;
    }
  };

  if (showCredPrompt) {
    return (
      <div className="terminal-embed">
        <div className="terminal-header">
          <span className="terminal-title">
            {connectionParams.name || connectionParams.host}
          </span>
          <span className="status-indicator status-connecting">⟳ Waiting for credentials</span>
        </div>
        <div className="cred-prompt">
          <form onSubmit={handleCredSubmit}>
            <h3>SSH Credentials</h3>
            <p>Connecting to: {connectionParams.host}:{connectionParams.port || 22}</p>
            <input
              name="username"
              type="text"
              placeholder="Username"
              required
              autoFocus
            />
            <input
              name="password"
              type="password"
              placeholder="Password (leave blank for SSH key)"
            />
            <button type="submit">Connect</button>
            <p className="ssh-key-hint">
              💡 Leave password blank to use your SSH key
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-embed">
      <div className="terminal-header">
        <span className="terminal-title">
          {connectionParams.name || connectionParams.host}
        </span>
        {getStatusIndicator()}
      </div>
      <div className="terminal-container" ref={terminalRef}></div>
    </div>
  );
}

export default TerminalEmbed;