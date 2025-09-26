// DeviceSearchFilters.jsx - Extracted search form
import React from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';

const DeviceSearchFilters = ({
  filters,
  sites,
  loading,
  loadingSites,
  showFilters,
  onFilterChange,
  onToggleFilters,
  onSearch,
  onClearFilters
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-accordion-content)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      border: '1px solid var(--border-color)'
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Main Search Row */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="search" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--text-color)',
              marginBottom: '0.5rem'
            }}>
              Search Devices
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tab-inactive)'
              }} />
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                placeholder="Search by name, IP, or description..."
                style={{
                  width: '100%',
                  paddingLeft: '2.5rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem',
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
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button
              onClick={onToggleFilters}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                backgroundColor: showFilters ? 'var(--bg-button)' : 'var(--bg-accordion)',
                color: showFilters ? 'var(--text-button)' : 'var(--text-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Filter size={16} style={{ marginRight: '0.5rem' }} />
              Filters
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--bg-button)',
                color: 'var(--text-button)',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <RefreshCw size={16} style={{
                  marginRight: '0.5rem',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Search size={16} style={{ marginRight: '0.5rem' }} />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div>
              <label htmlFor="site" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.5rem'
              }}>
                Site
              </label>
              <select
                id="site"
                value={filters.site}
                onChange={(e) => onFilterChange('site', e.target.value)}
                disabled={loadingSites}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.name}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="platform" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.5rem'
              }}>
                Platform
              </label>
              <input
                type="text"
                id="platform"
                value={filters.platform}
                onChange={(e) => onFilterChange('platform', e.target.value)}
                placeholder="e.g., cisco_ios, juniper_junos"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label htmlFor="status" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.5rem'
              }}>
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="staged">Staged</option>
                <option value="failed">Failed</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label htmlFor="limit" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.5rem'
              }}>
                Limit
              </label>
              <select
                id="limit"
                value={filters.limit}
                onChange={(e) => onFilterChange('limit', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem'
                }}
              >
                <option value={25}>25 results</option>
                <option value={50}>50 results</option>
                <option value={100}>100 results</option>
                <option value={200}>200 results</option>
              </select>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gridColumn: '1 / -1',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClearFilters}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-accordion)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default DeviceSearchFilters;