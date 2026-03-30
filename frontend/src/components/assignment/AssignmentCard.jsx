import React from 'react';
import { Calendar, Users, CheckCircle, Clock, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AssignmentCard({ assignment, onEdit, onDelete }) {
  const navigate = useNavigate();
  
  const statusColor = {
    DRAFT: 'neutral',
    PUBLISHED: 'success',
    CLOSED: 'neutral'
  };

  const progress = assignment.totalStudents > 0 
    ? Math.round((assignment.submittedCount / assignment.totalStudents) * 100) 
    : 0;

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <div className="lms-panel" style={{ cursor: 'pointer' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{assignment.title}</h3>
          <span className={`lms-pill ${statusColor[assignment.status] || 'neutral'}`}>
            {assignment.status}
          </span>
        </div>
        
        <p style={{ margin: '8px 0', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          {assignment.description?.substring(0, 100)}{assignment.description?.length > 100 ? '...' : ''}
        </p>

        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={14} />
            <span>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('vi-VN') : 'Không hạn'}</span>
            {isOverdue && <span style={{ color: '#dc2626', fontWeight: 600 }}>Quá hạn</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} />
            <span>{assignment.submittedCount}/{assignment.totalStudents}</span>
          </div>
          {assignment.gradedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} />
              <span>{assignment.gradedCount} đã chấm</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Tiến độ nộp bài</span>
            <span style={{ fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: progress === 100 ? '#16a34a' : '#1b7f79',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
        <button 
          className="lms-cta" 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/lms/teacher/assignments/${assignment.id}`);
          }}
          style={{ flex: 1 }}
        >
          <Eye size={14} /> Xem bài nộp
        </button>
        <button 
          className="lms-cta ghost" 
          onClick={(e) => {
            e.stopPropagation();
            onEdit(assignment);
          }}
        >
          <Edit size={14} />
        </button>
        <button 
          className="lms-cta ghost" 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(assignment.id);
          }}
          style={{ color: '#dc2626' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
