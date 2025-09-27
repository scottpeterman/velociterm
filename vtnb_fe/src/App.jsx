// src/App.jsx - Enhanced with JWT support (minimal changes)
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

// Import all theme CSS files at build time (unchanged)
import './themes/theme-crt-cyber.css';
import './themes/theme-default.css';
import './themes/theme-light.css';
import './themes/theme-blue.css';
import './themes/theme-green.css';
import './themes/theme-forest-green.css';
import './themes/theme-crt-amber.css';
import './themes/theme-crt-mono.css';
import './themes/theme-paper.css';

// Contexts (unchanged)
import { WebGLProvider } from './contexts/WebGLContext';
import { WindowManagerProvider } from './contexts/WindowManagerContext';

// Components (unchanged)
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// Services with JWT support
import { authService } from './services/auth';
import { workspaceService } from './services/workspace';

// Create QueryClient at module level (unchanged)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('cyber');

  useEffect(() => {
    // Check if user is already logged in (works for both session and JWT)
    checkAuthStatus();
  }, []);

  // Theme switching useEffect (unchanged)
  useEffect(() => {
    const themeClasses = [
      'theme-cyber', 'theme-matrix', 'theme-default', 'theme-light',
      'theme-blue', 'theme-green', 'theme-forest', 'theme-amber',
      'theme-mono', 'theme-paper', 'theme-corporate'
    ];

    themeClasses.forEach(className => {
      document.documentElement.classList.remove(className);
    });

    const themeClass = `theme-${theme}`;
    document.documentElement.classList.add(themeClass);

    console.log(`Theme switched to: ${theme} (class: ${themeClass})`);
  }, [theme]);

  const checkAuthStatus = async () => {
    try {
      // Enhanced: getCurrentUser now works with both JWT and session auth
      const userInfo = await authService.getCurrentUser();
      if (userInfo) {
        setUser({
          ...userInfo,
          // Add auth info for debugging/display
          authInfo: authService.getAuthInfo()
        });
        setIsAuthenticated(true);

        // Load user settings including theme (unchanged)
        try {
          const settings = await workspaceService.getSettings();
          setTheme(settings.theme || 'cyber');
        } catch (error) {
          console.log('Could not load user settings, using defaults');
        }
      }
    } catch (error) {
      console.log('No active session or token:', error.message);
      // Clear any invalid tokens
      if (error.message.includes('token') || error.message.includes('JWT')) {
        try {
          await authService.logout();
        } catch (logoutError) {
          console.log('Cleanup after auth check failed');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // App.jsx - Only the handleLogin function needs to change

// Enhanced handleLogin to support both auth modes
const handleLogin = async (credentials) => {
  try {
    // Extract authMode from credentials (new)
    const { authMode = 'session', ...loginCredentials } = credentials;

    console.log(`Attempting ${authMode} authentication with ${loginCredentials.auth_method} method...`);

    // Use the enhanced authService.login which now accepts authMode
    const userInfo = await authService.login(loginCredentials, authMode);

    setUser({
      ...userInfo,
      authInfo: authService.getAuthInfo() // Include auth method info
    });
    setIsAuthenticated(true);

    // Load user settings (unchanged)
    try {
      const settings = await workspaceService.getSettings();
      setTheme(settings.theme || 'cyber');
    } catch (error) {
      console.log('Could not load user settings, using defaults');
    }

    // Log successful login with auth method info
    const authInfo = authService.getAuthInfo();
    console.log(`Login successful:`, {
      username: userInfo.username,
      authMethod: loginCredentials.auth_method,
      authMode: authInfo.method,
      hasJWTTokens: authInfo.hasJWTTokens
    });

    return { success: true };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
};

  // Enhanced handleLogout
  const handleLogout = async () => {
    try {
      const authInfo = authService.getAuthInfo();
      console.log(`Logging out from ${authInfo.method} authentication...`);

      await authService.logout();

      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setTheme('cyber');
    }
  };

  // Loading screen (unchanged)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading VelociTerm NB...</p>
          <p className="text-gray-500 text-sm mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <WebGLProvider>
      <WindowManagerProvider>
        <QueryClientProvider client={queryClient}>
          <div className={`min-h-screen theme-${theme}`}>
            {!isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Dashboard
                user={user}
                onLogout={handleLogout}
                theme={theme}
                onThemeChange={setTheme}
              />
            )}
          </div>
        </QueryClientProvider>
      </WindowManagerProvider>
    </WebGLProvider>
  );
}

export default App;