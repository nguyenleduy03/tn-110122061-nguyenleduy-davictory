import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Globe, Lock, Play } from 'lucide-react';
import { examApi } from '../../services/examApi';
import { authApi } from '../../services/authApi';

const STATUS_LABELS = {
  SCHEDULED: 'Sắp diễn ra',
  OPEN: 'Đang mở',
  CLOSED: 'Đã kết thúc',
};

const TYPE_LABELS = {
  CLASS_EXAM: 'Thi lớp',
  OPEN_EXAM: 'Thi tự do',
};

export default function StudentExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [passwordModal, setPasswordModal] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await examApi.listAvailable();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Không thể tải danh sách kỳ thi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const handleEnterExam = async (exam) => {
    if (exam.status !== 'OPEN') {
      alert('Kỳ thi này chưa mở hoặc đã đóng');
      return;
    }

    if (exam.hasPassword) {
      setPasswordModal(exam);
      setPassword('');
      setPasswordError('');
      return;
    }

    startExam(exam);
  };

  const handlePasswordSubmit = async () => {
    if (!passwordModal) return;
    try {
      setVerifying(true);
      const result = await examApi.verifyPassword(passwordModal.id, password);
      if (result.valid) {
        setPasswordModal(null);
        startExam(passwordModal);
      }
    } catch (err) {
      setPasswordError(err?.response?.data?.error || 'Sai mật khẩu');
    } finally {
      setVerifying(false);
    }
  };

  const startExam = async (exam) => {
    try {
      await examApi.checkAccess(exam.id);
      const isFullTest = false; // TODO: check from test data
      if (isFullTest) {
        navigate(`/exam/take/${exam.id}`);
      } else {
        navigate(`/test/listening/${exam.testId}?examId=${exam.id}`);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Không thể vào thi');
    }
  };

  const filteredExams = filterTab === 'ALL'
    ? exams
    : exams.filter(e => e.status === filterTab);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN');
  };

  const formatDuration = (m) => {
    if (!m) return '';
    if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}p` : ''}`;
    return `${m} phút`;
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc', fontFamily: 'Sora, sans-serif',
      padding: 24, maxWidth: 1000, margin: '0 auto',
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a' }}>Kỳ thi</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Các kỳ thi dành cho bạn
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['ALL', 'OPEN', 'SCHEDULED', 'CLOSED'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0',
              background: filterTab === tab ? '#3b82f6' : 'white',
              color: filterTab === tab ? 'white' : '#475569',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            {tab === 'ALL' ? 'Tất cả' : STATUS_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Đang tải...</div>
        ) : filteredExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Không có kỳ thi nào</div>
        ) : filteredExams.map(exam => (
          <div
            key={exam.id}
            style={{
              background: 'white', borderRadius: 12, padding: 20,
              border: '1px solid #e2e8f0', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              opacity: exam.status === 'CLOSED' ? 0.6 : 1,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{exam.title}</h3>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: exam.status === 'OPEN' ? '#d1fae5' : exam.status === 'SCHEDULED' ? '#fef3c7' : '#f1f5f9',
                  color: exam.status === 'OPEN' ? '#065f46' : exam.status === 'SCHEDULED' ? '#92400e' : '#64748b',
                }}>
                  {STATUS_LABELS[exam.status]}
                </span>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: exam.examType === 'CLASS_EXAM' ? '#dbeafe' : '#ede9fe',
                  color: exam.examType === 'CLASS_EXAM' ? '#1d4ed8' : '#6d28d9',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {exam.examType === 'CLASS_EXAM' ? <Users size={11} /> : <Globe size={11} />}
                  {TYPE_LABELS[exam.examType]}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {formatDuration(exam.durationMinutes)}
                </span>
                {exam.className && <span>Lớp: {exam.className}</span>}
                {exam.scheduledStartTime && (
                  <span>Mở: {formatDate(exam.scheduledStartTime)}</span>
                )}
                {exam.hasPassword && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706' }}>
                    <Lock size={12} /> Yêu cầu mật khẩu
                  </span>
                )}
              </div>
            </div>
            <div>
              {exam.status === 'OPEN' ? (
                <button
                  onClick={() => handleEnterExam(exam)}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: '#3b82f6', color: 'white', fontWeight: 600,
                    fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Play size={14} /> Vào thi
                </button>
              ) : exam.status === 'SCHEDULED' ? (
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Chờ mở cửa</span>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Đã kết thúc</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {passwordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Nhập mật khẩu</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              Kỳ thi "{passwordModal.title}" yêu cầu mật khẩu
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Nhập mật khẩu"
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            {passwordError && (
              <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{passwordError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPasswordModal(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600,
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={verifying || !password}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600,
                  opacity: verifying || !password ? 0.6 : 1,
                }}
              >
                {verifying ? 'Đang kiểm tra...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
