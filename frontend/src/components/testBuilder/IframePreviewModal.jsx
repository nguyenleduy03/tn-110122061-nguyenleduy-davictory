import React from 'react';
import { X, Maximize2 } from 'lucide-react';

/**
 * IframePreviewModal - Modal fullscreen để xem trước trang thi thực tế
 * Load trang thi trong iframe chồng lên trang hiện tại
 */
const IframePreviewModal = ({ testId, skillType, onClose }) => {
  // Đóng modal khi nhấn ESC
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!testId || !skillType) return null;

  const previewUrl = `/test/${skillType.toLowerCase()}/${testId}?mode=practice`;

  return (
    <div className="iframe-preview-overlay" onClick={onClose}>
      <div className="iframe-preview-container" onClick={(e) => e.stopPropagation()}>
        {/* Header với nút đóng */}
        <div className="iframe-preview-header">
          <div className="iframe-preview-title">
            <Maximize2 size={18} />
            <span>Xem trước đề thi - {skillType}</span>
          </div>
          <button 
            className="iframe-preview-close"
            onClick={onClose}
            title="Đóng xem trước (ESC)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              border: '2px solid #d1d5db',
              background: '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#1f2937',
              position: 'relative',
              zIndex: 10001,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Iframe chứa trang thi */}
        <iframe
          src={previewUrl}
          className="iframe-preview-frame"
          title="Preview Test"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
};

export default IframePreviewModal;
