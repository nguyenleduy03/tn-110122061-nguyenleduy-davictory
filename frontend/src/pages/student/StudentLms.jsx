import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, FileText, BookOpen, Award, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../services/assignmentApi';
import { authApi } from '../../services/authApi';
import Navbar from '../../components/layout/Navbar';
import '../../styles/homePage.css';

export default function StudentLms() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const classData = await authApi.getMyClassManagement();
        const myClasses = classData.classes || [];
        setClasses(myClasses);

        if (myClasses.length > 0) {
          const allAssignmentPromises = await Promise.all(
            myClasses.map(c => assignmentApi.getAssignmentsForStudent(c.id))
          );
          const allAssignmentData = allAssignmentPromises.flat();
          setAssignments(allAssignmentData);
          
          const submissionPromises = allAssignmentData.map(async (assignment) => {
            try {
              const submission = await assignmentApi.getMySubmission(assignment.id);
              return { [assignment.id]: submission };
            } catch {
              return { [assignment.id]: null };
            }
          });
          
          const submissionResults = await Promise.all(submissionPromises);
          const submissionMap = submissionResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
          setSubmissions(submissionMap);
        }
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAssignmentStatus = (assignment) => {
    const submission = submissions[assignment.id];
    if (submission) {
      return { label: 'Đã nộp', color: 'success', icon: CheckCircle };
    }
    
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
    
    if (assignment.status !== 'PUBLISHED') return { label: 'Chưa mở', color: 'neutral', icon: Clock };
    if (!dueDate) return { label: 'Không hạn', color: 'neutral', icon: FileText };
    if (now > dueDate) return { label: 'Quá hạn', color: 'warn', icon: AlertCircle };
    
    const hoursLeft = (dueDate - now) / (1000 * 60 * 60);
    if (hoursLeft < 24) return { label: 'Sắp hết hạn', color: 'warn', icon: AlertCircle };
    return { label: 'Đang mở', color: 'success', icon: FileText };
  };

  const filteredAssignments = assignments
    .filter(a => !selectedClass || a.classId === parseInt(selectedClass))
    .filter(a => {
      if (filter === 'pending') return !submissions[a.id] && a.status === 'PUBLISHED';
      if (filter === 'submitted') return !!submissions[a.id];
      if (filter === 'overdue') {
        const dueDate = a.dueDate ? new Date(a.dueDate) : null;
        return dueDate && new Date() > dueDate && !submissions[a.id];
      }
      return true;
    });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => !submissions[a.id] && a.status === 'PUBLISHED').length,
    submitted: Object.values(submissions).filter(s => s).length,
    overdue: assignments.filter(a => {
      const dueDate = a.dueDate ? new Date(a.dueDate) : null;
      return dueDate && new Date() > dueDate && !submissions[a.id];
    }).length
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 16, color: '#6b7280' }}>Đang tải...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{ 
        minHeight: '100vh',
        background: 'radial-gradient(circle at 14% 82%, rgba(59, 130, 246, 0.08) 0%, transparent 52%), radial-gradient(circle at 90% 8%, rgba(14, 165, 233, 0.06) 0%, transparent 50%), linear-gradient(130deg, #f8fbff 0%, #eef4ff 52%, #ffffff 100%)',
        paddingTop: 40
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: 20, 
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              color: '#0056D2'
            }}>
              <Sparkles size={16} />
              HỌC TẬP THÔNG MINH
            </div>
            <h1 style={{ margin: '0 0 12px', fontSize: 48, fontWeight: 800, background: 'linear-gradient(135deg, #0056D2 0%, #0ea5e9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Học tập của tôi
            </h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 18 }}>Quản lý bài tập và theo dõi tiến độ học tập</p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 40 }}>
            <div style={{ 
              padding: 32, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              borderRadius: 20, 
              color: '#fff', 
              boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
              transition: 'transform 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <BookOpen size={28} strokeWidth={2.5} />
                <span style={{ fontSize: 15, opacity: 0.95, fontWeight: 600 }}>Tổng bài tập</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em' }}>{stats.total}</div>
            </div>
            
            <div style={{ 
              padding: 32, 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
              borderRadius: 20, 
              color: '#fff', 
              boxShadow: '0 10px 40px rgba(240, 147, 251, 0.3)',
              transition: 'transform 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Clock size={28} strokeWidth={2.5} />
                <span style={{ fontSize: 15, opacity: 0.95, fontWeight: 600 }}>Chưa nộp</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em' }}>{stats.pending}</div>
            </div>
            
            <div style={{ 
              padding: 32, 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
              borderRadius: 20, 
              color: '#fff', 
              boxShadow: '0 10px 40px rgba(79, 172, 254, 0.3)',
              transition: 'transform 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <CheckCircle size={28} strokeWidth={2.5} />
                <span style={{ fontSize: 15, opacity: 0.95, fontWeight: 600 }}>Đã nộp</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em' }}>{stats.submitted}</div>
            </div>
            
            <div style={{ 
              padding: 32, 
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 
              borderRadius: 20, 
              color: '#fff', 
              boxShadow: '0 10px 40px rgba(250, 112, 154, 0.3)',
              transition: 'transform 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <AlertCircle size={28} strokeWidth={2.5} />
                <span style={{ fontSize: 15, opacity: 0.95, fontWeight: 600 }}>Quá hạn</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em' }}>{stats.overdue}</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 32, padding: 28, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderRadius: 20, border: '1px solid rgba(0, 86, 210, 0.1)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 240px' }}>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, fontSize: 14, color: '#374151' }}>Lớp học</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: 12, 
                    border: '1px solid #d1d5db', 
                    fontSize: 14,
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="">Tất cả lớp</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: '1 1 240px' }}>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, fontSize: 14, color: '#374151' }}>Trạng thái</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: 12, 
                    border: '1px solid #d1d5db', 
                    fontSize: 14,
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chưa nộp</option>
                  <option value="submitted">Đã nộp</option>
                  <option value="overdue">Quá hạn</option>
                </select>
              </div>
            </div>
          </div>

          {/* Assignment List */}
          {filteredAssignments.length === 0 ? (
            <div style={{ padding: 100, textAlign: 'center', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderRadius: 20, border: '1px solid rgba(0, 86, 210, 0.1)' }}>
              <FileText size={80} style={{ margin: '0 auto 20px', opacity: 0.15, color: '#0056D2' }} />
              <p style={{ margin: 0, color: '#6b7280', fontSize: 18, fontWeight: 500 }}>Không có bài tập nào</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {filteredAssignments.map(assignment => {
                const status = getAssignmentStatus(assignment);
                const submission = submissions[assignment.id];
                
                return (
                  <div
                    key={assignment.id}
                    style={{
                      padding: 28,
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 20,
                      border: '1px solid rgba(0, 86, 210, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 86, 210, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = 'rgba(0, 86, 210, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(0, 86, 210, 0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 24 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{assignment.title}</h3>
                          <span className={`lms-pill ${status.color}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', borderRadius: 8 }}>
                            {status.icon && <status.icon size={14} />}
                            {status.label}
                          </span>
                        </div>
                        
                        <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 15, lineHeight: 1.7 }}>
                          {assignment.description?.substring(0, 200)}{assignment.description?.length > 200 ? '...' : ''}
                        </p>
                        
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14, color: '#6b7280' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={18} />
                            <span style={{ fontWeight: 500 }}>{assignment.className}</span>
                          </div>
                          {assignment.dueDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Clock size={18} />
                              <span>Hạn: {new Date(assignment.dueDate).toLocaleString('vi-VN')}</span>
                            </div>
                          )}
                          {assignment.maxScore && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Award size={18} />
                              <span>Điểm tối đa: {assignment.maxScore}</span>
                            </div>
                          )}
                          {submission?.score !== null && submission?.score !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700 }}>
                              <TrendingUp size={18} />
                              <span>Điểm: {submission.score}/{assignment.maxScore}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {assignment.testId && assignment.status === 'PUBLISHED' && !submission && (
                          <button
                            className="hero-btn-solid"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/test/reading/${assignment.testId}?mode=assignment&assignmentId=${assignment.id}`);
                            }}
                            style={{ fontSize: 14, padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <Sparkles size={16} />
                            Làm bài
                          </button>
                        )}
                        {submission && (
                          <button
                            className="hero-btn-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/assignments/${assignment.id}/result`);
                            }}
                            style={{ fontSize: 14, padding: '12px 24px', borderRadius: 12 }}
                          >
                            Xem kết quả
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
