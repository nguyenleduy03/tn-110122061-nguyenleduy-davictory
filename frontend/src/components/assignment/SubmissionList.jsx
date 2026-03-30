import React from 'react';
import { FileText } from 'lucide-react';

export default function SubmissionList({ submissions, onGrade, showActions = true }) {
  if (!submissions || submissions.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
        Chưa có bài nộp nào
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="lms-table">
        <thead>
          <tr>
            <th>Học viên</th>
            <th>Ngày nộp</th>
            <th>Trạng thái</th>
            <th>Điểm</th>
            {showActions && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{s.fullName}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{s.username}</div>
              </td>
              <td style={{ fontSize: 13 }}>
                {s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : '—'}
              </td>
              <td>
                <span className={`lms-pill ${
                  s.status === 'GRADED' ? 'success' : 
                  s.status === 'LATE' ? 'warn' : 
                  'neutral'
                }`}>
                  {s.status === 'SUBMITTED' ? 'Chờ chấm' : 
                   s.status === 'LATE' ? 'Nộp trễ' : 
                   s.status === 'GRADED' ? 'Đã chấm' : s.status}
                </span>
              </td>
              <td style={{ fontWeight: 600, color: s.score ? '#16a34a' : '#9ca3af' }}>
                {s.score !== null && s.score !== undefined ? s.score : '—'}
              </td>
              {showActions && (
                <td>
                  <button 
                    className="lms-cta ghost"
                    onClick={() => onGrade(s)}
                  >
                    <FileText size={14} /> {s.status === 'GRADED' ? 'Xem/Sửa' : 'Chấm điểm'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
