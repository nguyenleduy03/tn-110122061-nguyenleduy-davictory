import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const ShortAnswerBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`}
    onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    
    {/* Instructions field */}
    <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
        Hướng dẫn:
      </label>
      <input
        type="text"
        style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
        value={group.instructions || ''}
        placeholder="Answer the questions. Write NO MORE THAN THREE WORDS for each answer."
        onChange={(e) => onUpdate(group.id, { instructions: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
    
    <div contentEditable suppressContentEditableWarning className="exam-mc-context"
      data-placeholder="Tiêu đề / ngữ cảnh (nếu có)..."
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
      dangerouslySetInnerHTML={{ __html: group.title || '' }}
    />
    <div className="exam-q-range-header">
      Câu&nbsp;
      <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1"
        onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
      &nbsp;–&nbsp;
      <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="4"
        onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
    </div>
    {(group.questions ?? []).map((q) => (
      <div key={q.id}
        className={`exam-sc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
        <div className="exam-q-num" style={{ background: '#166534', flexShrink: 0 }}>{q.questionNumber ?? '?'}</div>
        <div className="exam-sc-body">
          <RichInput
            value={q.questionText || ''}
            placeholder="VD: What is the name of the street?"
            onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Đáp án:</span>
            <RichInput
              style={{ flex: 1 }}
              value={q.answerText || ''}
              placeholder="nhập đáp án mẫu..."
              onChange={(html) => onUpdateQuestion(group.id, q.id, { answerText: html })} />
          </div>
        </div>
        <button className="exam-group-tool-btn danger"
          onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
          <X size={11} />
        </button>
      </div>
    ))}
    <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
      <Plus size={12} /> Thêm câu hỏi
    </button>
  </div>
);


export default ShortAnswerBlock;
