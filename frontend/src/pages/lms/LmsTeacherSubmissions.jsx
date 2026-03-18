import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, FileText, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';

export default function LmsTeacherSubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, SUBMITTED, GRADED

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await teacherApi.getAllSubmissions();
        console.log('📊 All Submissions:', data);
        
        const allSubmissions = [
          ...(data.writingSubmissions || []).map(s => ({ ...s, type: 'WRITING' })),
          ...(data.examAttempts || []).map(a => ({ ...a, type: a.examType }))
        ].sort((a, b) => new Date(b.submittedAt || b.startedAt) - new Date(a.submittedAt || a.startedAt));
        
        setSubmissions(allSubmissions);
      } catch (err) {
        setError('Không thể tải danh sách bài nộp');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'ALL') return true;
    if (filter === 'SUBMITTED') return s.status === 'SUBMITTED';
    if (filter === 'GRADED') return s.status === 'GRADED';
    return true;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'SUBMITTED').length,
    graded: submissions.filter(s => s.status === 'GRADED').length,
  };

  if (loading) {
    return (
      <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
          <p>Đang tải danh sách bài nộp...</p>
        </div>
      </LmsLayout>
    );
  }

  if (error) {
    return (
      <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
          <p>{error}</p>
        </div>
      </LmsLayout>
    );
  }

  return (
    <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
      {/* Stats Cards */}
      <section className="lms-cards" style={{ marginBottom: 20 }}>
        <div className="lms-card">
          <h3>Tổng bài nộp</h3>
          <div className="lms-card-value">{stats.total}</div>
          <p className="lms-subtitle">Tất cả bài làm</p>
        </div>
        <div className="lms-card">
          <h3>Chờ chấm</h3>
          <div className="lms-card-value" style={{ color: '#d97706' }}>{stats.pending}</div>
          <p className="lms-subtitle">Cần xử lý</p>
        </div>
        <div className="lms-card">
          <h3>Đã chấm</h3>
          <div className="lms-card-value" style={{ color: '#16a34a' }}>{stats.graded}</div>
          <p className="lms-subtitle">Hoàn thành</p>
        </div>
      </section>

      {/* Filter */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <div className="lms-chip-row">
          <button 
            className={`lms-cta ${filter === 'ALL' ? '' : 'ghost'}`}
            onClick={() => setFilter('ALL')}
          >
            Tất cả ({stats.total})
          </button>
          <button 
            className={`lms-cta ${filter === 'SUBMITTED' ? '' : 'ghost'}`}
            onClick={() => setFilter('SUBMITTED')}
          >
            <Clock size={14} /> Chờ chấm ({stats.pending})
          </button>
          <button 
            className={`lms-cta ${filter === 'GRADED' ? '' : 'ghost'}`}
            onClick={() => setFilter('GRADED')}
          >
            <Award size={14} /> Đã chấm ({stats.graded})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="lms-panel">
        {filteredSubmissions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Loại bài</th>
                  <th>Bài làm</th>
                  <th>Ngày nộp</th>
                  <th>Trạng thái</th>
                  <th>Điểm</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td style={{ fontWeight: 600 }}>{s.username || 'N/A'}</td>
                    <td>
                      <span className={`lms-pill ${
                        s.type === 'WRITING' ? 'neutral' :
                        s.type === 'READING' ? 'success' :
                        s.type === 'LISTENING' ? 'warn' : 'neutral'
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td>{s.groupTitle || s.examTitle || 'N/A'}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {(s.submittedAt || s.startedAt) ? new Date(s.submittedAt || s.startedAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td>
                      <span className={`lms-pill ${
                        s.status === 'SUBMITTED' ? 'warn' : 
                        s.status === 'GRADED' ? 'success' : 
                        'neutral'
                      }`}>
                        {s.status === 'SUBMITTED' ? 'Chờ chấm' : 
                         s.status === 'GRADED' ? 'Đã chấm' : 
                         s.status || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: (s.score || s.bandScore || s.overallBandScore) ? '#16a34a' : '#9ca3af' }}>
                      {s.score || s.bandScore || s.overallBandScore || '—'}
                    </td>
                    <td>
                      <button 
                        className="lms-cta ghost"
                        onClick={() => {
                          if (s.type === 'WRITING') navigate(`/lms/submission/writing/${s.id}`);
                          else navigate(`/lms/submission/exam/${s.id}`);
                        }}
                      >
                        <FileText size={14} /> Xem bài
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14 }}>
              {filter === 'ALL' ? 'Chưa có bài nộp nào' : 
               filter === 'SUBMITTED' ? 'Không có bài chờ chấm' : 
               'Chưa có bài đã chấm'}
            </p>
          </div>
        )}
      </div>
    </LmsLayout>
  );
}
