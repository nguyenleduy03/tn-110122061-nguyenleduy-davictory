import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

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

const MatchingFeaturesBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  const meta = parseMatchingFeaturesMeta(group.passageText);
  const categories = meta.categories.length > 0 ? meta.categories : DEFAULT_MATCHING_FEATURE_CATEGORIES.map((label) => ({ label, text: '' }));

  const updateMeta = (nextMeta) => {
    onUpdate(group.id, { passageText: JSON.stringify(nextMeta) });
  };

  const updateCategory = (index, nextText) => {
    const nextCategories = categories.map((cat, catIndex) => (
      catIndex === index ? { ...cat, text: nextText } : cat
    ));
    updateMeta({ categoryTitle: meta.categoryTitle, categories: nextCategories });
  };

  const addCategory = () => {
    const nextLabel = String.fromCharCode(65 + categories.length);
    updateMeta({
      categoryTitle: meta.categoryTitle,
      categories: [...categories, { label: nextLabel, text: '' }],
    });
  };

  const removeCategory = (index) => {
    const nextCategories = categories.filter((_, catIndex) => catIndex !== index);
    updateMeta({ categoryTitle: meta.categoryTitle, categories: nextCategories });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-q-range-header" onClick={(e) => e.stopPropagation()}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''}
          placeholder="1"
          onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''}
          placeholder="4"
          onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
      </div>

      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          value={group.instructions || ''}
          placeholder="Choose the correct group (A–E) for each item. You may choose any group more than once."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      <div className="pv-mf-categories-box" style={{ marginBottom: 12, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="pv-mf-category-title" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <RichInput
            style={{ flex: 1 }}
            value={meta.categoryTitle || ''}
            placeholder="First invented or used by"
            onChange={(html) => updateMeta({ categoryTitle: html, categories })}
          />
          <button className="exam-add-btn" style={{ margin: 0, padding: '4px 10px' }} onClick={(e) => { e.stopPropagation(); addCategory(); }}>
            <Plus size={11} /> Thêm cột
          </button>
        </div>
        <div className="pv-mf-category-list">
          {categories.map((cat, index) => (
            <div key={`${cat.label}-${index}`} className="pv-mf-category-row" style={{ display: 'table-row' }}>
              <span className="pv-mf-cat-label" style={{ display: 'table-cell' }}>{cat.label}</span>
              <span className="pv-mf-cat-text" style={{ display: 'table-cell', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RichInput
                    style={{ flex: 1 }}
                    value={cat.text || ''}
                    placeholder={`Mô tả ${cat.label}`}
                    onChange={(html) => updateCategory(index, html)}
                  />
                  <button className="exam-q-del-btn" onClick={(e) => { e.stopPropagation(); removeCategory(index); }}>×</button>
                </div>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pv-mf-table-wrap" style={{ marginBottom: 10 }} onClick={(e) => e.stopPropagation()}>
        <table className="pv-mf-table">
          <thead>
            <tr className="pv-mf-header-row">
              <th className="pv-mf-th-item"></th>
              {categories.map((cat) => (
                <th key={cat.label} className="pv-mf-th-cat">{cat.label}</th>
              ))}
              <th className="pv-mf-th-cat" style={{ width: 72 }}>Xoá</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const selectedLabel = q.answerText || '';
              return (
                <tr key={q.id} className={`pv-mf-question-row${selectedQuestionId === q.id ? ' pv-mf-row-active' : ''}`} onClick={() => onSelectQuestion(q)}>
                  <td className="pv-mf-td-item">
                    <div className="pv-mf-item-inner">
                      <span className="pv-q-num-badge">{q.questionNumber ?? '?'}</span>
                      <RichInput
                        style={{ flex: 1 }}
                        value={q.questionText || ''}
                        placeholder="Nội dung câu hỏi..."
                        onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })}
                      />
                    </div>
                  </td>
                  {categories.map((cat) => (
                    <td
                      key={cat.label}
                      className={`pv-mf-choice-cell${selectedLabel === cat.label ? ' pv-mf-selected' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { answerText: selectedLabel === cat.label ? '' : cat.label }); }}
                      title={`Chọn ${cat.label}`}
                    >
                      {selectedLabel === cat.label && <span className="pv-mf-check">✓</span>}
                    </td>
                  ))}
                  <td className="pv-mf-choice-cell" style={{ background: '#fff' }}>
                    <button className="exam-q-del-btn" onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};

// ---- Matching Heading Block ----
// Giao diện tạo đề tối giản:
//   • Phần trên: nhập "List of Headings" (i, ii, iii, ...) — danh sách heading có thể nhiều hơn số câu (headings dư để đánh lừa)
//   • Phần dưới: từng section (đoạn A/B/C) — nhập tên section + chọn đáp án đúng từ dropdown

export default MatchingFeaturesBlock;
