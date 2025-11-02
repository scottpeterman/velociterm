import React, { useState, useEffect } from 'react';
import './EmbedApp.css';
import TerminalEmbed from './components/TerminalEmbed';
import LoginOverlay from './components/LoginOverlay';
import { parseUrlParams, checkAuthStatus } from './utils/embedUtils';

/**
 * VelociTerm Embedded Terminal Application
 *
 * Lightweight single-terminal app designed for iframe embedding in NetBox.
 * URL Parameters:
 *   - session: Session name from user's VelociTerm sessions
 *   - host: Direct SSH host IP/hostname
 *   - port: SSH port (default 22)
 *   - name: Display name for terminal
 *   - theme: Theme name or 'follow' to match parent
 *   - auth: Preferred auth method ('jwt' or 'session')
 *
 * Example URLs:
 *   /embed?session=prod-core-switch
 *   /embed?host=10.0.0.108&port=22&name=T1000
 *   /embed?session=device&theme=cyberpunk-teal
 */
function EmbedApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connectionParams, setConnectionParams] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Remove the static loading screen from index.html
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.remove();
    }

    // Parse URL parameters
    const params = parseUrlParams();

    if (!params.session && !params.host) {
      setError('Missing required parameter: session or host');
      setChecking(false);
      return;
    }

    setConnectionParams(params);

    // Check if user is already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuthed = await checkAuthStatus();
      setAuthenticated(isAuthed);
    } catch (err) {
      console.error('Auth check failed:', err);
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  };

  const handleAuthSuccess = () => {
    setAuthenticated(true);
  };

  if (checking) {
    return (
      <div className="embed-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="embed-error">
        <h2>Configuration Error</h2>
        <p>{error}</p>
        <p className="embed-help">
          Valid URL formats:
          <br />• /embed?session=session-name
          <br />• /embed?host=10.0.0.1&port=22&name=Device
        </p>
      </div>
    );
  }

  return (
    <div className="embed-app">
      {!authenticated && (
        <LoginOverlay
          onAuthSuccess={handleAuthSuccess}
          preferredMethod={connectionParams?.auth || 'jwt'}
        />
      )}
      {authenticated && connectionParams && (
        <TerminalEmbed
          connectionParams={connectionParams}
          onError={setError}
        />
      )}
    </div>
  );
}

export default EmbedApp;