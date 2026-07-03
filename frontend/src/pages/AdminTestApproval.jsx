import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCcw } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { authApi } from '../services/authApi';

export default function AdminTestApproval() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await authApi.get('/admin/test-approval/pending');
      setTests(res.data);
    } catch (err) {
      console.error('Error fetching pending tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (testId) => {
    setActionLoading(testId);
    try {
      await authApi.put(`/admin/test-approval/${testId}/approve`);
      setTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi phê duyệt');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (testId) => {
    const reason = prompt('Nhập lý do từ chối (không bắt buộc):');
    setActionLoading(testId);
    try {
      await authApi.put(`/admin/test-approval/${testId}/reject`, { reason: reason || '' });
      setTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi từ chối');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout title="Duyệt đề thi" subtitle="Kiểm duyệt và phê duyệt đề thi từ giáo viên">
      <div className="admin-filter-row" style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>
          {loading ? 'Đang tải...' : `${tests.length} đề thi chờ duyệt`}
        </span>
        <button onClick={fetchPending} className="admin-btn ghost small">
          <RefreshCcw size={14} /> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="admin-empty" style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0' }}>
          <CheckCircle2 size={48} color="#34d399" className="admin-empty-icon" />
          <p className="admin-empty-title">Không có đề thi nào chờ duyệt</p>
          <p className="admin-empty-text">Tất cả đề thi đã được xử lý</p>
        </div>
      ) : (
        <div className="admin-filter-row" style={{ flexDirection: 'column', gap: 12 }}>
          {tests.map(test => (
            <div key={test.id} className="admin-panel" style={{ padding: 20, width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{test.title}</h3>
                  <div className="admin-filter-row" style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                    <span>Loại: {test.testType || 'N/A'}</span>
                    <span>{test.isFullTest ? 'Full Test' : 'Kỹ năng riêng'}</span>
                    {test.durationMinutes && <span>Thời gian: {test.durationMinutes} phút</span>}
                  </div>
                  {test.createdBy && (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                      Tác giả: <strong>{test.createdBy.fullName || test.createdBy.username}</strong>
                      {test.createdBy.email && <span> ({test.createdBy.email})</span>}
                    </div>
                  )}
                  {test.createdAt && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      Tạo lúc: {new Date(test.createdAt).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
                <div className="admin-hero-actions">
                  <button onClick={() => handleApprove(test.id)} disabled={actionLoading === test.id}
                    className="admin-btn success small">
                    {actionLoading === test.id ? <Loader2 size={14} className="admin-spin" /> : <CheckCircle2 size={16} />}
                    Duyệt
                  </button>
                  <button onClick={() => handleReject(test.id)} disabled={actionLoading === test.id}
                    className="admin-btn danger small">
                    <XCircle size={16} />
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
