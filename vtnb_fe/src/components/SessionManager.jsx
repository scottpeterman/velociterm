import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit,
  Trash2,
  Folder,
  FolderPlus,
  X,
  ChevronDown,
  ChevronRight,
  Server,
  Settings,
  Download,
  Upload,
  Copy
} from 'lucide-react';

import { SessionOperations } from './sessionOperations';
import { ImportDialog, ConfirmationDialog, SessionForm } from './SessionDialogs';

const SessionManager = ({ isOpen, onClose, onSessionsUpdated, theme }) => {
console.log('SessionManager received props:', {
    isOpen,
    theme,
    onClose: !!onClose,
    onSessionsUpdated: !!onSessionsUpdated
  });

  // Also add this useEffect to track theme changes
  useEffect(() => {
    if (isOpen) {
      console.log('SessionManager opened with theme:', theme);
    }
  }, [isOpen, theme]);
  // Main state
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Form states
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Dialog states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  // Data loading
  const loadSessions = async () => {
    setLoading(true);
    try {
      const result = await SessionOperations.loadSessions();
      setSessions(result.data);

      // Auto-expand all folders initially
      const folderNames = result.data.map(folder => folder.folder_name);
      setExpandedFolders(new Set(folderNames));
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Session handlers
  const handleCreateSession = async (sessionData) => {
    const result = await SessionOperations.createSession(sessionData);
    if (result.success) {
      await loadSessions();
      setShowNewSessionForm(false);
      onSessionsUpdated?.();
    } else {
      alert(result.error);
    }
  };

  const handleUpdateSession = async (sessionData) => {
    const result = await SessionOperations.updateSession(editingSession.id, sessionData);
    if (result.success) {
      await loadSessions();
      setEditingSession(null);
      onSessionsUpdated?.();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteSession = (sessionId, sessionName) => {
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      alert('Cannot delete session: Invalid session ID');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Session',
      message: `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`,
      onConfirm: async () => {
        const result = await SessionOperations.deleteSession(sessionId);
        if (result.success) {
          await loadSessions();
          onSessionsUpdated?.();
        } else {
          alert(result.error);
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  // Folder handlers
  const handleCreateFolder = async () => {
    const result = await SessionOperations.createFolder(newFolderName);
    if (result.success) {
      await loadSessions();
      setNewFolderName('');
      onSessionsUpdated?.();
    } else {
      alert(result.error);
    }
  };

  const handleRenameFolder = async (oldName, newName) => {
    const result = await SessionOperations.renameFolder(oldName, newName);
    if (result.success) {
      await loadSessions();
      setEditingFolder(null);
      onSessionsUpdated?.();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteFolder = (folderName) => {
    const folder = sessions.find(f => f.folder_name === folderName);
    const sessionCount = folder?.sessions?.length || 0;

    if (sessionCount > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Cannot Delete Folder',
        message: `Cannot delete folder "${folderName}" because it contains ${sessionCount} session(s). Please move or delete the sessions first.`,
        onConfirm: () => setConfirmDialog({ isOpen: false }),
        onCancel: () => setConfirmDialog({ isOpen: false }),
        showCancel: false,
        confirmText: 'OK'
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Folder',
      message: `Are you sure you want to delete the folder "${folderName}"? This action cannot be undone.`,
      onConfirm: async () => {
        const result = await SessionOperations.deleteFolder(folderName);
        if (result.success) {
          await loadSessions();
          onSessionsUpdated?.();
        } else {
          alert(result.error);
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  // UI handlers
  const toggleFolder = (folderName) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const handleEditSession = (session) => {
    if (!session.id || session.id === 'null' || session.id === 'undefined') {
      alert('Cannot edit this session: Invalid session ID. Please refresh and try again.');
      return;
    }

    const currentFolder = sessions.find(folder =>
      folder.sessions.some(s => s.id === session.id)
    );

    const sessionWithFolder = {
      ...session,
      folder_name: currentFolder ? currentFolder.folder_name : session.folder_name || ''
    };

    setEditingSession(sessionWithFolder);
  };

  const handleExport = async () => {
    const result = await SessionOperations.exportSessions();
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleImportComplete = async () => {
    await loadSessions();
    onSessionsUpdated?.();
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Main Modal */}
      <div
            className={`session-manager-overlay theme-${theme}`} // Apply theme class here
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          if (e.target.classList.contains('session-manager-overlay')) {
            onClose();
          }
        }}
      >
        <div style={{
          backgroundColor: 'var(--bg-accordion-content, #ffffff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '0.75rem',
          width: '98vw',
          maxWidth: '1600px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Settings size={24} style={{ color: 'var(--border-focus, #3b82f6)' }} />
              <h2 style={{
                color: 'var(--text-color, #1f2937)',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: 0
              }}>
                Session Manager
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tab-inactive, #6b7280)',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--bg-accordion, #f9fafb)';
                e.target.style.color = 'var(--text-color, #1f2937)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--text-tab-inactive, #6b7280)';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Toolbar */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setShowNewSessionForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-button, #3b82f6)',
                color: 'var(--text-button, #ffffff)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Plus size={16} />
              New Session
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="New folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-color, #1f2937)',
                  fontSize: '0.875rem',
                  width: '150px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-accordion, #f9fafb)',
                  color: 'var(--text-color, #1f2937)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  opacity: newFolderName.trim() ? 1 : 0.5,
                  transition: 'all 0.2s ease'
                }}
              >
                <FolderPlus size={16} />
                Add Folder
              </button>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-accordion, #f9fafb)',
                  color: 'var(--text-tab-inactive, #6b7280)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Download size={16} />
                Export
              </button>
              <button
                onClick={() => setShowImportDialog(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-accordion, #f9fafb)',
                  color: 'var(--text-tab-inactive, #6b7280)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Upload size={16} />
                Import
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* Sessions List */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '1rem',
              minWidth: 0
            }}>
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: 'var(--text-tab-inactive, #6b7280)'
                }}>
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: 'var(--text-tab-inactive, #6b7280)',
                  textAlign: 'center'
                }}>
                  <Server size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    No Sessions Found
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Create your first session or import from NetBox
                  </div>
                </div>
              ) : (
                sessions.map((folder) => (
                  <div key={folder.folder_name} style={{
                    marginBottom: '1rem',
                    minWidth: 0,
                    width: '100%'
                  }}>
                    {/* Folder Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-accordion-header, #f3f4f6)',
                      border: '1px solid var(--border-color, #e5e7eb)',
                      borderRadius: '0.5rem',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      minWidth: 0,
                      width: '100%'
                    }} onClick={() => toggleFolder(folder.folder_name)}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden'
                      }}>
                        {expandedFolders.has(folder.folder_name) ? (
                          <ChevronDown size={16} style={{ color: 'var(--text-tab-inactive, #6b7280)', flexShrink: 0 }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: 'var(--text-tab-inactive, #6b7280)', flexShrink: 0 }} />
                        )}
                        <Folder size={16} style={{ color: 'var(--border-focus, #3b82f6)', flexShrink: 0 }} />

                        {editingFolder === folder.folder_name ? (
                          <input
                            type="text"
                            defaultValue={folder.folder_name}
                            style={{
                              backgroundColor: 'var(--bg-input, #ffffff)',
                              border: '1px solid var(--border-color, #e5e7eb)',
                              borderRadius: '0.25rem',
                              color: 'var(--text-color, #1f2937)',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.875rem',
                              minWidth: 0,
                              flex: 1
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameFolder(folder.folder_name, e.target.value);
                              } else if (e.key === 'Escape') {
                                setEditingFolder(null);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== folder.folder_name) {
                                handleRenameFolder(folder.folder_name, e.target.value);
                              } else {
                                setEditingFolder(null);
                              }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{
                            color: 'var(--text-color, #1f2937)',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0
                          }}>
                            {folder.folder_name}
                          </span>
                        )}

                        <span style={{
                          color: 'var(--text-tab-inactive, #6b7280)',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--bg-accordion, #f9fafb)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.75rem',
                          flexShrink: 0
                        }}>
                          {folder.sessions?.length || 0}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        flexShrink: 0,
                        marginLeft: '0.5rem'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder.folder_name);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tab-inactive, #6b7280)',
                            padding: '0.25rem',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.folder_name);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tab-inactive, #6b7280)',
                            padding: '0.25rem',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Sessions */}
                    {expandedFolders.has(folder.folder_name) && folder.sessions && (
                      <div style={{
                        paddingLeft: '1rem',
                        minWidth: 0,
                        width: '100%'
                      }}>
                        {/* Sessions Table Header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(90px, .25fr) minmax(140px, 180px) minmax(80px, 120px) 90px',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'var(--bg-accordion-header, #f3f4f6)',
                          borderRadius: '0.25rem',
                          marginBottom: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: 'var(--text-tab-inactive, #6b7280)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em'
                        }}>
                          <div>Name</div>
                          <div>Host</div>
                          <div>Type</div>
                          <div>Actions</div>
                        </div>

                        {/* Sessions Table Rows */}
                        {folder.sessions.map((session, index) => (
                          <div key={session.id || `${folder.folder_name}-${index}`} style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(20px, 120px) minmax(140px, 180px) minmax(80px, 120px) 90px',
                            gap: '0.5rem',
                            alignItems: 'center',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'var(--bg-accordion, #f9fafb)',
                            border: '1px solid var(--border-color, #e5e7eb)',
                            borderRadius: '0.25rem',
                            marginBottom: '0.25rem',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease',
                            minWidth: 0,
                            width: '100%'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'var(--bg-accordion-header, #f3f4f6)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'var(--bg-accordion, #f9fafb)';
                          }}
                          >
                            {/* Name Column */}
                            <div style={{
                              color: 'var(--text-color, #1f2937)',
                              fontWeight: '500',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0
                            }}>
                              {session.display_name}
                            </div>

                            {/* Host Column */}
                            <div style={{
                              color: 'var(--text-tab-inactive, #6b7280)',
                              fontSize: '0.8125rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0
                            }}>
                              {session.host}:{session.port}
                            </div>

                            {/* Type Column */}
                            <div style={{
                              color: 'var(--text-tab-inactive, #6b7280)',
                              fontSize: '0.75rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {session.device_type}
                            </div>

                            {/* Actions Column */}
                            <div style={{
                              display: 'flex',
                              gap: '0.25rem',
                              justifyContent: 'flex-start'
                            }}>
                              <button
                                onClick={() => handleEditSession(session)}
                                title="Edit"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-tab-inactive, #6b7280)',
                                  padding: '0.25rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = 'var(--bg-button, #3b82f6)';
                                  e.target.style.color = 'var(--text-color, #ffffff)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = 'var(--text-tab-inactive, #6b7280)';
                                }}
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                title="Copy"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-tab-inactive, #6b7280)',
                                  padding: '0.25rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = 'var(--bg-accordion-header, #f3f4f6)';
                                  e.target.style.color = 'var(--text-color, #1f2937)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = 'var(--text-tab-inactive, #6b7280)';
                                }}
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id, session.display_name)}
                                title="Delete"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-tab-inactive, #6b7280)',
                                  padding: '0.25rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#dc2626';
                                  e.target.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = 'var(--text-tab-inactive, #6b7280)';
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Side Panel for Forms */}
            {(showNewSessionForm || editingSession) && (
              <SessionForm
                session={editingSession}
                folders={sessions}
                onSave={editingSession ? handleUpdateSession : handleCreateSession}
                onCancel={() => {
                  setShowNewSessionForm(false);
                  setEditingSession(null);
                }}
                isEditing={!!editingSession}
              />
            )}
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        confirmText={confirmDialog.confirmText}
        showCancel={confirmDialog.showCancel}
      />
    </>
  );

  return createPortal(modalContent, document.body);
};

// Add keyframes for spinning animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);

export default SessionManager;