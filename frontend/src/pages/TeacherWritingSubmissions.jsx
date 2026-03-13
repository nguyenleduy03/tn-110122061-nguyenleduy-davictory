import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authApi } from '../services/authApi';
import { teacherApi } from '../services/teacherApi';

const STATUS_META = {
  SUBMITTED: { label: 'Cho cham', color: '#d97706', bg: '#fef3c7' },
  UNDER_REVIEW: { label: 'Dang cham', color: '#2563eb', bg: '#dbeafe' },
  GRADED: { label: 'Da cham', color: '#16a34a', bg: '#dcfce7' },
  RETURNED: { label: 'Da tra', color: '#6b7280', bg: '#f3f4f6' },
  DRAFT: { label: 'Nhap', color: '#6b7280', bg: '#f3f4f6' },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const isTeacherOrAbove = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return ['ADMIN', 'MANAGER', 'TEACHER'].some(r => rolesArray.includes(r));
};

export default function TeacherWritingSubmissions() {
  const user = authApi.getStoredUser();
  const hasPermission = isTeacherOrAbove(user?.roles);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSubmissions = useCallback(async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await teacherApi.getWritingSubmissions(statusFilter ? { status: statusFilter } : {});
      setSubmissions(Array.isArray(data) ? data : (data.content ?? []));
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Ban khong co quyen truy cap.');
      } else if (status === 404) {
        setError('API giao vien chua san sang cho bai nop Writing.');
      } else {
        setError('Khong the tai danh sach bai nop. Vui long thu lai.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return submissions;
    return submissions.filter((s) => {
      const name = (s.username || '').toLowerCase();
      const title = (s.groupTitle || '').toLowerCase();
      return name.includes(keyword) || title.includes(keyword);
    });
  }, [search, submissions]);

  const statusCounts = useMemo(() => {
    const counts = { SUBMITTED: 0, UNDER_REVIEW: 0, GRADED: 0, RETURNED: 0, DRAFT: 0 };
    submissions.forEach((s) => {
      const key = s.status || 'DRAFT';
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [submissions]);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Bai nop Writing</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Theo doi va cham diem bai viet</p>
          </div>
        </div>

        {!hasPermission && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff3cd', borderRadius: 12, marginBottom: 24 }}>
            <h2 style={{ color: '#856404', marginBottom: 12 }}>Khong co quyen truy cap</h2>
            <p style={{ color: '#856404' }}>
              Trang nay yeu cau tai khoan co quyen <strong>TEACHER</strong>, <strong>MANAGER</strong> hoac <strong>ADMIN</strong>.
            </p>
          </div>
        )}

        <div style={{
          display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
          background: '#fff', padding: '12px 14px', borderRadius: 10,
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tim theo hoc vien / de bai..."
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                border: '1px solid #d1d5db', borderRadius: 7,
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                color: '#374151', background: '#f9fafb',
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 7,
              fontSize: 13, color: '#374151', background: '#f9fafb',
              appearance: 'none', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">Tat ca trang thai</option>
            {Object.keys(STATUS_META).map((key) => (
              <option key={key} value={key}>{STATUS_META[key].label}</option>
            ))}
          </select>
          <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} bai
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.keys(STATUS_META).map((key) => (
            <span key={key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              color: STATUS_META[key].color, background: STATUS_META[key].bg,
            }}>
              {STATUS_META[key].label}: {statusCounts[key]}
            </span>
          ))}
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            color: '#dc2626', fontSize: 14, marginBottom: 16,
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
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#fff', borderRadius: 12, border: '1px dashed #d1d5db',
          }}>
            <FileText size={40} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Chua co bai nop
            </p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>
              Bai nop Writing se xuat hien o day khi hoc vien nop bai.
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1fr 1fr 1.2fr 1fr', gap: 0, background: '#f9fafb', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
              <div>Hoc vien</div>
              <div>De bai</div>
              <div>Trang thai</div>
              <div>So tu</div>
              <div>Diem</div>
              <div>Ngay nop</div>
              <div>Thao tac</div>
            </div>
            {filtered.map((s) => (
              <div
                key={s.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1fr 1fr 1.2fr 1fr', gap: 0, padding: '12px 16px', borderTop: '1px solid #eef2f7', alignItems: 'center' }}
              >
                <div style={{ fontWeight: 600, color: '#111827' }}>{s.username || '—'}</div>
                <div style={{ color: '#374151' }}>{s.groupTitle || 'Writing task'}</div>
                <div>
                  <StatusBadge status={s.status} />
                </div>
                <div style={{ color: '#374151' }}>{s.wordCount ?? '—'}</div>
                <div style={{ color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.overallBandScore ?? '—'}
                  {s.overallBandScore != null && <CheckCircle2 size={14} color="#16a34a" />}
                </div>
                <div style={{ color: '#6b7280' }}>{formatDate(s.submittedAt)}</div>
                <div>
                  <Link
                    to={`/teacher/writing/${s.id}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                      background: '#fff', fontSize: 12, color: '#2563eb', textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Chi tiet
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: meta.color, background: meta.bg,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
}
