import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Award, BookOpen, Headphones, PenTool, Mic, FileText, AlertCircle } from 'lucide-react';
import { assignmentApi } from '../../services/assignmentApi';
import Navbar from '../../components/layout/Navbar';

const SKILL_CONFIG = {
  LISTENING: { icon: Headphones, color: '#3b82f6', name: 'Listening' },
  READING: { icon: BookOpen, color: '#10b981', name: 'Reading' },
  WRITING: { icon: PenTool, color: '#f59e0b', name: 'Writing' },
  SPEAKING: { icon: Mic, color: '#ef4444', name: 'Speaking' }
};

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentData, submissionsData] = await Promise.allSettled([
          assignmentApi.getAssignment(id),
          assignmentApi.getMySubmissions(id)
        ]);

        if (assignmentData.status === 'fulfilled') {
          setAssignment(assignmentData.value);
        }
        if (submissionsData.status === 'fulfilled') {
          setSubmissions(submissionsData.value || []);
        }
      } catch (error) {
        console.error('Failed to load assignment:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
      </>
    );
  }

  if (!assignment) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>Không tìm thấy bài tập</p>
          <button onClick={() => navigate('/student/lms')} style={{ marginTop: 16 }}>
            Quay lại
          </button>
        </div>
      </>
    );
  }

  const isTestType = assignment.type === 'TEST';
  const latestSubmission = submissions[0];
  const attemptCount = submissions.length;
  const maxAttempts = assignment.maxAttempts;
  const canSubmit = !maxAttempts || attemptCount < maxAttempts;
  const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate);
  const allowSubmit = assignment.status === 'PUBLISHED' && (canSubmit || assignment.allowLateSubmission);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          
          <button
            onClick={() => navigate('/student/lms')}
            style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14 }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>

          {/* Assignment Info */}
          <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{assignment.title}</h1>
              <span style={{ 
                padding: '4px 10px', 
                borderRadius: 4, 
                fontSize: 12, 
                fontWeight: 500,
                background: isTestType ? '#dbeafe' : '#fef3c7',
                color: isTestType ? '#1e40af' : '#92400e'
              }}>
                {isTestType ? 'Bài test' : 'Bài tập tự do'}
              </span>
            </div>

            {assignment.description && (
              <p style={{ margin: '0 0 16px', color: '#6b7280', lineHeight: 1.6 }}>
                {assignment.description}
              </p>
            )}

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={16} />
                <span>{assignment.className}</span>
              </div>
              {assignment.dueDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} />
                  <span>Hạn: {new Date(assignment.dueDate).toLocaleString('vi-VN')}</span>
                  {isOverdue && <span style={{ color: '#dc2626', fontWeight: 600 }}>Quá hạn</span>}
                </div>
              )}
              {assignment.maxScore && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={16} />
                  <span>Điểm tối đa: {assignment.maxScore}</span>
                </div>
              )}
              {maxAttempts && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} />
                  <span>Số lần làm: {attemptCount}/{maxAttempts}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Status */}
          {latestSubmission && (
            <div style={{ 
              padding: 20, 
              background: latestSubmission.status === 'GRADED' ? '#d1fae5' : '#fef3c7', 
              borderRadius: 8, 
              marginBottom: 20 
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {latestSubmission.status === 'GRADED' ? '✓ Đã chấm điểm' : '⏳ Đã nộp, chờ chấm'}
              </div>
              {latestSubmission.status === 'GRADED' && latestSubmission.score !== null && (
                <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
                  Điểm: {latestSubmission.score}/{assignment.maxScore}
                </div>
              )}
              <button
                onClick={() => navigate(`/student/assignments/${id}/result`)}
                style={{ 
                  marginTop: 12, 
                  padding: '8px 16px', 
                  borderRadius: 6, 
                  border: 'none', 
                  background: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Xem kết quả
              </button>
            </div>
          )}

          {/* Warning if no attempts left */}
          {!canSubmit && !assignment.allowLateSubmission && (
            <div style={{ padding: 20, background: '#fee2e2', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertCircle size={20} color="#dc2626" />
              <span style={{ color: '#dc2626', fontWeight: 500 }}>
                Bạn đã hết lượt làm bài ({maxAttempts} lần)
              </span>
            </div>
          )}

          {/* TEST Type - Show Skills */}
          {isTestType && allowSubmit && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
                Chọn kỹ năng để làm bài
              </h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {Object.entries(SKILL_CONFIG).map(([skill, config]) => {
                  const Icon = config.icon;
                  return (
                    <div
                      key={skill}
                      onClick={() => navigate(`/test/${skill.toLowerCase()}/${assignment.testId}?assignment=${id}`)}
                      style={{
                        padding: 20,
                        background: '#fff',
                        borderRadius: 8,
                        border: `2px solid ${config.color}20`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = config.color;
                        e.currentTarget.style.boxShadow = `0 4px 12px ${config.color}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${config.color}20`;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 8, 
                        background: `${config.color}15`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Icon size={24} color={config.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: config.color }}>
                          {config.name}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          Click để bắt đầu
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>→</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MANUAL Type - Show Submit Button */}
          {!isTestType && allowSubmit && (
            <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', color: '#6b7280' }} />
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
                Bài tập tự do
              </h2>
              <p style={{ margin: '0 0 20px', color: '#6b7280' }}>
                Nhập nội dung bài làm hoặc đính kèm file
              </p>
              <button
                onClick={() => navigate(`/student/assignments/${id}/submit`)}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: 6, 
                  border: 'none', 
                  background: '#2563eb', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 15
                }}
              >
                Nộp bài
              </button>
            </div>
          )}

          {/* Closed */}
          {!allowSubmit && assignment.status !== 'PUBLISHED' && (
            <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, color: '#6b7280' }}>
                Bài tập chưa được phát hành hoặc đã đóng
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
