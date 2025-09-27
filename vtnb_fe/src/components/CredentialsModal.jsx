// CredentialsModal.jsx - Extracted credentials modal
import React from 'react';

const CredentialsModal = ({
  isOpen,
  device,
  credentials,
  onCredentialsChange,
  onConnect,
  onCancel
}) => {
  if (!isOpen || !device) return null;

  const handleInputChange = (field, value) => {
    onCredentialsChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onConnect();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-accordion-content)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        width: '24rem',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 'bold',
          color: 'var(--text-color)',
          marginBottom: '1rem'
        }}>
          SSH Connection
        </h3>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--text-color)',
              marginBottom: '0.25rem'
            }}>
              Device
            </label>
            <input
              type="text"
              value={`${device.name} (${device.primary_ip?.split('/')[0] || device.host}:22)`}
              readOnly
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-accordion)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                color: 'var(--text-color)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--text-color)',
              marginBottom: '0.25rem'
            }}>
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter username"
              autoFocus
              onKeyPress={handleKeyPress}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                color: 'var(--text-color)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--text-color)',
              marginBottom: '0.25rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password"
              onKeyPress={handleKeyPress}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                color: 'var(--text-color)',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              color: 'var(--text-color)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = 'var(--text-tab-inactive)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'var(--text-color)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            disabled={!credentials.username || !credentials.password}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-button)',
              color: 'var(--text-button)',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: !credentials.username || !credentials.password ? 'not-allowed' : 'pointer',
              opacity: !credentials.username || !credentials.password ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (credentials.username && credentials.password) {
                e.target.style.backgroundColor = 'var(--bg-button-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (credentials.username && credentials.password) {
                e.target.style.backgroundColor = 'var(--bg-button)';
              }
            }}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialsModal;