import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authApi } from '../services/authApi';
import { teacherApi } from '../services/teacherApi';

const isTeacherOrAbove = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return ['ADMIN', 'MANAGER', 'TEACHER'].some(r => rolesArray.includes(r));
};

export default function TeacherAssignments() {
  const user = authApi.getStoredUser();
  const hasPermission = isTeacherOrAbove(user?.roles);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);

  const fetchAssignments = useCallback(async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await teacherApi.getAssignments();
      setAssignments(Array.isArray(data) ? data : (data.content ?? []));
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Ban khong co quyen truy cap.');
      } else if (status === 404) {
        setError('API Assignment chua san sang cho giao vien.');
      } else {
        setError('Khong the tai danh sach bai tap. Vui long thu lai.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Quan ly bai tap</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Giao bai va theo doi nop bai theo lop</p>

        {!hasPermission && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff3cd', borderRadius: 12, marginBottom: 24 }}>
            <h2 style={{ color: '#856404', marginBottom: 12 }}>Khong co quyen truy cap</h2>
            <p style={{ color: '#856404' }}>Trang nay yeu cau quyen TEACHER/MANAGER/ADMIN.</p>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            color: '#dc2626', fontSize: 14, marginTop: 16,
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: '#6b7280' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Dang tai...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 12, border: '1px dashed #d1d5db', marginTop: 16 }}>
            <FileText size={40} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Chua co bai tap</p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Danh sach bai tap se xuat hien o day.</p>
          </div>
        ) : (
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Danh sach bai tap ({assignments.length})</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
