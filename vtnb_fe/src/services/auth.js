// src/services/auth.js - Enhanced with JWT support
import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Always include session cookies for WebSocket compatibility
});

// JWT token storage (in-memory only for Claude artifacts)
let accessToken = null;
let refreshToken = null;
let tokenRefreshPromise = null;

// Authentication state
let currentAuthMethod = 'session'; // 'session' or 'jwt'

// JWT token management
const tokenManager = {
  setTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    currentAuthMethod = 'jwt';
  },

  clearTokens() {
    accessToken = null;
    refreshToken = null;
    tokenRefreshPromise = null;
    currentAuthMethod = 'session';
  },

  getAccessToken() {
    return accessToken;
  },

  getRefreshToken() {
    return refreshToken;
  },

  hasValidTokens() {
    return !!accessToken && !!refreshToken;
  },

  isJWTMode() {
    return currentAuthMethod === 'jwt' && this.hasValidTokens();
  }
};

// Enhanced request interceptor with JWT support
api.interceptors.request.use(
  (config) => {
    // Add JWT Authorization header if available
    if (tokenManager.isJWTMode()) {
      config.headers.Authorization = `Bearer ${tokenManager.getAccessToken()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced response interceptor with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors for JWT authentication
    if (error.response?.status === 401 && tokenManager.isJWTMode() && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Prevent multiple simultaneous refresh attempts
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = refreshAccessToken();
        }

        await tokenRefreshPromise;
        tokenRefreshPromise = null;

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${tokenManager.getAccessToken()}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed - clear tokens and fallback to session auth
        console.warn('JWT refresh failed, falling back to session auth:', refreshError.message);
        tokenManager.clearTokens();

        // Don't throw error - let the original request proceed with session auth
        // Remove the Authorization header and retry
        delete originalRequest.headers.Authorization;
        return api(originalRequest);
      }
    }

    // Handle other 401 errors
    if (error.response?.status === 401) {
      throw new Error('Authentication failed');
    }

    throw error;
  }
);

// JWT token refresh function
const refreshAccessToken = async () => {
  if (!tokenManager.getRefreshToken()) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: tokenManager.getRefreshToken()
    }, {
      timeout: 5000,
      withCredentials: true // Keep session cookie for WebSocket compatibility
    });

    const { access_token, refresh_token } = response.data;
    tokenManager.setTokens(access_token, refresh_token);

    console.log('JWT tokens refreshed successfully');
    return response.data;

  } catch (error) {
    tokenManager.clearTokens();
    throw new Error('Token refresh failed');
  }
};

export const authService = {
  // Enhanced login with auth method selection
  async login(credentials, authMethod = 'session') {
    try {
      if (authMethod === 'jwt') {
        return await this.loginWithJWT(credentials);
      } else {
        return await this.loginWithSession(credentials);
      }
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Login failed');
    }
  },

  // Session-based login (existing method)
  async loginWithSession(credentials) {
    const token = btoa(`${credentials.username}:${credentials.password}`);

    const response = await api.post('/auth/login', {}, {
      headers: {
        'Authorization': `Basic ${token}`
      }
    });

    currentAuthMethod = 'session';
    console.log('Session login successful');
    return response.data;
  },

  // New JWT-based login
  async loginWithJWT(credentials) {
    const response = await api.post('/auth/token', {
      username: credentials.username,
      password: credentials.password,
      auth_method: credentials.auth_method || 'local',
      domain: credentials.domain || ''
    });

    const { access_token, refresh_token } = response.data;
    tokenManager.setTokens(access_token, refresh_token);

    console.log('JWT login successful');
    return response.data;
  },

  // Enhanced logout
  async logout() {
    try {
      // Call logout endpoint (works for both auth methods)
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API response
      tokenManager.clearTokens();
      currentAuthMethod = 'session';
    }
    return true;
  },

  // Enhanced current user check
  async getCurrentUser() {
    try {
      // Use the unified /auth/me endpoint that supports both auth methods
      const response = await api.get('/auth/me');

      if (response.data.authenticated) {
        return {
          username: response.data.username,
          groups: response.data.groups,
          auth_method: response.data.auth_method,
          ...response.data
        };
      }
      throw new Error('Not authenticated');

    } catch (error) {
      // If JWT mode and we get an error, try to refresh
      if (tokenManager.isJWTMode() && error.response?.status === 401) {
        try {
          await refreshAccessToken();
          // Retry after refresh
          const retryResponse = await api.get('/auth/me');
          return retryResponse.data;
        } catch (refreshError) {
          // Refresh failed, clear tokens
          tokenManager.clearTokens();
        }
      }
      throw new Error('Session expired');
    }
  },

  // Check authentication status
  async isAuthenticated() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  },

  // Get available authentication methods
  async getAuthMethods() {
    try {
      const response = await api.get('/auth/methods');
      return response.data;
    } catch (error) {
      console.warn('Failed to get auth methods:', error);
      return {
        available_methods: ['local'],
        default_method: 'local',
        jwt_enabled: true
      };
    }
  },

  // Verify current JWT token
  async verifyToken() {
    if (!tokenManager.isJWTMode()) {
      return { valid: false, reason: 'Not in JWT mode' };
    }

    try {
      const response = await api.get('/auth/verify');
      return { valid: true, ...response.data };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  },

  // Get current authentication info
  getAuthInfo() {
    return {
      method: currentAuthMethod,
      hasJWTTokens: tokenManager.hasValidTokens(),
      isJWTMode: tokenManager.isJWTMode()
    };
  },

  // Manual token refresh (for testing)
  async refreshTokens() {
    if (!tokenManager.isJWTMode()) {
      throw new Error('Not in JWT mode');
    }
    return await refreshAccessToken();
  }
};

// Export the configured axios instance for other services
export { api };