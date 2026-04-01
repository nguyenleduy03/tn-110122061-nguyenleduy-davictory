import React, { useState } from 'react';
import { X, Award } from 'lucide-react';

export default function GradeModal({ submission, assignment, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    score: submission.score || '',
    feedback: submission.feedback || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.score && formData.score !== 0) {
      alert('Vui lòng nhập điểm');
      return;
    }

    const score = parseFloat(formData.score);
    if (score < 0 || (assignment.maxScore && score > assignment.maxScore)) {
      alert(`Điểm phải từ 0 đến ${assignment.maxScore}`);
      return;
    }

    onSubmit(submission.id, {
      score,
      feedback: formData.feedback
    });
  };

  const isTestType = assignment.type === 'TEST';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 8,
        maxWidth: 600,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            Chấm điểm
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Student Info */}
        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Học sinh</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{submission.studentName}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
            Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
          </div>
        </div>

        {/* Submission Content - MANUAL type */}
        {!isTestType && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Bài làm</h3>
            
            {submission.submissionText && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Nội dung:</div>
                <div style={{ 
                  padding: 12, 
                  background: '#f9fafb', 
                  borderRadius: 6, 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  fontSize: 14,
                  maxHeight: 300,
                  overflow: 'auto'
                }}>
                  {submission.submissionText}
                </div>
              </div>
            )}

            {submission.attachmentUrl && (
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>File đính kèm:</div>
                <a 
                  href={submission.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', fontSize: 14 }}
                >
                  {submission.attachmentUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {/* TEST type info */}
        {isTestType && submission.examAttemptId && (
          <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: '#1e40af' }}>
              ℹ️ Bài test - Điểm được tính tự động từ kết quả thi
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Exam Attempt ID: {submission.examAttemptId}
            </div>
          </div>
        )}

        {/* Grading Form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              <Award size={16} />
              Điểm <span style={{ color: '#dc2626' }}>*</span>
              {assignment.maxScore && (
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 400 }}>
                  (Tối đa: {assignment.maxScore})
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={assignment.maxScore || undefined}
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              required
              placeholder="Nhập điểm"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16 }}
              disabled={isTestType && submission.score !== null}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Nhận xét
            </label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              rows={6}
              placeholder="Nhận xét chi tiết cho học sinh..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button 
              type="submit"
              style={{ 
                flex: 1, 
                padding: '10px 16px', 
                borderRadius: 6, 
                border: 'none', 
                background: '#2563eb', 
                color: '#fff', 
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Lưu điểm
            </button>
            <button 
              type="button"
              onClick={onClose}
              style={{ 
                padding: '10px 16px', 
                borderRadius: 6, 
                border: '1px solid #d1d5db', 
                background: '#fff', 
                color: '#374151',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
