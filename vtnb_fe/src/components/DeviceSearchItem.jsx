import React from 'react';
import { Monitor, Server, HardDrive, Terminal, ExternalLink, RefreshCw, Activity, Wifi } from 'lucide-react';

const DeviceSearchItem = ({ device, isConnecting, onConnect, onViewInNetbox, compact = false }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10b981';
      case 'offline': return '#ef4444';
      case 'planned': return '#f59e0b';
      case 'staged': return '#3b82f6';
      default: return 'var(--text-tab-inactive)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return <Activity size={compact ? 12 : 16} />;
      case 'offline': return <Wifi size={compact ? 12 : 16} />;
      default: return <HardDrive size={compact ? 12 : 16} />;
    }
  };

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-accordion)',
        borderRadius: '0.375rem',
        padding: '0.75rem',
        border: '1px solid var(--border-color)',
        transition: 'all 0.2s ease',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: '200px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: getStatusColor(device.status),
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            marginRight: '0.75rem'
          }}>
            {getStatusIcon(device.status)}
          </div>
          <div>
            <h4 style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '0.875rem', margin: 0 }}>
              {device.name}
            </h4>
          </div>
        </div>

        <div style={{ minWidth: '120px', display: 'flex', alignItems: 'center' }}>
          <Monitor size={14} style={{ color: 'var(--text-tab-inactive)', marginRight: '0.5rem' }} />
          <span style={{ color: 'var(--border-focus)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {device.primary_ip || 'No IP'}
          </span>
        </div>

        <div style={{ minWidth: '100px', display: 'flex', alignItems: 'center' }}>
          <Server size={14} style={{ color: 'var(--text-tab-inactive)', marginRight: '0.5rem' }} />
          <span style={{ color: 'var(--text-color)', fontSize: '0.75rem' }}>
            {device.platform || 'Unknown'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {device.primary_ip && (
            <button
              onClick={() => onConnect(device)}
              disabled={isConnecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.375rem 0.75rem',
                backgroundColor: 'var(--bg-button)',
                color: 'var(--text-button)',
                border: 'none',
                fontSize: '0.75rem',
                borderRadius: '0.375rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.5 : 1
              }}
            >
              {isConnecting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Terminal size={12} />}
            </button>
          )}
          <button onClick={() => onViewInNetbox(device)} style={{
            padding: '0.375rem',
            backgroundColor: 'var(--bg-accordion-header)',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Card view - simplified version of existing layout
  return (
    <div style={{
      backgroundColor: 'var(--bg-accordion)',
      borderRadius: '0.5rem',
      padding: '1.25rem',
      border: '1px solid var(--border-color)'
    }}>
      {/* Simplified card content */}
      <h3>{device.name}</h3>
      <p>{device.primary_ip}</p>
      <button onClick={() => onConnect(device)} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
};

export default DeviceSearchItem;