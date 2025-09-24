import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Palette,
  User,
  Shield,
  Save,
  RefreshCw,
  Key,
  Monitor,
  Database,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink
} from 'lucide-react';
import { workspaceService } from '../services/workspace';

const Settings = ({ theme, onThemeChange }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    theme: 'cyber',
    default_ssh_username: '',
    session_preferences: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [netboxStatus, setNetboxStatus] = useState(null);

  const themes = [
    { id: 'cyber', name: 'Cyber', description: 'Dark theme with cyan accents' },
    { id: 'matrix', name: 'Matrix', description: 'Green terminal aesthetic' },
    { id: 'neon', name: 'Neon', description: 'Vibrant purple and pink' },
    { id: 'corporate', name: 'Corporate', description: 'Professional blue theme' },
    { id: 'amber', name: 'Amber', description: 'Classic amber terminal' },
    { id: 'mono', name: 'Mono', description: 'Monochrome display' },
    { id: 'blue', name: 'Blue', description: 'Cool blue terminal' },
    { id: 'green', name: 'Green', description: 'Nature green theme' },
    { id: 'light', name: 'Light', description: 'Light mode theme' },
    { id: 'paper', name: 'Paper', description: 'Cream paper theme' },
    { id: 'default', name: 'Default', description: 'Standard terminal theme' }
  ];

  useEffect(() => {
    loadSettings();
    loadNetBoxStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await workspaceService.getSettings();
      setSettings(userSettings);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadNetBoxStatus = async () => {
    try {
      const status = await workspaceService.getNetBoxTokenStatus();
      setNetboxStatus(status);
    } catch (error) {
      console.error('Failed to load NetBox status:', error);
    }
  };

  const handleInputChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear messages
    if (message) setMessage(null);
  };

  const handleThemeChange = (newTheme) => {
    handleInputChange('theme', newTheme);
    onThemeChange(newTheme);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await workspaceService.updateSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '72rem',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: 'var(--font-terminal, monospace)'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-accordion-content)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--text-tab-inactive)',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-tab-inactive)', margin: 0 }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '72rem',
      margin: '0 auto',
      padding: '1.5rem',
      fontFamily: 'var(--font-terminal, monospace)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'var(--bg-accordion-content)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '2rem',
          position: 'relative'
        }}>
          {/* Close Button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--bg-accordion)';
              e.target.style.color = 'var(--text-color)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'var(--text-tab-inactive)';
            }}
            title="Close"
          >
            <X size={20} />
          </button>

          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: 'var(--text-color)',
            margin: '0 0 0.5rem 0'
          }}>
            Workspace Settings
          </h1>
          <p style={{
            color: 'var(--text-tab-inactive)',
            fontSize: '0.875rem',
            margin: 0
          }}>
            Configure your personal workspace preferences and security settings
          </p>
        </div>

        {/* Main Content Grid */}
        <div style={{
          backgroundColor: 'var(--bg-accordion-content)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {/* Left Column - Settings Form (Fixed Width) */}
            <div style={{
              flexShrink: 0,
              width: '24rem'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: 'var(--text-color)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <SettingsIcon size={24} style={{ color: '#06b6d4' }} />
                Configuration
              </h2>

              <form style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }} onSubmit={(e) => e.preventDefault()}>
                {/* Theme Selection */}
                <div>
                  <label htmlFor="theme-select" style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--text-color)',
                    marginBottom: '0.5rem'
                  }}>
                    Theme
                  </label>
                  <select
                    id="theme-select"
                    value={settings.theme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      color: 'var(--text-color)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
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
                    {themes.map((themeOption) => (
                      <option key={themeOption.id} value={themeOption.id}>
                        {themeOption.name} - {themeOption.description}
                      </option>
                    ))}
                  </select>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tab-inactive)',
                    marginTop: '0.25rem'
                  }}>
                    Choose your preferred visual theme for the interface
                  </p>
                </div>

                {/* SSH Username */}
                <div>
                  <label htmlFor="ssh_username" style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--text-color)',
                    marginBottom: '0.5rem'
                  }}>
                    Default SSH Username
                  </label>
                  <input
                    type="text"
                    id="ssh_username"
                    value={settings.default_ssh_username || ''}
                    onChange={(e) => handleInputChange('default_ssh_username', e.target.value)}
                    placeholder="admin, root, your-username"
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      color: 'var(--text-color)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
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
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tab-inactive)',
                    marginTop: '0.25rem'
                  }}>
                    Default username for SSH connections to devices
                  </p>
                </div>

                {/* Messages */}
                {message && (
                  <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid',
                    backgroundColor: message.type === 'success'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    borderColor: message.type === 'success' ? '#10b981' : '#ef4444',
                    color: message.type === 'success' ? '#10b981' : '#ef4444'
                  }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      {message.text}
                    </p>
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: saving ? 'var(--bg-accordion)' : 'var(--bg-button)',
                    color: saving ? 'var(--text-tab-inactive)' : 'var(--text-button)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    opacity: saving ? 0.5 : 1,
                    fontFamily: 'var(--font-terminal, monospace)'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.target.style.backgroundColor = 'var(--bg-button-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.target.style.backgroundColor = 'var(--bg-button)';
                    }
                  }}
                >
                  {saving ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--text-tab-inactive)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Settings
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column - Status and Information */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* NetBox Integration Status */}
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'var(--text-color)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Database size={24} style={{ color: '#06b6d4' }} />
                  NetBox Integration
                </h2>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-accordion)',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {netboxStatus?.configured ? (
                      <CheckCircle size={20} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                    )}
                    <div>
                      <h3 style={{
                        fontWeight: '500',
                        color: 'var(--text-color)',
                        margin: '0 0 0.25rem 0'
                      }}>
                        {netboxStatus?.configured ? 'NetBox Connected' : 'NetBox Not Configured'}
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-tab-inactive)',
                        margin: 0
                      }}>
                        {netboxStatus?.configured
                          ? `Connected to ${netboxStatus.api_url}`
                          : 'Configure your NetBox API token to enable device operations'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/netbox-setup'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--bg-accordion)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      fontFamily: 'var(--font-terminal, monospace)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-accordion-header)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-accordion)';
                    }}
                  >
                    <ExternalLink size={16} />
                    {netboxStatus?.configured ? 'Manage' : 'Configure'}
                  </button>
                </div>

                {netboxStatus?.configured && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-tab-inactive)' }}>Last Validated:</span>
                      <span style={{ color: 'var(--text-color)', marginLeft: '0.5rem' }}>
                        {netboxStatus.last_validated
                          ? new Date(netboxStatus.last_validated).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tab-inactive)' }}>Description:</span>
                      <span style={{ color: 'var(--text-color)', marginLeft: '0.5rem' }}>
                        {netboxStatus.description || 'No description'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Information */}
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'var(--text-color)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Shield size={24} style={{ color: '#10b981' }} />
                  Security & Privacy
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <Shield size={20} style={{ color: '#10b981', marginTop: '0.125rem', flexShrink: 0 }} />
                      <div>
                        <h3 style={{
                          fontWeight: '500',
                          color: '#10b981',
                          marginBottom: '0.5rem'
                        }}>
                          Workspace Security
                        </h3>
                        <ul style={{
                          color: '#6ee7b7',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          margin: 0,
                          paddingLeft: '1rem'
                        }}>
                          <li>All credentials are encrypted using industry-standard AES-256 encryption</li>
                          <li>Your NetBox API token is stored securely and never transmitted in plain text</li>
                          <li>Workspace data is isolated per user with strong access controls</li>
                          <li>Session data is protected with secure authentication mechanisms</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{
                      backgroundColor: 'var(--bg-accordion)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <Key size={32} style={{ color: '#06b6d4', margin: '0 auto 0.5rem' }} />
                      <h4 style={{
                        fontWeight: '500',
                        color: 'var(--text-color)',
                        margin: '0 0 0.25rem 0'
                      }}>
                        Encrypted Storage
                      </h4>
                      <p style={{
                        color: 'var(--text-tab-inactive)',
                        margin: 0
                      }}>
                        All sensitive data encrypted at rest
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: 'var(--bg-accordion)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <Monitor size={32} style={{ color: '#3b82f6', margin: '0 auto 0.5rem' }} />
                      <h4 style={{
                        fontWeight: '500',
                        color: 'var(--text-color)',
                        margin: '0 0 0.25rem 0'
                      }}>
                        Secure Sessions
                      </h4>
                      <p style={{
                        color: 'var(--text-tab-inactive)',
                        margin: 0
                      }}>
                        Protected authentication & session management
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: 'var(--bg-accordion)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <Shield size={32} style={{ color: '#10b981', margin: '0 auto 0.5rem' }} />
                      <h4 style={{
                        fontWeight: '500',
                        color: 'var(--text-color)',
                        margin: '0 0 0.25rem 0'
                      }}>
                        Privacy First
                      </h4>
                      <p style={{
                        color: 'var(--text-tab-inactive)',
                        margin: 0
                      }}>
                        Your data stays in your workspace
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div style={{
            backgroundColor: message.type === 'success'
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            borderRadius: '0.5rem',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {message.type === 'success' ? (
                <CheckCircle size={20} style={{ color: '#10b981' }} />
              ) : (
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              )}
              <p style={{
                color: message.type === 'success' ? '#10b981' : '#ef4444',
                margin: 0,
                fontSize: '0.875rem'
              }}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{
          backgroundColor: 'var(--bg-accordion-content)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: saving ? 'var(--bg-accordion)' : 'var(--bg-button)',
                color: saving ? 'var(--text-tab-inactive)' : 'var(--text-button)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.5 : 1,
                fontFamily: 'var(--font-terminal, monospace)'
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.target.style.backgroundColor = 'var(--bg-button-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.target.style.backgroundColor = 'var(--bg-button)';
                }
              }}
            >
              {saving ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid var(--text-tab-inactive)',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add CSS animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default Settings;