import React, { useState, useEffect } from 'react';
import { authApi } from '../services/authApi';
import './GoogleDriveSettings.css';

const GoogleDriveSettings = () => {
  const [status, setStatus] = useState({ authorized: false, message: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await authApi.get('/api/admin/drive/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus({ authorized: false, message: 'Lỗi kết nối' });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    try {
      const response = await authApi.get('/api/admin/drive/authorize-url');
      window.location.href = response.data.url;
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Bạn có chắc muốn thu hồi quyền truy cập Google Drive?')) return;
    
    try {
      await authApi.post('/api/admin/drive/revoke');
      alert('Đã thu hồi quyền truy cập');
      checkStatus();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="google-drive-settings">
      <div className="settings-header">
        <h2>Quản lý Google Drive</h2>
        <p>Cấu hình kết nối Google Drive để lưu trữ file audio và hình ảnh</p>
      </div>

      <div className="settings-content">
        <div className={`status-card ${status.authorized ? 'authorized' : 'unauthorized'}`}>
          <div className="status-icon">
            {status.authorized ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22 4 12 14.01 9 11.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2" strokeLinecap="round"/>
                <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          
          <div className="status-info">
            <h3>{status.authorized ? 'Đã kết nối' : 'Chưa kết nối'}</h3>
            <p>{status.message}</p>
            {status.email && <p className="email">📧 {status.email}</p>}
            {status.displayName && <p className="display-name">👤 {status.displayName}</p>}
          </div>
        </div>

        {status.authorized && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Dung lượng Drive</div>
              <div className="stat-value">{status.storageUsage} / {status.storageLimit}</div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{width: `${status.storagePercent}%`}}></div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Số file trong folder</div>
              <div className="stat-value">{status.totalFiles || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Dung lượng folder</div>
              <div className="stat-value">{status.folderSize || '0 B'}</div>
            </div>
          </div>
        )}

        <div className="actions">
          {!status.authorized ? (
            <button className="btn-authorize" onClick={handleAuthorize}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10 17 15 12 10 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="15" y1="12" x2="3" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Ủy quyền Google Drive
            </button>
          ) : (
            <div className="authorized-actions">
              <button className="btn-reauthorize" onClick={handleAuthorize}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="23 4 23 10 17 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Ủy quyền lại
              </button>
              <button className="btn-revoke" onClick={handleRevoke}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Thu hồi quyền
              </button>
            </div>
          )}
        </div>

        <div className="info-section">
          <h4>Thông tin</h4>
          <ul>
            <li>✓ File audio và hình ảnh sẽ được lưu trên Google Drive</li>
            <li>✓ Không lưu trực tiếp vào database</li>
            <li>✓ Tiết kiệm dung lượng server</li>
            <li>✓ Dễ dàng backup và quản lý</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveSettings;
