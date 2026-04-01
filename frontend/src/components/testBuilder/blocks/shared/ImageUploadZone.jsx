import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link as LinkIcon, Trash2, Image as ImageIcon } from 'lucide-react';
import { resolveDrivePreviewUrl } from '../../../../utils/mediaUrl';

/**
 * ImageUploadZone - Component tổng hợp cho upload ảnh
 * Hỗ trợ: URL input, file picker, drag & drop, paste từ clipboard
 */
const ImageUploadZone = ({
  imageUrl,
  onImageChange,
  onImageDelete,
  placeholder = 'Nhập URL ảnh hoặc kéo thả/paste ảnh vào đây',
  module = 'READING',
  testTitle = '',
  assetLabel = '',
  showPreview = true,
  compact = false,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Import hàm upload từ blockHelpers
  const loadImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh hợp lệ');
      return;
    }

    setIsProcessing(true);
    try {
      // Import động để tránh circular dependency
      const { loadImageFile: uploadFn } = await import('./blockHelpers');
      await uploadFn(file, onImageChange, module, testTitle, null, assetLabel);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Lỗi tải ảnh: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Xử lý paste ảnh từ clipboard
  const handlePaste = async (e) => {
    if (disabled) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await loadImageFile(file);
        }
        return;
      }
    }
  };

  // Xử lý drag & drop
  const handleDragEnter = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Kiểm tra có file ảnh không
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Chỉ clear khi rời khỏi drop zone, không phải children
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await loadImageFile(file);
      } else {
        alert('Vui lòng kéo thả file ảnh');
      }
    }
  };

  // Xử lý file picker
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadImageFile(file);
    }
    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  };

  // Đăng ký paste listener trên drop zone
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    dropZone.addEventListener('paste', handlePaste);
    return () => dropZone.removeEventListener('paste', handlePaste);
  }, [disabled, module, testTitle, assetLabel]);

  const isDataUrl = imageUrl?.startsWith('data:');

  if (compact) {
    // Chế độ compact: chỉ hiện nút upload và preview nhỏ
    return (
      <div className="image-upload-compact">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || isProcessing}
        />
        
        {imageUrl && showPreview && (
          <div className="image-preview-compact">
            <img src={resolveDrivePreviewUrl(imageUrl)} alt="Preview" />
            {onImageDelete && (
              <button
                type="button"
                onClick={onImageDelete}
                className="image-delete-btn"
                disabled={disabled}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="image-upload-btn-compact"
          disabled={disabled || isProcessing}
        >
          <Upload size={14} />
          {isProcessing ? 'Đang tải...' : 'Chọn ảnh'}
        </button>
      </div>
    );
  }

  // Chế độ full: drop zone với tất cả tính năng
  return (
    <div className="image-upload-zone-wrapper">
      <div
        ref={dropZoneRef}
        className={`image-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={disabled ? -1 : 0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || isProcessing}
        />

        {!imageUrl || !showPreview ? (
          <div className="image-upload-prompt">
            <ImageIcon size={32} className="upload-icon" />
            <div className="upload-text">
              <strong>Kéo thả ảnh vào đây</strong>
              <span>hoặc nhấn Ctrl+V để paste</span>
              <span>hoặc click để chọn file</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="upload-browse-btn"
              disabled={disabled || isProcessing}
            >
              <Upload size={16} />
              {isProcessing ? 'Đang tải...' : 'Chọn file'}
            </button>
          </div>
        ) : (
          <div className="image-preview-full">
            <img src={resolveDrivePreviewUrl(imageUrl)} alt="Preview" />
            <div className="image-preview-actions">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="image-change-btn"
                disabled={disabled || isProcessing}
              >
                <Upload size={14} />
                Đổi ảnh
              </button>
              {onImageDelete && (
                <button
                  type="button"
                  onClick={onImageDelete}
                  className="image-delete-btn"
                  disabled={disabled}
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              )}
            </div>
          </div>
        )}

        {isDragging && (
          <div className="drag-overlay">
            <ImageIcon size={48} />
            <span>Thả ảnh vào đây</span>
          </div>
        )}
      </div>

      {/* URL input field (optional) */}
      <div className="image-url-input-row">
        <LinkIcon size={14} />
        <input
          type="text"
          value={isDataUrl ? '(Ảnh đã tải lên)' : imageUrl || ''}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder={placeholder}
          readOnly={isDataUrl}
          disabled={disabled}
          className="image-url-input"
        />
      </div>

      {isProcessing && (
        <div className="image-processing-overlay">
          <div className="spinner"></div>
          <span>Đang nén và tải ảnh lên...</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploadZone;
