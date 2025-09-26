// src/App.jsx
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

// Import all theme CSS files at build time
import './themes/theme-crt-cyber.css';
import './themes/theme-default.css';
import './themes/theme-light.css';
import './themes/theme-blue.css';
import './themes/theme-green.css';
import './themes/theme-forest-green.css';
import './themes/theme-crt-amber.css';
import './themes/theme-crt-mono.css';
import './themes/theme-paper.css';

// Contexts
import { WebGLProvider } from './contexts/WebGLContext';
import { WindowManagerProvider } from './contexts/WindowManagerContext';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// Services
import { authService } from './services/auth';
import { workspaceService } from './services/workspace';

// Create QueryClient at module level - BEFORE the component
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
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  // Theme switching useEffect - simple CSS class approach
  useEffect(() => {
    // Remove all existing theme classes from document element
    const themeClasses = [
      'theme-cyber', 'theme-matrix', 'theme-default', 'theme-light',
      'theme-blue', 'theme-green', 'theme-forest', 'theme-amber',
      'theme-mono', 'theme-paper', 'theme-corporate'
    ];

    themeClasses.forEach(className => {
      document.documentElement.classList.remove(className);
    });

    // Add the current theme class
    const themeClass = `theme-${theme}`;
    document.documentElement.classList.add(themeClass);

    console.log(`Theme switched to: ${theme} (class: ${themeClass})`);
  }, [theme]);

  const checkAuthStatus = async () => {
    try {
      const userInfo = await authService.getCurrentUser();
      if (userInfo) {
        setUser(userInfo);
        setIsAuthenticated(true);

        // Load user settings including theme
        try {
          const settings = await workspaceService.getSettings();
          setTheme(settings.theme || 'cyber');
        } catch (error) {
          console.log('Could not load user settings, using defaults');
        }
      }
    } catch (error) {
      console.log('No active session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const userInfo = await authService.login(credentials);
      setUser(userInfo);
      setIsAuthenticated(true);

      // Load user settings
      try {
        const settings = await workspaceService.getSettings();
        setTheme(settings.theme || 'cyber');
      } catch (error) {
        console.log('Could not load user settings, using defaults');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setTheme('cyber');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading VelociTerm NB...</p>
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