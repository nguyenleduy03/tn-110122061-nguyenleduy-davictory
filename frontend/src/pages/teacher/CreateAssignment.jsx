import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { assignmentApi } from '../../services/assignmentApi';
import { classApi } from '../../services/classApi';
import '../../styles/assignmentForm.css';

const ASSIGNMENT_TYPES = [
  'LISTENING_PRACTICE',
  'READING_PRACTICE', 
  'WRITING_TASK',
  'SPEAKING_PRACTICE',
  'MOCK_TEST',
  'VOCABULARY',
  'GRAMMAR',
  'MIXED'
];

const CreateAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId');
  const template = location.state?.template;

  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    title: template?.title || '',
    description: template?.description || '',
    assignmentType: template?.assignmentType || 'MOCK_TEST',
    testId: testId || template?.testId || null,
    maxScore: template?.maxScore || null,
    notes: template?.notes || '',
    classId: null,
    dueDate: null,
    isRequired: true,
    status: 'DRAFT'
  });
  const [saving, setSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(!testId && !template);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const data = await classApi.getMyClasses();
      setClasses(data);
    } catch (error) {
      console.error('Lỗi tải lớp:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (saveAsTemplate) {
        await assignmentApi.createTemplateFromTest(form.testId, form);
        alert('Đã lưu bài tập mẫu!');
        navigate('/teacher/assignments/templates');
      } else {
        if (!form.classId) {
          alert('Vui lòng chọn lớp');
          return;
        }
        await assignmentApi.createAssignment(form);
        alert('Đã tạo bài tập!');
        navigate('/teacher/assignments');
      }
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assignment-form-page">
      <div className="form-header">
        <h1>{saveAsTemplate ? 'Lưu Bài Tập Mẫu' : 'Tạo Bài Tập'}</h1>
        <button className="btn-close" onClick={() => navigate(-1)}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="assignment-form">
        <div className="form-section">
          <label className="form-label">
            Tiêu đề <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className="form-section">
          <label className="form-label">Mô tả</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-section">
            <label className="form-label">Loại bài tập</label>
            <select
              className="form-select"
              value={form.assignmentType}
              onChange={(e) => setForm({ ...form, assignmentType: e.target.value })}
            >
              {ASSIGNMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Điểm tối đa</label>
            <input
              type="number"
              className="form-input"
              value={form.maxScore || ''}
              onChange={(e) => setForm({ ...form, maxScore: e.target.value ? parseFloat(e.target.value) : null })}
              step="0.5"
              min="0"
            />
          </div>
        </div>

        <div className="form-section">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
            />
            <span>Lưu làm bài tập mẫu (không giao cho lớp)</span>
          </label>
        </div>

        {!saveAsTemplate && (
          <>
            <div className="form-section">
              <label className="form-label">
                Lớp <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={form.classId || ''}
                onChange={(e) => setForm({ ...form, classId: e.target.value ? parseInt(e.target.value) : null })}
                required
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-section">
                <label className="form-label">Hạn nộp</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.dueDate || ''}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>

              <div className="form-section">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={form.isRequired}
                    onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                  />
                  <span>Bắt buộc</span>
                </label>
              </div>
            </div>
          </>
        )}

        <div className="form-section">
          <label className="form-label">Ghi chú</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssignment;
