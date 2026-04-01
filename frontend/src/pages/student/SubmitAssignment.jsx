import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, Send, CheckCircle } from 'lucide-react';
import { assignmentApi } from '../../services/assignmentApi';

export default function SubmitAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [formData, setFormData] = useState({
    submissionText: '',
    attachmentUrl: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assignmentData = await assignmentApi.getAssignment(id);
        setAssignment(assignmentData);

        // Check if MANUAL type
        if (assignmentData.type !== 'MANUAL') {
          alert('Bài tập này không hỗ trợ nộp bài thủ công');
          navigate(`/student/assignments/${id}`);
          return;
        }

        // Get previous submissions
        try {
          const submissionsData = await assignmentApi.getMySubmissions(id);
          setMySubmission(submissionsData[0] || null);
          if (submissionsData[0]) {
            setFormData({
              submissionText: submissionsData[0].submissionText || '',
              attachmentUrl: submissionsData[0].attachmentUrl || ''
            });
          }
        } catch (err) {
          // No previous submission
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.submissionText.trim() && !formData.attachmentUrl.trim()) {
      alert('Vui lòng nhập nội dung bài làm hoặc đính kèm file');
      return;
    }

    setSubmitting(true);
    try {
      await assignmentApi.submitManual(parseInt(id), formData);
      alert('Nộp bài thành công!');
      navigate(`/student/assignments/${id}/result`);
    } catch (error) {
      alert('Nộp bài thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
  }

  if (!assignment) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy bài tập</div>;
  }

  const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate);
  const canSubmit = assignment.status === 'PUBLISHED' && (!mySubmission || mySubmission.status !== 'GRADED');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <button
        onClick={() => navigate(`/student/assignments/${id}`)}
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#1b7f79', fontSize: 14 }}
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      {/* Assignment info */}
      <div style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700 }}>{assignment.title}</h1>
        
        <div style={{ display: 'flex', gap: 20, fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} />
            <span>Lớp: {assignment.className}</span>
          </div>
          {assignment.dueDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} />
              <span>Hạn nộp: {new Date(assignment.dueDate).toLocaleString('vi-VN')}</span>
              {isOverdue && <span style={{ color: '#dc2626', fontWeight: 600 }}>Quá hạn</span>}
            </div>
          )}
          {assignment.maxScore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} />
              <span>Điểm tối đa: {assignment.maxScore}</span>
            </div>
          )}
        </div>

        {assignment.description && (
          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>Yêu cầu:</strong>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{assignment.description}</p>
          </div>
        )}

        {assignment.attachmentUrl && (
          <a
            href={assignment.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1b7f79', textDecoration: 'none' }}
          >
            <FileText size={16} /> Tài liệu đính kèm
          </a>
        )}
      </div>

      {/* Submission status */}
      {mySubmission && (
        <div style={{ padding: 20, background: mySubmission.status === 'GRADED' ? '#dcfce7' : '#fef3c7', borderRadius: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={20} />
            <strong>
              {mySubmission.status === 'GRADED' ? 'Đã chấm điểm' : 
               mySubmission.status === 'LATE' ? 'Đã nộp (Trễ hạn)' : 'Đã nộp'}
            </strong>
          </div>
          <div style={{ fontSize: 14 }}>
            Nộp lúc: {new Date(mySubmission.submittedAt).toLocaleString('vi-VN')}
          </div>
          {mySubmission.status === 'GRADED' && (
            <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 18, color: '#16a34a', marginBottom: 8 }}>
                Điểm: {mySubmission.score}
              </div>
              {mySubmission.feedback && (
                <div>
                  <strong>Nhận xét:</strong>
                  <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{mySubmission.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submit form */}
      {canSubmit ? (
        <form onSubmit={handleSubmit} style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>
            {mySubmission ? 'Nộp lại bài làm' : 'Nộp bài làm'}
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Nội dung bài làm <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={formData.submissionText}
              onChange={(e) => setFormData({ ...formData, submissionText: e.target.value })}
              rows={12}
              placeholder="Nhập nội dung bài làm của bạn..."
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Link file đính kèm</label>
            <input
              type="url"
              value={formData.attachmentUrl}
              onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
              placeholder="https://..."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Có thể upload file lên Google Drive và dán link ở đây
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="lms-cta"
            style={{ width: '100%', padding: 12, fontSize: 16 }}
          >
            <Send size={16} /> {submitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </form>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, color: '#6b7280' }}>
            {mySubmission?.status === 'GRADED' 
              ? 'Bài làm đã được chấm điểm, không thể nộp lại'
              : 'Bài tập chưa được phát hành hoặc đã đóng'}
          </p>
        </div>
      )}
    </div>
  );
}
