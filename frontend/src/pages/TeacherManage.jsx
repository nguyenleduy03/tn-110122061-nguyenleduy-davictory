import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FilePlus,
  FolderOpen,
  ClipboardList,
  PenLine,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authApi } from '../services/authApi';
import { testBuilderApi } from '../services/testBuilderApi';

const isTeacherOrAbove = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return ['ADMIN', 'MANAGER', 'TEACHER'].some(r => rolesArray.includes(r));
};

const countByStatus = (tests, status) => tests.filter(t => t.status === status).length;

export default function TeacherManage() {
  const user = authApi.getStoredUser();
  const hasPermission = isTeacherOrAbove(user?.roles);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTests = useCallback(async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await testBuilderApi.getAllTests();
      setTests(Array.isArray(data) ? data : (data.content ?? []));
    } catch (err) {
      setError('Khong the tai danh sach de thi. Vui long thu lai.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const summary = useMemo(() => ({
    total: tests.length,
    published: countByStatus(tests, 'PUBLISHED'),
    draft: countByStatus(tests, 'DRAFT'),
    reviewing: countByStatus(tests, 'REVIEWING'),
  }), [tests]);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        {!hasPermission && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff3cd', borderRadius: 12, marginBottom: 24 }}>
            <h2 style={{ color: '#856404', marginBottom: 12 }}>Khong co quyen truy cap</h2>
            <p style={{ color: '#856404' }}>
              Trang nay yeu cau tai khoan co quyen <strong>TEACHER</strong>, <strong>MANAGER</strong> hoac <strong>ADMIN</strong>.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              style={{ marginTop: 16, padding: '10px 24px', background: '#856404', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              Dang nhap lai
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Quan ly giao vien</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>De thi, bai nop, bai tap va cham diem</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to="/teacher/tests/new"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 8,
                background: '#2563eb', color: '#fff', textDecoration: 'none',
                fontSize: 14, fontWeight: 600,
              }}
            >
              <FilePlus size={16} />
              Tao de thi
            </Link>
            <Link
              to="/teacher/tests"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 8,
                background: '#fff', color: '#111827', textDecoration: 'none',
                fontSize: 14, fontWeight: 600, border: '1px solid #e5e7eb',
              }}
            >
              <FolderOpen size={16} />
              Quan ly de thi
            </Link>
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
          <SummaryCard label="Tong de thi" value={summary.total} icon={ClipboardList} tone="#2563eb" />
          <SummaryCard label="Da xuat ban" value={summary.published} icon={CheckCircle2} tone="#16a34a" />
          <SummaryCard label="Ban nhap" value={summary.draft} icon={PenLine} tone="#6b7280" />
          <SummaryCard label="Dang kiem duyet" value={summary.reviewing} icon={Clock} tone="#d97706" />
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: '#6b7280' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Dang tai...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <InfoPanel
              title="Bai nop Writing"
              description="Danh sach bai nop can cham va bai da cham"
              cta={{ label: 'Mo danh sach', href: '/teacher/writing' }}
              note="Can API danh cho giao vien: danh sach bai nop, cham diem."
            />
            <InfoPanel
              title="Bai tap theo lop"
              description="Giao bai, theo doi nop bai, cham diem"
              cta={{ label: 'Mo quan ly', disabled: true }}
              note="Can API Assignment va AssignmentSubmission."
            />
            <InfoPanel
              title="Bao cao thi thu"
              description="Thong ke attempt, diem va tien do hoc vien"
              cta={{ label: 'Mo bao cao', disabled: true }}
              note="Can API ExamAttempt cho giao vien."
            />
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={tone} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{value}</div>
      </div>
    </div>
  );
}

function InfoPanel({ title, description, note, cta }) {
  const buttonDisabled = !!cta?.disabled || !cta?.href;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{title}</h3>
      <p style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>{description}</p>
      {note && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>{note}</div>
      )}
      {cta?.href ? (
        <Link
          to={cta.href}
          style={{
            marginTop: 14, padding: '8px 14px', borderRadius: 8,
            border: '1px solid #e5e7eb', background: buttonDisabled ? '#f3f4f6' : '#111827',
            color: buttonDisabled ? '#9ca3af' : '#fff', cursor: buttonDisabled ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
          }}
        >
          {cta?.label || 'Mo'}
        </Link>
      ) : (
        <button
          type="button"
          disabled={buttonDisabled}
          style={{
            marginTop: 14, padding: '8px 14px', borderRadius: 8,
            border: '1px solid #e5e7eb', background: '#f3f4f6',
            color: '#9ca3af', cursor: 'not-allowed',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {cta?.label || 'Mo'}
        </button>
      )}
    </div>
  );
}
