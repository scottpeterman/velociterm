// src/services/auth.js
import axios from 'axios';

const API_BASE_URL = '/api'; // Uses proxy in package.json

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Important: Include session cookies
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      throw new Error('Authentication failed');
    }
    throw error;
  }
);

export const authService = {
  async login(credentials) {
    try {
      // Use the new session-based login endpoint
      const token = btoa(`${credentials.username}:${credentials.password}`);

      const response = await api.post('/auth/login', {}, {
        headers: {
          'Authorization': `Basic ${token}`
        }
      });

      // Session cookie is automatically set by the browser
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return true; // Don't throw on logout errors
    }
  },

  async getCurrentUser() {
    try {
      // Check auth status using the new endpoint
      const response = await api.get('/auth/status');
      if (response.data.authenticated) {
        return {
          username: response.data.username,
          session_id: response.data.session_id,
          ...response.data
        };
      }
      throw new Error('Not authenticated');
    } catch (error) {
      throw new Error('Session expired');
    }
  },

  async isAuthenticated() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }
};

// Export the configured axios instance for other services
export { api };