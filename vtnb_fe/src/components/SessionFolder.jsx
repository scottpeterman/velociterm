// src/components/SessionFolder.jsx
import React from 'react';
import { ChevronRight } from 'lucide-react';
import SessionItem from './SessionItem';

const SessionFolder = ({ folder, isExpanded, onToggle, onConnect }) => {
  const connectedCount = folder.sessions.filter(session =>
    session.status === 'connected'
  ).length;

  return (
    <div className="session-folder" style={{ marginBottom: '0.5rem' }}>
      {/* Folder Header */}
      <div
        className="folder-header"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          cursor: 'pointer',
          borderRadius: '0.375rem',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-accordion)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="folder-left" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <ChevronRight
            size={14}
            className="folder-icon"
            style={{
              color: 'var(--text-tab-inactive)',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
          />
          <div className="folder-name" style={{
            fontSize: '0.8125rem',
            fontWeight: '500',
            color: 'var(--text-color)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {folder.folder_name}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem'
        }}>
          {/* Connected count badge */}
          {connectedCount > 0 && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              fontSize: '0.625rem',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.75rem',
              fontWeight: '500',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              {connectedCount}
            </div>
          )}

          {/* Total count badge */}
          <div className="folder-count" style={{
            background: 'var(--bg-accordion-header)',
            color: 'var(--text-tab-inactive)',
            fontSize: '0.6875rem',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.75rem',
            fontWeight: '500'
          }}>
            {folder.sessions.length}
          </div>
        </div>
      </div>

      {/* Session Items */}
      {isExpanded && (
        <div className="session-items" style={{
          marginLeft: '1.375rem',
          borderLeft: '1px solid var(--bg-accordion-header)',
          paddingLeft: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          {folder.sessions.map((session, sessionIndex) => (
            <SessionItem
              key={sessionIndex}
              session={session}
              onConnect={onConnect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionFolder;