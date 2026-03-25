import React, { useState } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import { fileApi } from '../../services/fileApi';

export const FileUploadButton = ({ 
  currentUrl, 
  onUploadSuccess, 
  mediaType = 'AUDIO', 
  module = 'LISTENING',
  accept = 'audio/*',
  label = 'Upload File'
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size
    const maxSize = mediaType === 'AUDIO' ? 20 : 10; // MB
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File không được vượt quá ${maxSize}MB`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await fileApi.uploadFile(file, mediaType, module);
      onUploadSuccess(result.url);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    onUploadSuccess('');
    setError(null);
  };

  return (
    <div className="file-upload-button">
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={uploading}
        style={{ display: 'none' }}
        id={`file-upload-${mediaType}-${module}`}
      />
      
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <label 
          htmlFor={`file-upload-${mediaType}-${module}`}
          style={{
            padding: '6px 12px',
            background: uploading ? '#ccc' : '#3b82f6',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
          {uploading ? 'Đang upload...' : label}
        </label>

        {currentUrl && (
          <button
            onClick={handleClear}
            style={{
              padding: '6px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Xóa file"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </div>
      )}

      {currentUrl && !uploading && (
        <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
          ✓ File đã upload
        </div>
      )}
    </div>
  );
};

export default FileUploadButton;
