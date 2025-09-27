import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { workspaceService } from '../services/workspace';

import DeviceSearchFilters from './DeviceSearchFilters';
import DeviceSearchResults from './DeviceSearchResults';
import CredentialsModal from './CredentialsModal';

const DeviceSearch = ({ onCreateTerminalSession }) => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState(null);
  const [netboxConfigured, setNetboxConfigured] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState('compact');
  const [showFilters, setShowFilters] = useState(false);
  const [connectingDevices, setConnectingDevices] = useState(new Set());

  // Modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [pendingDevice, setPendingDevice] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const [filters, setFilters] = useState({
    search: '',
    site: '',
    platform: '',
    status: 'active',
    limit: 100
  });

  useEffect(() => {
    checkNetBoxStatus();
  }, []);

  useEffect(() => {
    if (netboxConfigured) {
      loadSites();
    }
  }, [netboxConfigured]);

  const checkNetBoxStatus = async () => {
    try {
      const status = await workspaceService.getNetBoxTokenStatus();
      setNetboxConfigured(status.configured);
      if (!status.configured) {
        setError('NetBox is not configured. Please set up your API token first.');
      }
    } catch (error) {
      setError('Failed to check NetBox configuration');
    }
  };

  const loadSites = async () => {
    try {
      const result = await workspaceService.getSites();
      setSites(result.sites || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
    } finally {
      setLoadingSites(false);
    }
  };

  const performSearch = async () => {
    if (!netboxConfigured) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const result = await workspaceService.searchDevices(filters);
      setDevices(result.devices || []);
    } catch (error) {
      setError(error.message);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (device) => {
    setPendingDevice(device);
    setCredentials({ username: '', password: '' });
    setShowCredentialsModal(true);
  };

  const handleCredentialsConnect = () => {
    if (!credentials.username || !credentials.password || !pendingDevice) return;

    const sessionData = {
      id: pendingDevice.id,
      display_name: pendingDevice.name,
      host: pendingDevice.primary_ip.split('/')[0],
      port: 22,
      device_type: pendingDevice.device_type,
      site: pendingDevice.site,
      platform: pendingDevice.platform,
      status: 'disconnected',
      created_from: 'netbox_search',
      netbox_id: pendingDevice.id
    };

    if (onCreateTerminalSession) {
      onCreateTerminalSession({ sessionData, credentials });
    }

    setShowCredentialsModal(false);
    setPendingDevice(null);
    setCredentials({ username: '', password: '' });
  };

  if (!netboxConfigured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>NetBox Not Configured</h2>
          <p>Please configure your NetBox API token first.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: '112rem', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ backgroundColor: 'var(--bg-accordion-content)', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Search size={28} style={{ color: 'var(--border-focus)' }} />
              Netbox Device Search
            </h1>
            <button onClick={() => navigate('/')} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setViewMode('compact')} style={{
            padding: '0.5rem 1rem',
            backgroundColor: viewMode === 'compact' ? 'var(--bg-button)' : 'var(--bg-accordion)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}>
            Compact
          </button>
          <button onClick={() => setViewMode('cards')} style={{
            padding: '0.5rem 1rem',
            backgroundColor: viewMode === 'cards' ? 'var(--bg-button)' : 'var(--bg-accordion)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}>
            Cards
          </button>
        </div>

        <DeviceSearchFilters
          filters={filters}
          sites={sites}
          loading={loading}
          loadingSites={loadingSites}
          showFilters={showFilters}
          onFilterChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onSearch={performSearch}
          onClearFilters={() => setFilters({ search: '', site: '', platform: '', status: 'active', limit: 1000 })}
        />

        <DeviceSearchResults
          devices={devices}
          loading={loading}
          hasSearched={hasSearched}
          viewMode={viewMode}
          connectingDevices={connectingDevices}
          onConnect={handleConnect}
          onViewInNetbox={(device) => console.log('View in NetBox', device.id)}
          onRefresh={performSearch}
        />
      </div>

      <CredentialsModal
        isOpen={showCredentialsModal}
        device={pendingDevice}
        credentials={credentials}
        onCredentialsChange={setCredentials}
        onConnect={handleCredentialsConnect}
        onCancel={() => setShowCredentialsModal(false)}
      />
    </>
  );
};

export default DeviceSearch;