import React, { useEffect, useState } from 'react';
import { CalendarCheck, FilePlus, Megaphone, Sparkles, Users, FileText, ClipboardList, TrendingUp, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LmsLayout from '../../components/lms/LmsLayout';
import { authApi } from '../../services/authApi';
import { teacherApi } from '../../services/teacherApi';

export default function LmsTeacherDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, submissions
  const [data, setData] = useState({
    classes: [],
    teachers: [],
    currentUser: null
  });
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [classResponse, submissionResponse] = await Promise.all([
          authApi.getMyClassManagement(),
          teacherApi.getWritingSubmissions().catch(() => ({ content: [] }))
        ]);
        
        setData({
          classes: classResponse?.classes || [],
          teachers: classResponse?.teachers || [],
          currentUser: classResponse?.teacher || classResponse?.currentUser || null
        });
        
        setSubmissions(Array.isArray(submissionResponse) ? submissionResponse : (submissionResponse.content || []));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Tính toán thống kê
  const totalClasses = data.classes.length;
  const totalStudents = data.classes.reduce((sum, c) => sum + (c.activeStudentCount || c.studentCount || 0), 0);
  const activeClasses = data.classes.filter(c => c.status === 'ACTIVE').length;
  
  // Thống kê bài nộp
  const submissionStats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'SUBMITTED').length,
    graded: submissions.filter(s => s.status === 'GRADED').length,
  };

  // Lớp sắp khai giảng
  const upcomingClasses = data.classes
    .filter(c => c.status === 'UPCOMING' || c.status === 'ACTIVE')
    .sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate) - new Date(b.startDate);
    })
    .slice(0, 5);

  if (loading) {
    return (
      <LmsLayout title="Đang tải..." subtitle="Vui lòng chờ">
        <div className="lms-panel">
          <p>Đang tải dữ liệu...</p>
        </div>
      </LmsLayout>
    );
  }

  return (
    <LmsLayout
      title="Tổng quan giảng viên"
      subtitle="Theo dõi lớp học, bài nộp và hoạt động giảng dạy"
    >
      {/* Tab Navigation */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <div className="lms-chip-row">
          <button 
            className={`lms-cta ${activeTab === 'overview' ? '' : 'ghost'}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={14} /> Tổng quan
          </button>
          <button 
            className={`lms-cta ${activeTab === 'submissions' ? '' : 'ghost'}`}
            onClick={() => setActiveTab('submissions')}
          >
            <FileText size={14} /> Bài nộp ({submissionStats.total})
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <section className="lms-hero">
            <div className="lms-hero-card">
              <h2>Chào {data.currentUser?.fullName || 'Giảng viên'}!</h2>
              <p>Bạn đang quản lý {totalClasses} lớp học với {totalStudents} học viên.</p>
            </div>
            <div className="lms-panel">
              <h3 className="lms-panel-title">Thao tác nhanh</h3>
              <div className="lms-chip-row">
                <button className="lms-cta" onClick={() => navigate('/lms/teacher/classes')}>
                  <Users size={14} /> Quản lý lớp
                </button>
                <button className="lms-cta ghost" onClick={() => setActiveTab('submissions')}>
                  <FileText size={14} /> Chấm bài
                </button>
                <button className="lms-cta ghost" onClick={() => navigate('/lms/teacher/assignments')}>
                  <ClipboardList size={14} /> Bài tập
                </button>
              </div>
            </div>
          </section>

          <section className="lms-cards">
            <div className="lms-card">
              <h3>Lớp đang hoạt động</h3>
              <div className="lms-card-value">{activeClasses}</div>
              <p className="lms-subtitle">Tổng {totalClasses} lớp</p>
            </div>
            <div className="lms-card">
              <h3>Tổng học viên</h3>
              <div className="lms-card-value">{totalStudents}</div>
              <p className="lms-subtitle">Đang active</p>
            </div>
            <div className="lms-card">
              <h3>Bài nộp chờ chấm</h3>
              <div className="lms-card-value" style={{ color: '#d97706' }}>{submissionStats.pending}</div>
              <p className="lms-subtitle">Writing + Speaking</p>
            </div>
            <div className="lms-card">
              <h3>Hoàn thành</h3>
              <div className="lms-card-value">{data.classes.filter(c => c.status === 'COMPLETED').length}</div>
              <p className="lms-subtitle">Lớp đã kết thúc</p>
            </div>
          </section>

          <section className="lms-grid">
            <div className="lms-panel">
              <h3 className="lms-panel-title">Lớp học của bạn</h3>
              {upcomingClasses.length > 0 ? (
                <table className="lms-table">
                  <thead>
                    <tr><th>Tên lớp</th><th>Mã lớp</th><th>Học viên</th><th>Trạng thái</th></tr>
                  </thead>
                  <tbody>
                    {upcomingClasses.map((cls) => (
                      <tr 
                        key={cls.id}
                        onClick={() => navigate(`/lms/teacher/classes/${cls.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{cls.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{cls.code || cls.classCode}</td>
                        <td>{cls.activeStudentCount || cls.studentCount || 0}</td>
                        <td>
                          <span className={`lms-pill ${cls.status === 'ACTIVE' ? 'success' : cls.status === 'UPCOMING' ? 'warn' : 'neutral'}`}>
                            {cls.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="lms-subtitle">Chưa có lớp học nào</p>
              )}
              <button 
                className="lms-cta ghost" 
                style={{ marginTop: 12 }}
                onClick={() => navigate('/lms/teacher/classes')}
              >
                Xem tất cả lớp
              </button>
            </div>

            <div className="lms-panel">
              <h3 className="lms-panel-title">Thông tin chi tiết</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {data.classes.slice(0, 3).map((cls) => (
                  <div 
                    key={cls.id}
                    style={{ 
                      padding: 12, 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => navigate(`/lms/teacher/classes/${cls.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {cls.activeStudentCount || cls.studentCount || 0} học viên • {cls.code || cls.classCode}
                    </div>
                    {cls.schedule && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        {cls.schedule}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {data.classes.length === 0 && (
                <p className="lms-subtitle">Chưa có dữ liệu</p>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'submissions' && (
        <>
          {/* Stats Cards */}
          <section className="lms-cards" style={{ marginBottom: 20 }}>
            <div className="lms-card">
              <h3>Tổng bài nộp</h3>
              <div className="lms-card-value">{submissionStats.total}</div>
              <p className="lms-subtitle">Tất cả bài làm</p>
            </div>
            <div className="lms-card">
              <h3>Chờ chấm</h3>
              <div className="lms-card-value" style={{ color: '#d97706' }}>{submissionStats.pending}</div>
              <p className="lms-subtitle">Cần xử lý</p>
            </div>
            <div className="lms-card">
              <h3>Đã chấm</h3>
              <div className="lms-card-value" style={{ color: '#16a34a' }}>{submissionStats.graded}</div>
              <p className="lms-subtitle">Hoàn thành</p>
            </div>
          </section>

          {/* Submissions Table */}
          <div className="lms-panel">
            {submissions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="lms-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Bài làm</th>
                      <th>Số từ</th>
                      <th>Ngày nộp</th>
                      <th>Trạng thái</th>
                      <th>Điểm</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.slice(0, 10).map((s) => (
                      <tr key={s.id || `${s.username}-${s.groupTitle}`}>
                        <td style={{ fontWeight: 600 }}>{s.username || 'N/A'}</td>
                        <td>{s.groupTitle || 'N/A'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.wordCount || '—'}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td>
                          <span className={`lms-pill ${
                            s.status === 'SUBMITTED' ? 'warn' : 
                            s.status === 'GRADED' ? 'success' : 
                            s.status === 'UNDER_REVIEW' ? 'neutral' : 'neutral'
                          }`}>
                            {s.status === 'SUBMITTED' ? 'Chờ chấm' : 
                             s.status === 'GRADED' ? 'Đã chấm' : 
                             s.status === 'UNDER_REVIEW' ? 'Đang chấm' : 
                             s.status || 'N/A'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: s.score ? '#16a34a' : '#9ca3af' }}>
                          {s.score || '—'}
                        </td>
                        <td>
                          <button 
                            className="lms-cta ghost"
                            onClick={() => navigate(`/teacher/writing/${s.id}`)}
                          >
                            <FileText size={14} /> {s.status === 'GRADED' ? 'Xem' : 'Chấm'}
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
                <p style={{ margin: 0, fontSize: 14 }}>Chưa có bài nộp nào</p>
              </div>
            )}
          </div>
        </>
      )}
    </LmsLayout>
  );
}
