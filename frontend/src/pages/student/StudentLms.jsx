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
        // Kiểm tra đăng nhập
        if (!authApi.isAuthenticated()) {
          console.warn('User not authenticated');
          setLoading(false);
          return;
        }

        const classData = await authApi.getMyClasses();
        console.log('📚 Raw classData:', classData);
        const myClasses = Array.isArray(classData) ? classData : (classData?.classes || []);
        console.log('📚 Parsed myClasses:', myClasses);
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
            } catch (err) {
              // 403/404 = chưa nộp hoặc không có quyền xem
              if (err.response?.status === 403 || err.response?.status === 404) {
                return { [assignment.id]: null };
              }
              console.error(`Failed to get submission for assignment ${assignment.id}:`, err);
              return { [assignment.id]: null };
            }
          });
          
          const submissionResults = await Promise.all(submissionPromises);
          const submissionMap = submissionResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
          setSubmissions(submissionMap);
        }
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
        if (error.response?.status === 403) {
          console.error('403 Forbidden - User may not have permission to access classes');
        }
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
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 600, color: '#1a1a1a' }}>
              Bài tập của tôi
            </h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
              Quản lý và theo dõi tiến độ học tập
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={20} color="#6b7280" />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Tổng bài tập</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>{stats.total}</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Chưa nộp</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>{stats.pending}</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={20} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Đã nộp</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>{stats.submitted}</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={20} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Quá hạn</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>{stats.overdue}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Lớp học
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #d1d5db', 
                    fontSize: 14,
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Tất cả lớp</option>
                  {(classes || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Trạng thái
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #d1d5db', 
                    fontSize: 14,
                    background: '#fff',
                    cursor: 'pointer'
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
            <div style={{ padding: 80, textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: '#6b7280' }} />
              <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Không có bài tập nào</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredAssignments.map(assignment => {
                const status = getAssignmentStatus(assignment);
                const submission = submissions[assignment.id];
                
                return (
                  <div
                    key={assignment.id}
                    style={{
                      padding: 20,
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 20 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
                            {assignment.title}
                          </h3>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            fontSize: 11, 
                            padding: '3px 8px', 
                            borderRadius: 4,
                            background: assignment.type === 'TEST' ? '#dbeafe' : '#fef3c7',
                            color: assignment.type === 'TEST' ? '#1e40af' : '#92400e',
                            fontWeight: 600
                          }}>
                            {assignment.type === 'TEST' ? '📝 Test' : '📄 Tự do'}
                          </span>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            fontSize: 12, 
                            padding: '4px 10px', 
                            borderRadius: 4,
                            background: status.color === 'success' ? '#d1fae5' : status.color === 'warn' ? '#fee2e2' : '#f3f4f6',
                            color: status.color === 'success' ? '#059669' : status.color === 'warn' ? '#dc2626' : '#6b7280',
                            fontWeight: 500
                          }}>
                            {status.icon && <status.icon size={12} />}
                            {status.label}
                          </span>
                        </div>
                        
                        {assignment.description && (
                          <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
                            {assignment.description.substring(0, 150)}{assignment.description.length > 150 ? '...' : ''}
                          </p>
                        )}
                        
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BookOpen size={16} />
                            <span>{assignment.className}</span>
                          </div>
                          {assignment.dueDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={16} />
                              <span>Hạn: {new Date(assignment.dueDate).toLocaleString('vi-VN')}</span>
                            </div>
                          )}
                          {assignment.maxScore && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Award size={16} />
                              <span>Điểm tối đa: {assignment.maxScore}</span>
                            </div>
                          )}
                          {submission?.score !== null && submission?.score !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600 }}>
                              <TrendingUp size={16} />
                              <span>Điểm: {submission.score}/{assignment.maxScore}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {submission ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/assignments/${assignment.id}/result`);
                            }}
                            style={{ 
                              fontSize: 13, 
                              padding: '8px 16px', 
                              borderRadius: 6,
                              background: '#fff',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Xem kết quả
                          </button>
                        ) : assignment.status === 'PUBLISHED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/assignments/${assignment.id}`);
                            }}
                            style={{ 
                              fontSize: 13, 
                              padding: '8px 16px', 
                              borderRadius: 6,
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Làm bài
                          </button>
                        ) : null}
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
