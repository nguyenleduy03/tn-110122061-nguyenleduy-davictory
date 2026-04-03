import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const ShortAnswerBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  
  const addAnswer = (qId) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = q.answers || [q.answerText || ''];
    onUpdateQuestion(group.id, qId, { answers: [...answers, ''] });
  };

  const updateAnswer = (qId, answerIndex, value) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = [...(q.answers || [q.answerText || ''])];
    answers[answerIndex] = value;
    onUpdateQuestion(group.id, qId, { answers });
  };

  const deleteAnswer = (qId, answerIndex) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = [...(q.answers || [q.answerText || ''])];
    if (answers.length <= 1) return;
    answers.splice(answerIndex, 1);
    onUpdateQuestion(group.id, qId, { answers });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Answer the questions. Write NO MORE THAN THREE WORDS for each answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>
      
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Tiêu đề / ngữ cảnh (nếu có)..."
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
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="4"
          onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
      </div>
      {(group.questions ?? []).map((q) => {
        const answers = q.answers || [q.answerText || ''];
        return (
          <div key={q.id}
            className={`exam-sc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-q-num" style={{ background: '#166534', flexShrink: 0 }}>
              {q.questionNumber ?? '?'}
              {answers.length > 1 && <div style={{ fontSize: 9, marginTop: 2 }}>×{answers.length}</div>}
            </div>
            <div className="exam-sc-body">
              <RichInput
                value={q.questionText || ''}
                placeholder="VD: What is the name of the street?"
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  Đáp án (thứ tự không quan trọng):
                </div>
                {answers.map((ans, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 16 }}>{idx + 1}.</span>
                    <RichInput
                      style={{ flex: 1 }}
                      value={ans}
                      placeholder="nhập đáp án..."
                      onChange={(html) => updateAnswer(q.id, idx, html)} />
                    {answers.length > 1 && (
                      <button 
                        style={{ padding: '2px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}
                        onClick={(e) => { e.stopPropagation(); deleteAnswer(q.id, idx); }}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  className="exam-add-btn" 
                  style={{ fontSize: 11, padding: '3px 8px', marginTop: 4 }}
                  onClick={(e) => { e.stopPropagation(); addAnswer(q.id); }}>
                  <Plus size={10} /> Thêm đáp án
                </button>
              </div>
            </div>
            <button className="exam-group-tool-btn danger"
              onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
              <X size={11} />
            </button>
          </div>
        );
      })}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};


export default ShortAnswerBlock;
