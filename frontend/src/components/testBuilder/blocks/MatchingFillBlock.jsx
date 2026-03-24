import React from 'react';
import { X, Plus } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';

const MatchingFillBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Complete each statement with the correct answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      {/* Question range */}
      <div className="exam-q-range-header" style={{ marginBottom: 8 }}>
        Questions {group.fromQuestion ?? questions[0]?.questionNumber ?? '?'}
        {(() => {
          const last = group.toQuestion ?? questions[questions.length - 1]?.questionNumber;
          const first = group.fromQuestion ?? questions[0]?.questionNumber;
          return (last && last !== first) ? `–${last}` : '';
        })()}
      </div>

      {/* Questions with inline blanks */}
      {questions.map((q) => (
        <div key={q.id}
          className={`exam-question${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}
          style={{ marginBottom: 12, padding: 10, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <span className="exam-q-num" style={{ minWidth: 30, fontWeight: 600 }}>{q.questionNumber ?? '?'}</span>
            <div style={{ flex: 1 }}>
              <RichBlankEditor
                value={q.questionText || ''}
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })}
                placeholder="Nhập câu hỏi và dùng [blank] để tạo ô trống. VD: The first step is [blank]."
              />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                💡 Dùng <code>[blank]</code> để tạo ô trống trong câu
              </div>
            </div>
            <button className="exam-group-tool-btn danger"
              onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
              <X size={11} />
            </button>
          </div>
          <div style={{ paddingLeft: 38 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
              Đáp án (mỗi dòng = 1 đáp án chấp nhận):
            </label>
            <textarea
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, minHeight: 60, fontFamily: 'inherit' }}
              value={q.answerText || ''}
              placeholder="VD:&#10;answer 1&#10;answer 2&#10;answer 3"
              onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      ))}
      <button className="exam-add-btn" style={{ marginTop: 6 }}
        onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};

export default MatchingFillBlock;
