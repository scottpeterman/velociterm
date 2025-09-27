// sessionOperations.js
// Business logic and API operations for session management

export const SessionOperations = {
  // Session CRUD operations
  async loadSessions() {
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

        return { success: true, data: processedData };
      } else {
        console.error('Failed to load sessions:', response.statusText);
        return { success: false, error: response.statusText, data: [] };
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  async createSession(sessionData) {
    try {
      // Validate required fields
      if (!sessionData.display_name || !sessionData.host || !sessionData.folder_name) {
        return {
          success: false,
          error: 'Please fill in all required fields (Display Name, Host, and Folder)'
        };
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to create session: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      return { success: false, error: 'Failed to create session: Network error' };
    }
  },

  async updateSession(sessionId, updatedData) {
    try {
      // Validate session ID
      if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
        return { success: false, error: 'Cannot update session: Invalid session ID' };
      }

      // Validate required fields
      if (!updatedData.display_name || !updatedData.host) {
        return { success: false, error: 'Display Name and Host are required' };
      }

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to update session: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      return { success: false, error: 'Failed to update session: Network error' };
    }
  },

  async deleteSession(sessionId) {
    try {
      // Validate session ID
      if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
        return { success: false, error: 'Cannot delete session: Invalid session ID' };
      }

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to delete session: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      return { success: false, error: 'Failed to delete session: Network error' };
    }
  },

  // Folder CRUD operations
  async createFolder(folderName) {
    try {
      if (!folderName.trim()) {
        return { success: false, error: 'Please enter a folder name' };
      }

      const response = await fetch('/api/sessions/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_name: folderName.trim() })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to create folder: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      return { success: false, error: 'Failed to create folder: Network error' };
    }
  },

  async renameFolder(oldName, newName) {
    try {
      if (!newName.trim()) {
        return { success: false, error: 'Please enter a valid folder name' };
      }

      const response = await fetch(`/api/sessions/folders/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_name: newName.trim() })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to rename folder: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to rename folder:', error);
      return { success: false, error: 'Failed to rename folder: Network error' };
    }
  },

  async deleteFolder(folderName) {
    try {
      const response = await fetch(`/api/sessions/folders/${encodeURIComponent(folderName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to delete folder: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      return { success: false, error: 'Failed to delete folder: Network error' };
    }
  },

  // Import/Export operations
  async importSessions(file, mode) {
    try {
      if (!file) {
        return { success: false, error: 'Please select a file to import' };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const response = await fetch('/api/sessions/import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const results = await response.json();
        return { success: true, data: results };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to import sessions: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to import sessions:', error);
      return { success: false, error: 'Failed to import sessions: Network error' };
    }
  },

  async exportSessions() {
    try {
      const response = await fetch('/api/sessions/export');

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sessions-export-${new Date().toISOString().split('T')[0]}.yaml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        return { success: false, error: `Failed to export sessions: ${errorMsg}` };
      }
    } catch (error) {
      console.error('Failed to export sessions:', error);
      return { success: false, error: 'Failed to export sessions: Network error' };
    }
  },

  // Utility functions
  validateSessionData(sessionData) {
    const errors = [];

    if (!sessionData.display_name?.trim()) {
      errors.push('Display Name is required');
    }

    if (!sessionData.host?.trim()) {
      errors.push('Host is required');
    }

    if (!sessionData.folder_name?.trim()) {
      errors.push('Folder is required');
    }

    if (sessionData.port && (sessionData.port < 1 || sessionData.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  getDeviceTypes() {
    return [
      'linux', 'cisco_ios', 'cisco_nxos', 'juniper', 'arista_eos',
      'hp_comware', 'huawei', 'fortinet', 'paloalto_panos', 'mikrotik_routeros'
    ];
  },

  findSessionById(sessions, sessionId) {
    for (const folder of sessions) {
      for (const session of folder.sessions) {
        if (session.id === sessionId) {
          return { session, folder };
        }
      }
    }
    return null;
  }
};