// src/components/TerminalWindow.jsx - Complete version optimized for Angband and text games
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

// Enhanced terminal themes with CSS-derived support
const createAppSyncedTheme = () => {
  const root = document.documentElement;
  const getCSS = (prop) => {
    const value = getComputedStyle(root).getPropertyValue(prop).trim();
    return value || '#000000'; // Fallback to prevent empty values
  };

  // Map your CSS custom properties to xterm.js theme properties
  return {
    name: 'App Theme Synced',
    // Core colors from your CSS variables
    background: getCSS('--bg-main'),
    foreground: getCSS('--text-color'),
    cursor: getCSS('--border-focus'),
    cursorAccent: getCSS('--bg-main'), // Background color for block cursor text

    // Selection colors
    selection: getCSS('--bg-button') + '40', // Add transparency
    selectionForeground: getCSS('--text-button'),

    // Standard ANSI colors - adapt to your theme
    black: getCSS('--bg-accordion-header'),
    red: '#ef4444',           // Keep some colors static for readability
    green: '#22c55e',
    yellow: '#eab308',
    blue: getCSS('--border-focus'),
    magenta: getCSS('--bg-button'),
    cyan: '#06b6d4',
    white: getCSS('--text-color'),

    // Bright variants
    brightBlack: getCSS('--text-tab-inactive'),
    brightRed: '#f87171',
    brightGreen: '#4ade80',
    brightYellow: '#facc15',
    brightBlue: getCSS('--border-focus'),
    brightMagenta: getCSS('--bg-button-hover'),
    brightCyan: '#22d3ee',
    brightWhite: getCSS('--text-color')
  };
};

// Enhanced TERMINAL_THEMES object
const TERMINAL_THEMES = {
  // App-synced theme as the first option
  'app-synced': {
    name: 'Follow App Theme',
    description: 'Automatically matches your current app theme',
    getTheme: createAppSyncedTheme // Dynamic theme generator
  },

  // Keep your existing static themes
  cyber: {
    name: 'Cyber',
    description: 'Dark theme with cyan accents',
    background: '#0a0a0a',
    foreground: '#00ffff',
    cursor: '#00ffff',
    selection: '#ffffff40',
    black: '#1a1a1a',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff'
  },

  amber: {
    name: 'Amber',
    description: 'Classic amber terminal',
    background: '#1a1a1a',
    foreground: '#ffb000',
    cursor: '#ffb000',
    selection: '#ffb00040',
    black: '#2d2d2d',
    red: '#ff6b47',
    green: '#a6e22e',
    yellow: '#fd971f',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#ff8080',
    brightGreen: '#b8f040',
    brightYellow: '#ffb000',
    brightBlue: '#80d9ff',
    brightMagenta: '#c080ff',
    brightCyan: '#c0ffff',
    brightWhite: '#ffffff'
  },

  mono: {
    name: 'Mono',
    description: 'Monochrome display',
    background: '#000000',
    foreground: '#ffffff',
    cursor: '#ffffff',
    selection: '#ffffff40',
    black: '#000000',
    red: '#ffffff',
    green: '#ffffff',
    yellow: '#ffffff',
    blue: '#ffffff',
    magenta: '#ffffff',
    cyan: '#ffffff',
    white: '#ffffff',
    brightBlack: '#808080',
    brightRed: '#ffffff',
    brightGreen: '#ffffff',
    brightYellow: '#ffffff',
    brightBlue: '#ffffff',
    brightMagenta: '#ffffff',
    brightCyan: '#ffffff',
    brightWhite: '#ffffff'
  },

  blue: {
    name: 'Blue',
    description: 'Cool blue terminal',
    background: '#001122',
    foreground: '#4fc3f7',
    cursor: '#4fc3f7',
    selection: '#4fc3f740',
    black: '#1a1a2e',
    red: '#ff6b6b',
    green: '#51cf66',
    yellow: '#ffd93d',
    blue: '#4fc3f7',
    magenta: '#9775fa',
    cyan: '#22d3ee',
    white: '#f8f9fa',
    brightBlack: '#495057',
    brightRed: '#ff8787',
    brightGreen: '#69db7c',
    brightYellow: '#ffe066',
    brightBlue: '#74c0fc',
    brightMagenta: '#b197fc',
    brightCyan: '#66d9ef',
    brightWhite: '#ffffff'
  },

  green: {
    name: 'Green',
    description: 'CRT Green',
    background: '#001100',
    foreground: '#00ff00',
    cursor: '#00ff00',
    selection: '#00ff0040',
    black: '#002200',
    red: '#ff6666',
    green: '#00ff00',
    yellow: '#ffff66',
    blue: '#6666ff',
    magenta: '#ff66ff',
    cyan: '#66ffff',
    white: '#ccffcc',
    brightBlack: '#556b2f',
    brightRed: '#ff9999',
    brightGreen: '#66ff66',
    brightYellow: '#ffff99',
    brightBlue: '#9999ff',
    brightMagenta: '#ff99ff',
    brightCyan: '#99ffff',
    brightWhite: '#ffffff'
  },

  light: {
    name: 'Light',
    description: 'Light mode theme',
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    selection: '#b3d4fc',
    black: '#000000',
    red: '#cd3131',
    green: '#008000',
    yellow: '#808000',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#cd3131',
    brightGreen: '#00aa00',
    brightYellow: '#999900',
    brightBlue: '#0451a5',
    brightMagenta: '#bc05bc',
    brightCyan: '#0598bc',
    brightWhite: '#ffffff'
  },

  paper: {
    name: 'Paper',
    description: 'Cream paper theme',
    background: '#f7f3e9',
    foreground: '#2d2d2d',
    cursor: '#8b4513',
    selection: '#d4c5aa',
    black: '#2d2d2d',
    red: '#d73027',
    green: '#1a9850',
    yellow: '#f46d43',
    blue: '#4575b4',
    magenta: '#762a83',
    cyan: '#5ab4ac',
    white: '#545454',
    brightBlack: '#737373',
    brightRed: '#fc8d59',
    brightGreen: '#74add1',
    brightYellow: '#fee08b',
    brightBlue: '#4575b4',
    brightMagenta: '#9970ab',
    brightCyan: '#91bfdb',
    brightWhite: '#2d2d2d'
  },

  default: {
    name: 'Default',
    description: 'Standard terminal theme',
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    selection: '#264f78',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff'
  }
};

// Enhanced theme config getter
const getThemeConfig = (themeKey) => {
  const theme = TERMINAL_THEMES[themeKey];

  if (!theme) {
    console.warn(`Terminal theme '${themeKey}' not found, using default`);
    return TERMINAL_THEMES.default || createAppSyncedTheme();
  }

  // If theme has a getTheme function (like app-synced), call it
  if (theme.getTheme && typeof theme.getTheme === 'function') {
    return theme.getTheme();
  }

  // Otherwise return the static theme object
  return theme;
};

// Terminal theme storage utilities
const getTerminalTheme = (windowId) => {
  const stored = localStorage.getItem(`terminal-theme-${windowId}`);
  return stored || 'app-synced'; // Default to app-synced instead of 'default'
};

const setTerminalTheme = (windowId, theme) => {
  localStorage.setItem(`terminal-theme-${windowId}`, theme);
};

const clearTerminalTheme = (windowId) => {
  localStorage.removeItem(`terminal-theme-${windowId}`);
};

// Hook to listen for app theme changes
const useAppThemeSync = (windowId, onThemeChange) => {
  useEffect(() => {
    const currentTheme = getTerminalTheme(windowId);

    // Only set up listener if this terminal is using app-synced theme
    if (currentTheme !== 'app-synced') return;

    // Create a MutationObserver to watch for class changes on document.documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // App theme changed, update terminal theme
          console.log(`[Terminal ${windowId}] App theme changed, syncing terminal theme`);
          onThemeChange('app-synced');
        }
      });
    });

    // Watch for class changes on the root element
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [windowId, onThemeChange]);
};

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
  const themeSelectRef = useRef(null);

  // Context hooks
  const webgl = useWebGL();
  const windowManager = useWindowManager();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [terminalStats, setTerminalStats] = useState({
    rows: 24,
    cols: 80,
    bytesReceived: 0,
    bytesSent: 0
  });
  const [contextMenu, setContextMenu] = useState(null);

  // Handle context menu
  // Fixed handleContextMenu function with debugging
// Replace your current handleContextMenu function with this final version:

const handleContextMenu = useCallback((e) => {
  e.preventDefault();

  const terminal = termRef.current;
  if (!terminal) return;

  const hasSelection = terminal.hasSelection();
  const clipboardSupported = navigator.clipboard && navigator.clipboard.readText;

  // Calculate menu dimensions
  const menuWidth = 140;
  const menuHeight = hasSelection && clipboardSupported ? 160 :
                   hasSelection || clipboardSupported ? 120 : 80;

  // Get original coordinates
  const originalX = e.clientX;
  const originalY = e.clientY;

  // Apply offsets to compensate for transform
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = originalX - (viewportWidth * 0.5); // Move left by 50%
  let y = originalY - (viewportHeight * 0.15); // Move up by 15%

  // Smart positioning: only adjust if menu would be cut off
  if (x + menuWidth > viewportWidth - 5) {
    x = Math.max(5, x - menuWidth);
  }
  if (x < 5) {
    x = 5; // Ensure it doesn't go off left edge
  }

  if (y + menuHeight > viewportHeight - 5) {
    y = Math.max(5, y - menuHeight);
  }
  if (y < 5) {
    y = 5; // Ensure it doesn't go off top edge
  }

  console.log('Right click at:', originalX, originalY);
  console.log('Viewport:', viewportWidth, 'x', viewportHeight);
  console.log('Offsets applied - X:', viewportWidth * 0.5, 'Y:', viewportHeight * 0.15);
  console.log('Final menu position:', x, y);

  setContextMenu({
    x,
    y,
    hasSelection,
    clipboardSupported
  });
}, []);


// Alternative approach if you need container-relative positioning:
const handleContextMenuContainerRelative = useCallback((e) => {
  e.preventDefault();

  const terminal = termRef.current;
  const container = containerRef.current;
  if (!terminal || !container) return;

  const hasSelection = terminal.hasSelection();
  const clipboardSupported = navigator.clipboard && navigator.clipboard.readText;

  // Get the actual terminal screen element (where xterm renders)
  const terminalScreen = container.querySelector('.xterm-screen') || container;
  const rect = terminalScreen.getBoundingClientRect();

  // Calculate menu dimensions
  const menuWidth = 140;
  const menuHeight = hasSelection && clipboardSupported ? 160 :
                   hasSelection || clipboardSupported ? 120 : 80;

  // Use event coordinates relative to the terminal screen
  let x = e.clientX;
  let y = e.clientY;

  // Constrain to terminal bounds
  const maxX = rect.right - menuWidth - 10;
  const maxY = rect.bottom - menuHeight - 10;
  const minX = rect.left + 10;
  const minY = rect.top + 10;

  x = Math.min(Math.max(x, minX), maxX);
  y = Math.min(Math.max(y, minY), maxY);

  setContextMenu({
    x,
    y,
    hasSelection,
    clipboardSupported
  });
}, []);


  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopy = useCallback(async () => {
    const terminal = termRef.current;
    if (!terminal || !terminal.hasSelection()) return;

    const selectedText = terminal.getSelection();
    if (selectedText && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(selectedText);
        console.log('[Terminal] Text copied to clipboard');
      } catch (error) {
        console.error('[Terminal] Failed to copy text:', error);
      }
    }
    closeContextMenu();
  }, [closeContextMenu]);

  const handlePaste = useCallback(async () => {
  const terminal = termRef.current;
  if (!navigator.clipboard || !terminal) return;

  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      // Use xterm.js built-in paste method
      // This properly handles the paste and triggers onData
      terminal.paste(text);
      console.log('[Terminal] Text pasted from clipboard');
    }
  } catch (error) {
    console.error('[Terminal] Failed to paste text:', error);

    // Fallback: Show user instruction for manual paste
    if (error.name === 'NotAllowedError') {
      terminal.write('\r\n\x1b[33m[Paste blocked by browser. Use Ctrl+V or Shift+Insert]\x1b[0m\r\n');
    }
  }
  closeContextMenu();
}, [closeContextMenu]);

  const handleSelectAll = useCallback(() => {
    const terminal = termRef.current;
    if (!terminal) return;

    terminal.selectAll();
    closeContextMenu();
  }, [closeContextMenu]);

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.terminal-context-menu')) {
          closeContextMenu();
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);

  // Debounced credentials
  const debouncedCredentials = useDebounce(credentials, 500);

  // Get initial theme config
  const initialThemeConfig = useMemo(() => getThemeConfig(getTerminalTheme(windowId)), [windowId]);

  // OPTIMIZED: Reduced resize debounce for more responsive games
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
  }, 100), [windowId]); // Reduced from 200ms to 100ms

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

  // Enhanced theme change handler with CSS-derived support
  const handleThemeChange = useCallback((newTheme) => {
    // Store theme preference
    setTerminalTheme(windowId, newTheme);

    if (termRef.current && containerRef.current) {
      // Get theme config (will call createAppSyncedTheme if needed)
      const config = getThemeConfig(newTheme);

      // Update terminal theme directly
      termRef.current.options.theme = config;

      // Update container background for immediate visual feedback
      containerRef.current.style.backgroundColor = config.background;

      // Update the select element to show current selection
      if (themeSelectRef.current) {
        themeSelectRef.current.value = newTheme;
      }

      // Force refresh and restore focus
      requestAnimationFrame(() => {
        if (termRef.current && fitRef.current) {
          fitRef.current.fit();
          termRef.current.focus();
        }
      });

      console.log(`[Terminal ${windowId}] Theme changed to: ${config.name}`);
    }
  }, [windowId]);

  // Add app theme sync hook
  useAppThemeSync(windowId, handleThemeChange);

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
  }, [isMinimized, sendResize]));

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

  // OPTIMIZED: Enhanced message handler for better game performance
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

          // OPTIMIZED: Better UTF-8 handling for game characters
          let utf8String;
          try {
            utf8String = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          } catch (e) {
            // Fallback to latin1 for non-UTF8 game data
            utf8String = new TextDecoder('latin1').decode(bytes);
          }

          if (termRef.current) {
            // Write data immediately for responsive gameplay
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

  // Enhanced theme selector component
  const renderThemeSelector = () => {
    const currentTheme = getTerminalTheme(windowId);

    return (
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
          ref={themeSelectRef}
          value={currentTheme}
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
          <option value="app-synced">
            Follow App Theme
          </option>

          <optgroup label="Static Themes">
            {Object.entries(TERMINAL_THEMES)
              .filter(([key]) => key !== 'app-synced')
              .map(([key, theme]) => (
                <option key={key} value={key}>
                  {theme.name}
                </option>
              ))
            }
          </optgroup>
        </select>

        {currentTheme === 'app-synced' && (
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--border-focus)',
            fontWeight: '500'
          }}>
            SYNCED
          </span>
        )}
      </div>
    );
  };

  // OPTIMIZED: Game-friendly terminal initialization
  useEffect(() => {
    if (!containerRef.current || isMinimized) return;

    const currentTheme = getTerminalTheme(windowId);
    const themeConfig = getThemeConfig(currentTheme);

    console.log(`[Terminal] Initializing with theme: ${currentTheme}`, themeConfig);

    // OPTIMIZED: Game-friendly terminal configuration
    const terminal = new Terminal({
      convertEol: false, // Critical: Don't auto-convert for games
      cursorBlink: true,
      cursorStyle: 'block', // Better for games
      fontFamily: 'var(--font-terminal, "Cascadia Code", "SF Mono", Monaco, Menlo, monospace)',
      fontSize: 14, // Slightly larger for readability
      lineHeight: 1.0, // Tight spacing for game grids
      rows: 25, // Standard roguelike size
      cols: 80,
      allowTransparency: false, // Better performance
      minimumContrastRatio: 1, // Allow all game colors
      drawBoldTextInBrightColors: true, // Classic behavior
      macOptionIsMeta: true, // Important for key bindings
      rightClickSelectsWord: false, // Prevent interference
      scrollback: 500, // Reduced for better performance
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5,

      // CRITICAL: Proper escape sequence handling
      windowsMode: false,
      altClickMovesCursor: false,
      logLevel: 'warn',

      // Enhanced terminal options for better compatibility
      bellSound: null,
      bellStyle: 'none',
      disableStdin: false,

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

    // CONTEXT MENU: Add right-click event listener
    const terminalElement = containerRef.current.querySelector('.xterm-screen');
    if (terminalElement) {
      terminalElement.addEventListener('contextmenu', handleContextMenu);
    }

    if (webgl?.supported) {
      webgl.enableHardwareAcceleration(containerRef.current);
    }

    fitTerminal();

    // OPTIMIZED: Enhanced input handling for games
    terminal.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          // Send input immediately without buffering
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

    // OPTIMIZED: Better key handling for games
    terminal.onKey(({ key, domEvent }) => {
      // Let xterm handle most keys, but ensure special game keys work
      if (domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey) {
        // Allow xterm to handle modified keys normally
        return;
      }

      // For function keys and special keys, let xterm handle them
      if (domEvent.code.startsWith('F') ||
          ['Escape', 'Tab', 'Enter', 'Backspace', 'Delete'].includes(domEvent.code)) {
        return;
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

    // Enhanced welcome message
    terminal.writeln('VelociTerm NB -Terminal');
    terminal.writeln(`Session: ${sessionData.display_name || sessionData.host}`);
    terminal.writeln(`Theme: ${themeConfig.name}${currentTheme === 'app-synced' ? ' (Auto-synced)' : ''}`);
    terminal.writeln('Optimized for text-based games like Angband');

    if (currentTheme === 'app-synced') {
      const appThemeClass = Array.from(document.documentElement.classList)
        .find(cls => cls.startsWith('theme-'));
      if (appThemeClass) {
        terminal.writeln(`App Theme: ${appThemeClass.replace('theme-', '')}`);
      }
    }

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
  }, [sessionData, fitTerminal, sendResize, webgl, credentials, openSocket, isMinimized, windowId]);

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
      {/* Status Bar with Enhanced Theme Selector */}
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

          {/* Enhanced theme selector */}
          {renderThemeSelector()}

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
            backgroundColor: initialThemeConfig.background,
            flex: 1,
            position: 'relative'
          }}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="terminal-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-sidebar)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            minWidth: '120px',
            padding: '0.25rem',
            fontSize: '0.875rem'
          }}
        >
          {contextMenu.hasSelection && (
            <div
              onClick={handleCopy}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                borderRadius: '0.25rem',
                transition: 'background-color 0.15s ease',
                color: 'var(--text-color)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--bg-accordion-header)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              Copy
            </div>
          )}


          <div
            onClick={handleSelectAll}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              borderRadius: '0.25rem',
              transition: 'background-color 0.15s ease',
              color: 'var(--text-color)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--bg-accordion-header)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Select All
          </div>

          {(contextMenu.hasSelection || contextMenu.clipboardSupported) && (
            <div style={{
              height: '1px',
              backgroundColor: 'var(--border-color)',
              margin: '0.25rem 0'
            }} />
          )}

          <div
            onClick={closeContextMenu}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              borderRadius: '0.25rem',
              transition: 'background-color 0.15s ease',
              color: 'var(--text-tab-inactive)',
              fontSize: '0.8rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--bg-accordion-header)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Close
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
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

  return propsEqual;
});

TerminalWindow.displayName = 'TerminalWindow';

export default TerminalWindow;