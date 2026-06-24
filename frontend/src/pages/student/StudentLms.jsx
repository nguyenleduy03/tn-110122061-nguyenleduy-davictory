import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, FileText, BookOpen, Award, TrendingUp, Sparkles, Play, Lock, Globe, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../services/assignmentApi';
import { authApi } from '../../services/authApi';
import { examApi } from '../../services/examApi';
import Navbar from '../../components/layout/Navbar';
import '../../styles/homePage.css';

const EXAM_STATUS_LABELS = {
  SCHEDULED: 'Sắp diễn ra',
  OPEN: 'Đang mở',
  CLOSED: 'Đã kết thúc',
};

const EXAM_TYPE_LABELS = {
  CLASS_EXAM: 'Thi lớp',
  OPEN_EXAM: 'Thi tự do',
};

export default function StudentLms() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' or 'exams'
  
  // Assignments state
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  // Exams state
  const [exams, setExams] = useState([]);
  const [examError, setExamError] = useState('');
  const [examFilterTab, setExamFilterTab] = useState('ALL');
  const [passwordModal, setPasswordModal] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!authApi.isAuthenticated()) {
        setLoading(false);
        return;
      }

      // Fetch classes and assignments
      const classData = await authApi.getMyClasses();
      const myClasses = Array.isArray(classData) ? classData : (classData?.classes || []);
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
            return { [assignment.id]: null };
          }
        });
        
        const submissionResults = await Promise.all(submissionPromises);
        const submissionMap = submissionResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setSubmissions(submissionMap);
      }

      // Fetch exams
      const examData = await examApi.listAvailable();
      setExams(Array.isArray(examData) ? examData : []);

    } catch (error) {
      console.error('Failed to fetch LMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Assignment helpers
  const getAssignmentStatus = (assignment) => {
    const submission = submissions[assignment.id];
    if (submission) return { label: 'Đã nộp', color: 'success', icon: CheckCircle };
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
      if (assignmentFilter === 'pending') return !submissions[a.id] && a.status === 'PUBLISHED';
      if (assignmentFilter === 'submitted') return !!submissions[a.id];
      if (assignmentFilter === 'overdue') {
        const dueDate = a.dueDate ? new Date(a.dueDate) : null;
        return dueDate && new Date() > dueDate && !submissions[a.id];
      }
      return true;
    });

  // Exam helpers
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
      navigate(`/test/listening/${exam.testId}?examId=${exam.id}`);
    } catch (err) {
      alert(err?.response?.data?.error || 'Không thể vào thi');
    }
  };

  const filteredExams = examFilterTab === 'ALL'
    ? exams
    : exams.filter(e => e.status === examFilterTab);

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => !submissions[a.id] && a.status === 'PUBLISHED').length,
    submitted: Object.values(submissions).filter(s => s).length,
    exams: exams.filter(e => e.status === 'OPEN').length
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
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 600, color: '#1a1a1a' }}>
                LMS
              </h1>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
                Không gian học tập và rèn luyện của bạn
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
            <button
              onClick={() => setActiveTab('assignments')}
              style={{
                padding: '12px 4px',
                fontSize: 16,
                fontWeight: 600,
                color: activeTab === 'assignments' ? '#2563eb' : '#6b7280',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'assignments' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Bài tập {stats.pending > 0 && <span style={{ marginLeft: 4, background: '#ef4444', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 10 }}>{stats.pending}</span>}
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              style={{
                padding: '12px 4px',
                fontSize: 16,
                fontWeight: 600,
                color: activeTab === 'exams' ? '#2563eb' : '#6b7280',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'exams' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Kỳ thi {stats.exams > 0 && <span style={{ marginLeft: 4, background: '#10b981', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 10 }}>{stats.exams}</span>}
            </button>
          </div>

          {activeTab === 'assignments' ? (
            <>
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
                      value={assignmentFilter}
                      onChange={(e) => setAssignmentFilter(e.target.value)}
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
                                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 6, background: '#fff', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 500 }}
                              >
                                Xem kết quả
                              </button>
                            ) : assignment.status === 'PUBLISHED' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/student/assignments/${assignment.id}`);
                                }}
                                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
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
            </>
          ) : (
            <>
              {/* Exam Content */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['ALL', 'OPEN', 'SCHEDULED', 'CLOSED'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setExamFilterTab(tab)}
                    style={{
                      padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0',
                      background: examFilterTab === tab ? '#3b82f6' : 'white',
                      color: examFilterTab === tab ? 'white' : '#475569',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {tab === 'ALL' ? 'Tất cả' : EXAM_STATUS_LABELS[tab] || tab}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {filteredExams.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    Không có kỳ thi nào
                  </div>
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
                          {EXAM_STATUS_LABELS[exam.status]}
                        </span>
                        <span style={{
                          padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: exam.examType === 'CLASS_EXAM' ? '#dbeafe' : '#ede9fe',
                          color: exam.examType === 'CLASS_EXAM' ? '#1d4ed8' : '#6d28d9',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {exam.examType === 'CLASS_EXAM' ? <Users size={11} /> : <Globe size={11} />}
                          {EXAM_TYPE_LABELS[exam.examType]}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {exam.durationMinutes} phút
                        </span>
                        {exam.className && <span>Lớp: {exam.className}</span>}
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
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>{EXAM_STATUS_LABELS[exam.status]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password Modal */}
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
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
              >
                Huỷ
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={verifying || !password}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: verifying || !password ? 0.6 : 1 }}
              >
                {verifying ? 'Đang kiểm tra...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
