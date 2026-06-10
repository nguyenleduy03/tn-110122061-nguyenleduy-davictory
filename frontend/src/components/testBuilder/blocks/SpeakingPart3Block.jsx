import React from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';

const SpeakingPart3Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const questions = group.questions ?? [''];

  const [showImport, setShowImport] = React.useState(false);
  const importRef = React.useRef(null);

  const addQuestion = (e) => {
    e.stopPropagation();
    onUpdate(group.id, { questions: [...questions, ''] });
  };

  const handleImport = () => {
    const text = importRef.current?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      setShowImport(false);
      return;
    }

    onUpdate(group.id, {
      questions: [...questions.filter(q => q.trim()), ...lines],
    });
    setShowImport(false);
  };

  const updateQuestion = (i, val) => {
    const next = [...questions];
    next[i] = val;
    onUpdate(group.id, { questions: next });
  };

  const deleteQuestion = (i, e) => {
    e.stopPropagation();
    if (questions.length > 1) {
      onUpdate(group.id, { questions: questions.filter((_, idx) => idx !== i) });
    }
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={14} /> Part 3 - Two-way Discussion
        </label>
        <RichInput
          value={group.partInstruction ?? ''}
          placeholder="The examiner asks further questions connected to the topic in Part 2..."
          onChange={(html) => onUpdate(group.id, { partInstruction: html })}
        />
      </div>

      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label">Discussion Theme (optional)</label>
        <RichInput
          value={group.theme ?? ''}
          placeholder="e.g., The role of technology in education / Cultural traditions in modern society"
          onChange={(html) => onUpdate(group.id, { theme: html })}
        />
      </div>

      <div className="exam-spk-qlist" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ marginBottom: 8 }}>Discussion Questions</label>
        {questions.map((q, i) => (
          <div key={i} className="exam-spk-qrow">
            <span className="exam-spk-qnum">Q{i + 1}</span>
            <RichInput
              value={q}
              placeholder="How has technology changed the way people learn? / Why do you think...?"
              onChange={(html) => updateQuestion(i, html)}
              className="exam-spk-rich-q"
            />
            {questions.length > 1 && (
              <button className="exam-spk-qdel" onClick={(e) => deleteQuestion(i, e)}>
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="exam-spk-qadd" style={{ flex: 1 }} onClick={addQuestion}>
            <Plus size={12} /> Add question
          </button>
          <button className="exam-spk-qadd" onClick={() => setShowImport(true)} title="Import questions">
            📋 Import
          </button>
        </div>
      </div>

      <div className="exam-wt-meta-row" style={{ marginTop: 12 }}>
        <div className="exam-wt-meta-field">
          <label className="exam-wt-label">Expected duration (minutes)</label>
          <input type="number" className="exam-q-range-input" style={{ width: 72 }}
            value={group.durationMinutes ?? 5} min={3} max={7}
            onChange={(e) => onUpdate(group.id, { durationMinutes: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()} />
        </div>
      </div>

      {showImport && (
        <div className="exam-import-modal" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000, width: '400px', border: '1px solid #e5e7eb'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Import Discussion Questions</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Mỗi dòng là một câu hỏi</p>
          <textarea
            ref={importRef}
            rows={10}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}
            placeholder="VD:&#10;How has technology changed the way people learn?&#10;What are the disadvantages of using AI in schools?"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleImport} style={{
              flex: 1, padding: '8px 16px', backgroundColor: '#6d28d9', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Import</button>
            <button onClick={() => setShowImport(false)} style={{
              padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#4b5563',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingPart3Block;
