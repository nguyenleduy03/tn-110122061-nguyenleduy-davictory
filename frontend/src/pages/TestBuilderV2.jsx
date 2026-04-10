import React, { useState } from 'react';
import { Save, Eye, Plus, Trash2 } from 'lucide-react';
import QuillEditor from '../components/common/QuillEditor';
import './TestBuilderV2.css';

const TestBuilderV2 = () => {
  const [test, setTest] = useState({
    title: '',
    skill: 'READING',
    parts: []
  });

  const addPart = () => {
    setTest(prev => ({
      ...prev,
      parts: [...prev.parts, {
        id: Date.now(),
        title: `Part ${prev.parts.length + 1}`,
        passage: '',
        questions: []
      }]
    }));
  };

  const updatePart = (partId, field, value) => {
    setTest(prev => ({
      ...prev,
      parts: prev.parts.map(p => 
        p.id === partId ? { ...p, [field]: value } : p
      )
    }));
  };

  const deletePart = (partId) => {
    setTest(prev => ({
      ...prev,
      parts: prev.parts.filter(p => p.id !== partId)
    }));
  };

  const addQuestion = (partId) => {
    setTest(prev => ({
      ...prev,
      parts: prev.parts.map(p => 
        p.id === partId 
          ? { 
              ...p, 
              questions: [...p.questions, {
                id: Date.now(),
                number: p.questions.length + 1,
                text: '',
                answer: ''
              }]
            }
          : p
      )
    }));
  };

  const updateQuestion = (partId, questionId, field, value) => {
    setTest(prev => ({
      ...prev,
      parts: prev.parts.map(p => 
        p.id === partId 
          ? {
              ...p,
              questions: p.questions.map(q =>
                q.id === questionId ? { ...q, [field]: value } : q
              )
            }
          : p
      )
    }));
  };

  const deleteQuestion = (partId, questionId) => {
    setTest(prev => ({
      ...prev,
      parts: prev.parts.map(p => 
        p.id === partId 
          ? { ...p, questions: p.questions.filter(q => q.id !== questionId) }
          : p
      )
    }));
  };

  const handleSave = () => {
    console.log('Saving test:', test);
    alert('Đã lưu đề thi (xem console)');
  };

  return (
    <div className="test-builder-v2">
      <header className="builder-header">
        <h1>Tạo đề thi mới (V2 - Quill Editor)</h1>
        <div className="header-actions">
          <button className="btn-preview">
            <Eye size={16} /> Xem trước
          </button>
          <button className="btn-save" onClick={handleSave}>
            <Save size={16} /> Lưu
          </button>
        </div>
      </header>

      <div className="builder-content">
        <div className="test-info">
          <input
            type="text"
            className="test-title"
            placeholder="Tiêu đề đề thi..."
            value={test.title}
            onChange={(e) => setTest(prev => ({ ...prev, title: e.target.value }))}
          />
          
          <select
            className="test-skill"
            value={test.skill}
            onChange={(e) => setTest(prev => ({ ...prev, skill: e.target.value }))}
          >
            <option value="LISTENING">Listening</option>
            <option value="READING">Reading</option>
            <option value="WRITING">Writing</option>
            <option value="SPEAKING">Speaking</option>
          </select>
        </div>

        <div className="parts-container">
          {test.parts.map((part) => (
            <div key={part.id} className="part-card">
              <div className="part-header">
                <input
                  type="text"
                  className="part-title"
                  value={part.title}
                  onChange={(e) => updatePart(part.id, 'title', e.target.value)}
                />
                <button 
                  className="btn-delete"
                  onClick={() => deletePart(part.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="part-passage">
                <label>Đoạn văn / Passage:</label>
                <QuillEditor
                  value={part.passage}
                  onChange={(value) => updatePart(part.id, 'passage', value)}
                  placeholder="Nhập đoạn văn..."
                  height={200}
                />
              </div>

              <div className="questions-section">
                <div className="questions-header">
                  <h3>Câu hỏi</h3>
                  <button 
                    className="btn-add-question"
                    onClick={() => addQuestion(part.id)}
                  >
                    <Plus size={16} /> Thêm câu hỏi
                  </button>
                </div>

                {part.questions.map((q) => (
                  <div key={q.id} className="question-item">
                    <div className="question-header">
                      <span className="question-number">Câu {q.number}</span>
                      <button
                        className="btn-delete-small"
                        onClick={() => deleteQuestion(part.id, q.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="question-content">
                      <QuillEditor
                        value={q.text}
                        onChange={(value) => updateQuestion(part.id, q.id, 'text', value)}
                        placeholder="Nội dung câu hỏi..."
                        height={100}
                      />
                    </div>

                    <div className="question-answer">
                      <label>Đáp án:</label>
                      <input
                        type="text"
                        value={q.answer}
                        onChange={(e) => updateQuestion(part.id, q.id, 'answer', e.target.value)}
                        placeholder="Nhập đáp án..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button className="btn-add-part" onClick={addPart}>
            <Plus size={20} /> Thêm Part
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestBuilderV2;
