import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const TFNGBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
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
          placeholder="Choose TRUE if the statement agrees with the information, FALSE if it contradicts, or NOT GIVEN if there is no information."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>
      
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Tiêu đề / ngữ cảnh chung (nếu có)..."
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onInput={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        onBlur={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />
      <div className="exam-q-range-header">
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1"
          onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="7"
          onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
      </div>
      {questions.map((q) => (
        <div key={q.id}
          className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
          <div className="exam-mc-q-header">
            <div className="exam-q-num" style={{ background: '#1d4ed8' }}>{q.questionNumber ?? '?'}</div>
            <RichInput
              style={{ flex: 1 }}
              value={q.questionText || ''}
              placeholder="Nội dung phát biểu..."
              onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
            <button className="exam-group-tool-btn danger"
              onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
              <X size={11} />
            </button>
          </div>
          {/* TRUE / FALSE / NOT GIVEN radio buttons */}
          <div className="exam-tfng-options">
            {['TRUE', 'FALSE', 'NOT GIVEN'].map((v) => (
              <label key={v} className={`exam-tfng-opt${q.answerText === v ? ' correct' : ''}`}
                onClick={(e) => e.stopPropagation()}>
                <input type="radio"
                  checked={q.answerText === v}
                  onChange={() => onUpdateQuestion(group.id, q.id, { answerText: v })}
                  onClick={(e) => e.stopPropagation()} />
                {v}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};

// ---- Sentence Completion Block ----

export default TFNGBlock;
