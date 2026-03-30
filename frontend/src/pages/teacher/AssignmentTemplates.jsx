import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { assignmentApi } from '../../services/assignmentApi';
import '../../styles/assignmentTemplates.css';

const AssignmentTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await assignmentApi.getMyTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Lỗi tải templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa bài tập mẫu này?')) return;
    try {
      await assignmentApi.deleteAssignment(id);
      loadTemplates();
    } catch (error) {
      alert('Lỗi xóa: ' + error.message);
    }
  };

  const handleUseTemplate = (template) => {
    navigate('/teacher/assignments/create', { state: { template } });
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="assignment-templates-page">
      <div className="page-header">
        <div>
          <h1>Bài Tập Mẫu</h1>
          <p>Quản lý bài tập đã tạo để sử dụng lại</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/test-builder')}>
          <Plus size={20} />
          Tạo Đề Mới
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={64} />
          <h3>Chưa có bài tập mẫu</h3>
          <p>Tạo đề thi trong Test Builder và lưu làm bài tập mẫu</p>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h3>{template.title}</h3>
                <span className="template-type">{template.assignmentType}</span>
              </div>
              
              {template.description && (
                <p className="template-desc">{template.description}</p>
              )}

              <div className="template-meta">
                {template.testId && <span>Đề #{template.testId}</span>}
                {template.maxScore && <span>Điểm tối đa: {template.maxScore}</span>}
              </div>

              <div className="template-actions">
                <button 
                  className="btn-use"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Copy size={16} />
                  Sử Dụng
                </button>
                <button 
                  className="btn-icon"
                  onClick={() => navigate(`/test-builder/${template.testId}`)}
                  disabled={!template.testId}
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="btn-icon btn-danger"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentTemplates;
