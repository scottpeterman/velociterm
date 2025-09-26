// Updated Login.jsx - Fixed to use theme system
import React, { useState } from 'react';
import { Terminal, User, Lock, Zap } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!credentials.username || !credentials.password) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    const result = await onLogin(credentials);

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
                Enhanced Backend
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
                  placeholder="Enter your username"
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
                  placeholder="Enter your password"
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
                  Connect to Workspace
                </>
              )}
            </button>
          </form>
        </div>

        {/* POC Notice */}
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

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-tab-inactive)'
          }}>
            VelociTerm NB Proof of Concept • Secure NetBox Integration
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