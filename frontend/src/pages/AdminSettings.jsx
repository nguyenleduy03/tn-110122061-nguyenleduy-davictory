import React, { useEffect, useState } from 'react';
import { Settings, Save, Loader2, RefreshCcw } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { authApi } from '../services/authApi';

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [values, setValues] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await authApi.get('/admin/settings');
      setSettings(res.data);
      const v = {};
      res.data.forEach(s => { v[s.key] = s.value || ''; });
      setValues(v);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    setSaving(key);
    setMessage('');
    try {
      await authApi.put(`/admin/settings/${key}`, { value: values[key] });
      setMessage('Đã lưu cài đặt!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(null);
    }
  };

  const labels = {
    site_name: 'Tên trang web', site_description: 'Mô tả trang', maintenance_mode: 'Chế độ bảo trì',
    contact_email: 'Email liên hệ', contact_phone: 'SĐT liên hệ',
    max_upload_size: 'Kích thước upload tối đa', default_timezone: 'Múi giờ', logo_url: 'URL Logo'
  };

  return (
    <AdminLayout title="Cấu hình hệ thống" subtitle="Cài đặt chung, thông tin liên hệ và bảo trì">
      {message && (
        <div className={`admin-alert ${message.includes('Lỗi') ? 'admin-alert-danger' : 'admin-alert-info'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={32} className="admin-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {settings.map(s => (
            <div key={s.key} className="admin-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                    {labels[s.key] || s.key}
                    <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>
                      ({s.key})
                    </span>
                  </label>
                  {s.description && (
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>{s.description}</p>
                  )}
                  {s.key === 'maintenance_mode' ? (
                    <select value={values[s.key]} onChange={e => setValues({...values, [s.key]: e.target.value})}
                      className="admin-select" style={{ width: '100%', maxWidth: 300 }}>
                      <option value="false">Tắt</option>
                      <option value="true">Bật</option>
                    </select>
                  ) : (
                    <input value={values[s.key] || ''}
                      onChange={e => setValues({...values, [s.key]: e.target.value})}
                      className="admin-input" style={{ width: '100%', maxWidth: 500 }}
                    />
                  )}
                </div>
                <button onClick={() => handleSave(s.key)} disabled={saving === s.key}
                  className="admin-btn primary small" style={{ marginLeft: 16, whiteSpace: 'nowrap' }}>
                  {saving === s.key ? <Loader2 size={14} className="admin-spin" /> : <Save size={16} />}
                  Lưu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
