/**
 * Utility functions for VelociTerm Embedded Terminal
 */

/**
 * Get backend API base URL
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const backendPort = params.get('bep');
  
  // Use query param if present, otherwise default to 8050
  const port = backendPort || '8050';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;
  
  return `${protocol}//${hostname}:${port}`;
}

/**
 * Parse URL parameters for embedded terminal
 * @returns {Object} Connection parameters
 */
export function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    // Session-based connection
    session: params.get('session'),

    // Direct connection parameters
    host: params.get('host'),
    port: parseInt(params.get('port') || '22'),
    name: params.get('name'),

    // UI preferences
    theme: params.get('theme') || 'cyberpunk-teal',
    auth: params.get('auth') || 'session', // jwt or session

    // SSH options (optional)
    username: params.get('username'), // Pre-fill SSH username
  };
}

/**
 * Check if user is already authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export async function checkAuthStatus() {
  const API_BASE_URL = getApiBaseUrl();
  console.log('=== AUTH STATUS CHECK ===');
  console.log('Using API base URL:', API_BASE_URL);

  try {
    // Check localStorage
    const token = localStorage.getItem('access_token');
    const velociTermUser = localStorage.getItem('velociterm_user');
    console.log('localStorage check:');
    console.log('  - access_token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
    console.log('  - velociterm_user:', velociTermUser || 'NOT FOUND');

    // Check cookies
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session='));
    console.log('Cookie check:');
    console.log('  - session cookie:', sessionCookie ? 'FOUND' : 'NOT FOUND');
    if (sessionCookie) {
      console.log('  - session value:', sessionCookie.substring(0, 30) + '...');
    }

    // Build headers
    let headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Added Authorization header with JWT token');
    }

    console.log('Calling /api/auth/status...');
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      method: 'GET',
      headers,
      credentials: 'include' // Include session cookies
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);

      if (data.authenticated === true) {
        console.log('✓ User is authenticated!');
        console.log('  - username:', data.username);
        console.log('  - auth_method:', data.auth_method);

        // Store username if not already stored
        if (data.username && !velociTermUser) {
          localStorage.setItem('velociterm_user', data.username);
          console.log('Stored velociterm_user in localStorage');
        }

        return true;
      } else {
        console.log('✗ User is NOT authenticated (authenticated=false in response)');
        return false;
      }
    } else {
      console.log('✗ Response not OK:', response.status, response.statusText);

      // Try to get error details
      try {
        const errorData = await response.json();
        console.log('Error response body:', errorData);
      } catch (e) {
        console.log('Could not parse error response');
      }

      return false;
    }
  } catch (err) {
    console.error('✗ Auth status check FAILED with exception:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack
    });
    return false;
  } finally {
    console.log('=== END AUTH STATUS CHECK ===\n');
  }
}

/**
 * Get stored JWT token
 * @returns {string|null} Access token or null
 */
export function getAccessToken() {
  return localStorage.getItem('access_token');
}

/**
 * Get stored refresh token
 * @returns {string|null} Refresh token or null
 */
export function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

/**
 * Clear stored authentication tokens
 */
export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Refresh JWT access token
 * @returns {Promise<string|null>} New access token or null
 */
export async function refreshAccessToken() {
  const API_BASE_URL = getApiBaseUrl();
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
    }

    // Refresh failed - clear tokens
    clearTokens();
    return null;
  } catch (err) {
    console.error('Token refresh failed:', err);
    clearTokens();
    return null;
  }
}

/**
 * Make authenticated API request with automatic token refresh
 * @param {string} url - API endpoint (absolute or relative)
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const API_BASE_URL = getApiBaseUrl();
  const token = getAccessToken();

  // Build full URL if relative path provided
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Add authorization header if token exists
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Always include credentials for session auth fallback
  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include'
  };

  let response = await fetch(fullUrl, fetchOptions);

  // If unauthorized and we have a refresh token, try refreshing
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include'
      });
    }
  }

  return response;
}

/**
 * Parse theme from URL or detect parent page theme
 * @returns {string} Theme name
 */
export function detectTheme() {
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get('theme');

  // If theme=follow, try to detect parent page theme
  if (themeParam === 'follow') {
    try {
      // Check if we're in an iframe
      if (window.self !== window.top) {
        // Try to read parent page theme (may fail due to CORS)
        const parentTheme = window.parent.document.body.className;

        // Map NetBox themes to VelociTerm themes
        const themeMap = {
          'dark': 'cyberpunk-teal',
          'light': 'light-mode',
          'netbox-dark': 'netbox-dark',
          'netbox-light': 'light-mode'
        };

        for (const [key, value] of Object.entries(themeMap)) {
          if (parentTheme.includes(key)) {
            return value;
          }
        }
      }
    } catch (err) {
      // CORS prevented access to parent - use default
      console.log('Cannot detect parent theme, using default');
    }
  }

  return themeParam || 'cyberpunk-teal';
}

/**
 * Validate connection parameters
 * @param {Object} params - Connection parameters
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
export function validateConnectionParams(params) {
  // Must have either session or host
  if (!params.session && !params.host) {
    return {
      valid: false,
      error: 'Missing required parameter: session or host'
    };
  }

  // If using direct connection, host is required
  if (params.host && !params.host.trim()) {
    return {
      valid: false,
      error: 'Host parameter cannot be empty'
    };
  }

  // Validate port if provided
  if (params.port && (params.port < 1 || params.port > 65535)) {
    return {
      valid: false,
      error: 'Invalid port number (must be 1-65535)'
    };
  }

  return { valid: true };
}