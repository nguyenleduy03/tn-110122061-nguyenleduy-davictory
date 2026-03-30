import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const ASSIGNMENT_TYPES = [
  { value: 'LISTENING_PRACTICE', label: 'Luyện Listening' },
  { value: 'READING_PRACTICE', label: 'Luyện Reading' },
  { value: 'WRITING_TASK', label: 'Bài Writing' },
  { value: 'SPEAKING_PRACTICE', label: 'Luyện Speaking' },
  { value: 'MOCK_TEST', label: 'Thi thử' },
  { value: 'VOCABULARY', label: 'Từ vựng' },
  { value: 'GRAMMAR', label: 'Ngữ pháp' },
  { value: 'MIXED', label: 'Tổng hợp' },
];

export default function AssignmentForm({ assignment, classes, onSubmit, onClose }) {
  const location = useLocation();
  const testFromBuilder = location.state; // { testId, testTitle }
  
  const [formData, setFormData] = useState({
    classId: '',
    title: testFromBuilder?.testTitle || '',
    description: '',
    assignmentType: 'MIXED',
    testId: testFromBuilder?.testId || '',
    attachmentUrl: '',
    dueDate: '',
    isRequired: true,
    maxScore: '',
    status: 'DRAFT',
    notes: '',
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        classId: assignment.classId || '',
        title: assignment.title || '',
        description: assignment.description || '',
        assignmentType: assignment.assignmentType || 'MIXED',
        testId: assignment.testId || '',
        attachmentUrl: assignment.attachmentUrl || '',
        dueDate: assignment.dueDate ? assignment.dueDate.substring(0, 16) : '',
        isRequired: assignment.isRequired !== false,
        maxScore: assignment.maxScore || '',
        status: assignment.status || 'DRAFT',
        notes: assignment.notes || '',
      });
    }
  }, [assignment]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      classId: parseInt(formData.classId),
      testId: formData.testId ? parseInt(formData.testId) : null,
      maxScore: formData.maxScore ? parseFloat(formData.maxScore) : null,
      dueDate: formData.dueDate || null,
    };

    onSubmit(payload);
  };

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
        maxWidth: 600,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            {assignment ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              Lớp học <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="">Chọn lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              Tiêu đề <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="VD: Bài tập Listening Unit 5"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Hướng dẫn chi tiết cho học viên..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Loại bài tập</label>
              <select
                value={formData.assignmentType}
                onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              >
                {ASSIGNMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Trạng thái</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã phát hành</option>
                <option value="CLOSED">Đã đóng</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              Đề thi (Optional - nếu bài tập là làm đề)
            </label>
            <input
              type="number"
              value={formData.testId}
              onChange={(e) => setFormData({ ...formData, testId: e.target.value })}
              placeholder="Nhập ID đề thi (VD: 1, 2, 3...)"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Nếu để trống, học viên sẽ nộp bài dạng text. Nếu có ID đề thi, học viên sẽ làm bài trên trang thi.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Hạn nộp</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Điểm tối đa</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                placeholder="VD: 10"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Link tài liệu</label>
            <input
              type="url"
              value={formData.attachmentUrl}
              onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
              placeholder="https://..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
              />
              <span style={{ fontSize: 14 }}>Bài tập bắt buộc</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="lms-cta" style={{ flex: 1 }}>
              {assignment ? 'Cập nhật' : 'Tạo bài tập'}
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
