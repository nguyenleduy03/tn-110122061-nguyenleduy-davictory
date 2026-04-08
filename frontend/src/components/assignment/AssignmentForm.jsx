import React, { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { useTabIndent } from '../../hooks/useTabIndent';

export default function AssignmentForm({ assignment, classes, tests, onSubmit, onClose }) {
  const { handleKeyDown } = useTabIndent();
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    description: '',
    type: 'MANUAL',
    testId: '',
    maxScore: '',
    dueDate: '',
    maxAttempts: '',
    allowLateSubmission: false,
    status: 'DRAFT'
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        classId: assignment.classId || '',
        title: assignment.title || '',
        description: assignment.description || '',
        type: assignment.type || 'MANUAL',
        testId: assignment.testId || '',
        maxScore: assignment.maxScore || '',
        dueDate: assignment.dueDate ? assignment.dueDate.substring(0, 16) : '',
        maxAttempts: assignment.maxAttempts || '',
        allowLateSubmission: assignment.allowLateSubmission || false,
        status: assignment.status || 'DRAFT'
      });
    }
  }, [assignment]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      classId: parseInt(formData.classId),
      testId: formData.type === 'TEST' && formData.testId ? parseInt(formData.testId) : null,
      maxScore: formData.maxScore ? parseFloat(formData.maxScore) : null,
      maxAttempts: formData.maxAttempts ? parseInt(formData.maxAttempts) : null,
      dueDate: formData.dueDate || null
    };

    onSubmit(payload);
  };

  const isTestType = formData.type === 'TEST';

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
            {assignment ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          
          {/* Type Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Loại bài tập <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{
                padding: 16,
                border: `2px solid ${formData.type === 'TEST' ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: 8,
                cursor: 'pointer',
                background: formData.type === 'TEST' ? '#eff6ff' : '#fff',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="type"
                  value="TEST"
                  checked={formData.type === 'TEST'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, testId: '' })}
                  style={{ marginRight: 8 }}
                />
                <strong>Bài test</strong>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Học sinh làm test trên hệ thống, điểm tự động
                </div>
              </label>
              
              <label style={{
                padding: 16,
                border: `2px solid ${formData.type === 'MANUAL' ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: 8,
                cursor: 'pointer',
                background: formData.type === 'MANUAL' ? '#eff6ff' : '#fff',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="type"
                  value="MANUAL"
                  checked={formData.type === 'MANUAL'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, testId: '' })}
                  style={{ marginRight: 8 }}
                />
                <strong>Bài tự do</strong>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Học sinh nộp text/file, giáo viên chấm thủ công
                </div>
              </label>
            </div>
          </div>

          {/* Class */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Lớp học <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="">Chọn lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          {/* Test Selection - only for TEST type */}
          {isTestType && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Chọn đề thi <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={formData.testId}
                onChange={(e) => setFormData({ ...formData, testId: e.target.value })}
                required={isTestType}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              >
                <option value="">Chọn đề thi</option>
                {(tests || []).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                Học sinh sẽ làm test này và điểm được tính tự động
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Tiêu đề <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder={isTestType ? "VD: Bài test Unit 5" : "VD: Viết essay về môi trường"}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Mô tả / Yêu cầu
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder={isTestType ? "Hướng dẫn làm bài..." : "Yêu cầu chi tiết cho bài tập..."}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }}
            />
          </div>

          {/* Settings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Điểm tối đa
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                placeholder="VD: 10"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Số lần làm
                <HelpCircle size={14} color="#6b7280" title="Để trống = không giới hạn" />
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
                placeholder="Không giới hạn"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Hạn nộp
            </label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.allowLateSubmission}
                onChange={(e) => setFormData({ ...formData, allowLateSubmission: e.target.checked })}
              />
              <span style={{ fontSize: 14 }}>Cho phép nộp trễ</span>
            </label>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Trạng thái
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã phát hành</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Chỉ bài tập "Đã phát hành" mới hiển thị cho học sinh
            </p>
          </div>

          {/* Actions */}
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
              {assignment ? 'Cập nhật' : 'Tạo bài tập'}
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
