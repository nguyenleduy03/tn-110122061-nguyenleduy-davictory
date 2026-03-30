import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../services/assignmentApi';
import { authApi } from '../../services/authApi';

export default function StudentAssignments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const classData = await authApi.getMyClassManagement();
        const myClasses = classData.classes || [];
        console.log('📚 My classes:', myClasses);
        setClasses(myClasses);

        if (myClasses.length > 0) {
          const allAssignmentPromises = await Promise.all(
            myClasses.map(c => assignmentApi.getAssignmentsForStudent(c.id))
          );
          const allAssignmentData = allAssignmentPromises.flat();
          console.log('📝 All assignments:', allAssignmentData);
          setAssignments(allAssignmentData);
          
          // Fetch submission status for each assignment
          const submissionPromises = allAssignmentData.map(async (assignment) => {
            try {
              const submission = await assignmentApi.getMySubmission(assignment.id);
              return { [assignment.id]: submission };
            } catch {
              return { [assignment.id]: null }; // Chưa nộp
            }
          });
          
          const submissionResults = await Promise.all(submissionPromises);
          const submissionMap = submissionResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
          setSubmissions(submissionMap);
        } else {
          console.warn('⚠️ No classes found for student');
        }
      } catch (error) {
        console.error('❌ Failed to fetch assignments:', error);
        console.error('Error details:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAssignments = selectedClass
    ? assignments.filter(a => a.classId === parseInt(selectedClass))
    : assignments;

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

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Đang tải bài tập...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>Bài tập của tôi</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>Xem và nộp bài tập được giao</p>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontWeight: 500 }}>Lọc theo lớp:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          <option value="">Tất cả lớp ({assignments.length})</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} ({assignments.filter(a => a.classId === c.id).length})
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Tổng bài tập</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{filteredAssignments.length}</div>
        </div>
        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Chưa nộp</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#d97706' }}>
            {filteredAssignments.filter(a => a.status === 'PUBLISHED').length}
          </div>
        </div>
        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Quá hạn</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#dc2626' }}>
            {filteredAssignments.filter(a => {
              const dueDate = a.dueDate ? new Date(a.dueDate) : null;
              return dueDate && new Date() > dueDate && a.status === 'PUBLISHED';
            }).length}
          </div>
        </div>
      </div>

      {/* Assignment list */}
      {filteredAssignments.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ margin: 0, color: '#6b7280' }}>Chưa có bài tập nào</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredAssignments.map(assignment => {
            const status = getAssignmentStatus(assignment);
            return (
              <div
                key={assignment.id}
                style={{
                  padding: 20,
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>{assignment.title}</h3>
                    <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 14 }}>
                      {assignment.description?.substring(0, 150)}{assignment.description?.length > 150 ? '...' : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={14} />
                        <span>Lớp: {assignment.className}</span>
                      </div>
                      {assignment.dueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} />
                          <span>Hạn: {new Date(assignment.dueDate).toLocaleString('vi-VN')}</span>
                        </div>
                      )}
                      {assignment.maxScore && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} />
                          <span>Điểm tối đa: {assignment.maxScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`lms-pill ${status.color}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {status.icon && <status.icon size={12} />}
                      {status.label}
                    </span>
                    {assignment.testId && assignment.status === 'PUBLISHED' && !submissions[assignment.id] && (
                      <button
                        className="lms-cta"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/test/reading/${assignment.testId}?mode=assignment&assignmentId=${assignment.id}`);
                        }}
                        style={{ fontSize: 13, padding: '4px 12px' }}
                      >
                        Làm bài
                      </button>
                    )}
                    {submissions[assignment.id] && (
                      <button
                        className="lms-btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/assignments/${assignment.id}/result`);
                        }}
                        style={{ fontSize: 13, padding: '4px 12px' }}
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
  );
}
