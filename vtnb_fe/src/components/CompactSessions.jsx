// Updated CompactSessions.jsx - Add SessionManager integration

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  Plus,
  Search,
  RotateCcw,
  Settings
} from 'lucide-react';
import SessionFolder from './SessionFolder';
import SessionFilter from './SessionFilter';
import SessionManager from './SessionManager'; // Add this import
import { workspaceService } from '../services/workspace';

const CompactSessions = ({ onOpenTerminalWithCredentials, windowManager, theme }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set(['*']));
  const [filter, setFilter] = useState('');
  const [showSessionManager, setShowSessionManager] = useState(false); // Add this state
    console.log('CompactSessions Theme: ' + theme);
  useEffect(() => {
    loadSessions();
  }, []);

  // Filter logic - memoized for performance with large datasets
  const filteredSessions = useMemo(() => {
    if (!filter.trim()) return sessions;

    const filterLower = filter.toLowerCase();

    return sessions
      .map(folder => {
        // Filter sessions within each folder
        const filteredFolderSessions = folder.sessions.filter(session =>
          session.display_name?.toLowerCase().includes(filterLower) ||
          session.host?.toLowerCase().includes(filterLower) ||
          session.device_type?.toLowerCase().includes(filterLower) ||
          session.platform?.toLowerCase().includes(filterLower) ||
          folder.folder_name?.toLowerCase().includes(filterLower)
        );

        // Only return folder if it has matching sessions or matching folder name
        if (filteredFolderSessions.length > 0 ||
            folder.folder_name?.toLowerCase().includes(filterLower)) {
          return {
            ...folder,
            sessions: filteredFolderSessions
          };
        }
        return null;
      })
      .filter(Boolean); // Remove null folders
  }, [sessions, filter]);

  // Calculate total session count for filter results
  const totalFilteredSessions = useMemo(() =>
    filteredSessions.reduce((total, folder) => total + folder.sessions.length, 0),
    [filteredSessions]
  );

  // Auto-expand folders when filtering (UX improvement)
  useEffect(() => {
    if (filter.trim()) {
      // Expand all folders when filtering to show results
      setCollapsedFolders(new Set());
    } else {
      // When clearing filter, return to default collapsed state
      setCollapsedFolders(new Set(['*']));
    }
  }, [filter]);

  const loadSessions = async () => {
    try {
      const sessionData = await workspaceService.getSessions();
      setSessions(sessionData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderName) => {
    const newCollapsed = new Set(collapsedFolders);

    // If we have the "all collapsed" marker, remove it and start fresh
    if (newCollapsed.has('*')) {
      newCollapsed.clear();
      // Add all folder names except the one being toggled
      sessions.forEach(folder => {
        if (folder.folder_name !== folderName) {
          newCollapsed.add(folder.folder_name);
        }
      });
    } else {
      // Normal toggle behavior
      if (newCollapsed.has(folderName)) {
        newCollapsed.delete(folderName);
      } else {
        newCollapsed.add(folderName);
      }
    }

    setCollapsedFolders(newCollapsed);
  };

  const openDeviceSearch = () => {
    // This will be handled by the parent Dashboard component
    window.dispatchEvent(new CustomEvent('openDeviceSearch'));
  };

  const openEditSessions = (e) => {
  console.log('openEditSessions function called!'); // Add this
  console.log('Event:', e); // Add this
  console.log('Current showSessionManager state:', showSessionManager); // Add this

  // Updated to open the SessionManager modal
  setShowSessionManager(true);
  console.log('setShowSessionManager(true) called'); // Add this
};

  // Handler for when sessions are updated in SessionManager
  const handleSessionsUpdated = async () => {
    await loadSessions(); // Reload sessions from backend
  };

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--text-tab-inactive)',
          fontSize: '0.875rem'
        }}>
          Loading sessions...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sessions Header with Edit Button */}
      <div classname='theme-${theme}'

        style={{
        padding: '1rem 1.25rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'var(--text-color)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Terminal Sessions
        </div>
        <div style={{
          display: 'flex',
          gap: '0.375rem'
        }}>
          <button
            onClick={openEditSessions}
            title="Manage Sessions"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              padding: '0.375rem',
              borderRadius: '0.25rem',
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
            <Settings size={14} />
          </button>
          <button
            onClick={openDeviceSearch}
            title="Search Devices"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              padding: '0.375rem',
              borderRadius: '0.25rem',
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
            <Search size={14} />
          </button>
          <button
            onClick={loadSessions}
            title="Refresh Sessions"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              padding: '0.375rem',
              borderRadius: '0.25rem',
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
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Filter Component */}
      <SessionFilter
        filter={filter}
        onFilterChange={setFilter}
        resultCount={totalFilteredSessions}
      />

      {/* Sessions List - now uses filtered data */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 0.75rem',
        // Custom scrollbar styles
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--bg-accordion-header) transparent'
      }}>
        {filteredSessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            color: 'var(--text-tab-inactive)',
            fontSize: '0.875rem'
          }}>
            {filter ? (
              <>
                <Search size={32} style={{
                  margin: '0 auto 1rem auto',
                  display: 'block',
                  opacity: 0.5,
                  color: 'var(--text-tab-inactive)'
                }} />
                <div style={{
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem'
                }}>
                  No matches for "{filter}"
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  marginBottom: '1rem',
                  color: 'var(--text-tab-inactive)'
                }}>
                  Try a different search term or clear the filter
                </div>
                <button
                  onClick={() => setFilter('')}
                  style={{
                    background: 'var(--bg-button)',
                    color: 'var(--text-button)',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-button-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-button)';
                  }}
                >
                  Clear Filter
                </button>
              </>
            ) : (
              <>
                <Search size={32} style={{
                  margin: '0 auto 1rem auto',
                  display: 'block',
                  opacity: 0.5
                }} />
                <div style={{marginBottom: '0.5rem', fontWeight: '500'}}>
                  No Sessions Found
                </div>
                <div style={{fontSize: '0.75rem', marginBottom: '1rem'}}>
                  Use the gear button above to create sessions or search for devices
                </div>
                <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                  <button
                    onClick={openEditSessions}
                    style={{
                      background: 'var(--bg-button)',
                      color: 'var(--text-button)',
                      border: '1px solid var(--border-color)',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-button-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-button)';
                    }}
                  >
                    <Settings size={14} />
                    Manage Sessions
                  </button>
                  <button
                    onClick={openDeviceSearch}
                    style={{
                      background: 'var(--bg-accordion)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-accordion-header)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-accordion)';
                    }}
                  >
                    <Search size={14} />
                    Search Devices
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            {filteredSessions.map((folder, index) => (
              <SessionFolder
                key={`${folder.folder_name}-${index}`}
                folder={folder}
                isExpanded={collapsedFolders.has('*') ? false : !collapsedFolders.has(folder.folder_name)}
                onToggle={() => toggleFolder(folder.folder_name)}
                onConnect={onOpenTerminalWithCredentials}
              />
            ))}
          </div>
        )}
      </div>

      {/* Session Manager Modal */}
      <SessionManager
  isOpen={showSessionManager}
   theme={theme}
  onClose={() => {
    console.log('SessionManager onClose called');
    setShowSessionManager(false);
  }}
  onSessionsUpdated={handleSessionsUpdated}
/>

      {/* Add custom scrollbar styles */}

    </>
  );
};

export default CompactSessions;