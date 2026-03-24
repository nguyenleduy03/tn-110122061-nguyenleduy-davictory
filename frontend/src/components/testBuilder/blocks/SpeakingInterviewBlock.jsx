import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown, ClipboardList } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const SpeakingInterviewBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const questions = group.questions ?? [];
  const interviewType = group.interviewType ?? 'PART1';

  const addQuestion = (e) => {
    e.stopPropagation();
    onUpdate(group.id, {
      questions: [...questions, {
        id: `spkq-${Date.now()}`,
        questionText: '',
        questionType: { typeName: 'SPEAKING_INTERVIEW' },
        options: [], answers: [], points: 1,
      }],
    });
  };

  const updateQ = (qId, text) =>
    onUpdate(group.id, { questions: questions.map((q) => (q.id === qId ? { ...q, questionText: text } : q)) });

  const deleteQ = (qId, e) => {
    e.stopPropagation();
    onUpdate(group.id, { questions: questions.filter((q) => q.id !== qId) });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Part type toggle */}
      <div className="exam-spk-type-row" onClick={(e) => e.stopPropagation()}>
        {[['PART1', 'Part 1 · Interview'], ['PART3', 'Part 3 · Discussion']].map(([v, lbl]) => (
          <button key={v} type="button"
            className={`exam-spk-type-btn${interviewType === v ? ' active' : ''}`}
            onClick={() => onUpdate(group.id, { interviewType: v })}>{lbl}</button>
        ))}
      </div>

      {/* Instructions */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> Hướng dẫn (tuỳ chọn)
        </label>
        <RichInput
          value={group.partInstruction ?? ''}
          placeholder={interviewType === 'PART1'
            ? 'VD: In this part, the examiner asks you about yourself and familiar topics...'
            : 'VD: In this part, the examiner asks further questions related to the topic in Part 2...'}
          onChange={(html) => onUpdate(group.id, { partInstruction: html })}
        />
      </div>

      {/* Question list */}
      <div className="exam-spk-qlist" onClick={(e) => e.stopPropagation()}>
        {questions.map((q, i) => (
          <div key={q.id} className="exam-spk-qrow">
            <span className="exam-spk-qnum">Q{i + 1}</span>
            <RichInput
              value={q.questionText || q.text || ''}
              placeholder="Nhập câu hỏi của giám khảo..."
              onChange={(html) => updateQ(q.id, html)}
              className="exam-spk-rich-q"
            />
            <button className="exam-spk-qdel" title="Xóa câu hỏi"
              onClick={(e) => deleteQ(q.id, e)}><X size={12} /></button>
          </div>
        ))}
        <button className="exam-spk-qadd" onClick={addQuestion}>
          <Plus size={12} /> Thêm câu hỏi
        </button>
      </div>
    </div>
  );
};

// ---- Speaking Cue Card Block ----

export default SpeakingInterviewBlock;
