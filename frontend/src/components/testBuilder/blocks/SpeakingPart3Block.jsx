import React from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';

const SpeakingPart3Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const questions = group.questions ?? [''];

  const addQuestion = (e) => {
    e.stopPropagation();
    onUpdate(group.id, { questions: [...questions, ''] });
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
        <button className="exam-spk-qadd" onClick={addQuestion}>
          <Plus size={12} /> Add question
        </button>
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
    </div>
  );
};

export default SpeakingPart3Block;
