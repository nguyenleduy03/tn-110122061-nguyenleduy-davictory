import React, { useState, useEffect } from 'react';
import { Clock, X, Loader2, Eye } from 'lucide-react';
import { testBuilderApi, parseLoadedTest } from '../../services/testBuilderApi';

function VersionHistoryModal({ testId, isOpen, onClose, onRestoreVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(null); // versionNumber đang load

  useEffect(() => {
    if (isOpen && testId) loadVersions();
  }, [isOpen, testId]);

  const loadVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/test-builder/${testId}/versions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Không thể tải lịch sử');
      setVersions(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (versionNumber) => {
    setPreviewLoading(versionNumber);
    try {
      const snapshot = await testBuilderApi.getVersionSnapshot(testId, versionNumber);
      if (!snapshot) { alert('Phiên bản này chưa có dữ liệu.'); return; }
      const parsed = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
      onRestoreVersion?.(parsed, versionNumber);
      onClose();
    } catch (err) {
      alert('Không thể tải phiên bản: ' + err.message);
    } finally {
      setPreviewLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '90%', maxWidth: 600,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 20, borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="#7c3aed" />
            Lịch Sử Phiên Bản
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={32} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>{error}</div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Chưa có lịch sử phiên bản</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {versions.map((v, idx) => (
                <div key={v.versionNumber} style={{
                  padding: 16, border: '1px solid #e5e7eb', borderRadius: 8,
                  background: idx === 0 ? '#f3e8ff' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      {idx === 0 ? '🟢 Phiên bản hiện tại' : `Phiên bản ${v.versionNumber}`}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {new Date(v.createdAt).toLocaleString('vi-VN')} • {v.createdBy || 'N/A'} • {v.questionCount} câu hỏi
                    </div>
                  </div>
                  {v.hasSnapshot && (
                    <button
                      onClick={() => handlePreview(v.versionNumber)}
                      disabled={previewLoading === v.versionNumber}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', border: '1px solid #7c3aed',
                        background: '#fff', color: '#7c3aed', borderRadius: 6,
                        cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap'
                      }}
                    >
                      {previewLoading === v.versionNumber
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Eye size={14} />}
                      Xem
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default VersionHistoryModal;
