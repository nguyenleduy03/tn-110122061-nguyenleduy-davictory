import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authApi } from '../services/authApi';
import { teacherApi } from '../services/teacherApi';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const isTeacherOrAbove = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return ['ADMIN', 'MANAGER', 'TEACHER'].some(r => rolesArray.includes(r));
};

const isAdminOrManager = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return ['ADMIN', 'MANAGER'].some(r => rolesArray.includes(r));
};

const normalizeSet = (values) => new Set((Array.isArray(values) ? values : [])
  .map((v) => String(v).trim())
  .filter(Boolean));

const extractTeacherScope = (user) => ({
  classIds: normalizeSet(user?.managedClassIds || user?.teacherClassIds || user?.classIds),
  classCodes: normalizeSet(user?.managedClassCodes || user?.teacherClassCodes || user?.classCodes),
});

const getSubmissionClassId = (s) => {
  const value = s?.classId ?? s?.clazzId ?? s?.assignmentClassId;
  return value != null ? String(value) : '';
};

const getSubmissionClassCode = (s) => {
  const value = s?.classCode ?? s?.clazzCode;
  return value != null ? String(value).trim() : '';
};

const getSubmissionClassName = (s) => s?.className || s?.clazzName || '—';

export default function TeacherWritingDetail() {
  const { id } = useParams();
  const user = authApi.getStoredUser();
  const hasPermission = isTeacherOrAbove(user?.roles);

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [score, setScore] = useState('');
  const [status, setStatus] = useState('GRADED');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const teacherScope = useMemo(() => extractTeacherScope(user), [user]);

  const loadSubmission = useCallback(async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await teacherApi.getWritingSubmission(id);
      setSubmission(data);
      setScore(data?.overallBandScore != null ? String(data.overallBandScore) : '');
      setStatus(data?.status || 'GRADED');
      setFeedback(data?.overallFeedback || '');
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Ban khong co quyen truy cap.');
      } else if (status === 404) {
        setError('API giao vien chua san sang cho bai nop Writing.');
      } else {
        setError('Khong the tai bai nop. Vui long thu lai.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, id]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const stats = useMemo(() => ({
    wordCount: submission?.wordCount ?? '—',
    status: submission?.status ?? '—',
    score: submission?.overallBandScore ?? '—',
    submittedAt: formatDateTime(submission?.submittedAt),
  }), [submission]);

  const canGrade = useMemo(() => {
    if (!submission) return false;
    if (isAdminOrManager(user?.roles)) return true;

    const classId = getSubmissionClassId(submission);
    const classCode = getSubmissionClassCode(submission);
    if (!classId && !classCode) return false;

    return teacherScope.classIds.has(classId) || teacherScope.classCodes.has(classCode);
  }, [submission, teacherScope, user]);

  const handleSaveGrade = async () => {
    if (!canGrade || saving) return;
    setSaveError('');

    const parsedScore = score === '' ? null : Number(score);
    if (parsedScore != null && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 9)) {
      setSaveError('Band score phai nam trong khoang 0 den 9.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        overallBandScore: parsedScore,
        overallFeedback: feedback,
        status,
      };
      const updated = await teacherApi.gradeWritingSubmission(id, payload);
      setSubmission(updated);
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || 'Khong the luu ket qua cham bai.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Link to="/teacher/writing" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Quay lai
          </Link>
        </div>

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
        ) : submission ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Cham bai Writing</h1>
              <p style={{ marginTop: 6, color: '#6b7280' }}>Hoc vien: <strong>{submission.username || '—'}</strong></p>
              <p style={{ marginTop: 4, color: '#6b7280' }}>Lop: <strong>{getSubmissionClassName(submission)}</strong></p>
              <p style={{ marginTop: 4, color: '#6b7280' }}>De bai: <strong>{submission.groupTitle || 'Writing task'}</strong></p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard label="Trang thai" value={stats.status} />
              <StatCard label="So tu" value={stats.wordCount} />
              <StatCard label="Diem" value={stats.score} />
              <StatCard label="Ngay nop" value={stats.submittedAt} />
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Bai lam cua hoc vien</h3>
              <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                {submission.submissionText || '—'}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Diem va nhan xet</h3>

              {!canGrade && (
                <div style={{
                  marginTop: 12,
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8,
                  color: '#9a3412', fontSize: 13,
                }}>
                  <AlertCircle size={15} />
                  Giao vien chi duoc cham bai thuoc lop minh. Bai nay khong nam trong pham vi lop duoc phan cong hoac backend chua tra thong tin lop.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 12 }}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="9"
                  placeholder="Band score"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  disabled={!canGrade || saving}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canGrade || saving} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <option>SUBMITTED</option>
                  <option>UNDER_REVIEW</option>
                  <option>GRADED</option>
                  <option>RETURNED</option>
                </select>
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={!canGrade || saving}
                placeholder="Nhan xet tong quan"
                style={{ width: '100%', minHeight: 120, marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              {saveError && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{saveError}</div>}
              <button
                type="button"
                onClick={handleSaveGrade}
                disabled={!canGrade || saving}
                style={{
                  marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                  background: !canGrade || saving ? '#f3f4f6' : '#111827',
                  color: !canGrade || saving ? '#9ca3af' : '#fff',
                  cursor: !canGrade || saving ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {saving ? 'Dang luu...' : 'Luu ket qua'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 12, border: '1px dashed #d1d5db' }}>
            <FileText size={40} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Khong tim thay bai nop</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: '#111827' }}>{value}</div>
    </div>
  );
}
