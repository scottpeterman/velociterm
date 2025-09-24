import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import DeviceSearchItem from './DeviceSearchItem';

const DeviceSearchResults = ({
  devices,
  loading,
  hasSearched,
  viewMode,
  connectingDevices,
  onConnect,
  onViewInNetbox,
  onRefresh
}) => {
  const renderContent = () => {
    if (!hasSearched) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Search size={32} style={{ color: 'var(--text-tab-inactive)', margin: '0 auto 1rem auto', display: 'block' }} />
          <p style={{ color: 'var(--text-tab-inactive)' }}>
            Enter search criteria and click "Search" to find devices
          </p>
        </div>
      );
    }

    if (loading && devices.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} style={{
            color: 'var(--text-tab-inactive)',
            margin: '0 auto 1rem auto',
            display: 'block',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--text-tab-inactive)' }}>Searching devices...</p>
        </div>
      );
    }

    if (devices.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Search size={32} style={{ color: 'var(--text-tab-inactive)', margin: '0 auto 1rem auto', display: 'block' }} />
          <p style={{ color: 'var(--text-tab-inactive)' }}>No devices found. Try different search criteria.</p>
        </div>
      );
    }

    return (
      <div style={{
        display: viewMode === 'compact' ? 'flex' : 'grid',
        flexDirection: viewMode === 'compact' ? 'column' : undefined,
        gridTemplateColumns: viewMode === 'cards' ? 'repeat(auto-fill, minmax(350px, 1fr))' : undefined,
        gap: viewMode === 'compact' ? '0.5rem' : '1.5rem'
      }}>
        {devices.map((device) => (
          <DeviceSearchItem
            key={device.id}
            device={device}
            isConnecting={connectingDevices.has(`${device.id}`)}
            onConnect={onConnect}
            onViewInNetbox={onViewInNetbox}
            compact={viewMode === 'compact'}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-accordion-content)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-color)' }}>
          Search Results ({devices.length})
        </h2>
        {devices.length > 0 && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-accordion)',
              color: 'var(--text-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
            Refresh
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  );
};

export default DeviceSearchResults;