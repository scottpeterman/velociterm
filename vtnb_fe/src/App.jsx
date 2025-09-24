// src/App.jsx
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

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

// In App.jsx, add this useEffect after your existing useEffects
// This should be completely non-breaking and will enable theme switching

useEffect(() => {
  console.log('Loading theme:', theme); // Debug log

  // Remove any existing theme stylesheets
  const existingThemes = document.head.querySelectorAll('link[data-theme]');
  existingThemes.forEach(link => link.remove());

  // Map theme names to actual file names
const themeFileMap = {
  'cyber': 'theme-crt-cyber.css',
  'matrix': 'theme-crt-cyber.css', // Add this line - maps matrix to cyber theme
  'default': 'theme-default.css',
  'light': 'theme-light.css',
  'blue': 'theme-blue.css',
  'green': 'theme-green.css',
  'forest': 'theme-forest-green.css',
  'amber': 'theme-crt-amber.css',
  'mono': 'theme-crt-mono.css',
  'paper': 'theme-paper.css'
};

  // Load the selected theme
  if (theme && themeFileMap[theme]) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/themes/${themeFileMap[theme]}`;
    link.setAttribute('data-theme', theme);
    link.onload = () => console.log(`Theme ${theme} (${themeFileMap[theme]}) loaded successfully`);
    link.onerror = () => console.error(`Failed to load theme ${theme} (${themeFileMap[theme]})`);
    document.head.appendChild(link);
  } else if (theme) {
    // Fallback - try direct mapping
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/themes/theme-${theme}.css`;
    link.setAttribute('data-theme', theme);
    link.onload = () => console.log(`Theme ${theme} loaded successfully (direct mapping)`);
    link.onerror = () => console.error(`Failed to load theme ${theme} - no mapping found and direct mapping failed`);
    document.head.appendChild(link);
  }

  // Apply theme class to body for additional targeting if needed
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  if (theme) {
    document.body.classList.add(`theme-${theme}`);
  }
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