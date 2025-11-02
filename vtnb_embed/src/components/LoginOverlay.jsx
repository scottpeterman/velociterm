import React, { useState, useEffect } from 'react';
import './LoginOverlay.css';

/**
 * Get backend API base URL
 * @returns {string} API base URL
 */
const getApiBaseUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const backendPort = params.get('bep');

  // Use query param if present, otherwise default to 8050
  const port = backendPort || '8050';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;

  return `${protocol}//${hostname}:${port}`;
};

/**
 * Compact Login Overlay for Embedded Terminal
 * JWT-only authentication
 */
function LoginOverlay({ onAuthSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableMethods, setAvailableMethods] = useState(['local']);

  useEffect(() => {
    // Fetch available authentication methods
    fetchAuthMethods();
  }, []);

  const fetchAuthMethods = async () => {
    const API_BASE_URL = getApiBaseUrl();

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/methods`);
      if (response.ok) {
        const data = await response.json();
        setAvailableMethods(data.methods || ['local']);
        if (data.default_method) {
          setAuthMethod(data.default_method);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth methods:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const API_BASE_URL = getApiBaseUrl();

    try {
      // JWT authentication only
      const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          auth_method: authMethod
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Store JWT tokens
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          console.log('✓ Stored access token');
        }

        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
          console.log('✓ Stored refresh token');
        }

        // Store VelociTerm username for SSH key lookup
        if (data.username) {
          localStorage.setItem('velociterm_user', data.username);
          console.log(`✓ Stored VelociTerm user: ${data.username}`);
        }

        // Success - call parent callback
        onAuthSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || errorData.detail || 'Authentication failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <h2>VelociTerm</h2>
          <p>Authentication Required</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Auth Method Selection - Only show if multiple methods available */}
          {availableMethods.length > 1 && (
            <div className="form-group">
              <label>Authentication Method</label>
              <select
                value={authMethod}
                onChange={(e) => setAuthMethod(e.target.value)}
                className="form-select"
              >
                {availableMethods.map(method => (
                  <option key={method} value={method}>
                    {method.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
              className="form-input"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="form-input"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="submit-button"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Authenticating...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>

        <div className="login-footer">
          <small>Secure terminal access via VelociTerm • JWT Authentication</small>
        </div>
      </div>
    </div>
  );
}

export default LoginOverlay;