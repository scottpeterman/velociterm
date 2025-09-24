// Updated UnifiedSidebar.jsx with collapse functionality
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Terminal,
  Search,
  Server,
  Settings as SettingsIcon,
  User,
  LogOut
} from 'lucide-react';
import CompactSessions from './CompactSessions';

const UnifiedSidebar = ({
  user,
  onLogout,
  onOpenTerminalWithCredentials,
  windowManager,
  isCollapsed,
  onToggleSidebar
}) => {
  const location = useLocation();

  const navigationItems = [
    { path: '/', label: 'Sessions', icon: Terminal },
    { path: '/device-search', label: 'Device Search', icon: Search },
    { path: '/netbox-setup', label: 'NetBox Setup', icon: Server },
    { path: '/settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <nav className="unified-sidebar" style={{
      width: isCollapsed ? '48px' : '380px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.3s ease',
      position: 'relative'
    }}>
      {/* Header Section - Always visible, clickable to toggle */}
      <div className="sidebar-header" style={{
        padding: isCollapsed ? '1.5rem 0.75rem' : '1.5rem 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        cursor: 'pointer',
        transition: 'padding 0.3s ease'
      }} onClick={onToggleSidebar}>
        <div className="logo" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: isCollapsed ? '0' : '0.75rem',
          transition: 'justify-content 0.3s ease, gap 0.3s ease'
        }}>
          <Terminal size={32} style={{
            color: 'var(--border-focus)',
            flexShrink: 0
          }} />
          <div style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--text-color)',
            opacity: isCollapsed ? 0 : 1,
            transition: 'opacity 0.2s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}>
            VelociTerm NB
          </div>
        </div>
      </div>

      {/* Expanded State Content */}
      {!isCollapsed && (
        <>
          {/* Navigation Section */}
          <div className="nav-section" style={{
            padding: '1rem 0.75rem',
            borderBottom: '1px solid var(--border-color)',
            opacity: 1,
            transition: 'opacity 0.3s ease'
          }}>
            <div className="nav-items" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="nav-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    color: location.pathname === item.path ? 'var(--text-color)' : 'var(--text-tab-inactive)',
                    backgroundColor: location.pathname === item.path ? 'var(--bg-button)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    if (location.pathname !== item.path) {
                      e.target.style.backgroundColor = 'var(--bg-accordion)';
                      e.target.style.color = 'var(--text-color)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== item.path) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = 'var(--text-tab-inactive)';
                    }
                  }}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Sessions Section */}
          <CompactSessions
            onOpenTerminalWithCredentials={onOpenTerminalWithCredentials}
            windowManager={windowManager}
          />

          {/* Window Status Section - only show if there are active windows */}
          {windowManager && windowManager.windowCount > 0 && (
            <div className="window-status" style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-accordion-header)'
            }}>
              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--text-tab-inactive)',
                marginBottom: '0.25rem'
              }}>
                Active Windows
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-color)'
              }}>
                Total: {windowManager.windowCount} | Terminals: {windowManager.terminalCount}
              </div>
            </div>
          )}

          {/* User Section */}
          <div className="user-section" style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div className="user-info" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minWidth: 0
            }}>
              <User size={32} style={{color: 'var(--text-tab-inactive)'}} />
              <div className="user-details" style={{minWidth: 0}}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-color)'
                }}>
                  {user?.username || 'User'}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-tab-inactive)'
                }}>
                  Administrator
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="logout-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tab-inactive)',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--bg-accordion)';
                e.target.style.color = 'var(--text-color)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--text-tab-inactive)';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </>
      )}

      {/* Collapsed State Content */}
      {isCollapsed && (
        <div className="collapsed-content" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem 0',
          gap: '0.75rem'
        }}>
          {/* Collapsed Navigation */}
          <div className="collapsed-nav" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                title={item.label} // Tooltip for collapsed state
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.375rem',
                  color: location.pathname === item.path
                    ? 'var(--text-color)'
                    : 'var(--text-tab-inactive)',
                  backgroundColor: location.pathname === item.path
                    ? 'var(--bg-button)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== item.path) {
                    e.target.style.backgroundColor = 'var(--bg-accordion)';
                    e.target.style.color = 'var(--text-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.path) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--text-tab-inactive)';
                  }
                }}
              >
                <item.icon size={16} />
              </Link>
            ))}
          </div>

          {/* Collapsed Window Status */}
          {windowManager && windowManager.windowCount > 0 && (
            <div className="collapsed-window-status" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '20px',
              backgroundColor: 'var(--bg-accordion-header)',
              borderRadius: '0.75rem',
              fontSize: '0.625rem',
              color: 'var(--text-color)',
              fontWeight: '500',
              marginBottom: '1rem'
            }}>
              {windowManager.terminalCount}
            </div>
          )}

          {/* Spacer to push user section to bottom */}
          <div style={{ flex: 1 }} />

          {/* Collapsed User Section */}
          <div className="collapsed-user" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-accordion)'
            }}>
              <User size={18} style={{color: 'var(--text-tab-inactive)'}} />
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tab-inactive)',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--bg-accordion)';
                e.target.style.color = 'var(--text-color)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--text-tab-inactive)';
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Expand hint for collapsed state */}
      {isCollapsed && (
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '-8px',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '24px',
          backgroundColor: 'var(--border-focus)',
          borderRadius: '0 2px 2px 0',
          opacity: 0.3,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none'
        }} />
      )}
    </nav>
  );
};

export default UnifiedSidebar;