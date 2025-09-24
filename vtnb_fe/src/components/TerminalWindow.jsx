// src/components/TerminalWindow.jsx - Fixed version that prevents re-renders on theme change
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';

// Import your context hooks
import { useWebGL } from '../contexts/WebGLContext';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { useWindowResize } from '../hooks/useWindowResize';
import { useDebounce } from '../hooks/useDebounce';
import {
  buildWebSocketUrl,
  safeJSONStringify,
  debounce
} from '../utils/windowHelpers';

// Import terminal themes
import {
  TERMINAL_THEMES,
  getTerminalTheme,
  setTerminalTheme,
  clearTerminalTheme,
  getThemeConfig
} from '../utils/terminalThemes';

const TerminalWindow = React.memo(({
  sessionData,
  credentials,
  windowId,
  onClose,
  size,
  onStatusChange,
  isMinimized
}) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const wsRef = useRef(null);
  const searchAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const themeSelectRef = useRef(null); // Add ref for theme selector

  // Context hooks
  const webgl = useWebGL();
  const windowManager = useWindowManager();

  // State - REMOVED currentTheme state to prevent re-renders
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [terminalStats, setTerminalStats] = useState({
    rows: 24,
    cols: 80,
    bytesReceived: 0,
    bytesSent: 0
  });

  // Debounced credentials
  const debouncedCredentials = useDebounce(credentials, 500);

  // Get initial theme config - this won't change during re-renders
  const initialThemeConfig = useMemo(() => getThemeConfig(getTerminalTheme(windowId)), [windowId]);

  // FIXED: Theme change handler that doesn't trigger React re-renders
  const handleThemeChange = useCallback((newTheme) => {
    // Store theme preference
    setTerminalTheme(windowId, newTheme);

    if (termRef.current && containerRef.current) {
      const config = getThemeConfig(newTheme);

      // Update terminal theme directly
      termRef.current.options.theme = config;

      // Update container background for immediate visual feedback
      containerRef.current.style.backgroundColor = config.background;

      // Update the select element to show current selection
      if (themeSelectRef.current) {
        themeSelectRef.current.value = newTheme;
      }

      // CRITICAL: Restore terminal functionality after theme change
      requestAnimationFrame(() => {
        if (termRef.current && fitRef.current) {
          // Force a tiny "refresh" by triggering a refit
          fitRef.current.fit();
          termRef.current.focus(); // Restore input focus
        }
      });

      console.log(`[Terminal ${windowId}] Theme changed to: ${config.name} (no re-render)`);
    }
  }, [windowId]);

  // Window resize handler
  const { triggerResize } = useWindowResize(windowId, useCallback((details) => {
    if (fitRef.current && !isMinimized) {
      requestAnimationFrame(() => {
        try {
          fitRef.current.fit();
          sendResize();
        } catch (error) {
          console.warn('[Terminal] Resize failed:', error);
        }
      });
    }
  }, [isMinimized]));

  // Optimized resize handler with debouncing
  const sendResize = useCallback(debounce(() => {
    const ws = wsRef.current;
    const term = termRef.current;

    if (!ws || !term || ws.readyState !== WebSocket.OPEN) return;

    const cols = term.cols || 80;
    const rows = term.rows || 24;

    try {
      ws.send(safeJSONStringify({
        type: 'resize',
        cols,
        rows,
        windowId
      }));

      setTerminalStats(prev => ({ ...prev, rows, cols }));
      console.log(`[Terminal ${windowId}] Resize sent: ${cols}x${rows}`);
    } catch (error) {
      console.error('[Terminal] Resize send failed:', error);
    }
  }, 200), [windowId]);

  // Fit terminal to container
  const fitTerminal = useCallback(() => {
    if (fitRef.current && containerRef.current && !isMinimized) {
      try {
        fitRef.current.fit();
        sendResize();
      } catch (error) {
        console.warn('[Terminal] Fit failed:', error);
      }
    }
  }, [sendResize, isMinimized]);

  // WebSocket connection management
  const openSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Terminal] WebSocket already open');
      return;
    }

    const url = buildWebSocketUrl(windowId, 'terminal');
    console.log('[Terminal] Opening WebSocket:', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Terminal] WebSocket connected');
        setConnectionStatus('connecting');

        const payload = {
          type: 'connect',
          hostname: sessionData.host,
          port: Number(sessionData.port),
          username: debouncedCredentials.username,
          password: debouncedCredentials.password,
          windowId
        };

        ws.send(safeJSONStringify(payload));
        fitTerminal();

        if (onStatusChange) {
          onStatusChange('connecting');
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (error) {
            console.warn('[Terminal] Non-JSON message:', event.data);
          }
        }
      };

      ws.onclose = (event) => {
        console.warn('[Terminal] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        if (onStatusChange) {
          onStatusChange('disconnected');
        }

        // Auto-reconnect on unexpected close
        if (event.code !== 1000 && event.code !== 1001) {
          setTimeout(() => {
            if (wsRef.current === ws) {
              console.log('[Terminal] Attempting reconnection...');
              openSocket();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[Terminal] WebSocket error:', error);
        setConnectionStatus('error');

        if (onStatusChange) {
          onStatusChange('error');
        }
      };

    } catch (error) {
      console.error('[Terminal] Failed to create WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [windowId, sessionData, debouncedCredentials, fitTerminal, onStatusChange]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'ssh_output':
        if (message.tabId && String(message.tabId) !== String(windowId)) {
          return;
        }

        try {
          const binaryString = atob(message.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const utf8String = new TextDecoder('utf-8').decode(bytes);

          if (termRef.current) {
            termRef.current.write(utf8String);
            setTerminalStats(prev => ({
              ...prev,
              bytesReceived: prev.bytesReceived + bytes.length
            }));
          }

          if (!isConnected) {
            setIsConnected(true);
            setConnectionStatus('connected');
            if (onStatusChange) {
              onStatusChange('connected');
            }
          }
        } catch (error) {
          console.error('[Terminal] Failed to decode output:', error);
        }
        break;

      case 'status':
        console.log('[Terminal] Status:', message.message);
        if (termRef.current) {
          termRef.current.writeln(`\r\n[${message.message}]\r\n`);
        }

        if (message.message.includes('established') || message.message.includes('Connected')) {
          setIsConnected(true);
          setConnectionStatus('connected');
        }
        break;

      case 'error':
        console.error('[Terminal] Server error:', message.message);
        if (termRef.current) {
          termRef.current.writeln(`\r\n\x1b[31m[ERROR: ${message.message}]\x1b[0m\r\n`);
        }
        setConnectionStatus('error');
        break;

      case 'process_ended':
        console.log('[Terminal] Process ended');
        if (termRef.current) {
          termRef.current.writeln(`\r\n\x1b[33m[Connection ended]\x1b[0m\r\n`);
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
        break;

      default:
        console.log('[Terminal] Unknown message type:', message.type);
    }
  }, [windowId, isConnected, onStatusChange]);

  // Connection handlers
  const handleDisconnect = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.close(1000, 'User disconnect');
      } catch (error) {
        console.warn('[Terminal] Error during disconnect:', error);
      }
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');

    if (termRef.current) {
      termRef.current.writeln('\r\n\x1b[33m*** Disconnected by user ***\x1b[0m\r\n');
    }
  }, []);

  const handleClose = useCallback(() => {
    clearTerminalTheme(windowId);
    handleDisconnect();
    if (onClose) {
      onClose();
    }
  }, [handleDisconnect, onClose, windowId]);

  const handleReconnect = useCallback(() => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.writeln(`Reconnecting to ${sessionData.host}:${sessionData.port}...`);
    }
    openSocket();
  }, [sessionData, openSocket]);

  // FIXED: Terminal initialization - removed themeConfig from dependencies
  useEffect(() => {
    if (!containerRef.current || isMinimized) return;

    // Get current theme without storing in React state
    const currentTheme = getTerminalTheme(windowId);
    const themeConfig = getThemeConfig(currentTheme);

    console.log('[Terminal] Initializing terminal with theme:', currentTheme);

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: 'var(--font-terminal, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Roboto Mono", "Cascadia Code", monospace)',
      fontSize: 13,
      lineHeight: 1.2,
      rows: 24,
      cols: 80,
      allowTransparency: true,
      minimumContrastRatio: 4.5,
      theme: themeConfig
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    termRef.current = terminal;
    fitRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    terminal.open(containerRef.current);

    if (webgl?.supported) {
      webgl.enableHardwareAcceleration(containerRef.current);
    }

    fitTerminal();

    terminal.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(safeJSONStringify({ type: 'input', data }));
          setTerminalStats(prev => ({
            ...prev,
            bytesSent: prev.bytesSent + data.length
          }));
        } catch (error) {
          console.error('[Terminal] Failed to send input:', error);
        }
      }
    });

    terminal.onResize(() => {
      sendResize();
    });

    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(() => {
        fitTerminal();
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    terminal.writeln('VelociTerm NB - Enhanced Terminal');
    terminal.writeln(`Session: ${sessionData.display_name || sessionData.host}`);
    terminal.writeln(`Theme: ${themeConfig.name}`);

    if (credentials && credentials.username && credentials.password) {
      terminal.writeln(`Connecting to ${sessionData.host}:${sessionData.port}...`);
      setTimeout(() => {
        openSocket();
      }, 500);
    } else {
      terminal.writeln('Waiting for credentials...');
    }
    terminal.writeln('');

    return () => {
      console.log('[Terminal] Cleaning up terminal...');

      try {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }

        if (wsRef.current) {
          wsRef.current.close();
        }

        terminal.dispose();
      } catch (error) {
        console.warn('[Terminal] Cleanup error:', error);
      }

      termRef.current = null;
      fitRef.current = null;
      searchAddonRef.current = null;
      resizeObserverRef.current = null;
    };
  }, [sessionData, fitTerminal, sendResize, webgl, credentials, openSocket, isMinimized, windowId]); // Removed themeConfig dependency

  // Handle size changes
  useEffect(() => {
    if (size && !isMinimized) {
      fitTerminal();
    }
  }, [size, fitTerminal, isMinimized]);

  // Status helpers
  const statusConfig = useMemo(() => ({
    connected: { color: '#10b981', icon: '●' },
    connecting: { color: '#f59e0b', icon: '●' },
    error: { color: '#ef4444', icon: '●' },
    disconnected: { color: 'var(--text-tab-inactive)', icon: '○' }
  }), []);

  const currentStatus = statusConfig[connectionStatus] || statusConfig.disconnected;

  if (isMinimized) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-main)',
      fontFamily: 'var(--font-terminal, monospace)'
    }}>
      {/* Status Bar with Theme Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '0.875rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: currentStatus.color }}>{currentStatus.icon}</span>
            <span style={{
              color: 'var(--text-color)',
              fontWeight: '500'
            }}>
              {sessionData.display_name || sessionData.host}:{sessionData.port}
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: currentStatus.color,
              textTransform: 'capitalize'
            }}>
              {connectionStatus}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <label style={{
              fontSize: '0.75rem',
              color: 'var(--text-tab-inactive)'
            }}>
              Theme:
            </label>
            <select
              ref={themeSelectRef} // Add ref here
              defaultValue={getTerminalTheme(windowId)}
              onChange={(e) => handleThemeChange(e.target.value)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'var(--bg-accordion)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              {Object.entries(TERMINAL_THEMES).map(([key, theme]) => (
                <option key={key} value={key}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          {isConnected && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              color: 'var(--text-tab-inactive)',
              fontSize: '0.75rem'
            }}>
              <span>{terminalStats.cols}×{terminalStats.rows}</span>
              <span>↓{(terminalStats.bytesReceived / 1024).toFixed(1)}KB</span>
              <span>↑{(terminalStats.bytesSent / 1024).toFixed(1)}KB</span>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dc2626';
              }}
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleReconnect}
              disabled={connectionStatus === 'connecting' || !credentials}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: connectionStatus === 'connecting' || !credentials
                  ? 'var(--bg-accordion)'
                  : 'var(--border-focus)',
                color: connectionStatus === 'connecting' || !credentials
                  ? 'var(--text-tab-inactive)'
                  : 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: connectionStatus === 'connecting' || !credentials ? 'not-allowed' : 'pointer',
                opacity: connectionStatus === 'connecting' || !credentials ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (connectionStatus !== 'connecting' && credentials) {
                  e.target.style.backgroundColor = '#0891b2';
                }
              }}
              onMouseLeave={(e) => {
                if (connectionStatus !== 'connecting' && credentials) {
                  e.target.style.backgroundColor = 'var(--border-focus)';
                }
              }}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnect'}
            </button>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: initialThemeConfig.background, // Use initial theme
            flex: 1
          }}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Enhanced React.memo comparison to prevent unnecessary re-renders during theme changes
  const propsEqual = (
    prevProps.windowId === nextProps.windowId &&
    prevProps.sessionData?.host === nextProps.sessionData?.host &&
    prevProps.sessionData?.port === nextProps.sessionData?.port &&
    prevProps.credentials?.username === nextProps.credentials?.username &&
    prevProps.credentials?.password === nextProps.credentials?.password &&
    prevProps.size?.width === nextProps.size?.width &&
    prevProps.size?.height === nextProps.size?.height &&
    prevProps.isMinimized === nextProps.isMinimized
  );

  // Debug logging for memo comparison
  if (!propsEqual) {
    console.log(`[TerminalWindow] Props changed for ${prevProps.windowId}:`, {
      windowId: prevProps.windowId === nextProps.windowId,
      host: prevProps.sessionData?.host === nextProps.sessionData?.host,
      credentials: prevProps.credentials?.username === nextProps.credentials?.username,
      size: prevProps.size?.width === nextProps.size?.width && prevProps.size?.height === nextProps.size?.height,
      minimized: prevProps.isMinimized === nextProps.isMinimized
    });
  }

  return propsEqual;
});

TerminalWindow.displayName = 'TerminalWindow';

export default TerminalWindow;