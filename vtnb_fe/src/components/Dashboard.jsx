// Updated Dashboard.jsx - Add sidebar collapse functionality

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import {
  Terminal,
  Minimize2,
  Maximize2,
  X,
  Plus,
  Search,
  Server,
  Settings as SettingsIcon,
  User,
  LogOut,
  Folder,
  FolderOpen,
  Minus,
  Square,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  MoreVertical
} from 'lucide-react';

// Import your CSS
import './styles.css';

// Import your existing components
import NetboxSetup from './NetboxSetup';
import DeviceSearch from './DeviceSearch';
import Settings from './Settings';
import TerminalWindow from './TerminalWindow';

// Import the new unified sidebar components
import UnifiedSidebar from './UnifiedSidebar';
import CompactSessions from './CompactSessions';
import SessionFolder from './SessionFolder';
import SessionItem from './SessionItem';

// Import the contexts
import { useWindowManager } from '../contexts/WindowManagerContext';
import { useWebGL } from '../contexts/WebGLContext';

// Import services
import { workspaceService } from '../services/workspace';

// Window Types
const WINDOW_TYPES = {
  TERMINAL: 'terminal',
  DEVICE_SEARCH: 'device_search',
  NETBOX_SETUP: 'netbox_setup'
};

// Debounce helper from original POC
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Original POC DraggableWindow with full resize functionality
const DraggableWindow = React.memo(({
  windowId,
  title,
  icon: Icon,
  children,
  onClose,
  initialPosition,
  onPositionChange,
  isMinimized,
  onToggleMinimize,
  zIndex,
  onBringToFront,
  initialSize = { width: 800, height: 600 }
}) => {
  const webgl = useWebGL();
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const windowRef = useRef(null);

  // Apply GPU acceleration hints to window
  useEffect(() => {
    if (windowRef.current && webgl?.supported) {
      webgl.enableHardwareAcceleration(windowRef.current);
    }
  }, [webgl]);

  // Memoized resize handler
  const handleWindowResize = useCallback(() => {
    if (children && typeof children.type === 'function' &&
        children.type.name === 'TerminalWindow') {
      const event = new CustomEvent('windowResize', {
        detail: {
          windowId: windowId,
          width: size.width,
          height: size.height - 40
        }
      });
      window.dispatchEvent(event);
    }
  }, [size, children, windowId]);

  // Memoized debounced resize
  const debouncedResize = useMemo(
    () => debounce(() => { handleWindowResize(); }, 300),
    [handleWindowResize]
  );

  useEffect(() => { debouncedResize(); }, [size, debouncedResize]);

  // Memoized mouse handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.window-controls') || e.target.closest('.resize-handle')) return;
    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  }, []);

  const handleResizeMouseDown = useCallback((direction, e) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({ x: e.clientX, y: e.clientY, width: size.width, height: size.height });
    e.preventDefault();
    e.stopPropagation();
  }, [size.width, size.height]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newPosition = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
      setPosition(newPosition);
      if (onPositionChange) { onPositionChange(newPosition); }
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      let newSize = { ...size };

      switch (resizeDirection) {
        case 'se':
          newSize.width = Math.max(300, resizeStart.width + deltaX);
          newSize.height = Math.max(200, resizeStart.height + deltaY);
          break;
        case 'sw':
          newSize.width = Math.max(300, resizeStart.width - deltaX);
          newSize.height = Math.max(200, resizeStart.height + deltaY);
          if (newSize.width !== size.width) { setPosition(prev => ({ ...prev, x: prev.x + deltaX })); }
          break;
        case 'ne':
          newSize.width = Math.max(300, resizeStart.width + deltaX);
          newSize.height = Math.max(200, resizeStart.height - deltaY);
          if (newSize.height !== size.height) { setPosition(prev => ({ ...prev, y: prev.y + deltaY })); }
          break;
        case 'nw':
          newSize.width = Math.max(300, resizeStart.width - deltaX);
          newSize.height = Math.max(200, resizeStart.height - deltaY);
          if (newSize.width !== size.width) { setPosition(prev => ({ ...prev, x: prev.x + deltaX })); }
          if (newSize.height !== size.height) { setPosition(prev => ({ ...prev, y: prev.y + deltaY })); }
          break;
        case 'e':
          newSize.width = Math.max(300, resizeStart.width + deltaX);
          break;
        case 'w':
          newSize.width = Math.max(300, resizeStart.width - deltaX);
          if (newSize.width !== size.width) { setPosition(prev => ({ ...prev, x: prev.x + deltaX })); }
          break;
        case 's':
          newSize.height = Math.max(200, resizeStart.height + deltaY);
          break;
        case 'n':
          newSize.height = Math.max(200, resizeStart.height - deltaY);
          if (newSize.height !== size.height) { setPosition(prev => ({ ...prev, y: prev.y + deltaY })); }
          break;
      }
      setSize(newSize);
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, resizeDirection, size, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
  }, []);

  // Memoized event listener setup
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  if (isMinimized) {
    return (
      <div
        ref={windowRef}
        className="window minimized"
        data-window-id={windowId}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          zIndex,
          width: '250px',
          height: '40px'
        }}
      >
        <div
          className="window-titlebar"
          onMouseDown={handleMouseDown}
        >
          <div className="window-title">
            <Icon size={16} />
            <span>{title}</span>
          </div>
          <div className="window-controls">
            <button onClick={onToggleMinimize} className="control-btn">
              <Square size={12} />
            </button>
            <button onClick={onClose} className="control-btn close">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className="window"
      data-window-id={windowId}
      onClick={() => onBringToFront && onBringToFront(windowId)}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'move' : 'default'
      }}
    >
      {/* Window Header */}
      <div
        className="window-titlebar"
        onMouseDown={handleMouseDown}
      >
        <div className="window-title">
          <Icon size={16} />
          <span>{title}</span>
        </div>
        <div className="window-controls">
          <button onClick={onToggleMinimize} className="control-btn">
            <Minus size={14} />
          </button>
          <button onClick={onClose} className="control-btn close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="window-content">
        {children}
      </div>

      {/* Resize handles for all 8 directions */}
      <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeMouseDown('se', e)} />
      <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeMouseDown('sw', e)} />
      <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeMouseDown('ne', e)} />
      <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeMouseDown('nw', e)} />
      <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeMouseDown('e', e)} />
      <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeMouseDown('w', e)} />
      <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeMouseDown('s', e)} />
      <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeMouseDown('n', e)} />
    </div>
  );
});

// Enhanced Device Search that can be used both in routing and windowing
const WindowedDeviceSearch = () => {
  const windowManager = useWindowManager();

  const handleCreateTerminalSession = (data) => {
    // Handle the new format with both sessionData and credentials
    if (data.sessionData && data.credentials) {
      const terminalWindow = {
        type: WINDOW_TYPES.TERMINAL,
        title: `Terminal - ${data.sessionData.display_name}`,
        icon: Terminal,
        sessionData: data.sessionData,
        credentials: data.credentials,
        initialPosition: {
          x: 150 + Math.random() * 200,
          y: 150 + Math.random() * 200
        },
        initialSize: { width: 800, height: 500 }
      };

      windowManager.createWindow(terminalWindow);
    } else {
      // Old format - just sessionData
      const terminalWindow = {
        type: WINDOW_TYPES.TERMINAL,
        title: `Terminal - ${data.display_name}`,
        icon: Terminal,
        sessionData: data,
        initialPosition: {
          x: 150 + Math.random() * 200,
          y: 150 + Math.random() * 200
        },
        initialSize: { width: 800, height: 500 }
      };

      windowManager.createWindow(terminalWindow);
    }
  };

  return <DeviceSearch onCreateTerminalSession={handleCreateTerminalSession} />;
};

// Welcome area component for when no route content needs to be shown
const WindowArea = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-tab-inactive)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div>
        <Terminal size={64} style={{
          margin: '0 auto 1rem auto',
          display: 'block',
          opacity: 0.3
        }} />
        <h2 style={{
          fontSize: '1.5rem',
          color: 'var(--text-color)',
          marginBottom: '0.5rem'
        }}>
          Terminal Windows Area
        </h2>
        <p style={{ fontSize: '0.875rem' }}>
          This space is reserved for floating terminal windows.<br />
          Click "Connect" on any session to open a terminal window.
        </p>
      </div>
    </div>
  );
};

// Dashboard Content with Window Manager Integration and Sidebar Collapse
const DashboardContent = ({ user, onLogout, theme, onThemeChange }) => {
  const location = useLocation();
  const windowManager = useWindowManager();

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  // Toggle sidebar collapse
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Save sidebar state to localStorage for persistence
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleOpenTerminalWithCredentials = (data) => {
    // Handle both old format (just sessionData) and new format (object with sessionData + credentials)
    if (data.sessionData && data.credentials) {
      // New format from DeviceSearch - has both sessionData and credentials
      const terminalWindow = {
        type: WINDOW_TYPES.TERMINAL,
        title: `Terminal - ${data.sessionData.display_name}`,
        icon: Terminal,
        sessionData: {
          ...data.sessionData,
          id: data.sessionData.id || `session-${Date.now()}`,
          display_name: data.sessionData.display_name || data.sessionData.host,
          host: data.sessionData.host,
          port: data.sessionData.port || 22,
          device_type: data.sessionData.device_type || 'Unknown',
          status: data.sessionData.status || 'disconnected'
        },
        credentials: data.credentials,
        initialPosition: {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200
        },
        initialSize: { width: 800, height: 500 }
      };

      windowManager.createWindow(terminalWindow);
    } else {
      // Old format from SessionsView - just sessionData, need to show modal
      setPendingSession(data);
      setCredentials({ username: '', password: '' });
      setShowCredentialsModal(true);
    }
  };

  // Handle credential modal connect
  const handleCredentialsConnect = () => {
    if (!credentials.username || !credentials.password || !pendingSession) {
      return;
    }

    // Create terminal window with credentials
    const terminalWindow = {
      type: WINDOW_TYPES.TERMINAL,
      title: `Terminal - ${pendingSession.display_name}`,
      icon: Terminal,
      sessionData: {
        ...pendingSession,
        id: pendingSession.id || `session-${Date.now()}`,
        display_name: pendingSession.display_name || pendingSession.host,
        host: pendingSession.host,
        port: pendingSession.port || 22,
        device_type: pendingSession.device_type || 'Unknown',
        status: pendingSession.status || 'disconnected'
      },
      credentials: {
        username: credentials.username,
        password: credentials.password
      },
      initialPosition: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200
      },
      initialSize: { width: 800, height: 500 }
    };

    windowManager.createWindow(terminalWindow);

    // Close modal and reset state
    setShowCredentialsModal(false);
    setPendingSession(null);
    setCredentials({ username: '', password: '' });
  };

  // Handle modal cancel
  const handleCredentialsCancel = () => {
    setShowCredentialsModal(false);
    setPendingSession(null);
    setCredentials({ username: '', password: '' });
  };

  // Handle device search window opening from sidebar
  const openDeviceSearch = () => {
    const existingWindow = windowManager.getWindowsByType(WINDOW_TYPES.DEVICE_SEARCH)[0];
    if (existingWindow) {
      windowManager.focusWindow(existingWindow.id);
      return;
    }

    const searchWindow = {
      type: WINDOW_TYPES.DEVICE_SEARCH,
      title: 'Device Search',
      icon: Search,
      initialPosition: {
        x: 200 + Math.random() * 100,
        y: 100 + Math.random() * 100
      },
      initialSize: { width: 1000, height: 700 }
    };

    windowManager.createWindow(searchWindow);
  };

  // Listen for device search events from sidebar
  useEffect(() => {
    const handleOpenDeviceSearch = () => {
      openDeviceSearch();
    };

    window.addEventListener('openDeviceSearch', handleOpenDeviceSearch);
    return () => {
      window.removeEventListener('openDeviceSearch', handleOpenDeviceSearch);
    };
  }, [windowManager]);

  // Window content renderer
  const renderWindowContent = useCallback((window) => {
    switch (window.type) {
      case WINDOW_TYPES.TERMINAL:
        console.log('[Dashboard] Rendering terminal with credentials:', {
          hasCredentials: !!window.credentials,
          username: window.credentials?.username,
          windowId: window.id
        });
        return (
          <TerminalWindow
            key={window.id}
            sessionData={window.sessionData}
            credentials={window.credentials}
            windowId={window.id}
            onClose={() => windowManager.closeWindow(window.id)}
            onStatusChange={(status) => {
              windowManager.updateWindowStatus?.(window.id, status);
            }}
          />
        );
      case WINDOW_TYPES.DEVICE_SEARCH:
        return <WindowedDeviceSearch />;
      case WINDOW_TYPES.NETBOX_SETUP:
        return <NetboxSetup />;
      default:
        return <div className="p-4 text-white">Unknown window type</div>;
    }
  }, []);

  return (
    <div className="dashboard-layout min-h-screen flex relative overflow-hidden"
         style={{backgroundColor: 'var(--bg-main)'}}>

      {/* Unified Sidebar with collapse functionality */}
      <UnifiedSidebar
        user={user}
        onLogout={onLogout}
        onOpenTerminalWithCredentials={handleOpenTerminalWithCredentials}
        windowManager={windowManager}
        isCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main Content Area - Windows only */}
      <div className="main-content" style={{
        flex: 1,
        position: 'relative',
        marginLeft: sidebarCollapsed ? '0' : '0', // No additional margin needed
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Route-based content - only non-session routes */}
        <main className="h-full overflow-hidden">
          <Routes>
            <Route path="/" element={<WindowArea />} />
            <Route path="/device-search" element={<WindowedDeviceSearch />} />
            <Route path="/netbox-setup" element={<NetboxSetup />} />
            <Route path="/settings" element={
              <Settings theme={theme} onThemeChange={onThemeChange} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Floating Windows Container */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
          {windowManager.windows.map((window) => (
            <div key={window.id} className="pointer-events-auto">
              <DraggableWindow
                windowId={window.id}
                title={window.title}
                icon={window.icon}
                initialPosition={window.position}
                onPositionChange={(position) => windowManager.updateWindowPosition(window.id, position)}
                onClose={() => windowManager.closeWindow(window.id)}
                isMinimized={window.isMinimized}
                onToggleMinimize={() => windowManager.minimizeWindow(window.id)}
                zIndex={window.zIndex}
                onBringToFront={windowManager.focusWindow}
                initialSize={window.initialSize}
              >
                {renderWindowContent(window)}
              </DraggableWindow>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard-level Credentials Modal */}
      {showCredentialsModal && pendingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 20000}}>
          <div style={{
            backgroundColor: 'var(--bg-accordion-content)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '2rem',
            minWidth: '400px',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}>
            <h3 style={{
              color: 'var(--text-color)',
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1.5rem'
            }}>
              SSH Connection
            </h3>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-accordion)',
                  marginBottom: '0.5rem'
                }}>
                  Host
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-color)',
                    fontSize: '0.875rem'
                  }}
                  value={`${pendingSession.host}:${pendingSession.port || 22}`}
                  readOnly
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-accordion)',
                  marginBottom: '0.5rem'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-color)',
                    fontSize: '0.875rem'
                  }}
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    username: e.target.value
                  }))}
                  placeholder="Enter username"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCredentialsConnect()}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-accordion)',
                  marginBottom: '0.5rem'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-color)',
                    fontSize: '0.875rem'
                  }}
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  placeholder="Enter password"
                  onKeyPress={(e) => e.key === 'Enter' && handleCredentialsConnect()}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={handleCredentialsCancel}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-accordion)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--bg-accordion-header)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'var(--bg-accordion)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCredentialsConnect}
                disabled={!credentials.username || !credentials.password}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-button)',
                  color: 'var(--text-button)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  cursor: credentials.username && credentials.password ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                  opacity: credentials.username && credentials.password ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (credentials.username && credentials.password) {
                    e.target.style.backgroundColor = 'var(--bg-button-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (credentials.username && credentials.password) {
                    e.target.style.backgroundColor = 'var(--bg-button)';
                  }
                }}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
const Dashboard = ({ user, onLogout, theme, onThemeChange }) => {
  return (
    <Router>
      <DashboardContent
        user={user}
        onLogout={onLogout}
        theme={theme}
        onThemeChange={onThemeChange}
      />
    </Router>
  );
};

export default Dashboard;