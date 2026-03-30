import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function GradeModal({ submission, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    submissionId: submission.id,
    score: submission.score || '',
    feedback: submission.feedback || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      score: formData.score ? parseFloat(formData.score) : null,
    });
  };

  const maxScore = submission.assignmentTitle ? null : 10; // Placeholder, should come from assignment

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
        borderRadius: 12,
        maxWidth: 700,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Chấm bài</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Submission info */}
        <div style={{ marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Học viên:</strong> {submission.fullName} ({submission.username})
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Bài tập:</strong> {submission.assignmentTitle}
          </div>
          <div>
            <strong>Nộp lúc:</strong> {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('vi-VN') : 'N/A'}
          </div>
        </div>

        {/* Submission content */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Nội dung bài làm:</label>
          <div style={{ 
            padding: 16, 
            background: '#fff', 
            border: '1px solid #e5e7eb', 
            borderRadius: 8,
            minHeight: 100,
            maxHeight: 200,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.6
          }}>
            {submission.submissionText || <em style={{ color: '#9ca3af' }}>Không có nội dung text</em>}
          </div>
          {submission.attachmentUrl && (
            <a 
              href={submission.attachmentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, color: '#1b7f79', fontSize: 13 }}
            >
              📎 Xem file đính kèm
            </a>
          )}
        </div>

        {/* Grading form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              Điểm {maxScore && `(tối đa ${maxScore})`}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={maxScore || undefined}
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="VD: 8.5"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Nhận xét</label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              rows={6}
              placeholder="Nhận xét chi tiết về bài làm của học viên..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="lms-cta" style={{ flex: 1 }}>
              Lưu điểm
            </button>
            <button type="button" onClick={onClose} className="lms-cta ghost">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
