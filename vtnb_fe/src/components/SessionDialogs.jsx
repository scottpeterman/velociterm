import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { SessionOperations } from './sessionOperations';

export const ImportDialog = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importMode, setImportMode] = useState('generic');
  const [mergeMode, setMergeMode] = useState('merge');
  const [importing, setImporting] = useState(false);

  const handleImportFile = async () => {
    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('merge_mode', mergeMode);
      formData.append('import_mode', importMode);

      const response = await fetch('/api/sessions/import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const results = await response.json();
        setImportResults(results);
        onImportComplete?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        setImportResults({
          success: false,
          message: `Import failed: ${errorMsg}`
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResults({
        success: false,
        message: `Import failed: ${error.message}`
      });
    }

    setImporting(false);
  };

  const resetDialog = () => {
    setImportFile(null);
    setImportResults(null);
    setImportMode('generic');
    setMergeMode('merge');
    setImporting(false);
  };

  const getFileExtension = () => {
    switch (importMode) {
      case 'yaml':
        return '.yaml,.yml';
      case 'generic':
      case 'netbox':
        return '.csv';
      default:
        return '.csv,.yaml,.yml';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="import-dialog-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100001
      }}
      onClick={(e) => {
        if (e.target.classList.contains('import-dialog-overlay')) {
          onClose();
          resetDialog();
        }
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-accordion-content, #ffffff)',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        minWidth: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            color: 'var(--text-color, #1f2937)',
            fontSize: '1.125rem',
            fontWeight: '600',
            margin: 0
          }}>
            Import Sessions
          </h3>
          <button
            onClick={() => {
              onClose();
              resetDialog();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tab-inactive, #6b7280)',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Import Form */}
        {!importResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color, #1f2937)',
                marginBottom: '0.5rem'
              }}>
                Import Mode
              </label>
              <select
                value={importMode}
                onChange={(e) => {
                  setImportMode(e.target.value);
                  setImportFile(null); // Reset file when mode changes
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-color, #1f2937)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="generic">Generic CSV</option>
                <option value="netbox">NetBox CSV Export</option>
                <option value="yaml">YAML Sessions File</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color, #1f2937)',
                marginBottom: '0.5rem'
              }}>
                Merge Mode
              </label>
              <select
                value={mergeMode}
                onChange={(e) => setMergeMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-color, #1f2937)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="merge">Merge with existing sessions</option>
                <option value="replace">Replace all existing sessions</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-color, #1f2937)',
                marginBottom: '0.5rem'
              }}>
                Select File
              </label>
              <input
                type="file"
                accept={getFileExtension()}
                onChange={(e) => setImportFile(e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-color, #1f2937)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Import Mode Instructions */}
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-accordion, #f9fafb)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: 'var(--text-tab-inactive, #6b7280)'
            }}>
              {importMode === 'netbox' && (
                <div>
                  <strong>NetBox CSV Format:</strong> Export devices from NetBox. Should contain columns like:
                  Name, Primary IP, Site, Platform, Device Type, Status. The importer will automatically
                  map common NetBox column names.
                </div>
              )}
              {importMode === 'generic' && (
                <div>
                  <strong>Generic CSV Format:</strong> CSV with required columns:
                  <code style={{ backgroundColor: 'var(--bg-input)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', margin: '0 0.25rem' }}>
                    display_name, host, folder_name
                  </code>
                  <br />Optional columns: port, device_type, platform
                </div>
              )}
              {importMode === 'yaml' && (
                <div>
                  <strong>YAML Format:</strong> Existing sessions.yaml file from another VelociTerm instance
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1rem'
            }}>
              <button
                onClick={() => {
                  onClose();
                  resetDialog();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-accordion, #f9fafb)',
                  color: 'var(--text-color, #1f2937)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportFile}
                disabled={!importFile || importing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-button, #3b82f6)',
                  color: 'var(--text-button, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: (!importFile || importing) ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  opacity: (!importFile || importing) ? 0.5 : 1
                }}
              >
                {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              backgroundColor: importResults.status === 'success' ? '#dcfce7' : '#fee2e2',
              borderRadius: '0.375rem'
            }}>
              {importResults.status === 'success' ? (
                <CheckCircle size={20} style={{ color: '#16a34a' }} />
              ) : (
                <XCircle size={20} style={{ color: '#dc2626' }} />
              )}
              <span style={{
                fontWeight: '500',
                color: importResults.status === 'success' ? '#16a34a' : '#dc2626'
              }}>
                {importResults.status === 'success' ? 'Import Successful!' : 'Import Failed'}
              </span>
            </div>

            {importResults.status === 'success' && importResults.stats && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-accordion, #f9fafb)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Import Summary:</strong>
                </div>
                <div>Folders processed: {importResults.stats.folders_processed || 0}</div>
                <div>Sessions imported: {(importResults.stats.sessions_imported || 0) + (importResults.stats.sessions_merged || 0)}</div>
                <div>Sessions skipped (duplicates): {importResults.stats.sessions_skipped || 0}</div>
              </div>
            )}

            {importResults.status !== 'success' && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-accordion, #f9fafb)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#dc2626'
              }}>
                <strong>Error:</strong> {importResults.message}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  onClose();
                  resetDialog();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-button, #3b82f6)',
                  color: 'var(--text-button, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
// Confirmation Dialog Component
export const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  showCancel = true
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      className="confirmation-dialog-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-accordion-content, #ffffff)',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        minWidth: '400px',
        maxWidth: '90vw',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <h3 style={{
          color: 'var(--text-color, #1f2937)',
          fontSize: '1.125rem',
          fontWeight: '600',
          marginBottom: '1rem',
          margin: '0 0 1rem 0'
        }}>
          {title || 'Confirm Action'}
        </h3>

        <p style={{
          color: 'var(--text-tab-inactive, #6b7280)',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          marginBottom: '1.5rem',
          margin: '0 0 1.5rem 0'
        }}>
          {message}
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          {showCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--bg-accordion, #f9fafb)',
                color: 'var(--text-color, #1f2937)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: confirmText === 'Delete' ? '#dc2626' : 'var(--bg-button, #3b82f6)',
              color: 'var(--text-button, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Session Form Component
export const SessionForm = ({
  session,
  folders,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState(
    session || {
      display_name: '',
      host: '',
      port: 22,
      device_type: 'linux',
      platform: '',
      folder_name: ''
    }
  );

  const deviceTypes = SessionOperations.getDeviceTypes();

  const handleSubmit = () => {
    const validation = SessionOperations.validateSessionData(formData);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }
    onSave(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{
      width: '350px',
      borderLeft: '1px solid var(--border-color, #e5e7eb)',
      padding: '1rem',
      backgroundColor: 'var(--bg-accordion-content, #ffffff)',
      flexShrink: 0
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          color: 'var(--text-color, #1f2937)',
          fontSize: '1rem',
          fontWeight: '600',
          margin: 0
        }}>
          {isEditing ? 'Edit Session' : 'New Session'}
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tab-inactive, #6b7280)',
            padding: '0.25rem',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Form Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text-color, #1f2937)',
            marginBottom: '0.25rem'
          }}>
            Display Name *
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => updateField('display_name', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--text-color, #1f2937)',
              fontSize: '0.875rem'
            }}
            placeholder="Router-01"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text-color, #1f2937)',
            marginBottom: '0.25rem'
          }}>
            Host *
          </label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => updateField('host', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--text-color, #1f2937)',
              fontSize: '0.875rem'
            }}
            placeholder="192.168.1.1"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text-color, #1f2937)',
            marginBottom: '0.25rem'
          }}>
            Port
          </label>
          <input
            type="number"
            value={formData.port}
            onChange={(e) => updateField('port', parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--text-color, #1f2937)',
              fontSize: '0.875rem'
            }}
            min="1"
            max="65535"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text-color, #1f2937)',
            marginBottom: '0.25rem'
          }}>
            Device Type
          </label>
          <select
            value={formData.device_type}
            onChange={(e) => updateField('device_type', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--text-color, #1f2937)',
              fontSize: '0.875rem'
            }}
          >
            {deviceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text-color, #1f2937)',
            marginBottom: '0.25rem'
          }}>
            Folder *
          </label>
          <select
            value={formData.folder_name}
            onChange={(e) => updateField('folder_name', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--text-color, #1f2937)',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Select folder...</option>
            {folders.map(folder => (
              <option key={folder.folder_name} value={folder.folder_name}>
                {folder.folder_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text-color, #1f2937)',
            marginBottom: '0.25rem'
          }}>
            Platform
          </label>
          <input
            type="text"
            value={formData.platform || ''}
            onChange={(e) => updateField('platform', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              color: 'var(--text-color, #1f2937)',
              fontSize: '0.875rem'
            }}
            placeholder="Optional platform info"
          />
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '1rem'
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: 'var(--bg-accordion, #f9fafb)',
              color: 'var(--text-color, #1f2937)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-button, #3b82f6)',
              color: 'var(--text-button, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Save size={16} />
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};