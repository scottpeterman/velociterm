// src/components/SessionFilter.jsx
import React from 'react';
import { Search, X } from 'lucide-react';

const SessionFilter = ({ filter, onFilterChange, resultCount }) => {
  return (
    <div style={{
      padding: '0.75rem 1.25rem 0.75rem 1.25rem', // Add more right padding
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{
          position: 'absolute',
          left: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-tab-inactive)'
        }} />
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter sessions or sites..."
          style={{
            width: '100%',
            paddingLeft: '2.5rem',
            paddingRight: filter ? '2rem' : '0.75rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.375rem',
            color: 'var(--text-color)',
            fontSize: '0.75rem',
            outline: 'none',
            boxSizing: 'border-box' // Add this to ensure proper sizing
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--border-focus)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-color)';
          }}
        />
        {filter && (
          <button
            onClick={() => onFilterChange('')}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive)',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      {filter && (
        <div style={{
          fontSize: '0.625rem',
          color: 'var(--text-tab-inactive)',
          marginTop: '0.5rem',
          textAlign: 'center'
        }}>
          {resultCount} sessions found
        </div>
      )}
    </div>
  );
};

export default SessionFilter;