import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';
import { stripInlineStyles } from '../../../utils/textFormatters';

const DragMatchingBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const options = group.optionBank ?? [];
  
  // Clean options on mount if they have HTML comments
  useEffect(() => {
    const needsCleaning = options.some(o => o.text && o.text.includes('<!--'));
    if (needsCleaning) {
      const cleaned = options.map(o => ({
        ...o,
        text: o.text ? stripInlineStyles(o.text) : ''
      }));
      onUpdate(group.id, { optionBank: cleaned });
    }
  }, []);
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
          placeholder="Match each statement with the correct person, A, B or C."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      {/* Two-column layout */}
      <div className="exam-dm-layout">
        {/* Left column: items */}
        <div className="exam-dm-left">
          <div className="exam-dm-col-header">
            <RichInput
              style={{ width: '100%' }}
              value={group.leftTitle ?? ''}
              placeholder="Cột trái (VD: People)"
              onChange={(html) => onUpdate(group.id, { leftTitle: html })}
            />
          </div>
          <div className="exam-q-range-header" style={{ marginTop: 6, marginBottom: 8 }}>
            Questions {group.fromQuestion ?? questions[0]?.questionNumber ?? '?'}
            {(() => {
              const last = group.toQuestion ?? questions[questions.length - 1]?.questionNumber;
              const first = group.fromQuestion ?? questions[0]?.questionNumber;
              return (last && last !== first) ? `–${last}` : '';
            })()}
          </div>
          {questions.map((q) => (
            <div key={q.id}
              className={`exam-dm-row${selectedQuestionId === q.id ? ' selected' : ''}`}
              onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
              <RichInput
                style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Tên mục (VD: Mary Brown)"
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })}
              />
              <div className="exam-dm-gap">
                <span className="exam-dm-q-num">{q.questionNumber ?? '?'}</span>
              </div>
              <select className="exam-heading-select"
                value={q.answerText || ''}
                onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
                onClick={(e) => e.stopPropagation()}>
                <option value="">— Đáp án —</option>
                {options.map((o, i) => <option key={i} value={o.text}>{o.text}</option>)}
              </select>
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>
          ))}
          <button className="exam-add-btn" style={{ marginTop: 6 }}
            onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
            <Plus size={12} /> Thêm mục
          </button>
        </div>

        {/* Right column: word bank */}
        <div className="exam-dm-right">
          <div className="exam-dm-col-header">
            <RichInput
              style={{ width: '100%' }}
              value={group.rightTitle ?? ''}
              placeholder="Cột phải (VD: Staff Responsibilities)"
              onChange={(html) => onUpdate(group.id, { rightTitle: html })}
            />
          </div>
          <div className="exam-dm-bank">
            {options.map((o, i) => (
              <div key={i} className="exam-dm-option">
                <RichInput style={{ flex: 1 }}
                  value={o.text || ''}
                  placeholder={`Lựa chọn ${i + 1}...`}
                  onChange={(html) => {
                    const n = [...options];
                    n[i] = { ...n[i], text: html };
                    onUpdate(group.id, { optionBank: n });
                  }}
                />
                <button className="exam-q-del-btn"
                  onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { optionBank: options.filter((_, j) => j !== i) }); }}>
                  ×
                </button>
              </div>
            ))}
            <button className="exam-add-btn" style={{ marginTop: 6 }}
              onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { optionBank: [...options, { id: Date.now(), text: '' }] }); }}>
              <Plus size={11} /> Thêm lựa chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_MATCHING_FEATURE_CATEGORIES = ['A', 'B', 'C', 'D', 'E'];

const parseMatchingFeaturesMeta = (passageText) => {
  try {
    const parsed = passageText ? JSON.parse(passageText) : {};
    const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : DEFAULT_MATCHING_FEATURE_CATEGORIES.map((label) => ({ label, text: '' }));

    return {
      categoryTitle: parsed.categoryTitle || '',
      categories: categories.map((cat, index) => ({
        label: String(cat?.label || DEFAULT_MATCHING_FEATURE_CATEGORIES[index] || String.fromCharCode(65 + index)),
        text: String(cat?.text || ''),
      })),
    };
  } catch {
    return {
      categoryTitle: '',
      categories: DEFAULT_MATCHING_FEATURE_CATEGORIES.map((label) => ({ label, text: '' })),
    };
  }
};

export default DragMatchingBlock;
