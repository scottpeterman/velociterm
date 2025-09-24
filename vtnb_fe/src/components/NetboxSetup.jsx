import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Key,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Save,
  TestTube,
  Info,
  RefreshCw,
  X
} from 'lucide-react';
import { workspaceService } from '../services/workspace';

const NetBoxSetup = () => {
  const navigate = useNavigate();
  const [tokenConfig, setTokenConfig] = useState({
    api_url: '',
    api_token: '',
    description: ''
  });
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadCurrentStatus();
  }, []);

  const loadCurrentStatus = async () => {
    try {
      const status = await workspaceService.getNetBoxTokenStatus();
      setCurrentStatus(status);

      if (status.configured) {
        setTokenConfig({
          api_url: status.api_url || '',
          api_token: '', // Don't pre-fill for security
          description: status.description || ''
        });
      }
    } catch (error) {
      console.error('Failed to load NetBox status:', error);
      setMessage({ type: 'error', text: 'Failed to load current configuration' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTokenConfig(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear messages when user starts typing
    if (message) setMessage(null);
    if (testResult) setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!tokenConfig.api_url || !tokenConfig.api_token) {
      setMessage({ type: 'error', text: 'Please enter both API URL and token' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setMessage(null);

    try {
      const result = await workspaceService.configureNetBoxToken(tokenConfig);
      setTestResult({ type: 'success', ...result });
      setMessage({
        type: 'success',
        text: `NetBox API connection successful! Token authentication verified.`
      });
    } catch (error) {
      setTestResult({ type: 'error', message: error.message });
      setMessage({ type: 'error', text: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!tokenConfig.api_url || !tokenConfig.api_token) {
      setMessage({ type: 'error', text: 'Please enter both API URL and token' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await workspaceService.configureNetBoxToken(tokenConfig);
      setMessage({
        type: 'success',
        text: 'NetBox configuration saved successfully!'
      });

      // Refresh status
      await loadCurrentStatus();

      // Navigate to device search after a short delay
      setTimeout(() => {
        navigate('/device-search');
      }, 1500);

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateExisting = async () => {
    setValidating(true);
    setMessage(null);

    try {
      const result = await workspaceService.validateNetBoxToken();
      setMessage({
        type: 'success',
        text: `Token validation successful! NetBox API is accessible.`
      });
      await loadCurrentStatus();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setValidating(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

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

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div>
                <h1 style={{
                  fontSize: '1.875rem',
                  fontWeight: '700',
                  color: 'var(--text-color)',
                  margin: '0 0 0.25rem 0'
                }}>
                  NetBox Integration Setup
                </h1>
                <p style={{
                  color: 'var(--text-tab-inactive)',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  Configure your NetBox API token for device discovery and management
                </p>
              </div>
            </div>


          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem' }}>
          {/* Left Column - Form (Fixed Width) */}
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
              gap: '0.5rem'
            }}>
              <Key size={20} style={{ color: '#10b981' }} />
              {currentStatus?.configured ? 'Update Configuration' : 'Configure NetBox Token'}
            </h2>

            <form style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }} onSubmit={(e) => e.preventDefault()}>
              {/* API URL */}
              <div>
                <label htmlFor="api_url" style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  NetBox API URL
                </label>
                <input
                  type="url"
                  id="api_url"
                  name="api_url"
                  value={tokenConfig.api_url}
                  onChange={handleInputChange}
                  placeholder="https://netbox.company.com"
                  disabled={loading || testing}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
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
                  The base URL of your NetBox instance (without /api/ suffix)
                </p>
              </div>

              {/* API Token */}
              <div>
                <label htmlFor="api_token" style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  API Token
                </label>
                <input
                  type="password"
                  id="api_token"
                  name="api_token"
                  value={tokenConfig.api_token}
                  onChange={handleInputChange}
                  placeholder="Enter your NetBox API token"
                  disabled={loading || testing}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
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
                  Your personal NetBox API token with appropriate permissions
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={tokenConfig.description}
                  onChange={handleInputChange}
                  placeholder="VelociTerm Integration Token"
                  disabled={loading || testing}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
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
                  A description to help you identify this token
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
                {/* Connection Status */}
            {currentStatus?.configured && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                gap: '0.5rem'
              }}>
                <CheckCircle size={20} style={{ color: '#10b981' }} />

                <span style={{
                  color: '#10b981',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  Connected to NetBox
                </span>
              </div>
            )}
              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={loading || testing || !tokenConfig.api_url || !tokenConfig.api_token}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token
                      ? 'var(--bg-accordion)'
                      : 'var(--bg-accordion)',
                    color: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token
                      ? 'var(--text-tab-inactive)'
                      : 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    cursor: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token
                      ? 'not-allowed'
                      : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    opacity: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token ? 0.5 : 1,
                    fontFamily: 'var(--font-terminal, monospace)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !testing && tokenConfig.api_url && tokenConfig.api_token) {
                      e.target.style.backgroundColor = 'var(--bg-accordion-header)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && !testing && tokenConfig.api_url && tokenConfig.api_token) {
                      e.target.style.backgroundColor = 'var(--bg-accordion)';
                    }
                  }}
                >
                  {testing ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--text-tab-inactive)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Test Connection
                    </>
                  ) : (
                    <>
                      <TestTube size={16} />
                      Test Connection
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfiguration}
                  disabled={loading || testing || !tokenConfig.api_url || !tokenConfig.api_token}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token
                      ? 'var(--bg-accordion)'
                      : 'var(--bg-button)',
                    color: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token
                      ? 'var(--text-tab-inactive)'
                      : 'var(--text-button)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    cursor: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token
                      ? 'not-allowed'
                      : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    opacity: loading || testing || !tokenConfig.api_url || !tokenConfig.api_token ? 0.5 : 1,
                    fontFamily: 'var(--font-terminal, monospace)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !testing && tokenConfig.api_url && tokenConfig.api_token) {
                      e.target.style.backgroundColor = 'var(--bg-button-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && !testing && tokenConfig.api_url && tokenConfig.api_token) {
                      e.target.style.backgroundColor = 'var(--bg-button)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--text-button)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      {currentStatus?.configured ? 'Update Configuration' : 'Save Configuration'}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {currentStatus?.configured ? 'Update Configuration' : 'Save Configuration'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Info and Status */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Current Configuration */}
            {currentStatus?.configured && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: 'var(--text-color)',
                    margin: 0
                  }}>
                    Current Configuration
                  </h2>
                  <button
                    onClick={handleValidateExisting}
                    disabled={validating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--bg-accordion)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      cursor: validating ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)',
                      transition: 'all 0.2s ease',
                      opacity: validating ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!validating) {
                        e.target.style.backgroundColor = 'var(--bg-accordion-header)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!validating) {
                        e.target.style.backgroundColor = 'var(--bg-accordion)';
                      }
                    }}
                  >
                    {validating ? (
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--text-color)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <TestTube size={16} />
                    )}
                    Validate
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color)',
                      marginBottom: '0.5rem'
                    }}>
                      NetBox URL
                    </label>
                    <div style={{
                      color: 'var(--text-color)',
                      backgroundColor: 'var(--bg-accordion)',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)'
                    }}>
                      {currentStatus.api_url}
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--text-color)',
                      marginBottom: '0.5rem'
                    }}>
                      Description
                    </label>
                    <div style={{
                      color: 'var(--text-color)',
                      backgroundColor: 'var(--bg-accordion)',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-terminal, monospace)'
                    }}>
                      {currentStatus.description || 'No description'}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-tab-inactive)',
                  marginTop: '0.75rem'
                }}>
                  Last validated: {currentStatus.last_validated
                    ? new Date(currentStatus.last_validated).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: 'var(--text-color)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={20} style={{ color: '#06b6d4' }} />
                Setup Instructions
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: 'var(--bg-accordion)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{
                    fontWeight: '500',
                    color: 'var(--text-color)',
                    marginBottom: '0.75rem',
                    fontSize: '1rem'
                  }}>
                    Step 1: Create API Token in NetBox
                  </h3>
                  <ol style={{
                    listStyle: 'decimal inside',
                    color: 'var(--text-accordion)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    margin: 0,
                    padding: 0
                  }}>
                    <li style={{ marginBottom: '0.25rem' }}>Log into your NetBox instance</li>
                    <li style={{ marginBottom: '0.25rem' }}>Navigate to your user profile (top right menu)</li>
                    <li style={{ marginBottom: '0.25rem' }}>Go to "API Tokens" section</li>
                    <li style={{ marginBottom: '0.25rem' }}>Click "Add a token" or "Create Token"</li>
                    <li style={{ marginBottom: '0.25rem' }}>Set appropriate permissions (dcim.view_device, etc.)</li>
                    <li>Copy the generated token</li>
                  </ol>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-accordion)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{
                    fontWeight: '500',
                    color: 'var(--text-color)',
                    marginBottom: '0.75rem',
                    fontSize: '1rem'
                  }}>
                    Step 2: Configure Token
                  </h3>
                  <p style={{
                    color: 'var(--text-accordion)',
                    fontSize: '0.875rem',
                    marginBottom: '0.75rem',
                    lineHeight: 1.5
                  }}>
                    Enter your NetBox URL and the API token you just created in the form on the left.
                    The token will be encrypted and stored securely in your workspace.
                  </p>
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid #3b82f6',
                    padding: '0.75rem',
                    borderRadius: '0.375rem'
                  }}>
                    <p style={{
                      color: '#60a5fa',
                      fontSize: '0.75rem',
                      margin: 0,
                      lineHeight: 1.4
                    }}>
                      <strong>Security:</strong> Your API token is encrypted using industry-standard
                      encryption and stored securely in your personal workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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

export default NetBoxSetup;