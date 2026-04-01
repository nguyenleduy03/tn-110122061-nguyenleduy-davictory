import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Award, FileText } from 'lucide-react';
import { assignmentApi } from '../../services/assignmentApi';

export default function AssignmentResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assignmentData = await assignmentApi.getAssignment(id);
        setAssignment(assignmentData);

        const submissionsData = await assignmentApi.getMySubmissions(id);
        if (submissionsData && submissionsData.length > 0) {
          setSubmission(submissionsData[0]); // Latest submission
        }
      } catch (error) {
        console.error('Failed to fetch result:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Đang tải kết quả...</p>
      </div>
    );
  }

  if (!assignment || !submission) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Không tìm thấy kết quả</p>
        <button className="lms-cta" onClick={() => navigate('/student/lms')}>
          Quay lại
        </button>
      </div>
    );
  }

  const isGraded = submission.status === 'GRADED';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <button
        onClick={() => navigate(`/student/assignments/${id}`)}
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#1b7f79', fontSize: 14 }}
      >
        <ArrowLeft size={16} /> Quay lại bài tập
      </button>

      {/* Success message */}
      <div style={{ 
        padding: 24, 
        background: isGraded ? '#dcfce7' : '#fef3c7', 
        borderRadius: 12, 
        marginBottom: 24,
        textAlign: 'center'
      }}>
        <CheckCircle size={48} style={{ margin: '0 auto 16px', color: isGraded ? '#16a34a' : '#d97706' }} />
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>
          {isGraded ? 'Đã chấm điểm!' : 'Nộp bài thành công!'}
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          {isGraded 
            ? 'Giáo viên đã chấm bài của bạn' 
            : 'Bài làm của bạn đã được ghi nhận. Vui lòng chờ giáo viên chấm điểm.'}
        </p>
      </div>

      {/* Assignment info */}
      <div style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>{assignment.title}</h2>
        
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: 14 }}>
              Nộp lúc: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('vi-VN') : 'N/A'}
            </span>
          </div>

          {isGraded && submission.score !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Điểm: {submission.score} {assignment.maxScore && `/ ${assignment.maxScore}`}
              </span>
            </div>
          )}

          {submission.status === 'LATE' && (
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 6, fontSize: 13, color: '#d97706' }}>
              ⚠️ Bài nộp trễ hạn
            </div>
          )}
        </div>
      </div>

      {/* Submission Content - for MANUAL type */}
      {!isGraded && submission && assignment.type === 'MANUAL' && (
        <div style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Bài làm của bạn</h3>
          {submission.submissionText && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Nội dung:</div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#374151', padding: 12, background: '#f9fafb', borderRadius: 6 }}>
                {submission.submissionText}
              </p>
            </div>
          )}
          {submission.attachmentUrl && (
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>File đính kèm:</div>
              <a href={submission.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                {submission.attachmentUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {isGraded && submission.feedback && (
        <div style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Nhận xét của giáo viên
          </h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#374151' }}>
            {submission.feedback}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          className="lms-cta" 
          onClick={() => navigate('/student/lms')}
          style={{ flex: 1 }}
        >
          Danh sách bài tập
        </button>
        {assignment.type === 'TEST' && submission.examAttemptId && (
          <button 
            className="lms-cta ghost" 
            onClick={() => {
              // Navigate to test review - need to determine skill from examAttempt
              alert('Chức năng xem lại bài làm đang được phát triển');
            }}
            style={{ flex: 1 }}
          >
            Xem chi tiết bài làm
          </button>
        )}
      </div>
    </div>
  );
}
