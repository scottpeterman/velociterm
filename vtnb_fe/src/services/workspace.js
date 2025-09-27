// src/services/workspace.js
import { api } from './auth';

export const workspaceService = {
  // Sessions Management
  async getSessions() {
    try {
      const response = await api.get('/sessions');
      return response.data;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      throw new Error(error.response?.data?.detail || 'Failed to load sessions');
    }
  },

  // Add session to workspace - NEW METHOD
  async addSession(folderName, sessionData) {
    try {
      const response = await api.post('/sessions/add', {
        folder_name: folderName,
        session: sessionData
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add session:', error);
      throw new Error(error.response?.data?.detail || 'Failed to add session');
    }
  },

  // Update session data
  async updateSession(sessionId, sessionData) {
    try {
      const response = await api.put(`/sessions/${sessionId}`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Failed to update session:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update session');
    }
  },

  // Delete session
  async deleteSession(sessionId) {
    try {
      const response = await api.delete(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error(error.response?.data?.detail || 'Failed to delete session');
    }
  },

  // Window Management
  async registerWindow(windowData) {
    try {
      const response = await api.post('/windows/register', windowData);
      return response.data;
    } catch (error) {
      console.error('Failed to register window:', error);
      throw new Error(error.response?.data?.detail || 'Failed to register window');
    }
  },

  async validateWindow(windowId) {
    try {
      const response = await api.get(`/windows/validate/${windowId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to validate window:', error);
      throw new Error(error.response?.data?.detail || 'Failed to validate window access');
    }
  },

  // NetBox Token Management
  async getNetBoxTokenStatus() {
    try {
      const response = await api.get('/netbox/token/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get NetBox token status:', error);
      throw new Error(error.response?.data?.detail || 'Failed to check NetBox configuration');
    }
  },

  async configureNetBoxToken(config) {
    try {
      const response = await api.post('/netbox/token/configure', config);
      return response.data;
    } catch (error) {
      console.error('Failed to configure NetBox token:', error);
      throw new Error(error.response?.data?.detail || 'Failed to configure NetBox token');
    }
  },

  async validateNetBoxToken() {
    try {
      const response = await api.post('/netbox/token/validate');
      return response.data;
    } catch (error) {
      console.error('Failed to validate NetBox token:', error);
      throw new Error(error.response?.data?.detail || 'Failed to validate NetBox token');
    }
  },

  // NetBox Device Operations
  async searchDevices(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.site) params.append('site', filters.site);
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/netbox/devices?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search devices:', error);
      throw new Error(error.response?.data?.detail || 'Failed to search devices');
    }
  },

  async getSites() {
    try {
      const response = await api.get('/netbox/sites');
      return response.data;
    } catch (error) {
      console.error('Failed to get sites:', error);
      throw new Error(error.response?.data?.detail || 'Failed to load sites');
    }
  },

  // Tools Management
  async getAvailableTools() {
    try {
      const response = await api.get('/tools');
      return response.data;
    } catch (error) {
      console.error('Failed to get tools:', error);
      throw new Error(error.response?.data?.detail || 'Failed to load available tools');
    }
  },

  async getToolSchema(toolType) {
    try {
      const response = await api.get(`/plugins/${toolType}/schema`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get schema for ${toolType}:`, error);
      throw new Error(error.response?.data?.detail || `Failed to load ${toolType} configuration schema`);
    }
  },

  // System Monitoring
  // System Monitoring
  async getSystemStats() {
    try {
      const response = await api.get('/system/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get system stats:', error);
      throw new Error(error.response?.data?.detail || 'Failed to load system statistics');
    }
  },

  // User Settings
  async getSettings() {
    try {
      const response = await api.get('/workspace/settings');
      return response.data;
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw new Error(error.response?.data?.detail || 'Failed to load settings');
    }
  },

  async updateSettings(settings) {
    try {
      const response = await api.put('/workspace/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw new Error(error.response?.data?.detail || 'Failed to save settings');
    }
  },

  // Health Check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Backend service unavailable');
    }
  }
};