// Enhanced Login.jsx - JWT Support Added to Original
import React, { useState, useEffect } from 'react';
import { Terminal, User, Lock, Zap, Shield, Server, ChevronDown, Wifi, WifiOff, ToggleLeft, ToggleRight } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    domain: ''
  });
  const [authMethod, setAuthMethod] = useState('local');
  const [authMode, setAuthMode] = useState('session'); // NEW: JWT vs Session
  const [availableMethods, setAvailableMethods] = useState([]);
  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available authentication methods on component mount
  useEffect(() => {
    const fetchAuthMethods = async () => {
      try {
        const response = await fetch('/api/auth/methods');
        if (response.ok) {
          const data = await response.json();
          setAvailableMethods(data.available_methods);
          setAuthMethod(data.default_method);
          setAuthInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch auth methods:', err);
        // Fallback to POC mode if auth methods fetch fails
        setAvailableMethods(['poc']);
        setAuthMethod('poc');
      }
    };

    fetchAuthMethods();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!credentials.username || !credentials.password) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    // Prepare login data with auth method AND auth mode
    const loginData = {
      username: credentials.username,
      password: credentials.password,
      auth_method: authMethod,
      authMode: authMode, // NEW: Pass the JWT/Session preference
      ...(authMethod === 'local' && credentials.domain && { domain: credentials.domain })
    };

    const result = await onLogin(loginData);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleAuthMethodChange = (e) => {
    setAuthMethod(e.target.value);
    setError(''); // Clear error when switching methods
  };

  // NEW: Toggle between JWT and Session authentication
  const toggleAuthMode = () => {
    const newMode = authMode === 'session' ? 'jwt' : 'session';
    setAuthMode(newMode);
    setError(''); // Clear any previous errors
    console.log(`Switched to ${newMode} authentication mode`);
  };

  const getAuthMethodLabel = (method) => {
    switch (method) {
      case 'local':
        return authInfo?.system_info?.system === 'Windows' ? 'Windows Authentication' : 'Local Authentication';
      case 'ldap':
        return 'LDAP Authentication';
      case 'poc':
        return 'POC Mode (Demo)';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const getAuthMethodIcon = (method) => {
    switch (method) {
      case 'local':
        return <Shield size={16} />;
      case 'ldap':
        return <Server size={16} />;
      case 'poc':
        return <Terminal size={16} />;
      default:
        return <Shield size={16} />;
    }
  };

  // NEW: Get auth mode info
  const getAuthModeInfo = () => {
    if (authMode === 'jwt') {
      return {
        title: 'JWT Token Mode',
        description: 'Modern stateless authentication with automatic token refresh',
        icon: Wifi,
        color: 'var(--border-focus)'
      };
    } else {
      return {
        title: 'Session Cookie Mode',
        description: 'Traditional session-based authentication optimized for WebSockets',
        icon: WifiOff,
        color: 'var(--text-tab-inactive)'
      };
    }
  };

  const isWindowsLocal = authMethod === 'local' && authInfo?.system_info?.system === 'Windows';
  const authModeInfo = getAuthModeInfo(); // NEW

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              backgroundColor: 'var(--border-focus)',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Terminal size={32} style={{ color: 'white' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: '700',
                color: 'var(--text-color)',
                margin: '0',
                fontFamily: 'var(--font-terminal, monospace)'
              }}>
                VelociTerm NB
              </h1>
              <div style={{
                fontSize: '0.875rem',
                color: 'var(--border-focus)',
                fontWeight: '500'
              }}>
                Enhanced Authentication
              </div>
            </div>
          </div>
          <p style={{
            color: 'var(--text-tab-inactive)',
            fontSize: '0.875rem',
            margin: '0'
          }}>
            Secure workspace for NetBox device operations
          </p>
        </div>

        {/* NEW: Authentication Mode Toggle */}
        {authInfo?.jwt_enabled && (
          <div style={{
            backgroundColor: 'var(--bg-accordion)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <authModeInfo.icon size={18} style={{ color: authModeInfo.color }} />
                <span style={{
                  color: 'var(--text-color)',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  {authModeInfo.title}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAuthMode}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: authModeInfo.color,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.25rem'
                }}
                title={`Switch to ${authMode === 'jwt' ? 'Session' : 'JWT'} mode`}
              >
                {authMode === 'jwt' ?
                  <ToggleRight size={24} /> :
                  <ToggleLeft size={24} />
                }
              </button>
            </div>
            <p style={{
              color: 'var(--text-tab-inactive)',
              fontSize: '0.75rem',
              margin: '0'
            }}>
              {authModeInfo.description}
            </p>
          </div>
        )}

        {/* Login Card */}
        <div style={{
          backgroundColor: 'var(--bg-accordion-content)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.3)'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid #dc3545',
                color: '#dc3545',
                padding: '1rem',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            {/* Authentication Method Selection */}
            {availableMethods.length > 1 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  Authentication Method
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={authMethod}
                    onChange={handleAuthMethodChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.75rem 0.75rem 2.75rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      color: 'var(--text-color)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box',
                      appearance: 'none'
                    }}
                    disabled={loading}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--border-focus)';
                      e.target.style.outline = '2px solid var(--border-focus)';
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.outline = 'none';
                    }}
                  >
                    {availableMethods.map(method => (
                      <option key={method} value={method}>
                        {getAuthMethodLabel(method)}
                      </option>
                    ))}
                  </select>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0.75rem',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tab-inactive)',
                    pointerEvents: 'none'
                  }}>
                    {getAuthMethodIcon(authMethod)}
                  </div>
                  <ChevronDown
                    size={16}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '0.75rem',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-tab-inactive)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Domain field for Windows authentication */}
            {isWindowsLocal && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  Domain (optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="domain"
                    value={credentials.domain}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      color: 'var(--text-color)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Leave blank for local computer"
                    disabled={loading}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--border-focus)';
                      e.target.style.outline = '2px solid var(--border-focus)';
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.outline = 'none';
                    }}
                  />
                  <Server
                    size={16}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '0.75rem',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-tab-inactive)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Username field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.5rem'
              }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-color)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-terminal, monospace)',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder={
                    authMethod === 'poc' ? 'Any username' :
                    isWindowsLocal ? 'Windows username' :
                    authMethod === 'ldap' ? 'LDAP username' :
                    'Enter your username'
                  }
                  disabled={loading}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--border-focus)';
                    e.target.style.outline = '2px solid var(--border-focus)';
                    e.target.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.outline = 'none';
                  }}
                />
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0.75rem',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tab-inactive)',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-color)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-terminal, monospace)',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder={
                    authMethod === 'poc' ? 'Any password' : 'Enter your password'
                  }
                  disabled={loading}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--border-focus)';
                    e.target.style.outline = '2px solid var(--border-focus)';
                    e.target.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.outline = 'none';
                  }}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0.75rem',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tab-inactive)',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                backgroundColor: loading ? 'var(--bg-accordion)' : 'var(--bg-button)',
                color: loading ? 'var(--text-tab-inactive)' : 'var(--text-button)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-terminal, monospace)',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = 'var(--bg-button-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = 'var(--bg-button)';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid var(--text-tab-inactive)',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Authenticating...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Connect to Workspace {authMode === 'jwt' ? '(JWT)' : '(Session)'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Notice */}
        {authMethod === 'poc' ? (
          <div style={{
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid #ffc107',
            color: '#ffc107',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            <strong>POC Mode:</strong> Use any username/password combination to access the demo workspace.
          </div>
        ) : authMethod === 'local' ? (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e',
            color: '#22c55e',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            <strong>Local Authentication:</strong> {
              isWindowsLocal ?
              'Using Windows credentials. Domain is optional for local accounts.' :
              'Using system credentials for authentication.'
            }
          </div>
        ) : authMethod === 'ldap' ? (
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid #3b82f6',
            color: '#3b82f6',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            <strong>LDAP Authentication:</strong> Using enterprise directory services.
          </div>
        ) : null}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-tab-inactive)'
          }}>
            VelociTerm NB Enhanced Authentication • Secure NetBox Integration
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;