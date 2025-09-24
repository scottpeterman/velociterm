import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit,
  Trash2,
  Folder,
  FolderPlus,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Server,
  Settings,
  Download,
  Upload,
  Copy,
  Move
} from 'lucide-react';

const SessionManager = ({ isOpen, onClose, onSessionsUpdated }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [newSession, setNewSession] = useState({
    display_name: '',
    host: '',
    port: 22,
    device_type: 'linux',
    platform: '',
    folder_name: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();

        // Process sessions to ensure they have IDs
        const processedData = data.map(folder => ({
          ...folder,
          sessions: folder.sessions?.map((session, index) => ({
            ...session,
            // Generate ID if missing (fallback for existing sessions)
            id: session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`
          })) || []
        }));

        setSessions(processedData);

        // Auto-expand all folders initially
        const folderNames = processedData.map(folder => folder.folder_name);
        setExpandedFolders(new Set(folderNames));
      } else {
        console.error('Failed to load sessions:', response.statusText);
        setSessions([]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      // Ensure required fields are present
      if (!newSession.display_name || !newSession.host || !newSession.folder_name) {
        alert('Please fill in all required fields (Display Name, Host, and Folder)');
        return;
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSession)
      });

      if (response.ok) {
        await loadSessions();
        setShowNewSessionForm(false);
        setNewSession({
          display_name: '',
          host: '',
          port: 22,
          device_type: 'linux',
          platform: '',
          folder_name: ''
        });
        onSessionsUpdated?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create session:', errorData);
        alert(`Failed to create session: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session: Network error');
    }
  };

  const handleUpdateSession = async (sessionId, updatedData) => {
    try {
      // Validate session ID
      if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
        console.error('Invalid session ID:', sessionId);
        alert('Cannot update session: Invalid session ID');
        return;
      }

      // Ensure required fields are present
      if (!updatedData.display_name || !updatedData.host) {
        alert('Display Name and Host are required');
        return;
      }

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        await loadSessions();
        setEditingSession(null);
        onSessionsUpdated?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update session:', errorData);
        alert(`Failed to update session: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      alert('Failed to update session: Network error');
    }
  };

  const handleDeleteSession = (sessionId, sessionName) => {
    // Validate session ID
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      console.error('Invalid session ID:', sessionId);
      alert('Cannot delete session: Invalid session ID');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Session',
      message: `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            await loadSessions();
            onSessionsUpdated?.();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to delete session:', errorData);
            alert(`Failed to delete session: ${errorData.detail || response.statusText}`);
          }
        } catch (error) {
          console.error('Failed to delete session:', error);
          alert('Failed to delete session: Network error');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      const response = await fetch('/api/sessions/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_name: newFolderName.trim() })
      });

      if (response.ok) {
        await loadSessions();
        setNewFolderName('');
        onSessionsUpdated?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create folder:', errorData);
        alert(`Failed to create folder: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder: Network error');
    }
  };

  const handleRenameFolder = async (oldName, newName) => {
    if (!newName.trim()) {
      alert('Please enter a valid folder name');
      return;
    }

    try {
      const response = await fetch(`/api/sessions/folders/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_name: newName.trim() })
      });

      if (response.ok) {
        await loadSessions();
        setEditingFolder(null);
        onSessionsUpdated?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to rename folder:', errorData);
        alert(`Failed to rename folder: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to rename folder:', error);
      alert('Failed to rename folder: Network error');
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
        try {
          const response = await fetch(`/api/sessions/folders/${encodeURIComponent(folderName)}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            await loadSessions();
            onSessionsUpdated?.();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to delete folder:', errorData);
            alert(`Failed to delete folder: ${errorData.detail || response.statusText}`);
          }
        } catch (error) {
          console.error('Failed to delete folder:', error);
          alert('Failed to delete folder: Network error');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

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
    // Validate session has proper ID before editing
    if (!session.id || session.id === 'null' || session.id === 'undefined') {
      console.error('Cannot edit session without valid ID:', session);
      alert('Cannot edit this session: Invalid session ID. Please refresh and try again.');
      return;
    }

    // Find the current folder for this session
    const currentFolder = sessions.find(folder =>
      folder.sessions.some(s => s.id === session.id)
    );

    // Set the editing session with folder_name populated
    const sessionWithFolder = {
      ...session,
      folder_name: currentFolder ? currentFolder.folder_name : session.folder_name || ''
    };

    setEditingSession(sessionWithFolder);
  };

  const deviceTypes = [
    'linux', 'cisco_ios', 'cisco_nxos', 'juniper', 'arista_eos',
    'hp_comware', 'huawei', 'fortinet', 'paloalto_panos', 'mikrotik_routeros'
  ];

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Main Modal */}
      <div
        className="session-manager-overlay"
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
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--bg-button-hover, #2563eb)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--bg-button, #3b82f6)';
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
              <div style={{
                width: '350px',
                borderLeft: '1px solid var(--border-color, #e5e7eb)',
                padding: '1rem',
                backgroundColor: 'var(--bg-accordion-content, #ffffff)',
                flexShrink: 0
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    color: 'var(--text-color, #1f2937)',
                    fontSize: '1rem',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    {editingSession ? 'Edit Session' : 'New Session'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowNewSessionForm(false);
                      setEditingSession(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tab-inactive, #6b7280)',
                      padding: '0.25rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Session Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color, #1f2937)',
                      marginBottom: '0.25rem'
                    }}>
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={editingSession ? editingSession.display_name : newSession.display_name}
                      onChange={(e) => {
                        if (editingSession) {
                          setEditingSession({...editingSession, display_name: e.target.value});
                        } else {
                          setNewSession({...newSession, display_name: e.target.value});
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        color: 'var(--text-color, #1f2937)',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Router-01"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color, #1f2937)',
                      marginBottom: '0.25rem'
                    }}>
                      Host *
                    </label>
                    <input
                      type="text"
                      value={editingSession ? editingSession.host : newSession.host}
                      onChange={(e) => {
                        if (editingSession) {
                          setEditingSession({...editingSession, host: e.target.value});
                        } else {
                          setNewSession({...newSession, host: e.target.value});
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        color: 'var(--text-color, #1f2937)',
                        fontSize: '0.875rem'
                      }}
                      placeholder="192.168.1.1"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color, #1f2937)',
                      marginBottom: '0.25rem'
                    }}>
                      Port
                    </label>
                    <input
                      type="number"
                      value={editingSession ? editingSession.port : newSession.port}
                      onChange={(e) => {
                        if (editingSession) {
                          setEditingSession({...editingSession, port: parseInt(e.target.value)});
                        } else {
                          setNewSession({...newSession, port: parseInt(e.target.value)});
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        color: 'var(--text-color, #1f2937)',
                        fontSize: '0.875rem'
                      }}
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color, #1f2937)',
                      marginBottom: '0.25rem'
                    }}>
                      Device Type
                    </label>
                    <select
                      value={editingSession ? editingSession.device_type : newSession.device_type}
                      onChange={(e) => {
                        if (editingSession) {
                          setEditingSession({...editingSession, device_type: e.target.value});
                        } else {
                          setNewSession({...newSession, device_type: e.target.value});
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        color: 'var(--text-color, #1f2937)',
                        fontSize: '0.875rem'
                      }}
                    >
                      {deviceTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color, #1f2937)',
                      marginBottom: '0.25rem'
                    }}>
                      Folder *
                    </label>
                    <select
                      value={editingSession ? editingSession.folder_name : newSession.folder_name}
                      onChange={(e) => {
                        if (editingSession) {
                          setEditingSession({...editingSession, folder_name: e.target.value});
                        } else {
                          setNewSession({...newSession, folder_name: e.target.value});
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        color: 'var(--text-color, #1f2937)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Select folder...</option>
                      {sessions.map(folder => (
                        <option key={folder.folder_name} value={folder.folder_name}>
                          {folder.folder_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color, #1f2937)',
                      marginBottom: '0.25rem'
                    }}>
                      Platform
                    </label>
                    <input
                      type="text"
                      value={editingSession ? editingSession.platform || '' : newSession.platform}
                      onChange={(e) => {
                        if (editingSession) {
                          setEditingSession({...editingSession, platform: e.target.value});
                        } else {
                          setNewSession({...newSession, platform: e.target.value});
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        color: 'var(--text-color, #1f2937)',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Optional platform info"
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginTop: '1rem'
                  }}>
                    <button
                      onClick={() => {
                        setShowNewSessionForm(false);
                        setEditingSession(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-accordion, #f9fafb)',
                        color: 'var(--text-color, #1f2937)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (editingSession) {
                          handleUpdateSession(editingSession.id, editingSession);
                        } else {
                          handleCreateSession();
                        }
                      }}
                      disabled={
                        editingSession
                          ? !editingSession.display_name || !editingSession.host || !editingSession.folder_name
                          : !newSession.display_name || !newSession.host || !newSession.folder_name
                      }
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-button, #3b82f6)',
                        color: 'var(--text-button, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s ease',
                        opacity: (editingSession ? (!editingSession.display_name || !editingSession.host || !editingSession.folder_name) : (!newSession.display_name || !newSession.host || !newSession.folder_name)) ? 0.5 : 1
                      }}
                    >
                      <Save size={16} />
                      {editingSession ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div
          className="confirmation-dialog-overlay"
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
            zIndex: 100000
          }}
        >
          <div style={{
            backgroundColor: 'var(--bg-accordion-content, #ffffff)',
            border: '1px solid var(--border-color, #e5e7eb)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            minWidth: '400px',
            maxWidth: '90vw',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{
              color: 'var(--text-color, #1f2937)',
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1rem',
              margin: '0 0 1rem 0'
            }}>
              {confirmDialog.title || 'Confirm Action'}
            </h3>

            <p style={{
              color: 'var(--text-tab-inactive, #6b7280)',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              marginBottom: '1.5rem',
              margin: '0 0 1.5rem 0'
            }}>
              {confirmDialog.message}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              {confirmDialog.showCancel !== false && (
                <button
                  onClick={confirmDialog.onCancel}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--bg-accordion, #f9fafb)',
                    color: 'var(--text-color, #1f2937)',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-button, #3b82f6)',
                  color: 'var(--text-button, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {confirmDialog.confirmText || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
};

export default SessionManager;