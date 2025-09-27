// src/components/SessionItem.jsx
import React from 'react';
import { Terminal, X } from 'lucide-react';

const SessionItem = ({ session, onConnect }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return '#10b981';
      case 'connecting':
        return '#f59e0b';
      case 'error':
        return '#dc2626';
      default:
        return 'var(--text-tab-inactive)';
    }
  };

  const getStatusGlow = (status) => {
    switch (status) {
      case 'connected':
        return '0 0 4px rgba(16, 185, 129, 0.6)';
      case 'connecting':
        return '0 0 4px rgba(245, 158, 11, 0.6)';
      case 'error':
        return '0 0 4px rgba(220, 38, 38, 0.6)';
      default:
        return 'none';
    }
  };

  const handleConnect = (e) => {
    e.stopPropagation();
    onConnect(session);
  };

  return (
    <div
      className="session-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.625rem',
        marginBottom: '0.125rem',
        borderRadius: '0.25rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-accordion)';
        // Show actions on hover
        const actions = e.currentTarget.querySelector('.session-actions');
        if (actions) actions.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        // Hide actions on mouse leave
        const actions = e.currentTarget.querySelector('.session-actions');
        if (actions) actions.style.opacity = '0';
      }}
    >
      {/* Status Dot */}
      <div
        className="session-status"
        style={{
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: getStatusColor(session.status),
          boxShadow: getStatusGlow(session.status)
        }}
      />

      {/* Session Info */}
      <div className="session-info" style={{
        flex: 1,
        minWidth: 0
      }}>
        <div className="session-name" style={{
          fontSize: '0.75rem',
          fontWeight: '500',
          color: 'var(--text-color)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {session.display_name || session.host}
        </div>
        <div className="session-host" style={{
          fontSize: '0.6875rem',
          color: 'var(--text-tab-inactive)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {session.host}:{session.port || 22}
        </div>
      </div>

      {/* Session Actions */}
      <div
        className="session-actions"
        style={{
          opacity: 0,
          display: 'flex',
          gap: '0.25rem',
          transition: 'opacity 0.2s ease'
        }}
      >
        {session.status === 'connected' ? (
          <button
            className="action-btn"
            onClick={handleConnect}
            title="Disconnect"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'var(--text-tab-inactive)';
            }}
          >
            <X size={12} />
          </button>
        ) : (
          <button
            className="action-btn"
            onClick={handleConnect}
            title="Connect"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--bg-button)';
              e.target.style.color = 'var(--text-color)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'var(--text-tab-inactive)';
            }}
          >
            <Terminal size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionItem;