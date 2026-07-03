import React, { useEffect, useState } from 'react';
import { Database, Cpu, HardDrive, Activity, Loader2, RefreshCcw } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { authApi } from '../services/authApi';

export default function AdminSystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHealth(); }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await authApi.get('/admin/system/health');
      setHealth(res.data);
    } catch (err) {
      console.error('Error fetching health:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="System Health" subtitle="Kiểm tra trạng thái hệ thống và cơ sở dữ liệu">
      <button onClick={fetchHealth} className="admin-btn ghost small" style={{ marginBottom: 16 }}>
        <RefreshCcw size={14} /> Làm mới
      </button>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-spin" />
        </div>
      ) : !health ? (
        <div className="admin-empty">
          <p style={{ color: '#dc2626' }}>Không thể tải thông tin hệ thống</p>
        </div>
      ) : (
        <>
          <div className="admin-quick-stats" style={{ marginBottom: 24 }}>
            <div className="admin-quick-stat">
              <div className="admin-quick-stat-top"><Activity size={18} /><span>Trạng thái</span></div>
              <div className="admin-quick-stat-value" style={{ color: health.status === 'UP' ? '#059669' : '#dc2626' }}>
                {health.status === 'UP' ? 'Hoạt động' : 'Có vấn đề'}
              </div>
              <div className="admin-quick-stat-change is-positive">
                {health.status === 'UP' ? 'Hệ thống bình thường' : 'Cần kiểm tra'}
              </div>
            </div>
            <div className="admin-quick-stat">
              <div className="admin-quick-stat-top"><Database size={18} /><span>Cơ sở dữ liệu</span></div>
              <div className="admin-quick-stat-value" style={{ color: health.database?.status === 'CONNECTED' ? '#059669' : '#dc2626' }}>
                {health.database?.status === 'CONNECTED' ? 'Kết nối' : 'Mất kết nối'}
              </div>
              <div className="admin-quick-stat-change is-positive">{health.database?.tableCount ?? 0} tables</div>
            </div>
            <div className="admin-quick-stat">
              <div className="admin-quick-stat-top"><Cpu size={18} /><span>CPU / OS</span></div>
              <div className="admin-quick-stat-value">{health.system?.availableProcessors ?? '?'} cores</div>
              <div className="admin-quick-stat-change is-positive">{health.system?.osName || ''}</div>
            </div>
            <div className="admin-quick-stat">
              <div className="admin-quick-stat-top"><HardDrive size={18} /><span>Bộ nhớ</span></div>
              <div className="admin-quick-stat-value">{health.system?.freeMemory || '?'}</div>
              <div className="admin-quick-stat-change is-positive">/ {health.system?.totalMemory || '?'}</div>
            </div>
          </div>

          <div className="admin-cards-grid">
            <div className="admin-card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} color="#2563eb" /> Thông tin Database
              </h3>
              {health.database && (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(health.database).filter(([k]) => k !== 'status').map(([key, val]) => (
                      <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', color: '#64748b', fontWeight: 600, textTransform: 'capitalize', width: '40%' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#0f172a' }}>{String(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="admin-card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={18} color="#2563eb" /> Thông tin Hệ thống
              </h3>
              {health.system && (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(health.system).map(([key, val]) => (
                      <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', color: '#64748b', fontWeight: 600, textTransform: 'capitalize', width: '40%' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#0f172a' }}>{String(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
