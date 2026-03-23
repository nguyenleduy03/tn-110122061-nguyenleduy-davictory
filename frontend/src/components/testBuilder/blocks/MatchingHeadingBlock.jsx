import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown, ClipboardList } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const MatchingHeadingBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId,
  passageParagraphs }) => {
  const headings = group.headingBank ?? [];
  const questions = group.questions ?? [];

  // If passageParagraphs are available, derive sections from them (synced).
  // Each paragraph becomes one section row. We match existing answers by paragraph label.
  const hasSyncedPassage = passageParagraphs && passageParagraphs.length > 0;

  // Khi thêm đoạn mới: tự động pad heading bank cho đủ — nhưng không trim khi xóa đoạn
  // (heading có thể nhiều hơn số đoạn — làm "mồi" cho thí sinh)
  const targetCount = hasSyncedPassage ? passageParagraphs.length : 0;
  useEffect(() => {
    if (!hasSyncedPassage) return;
    const diff = targetCount - headings.length;
    if (diff <= 0) return; // không trim, chỉ pad thêm
    const extra = Array.from({ length: diff }, (_, k) => ({
      id: `h-auto-${Date.now()}-${k}`,
      text: '',
    }));
    onUpdate(group.id, { headingBank: [...headings, ...extra] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageParagraphs?.length]);

  // Build a map: paraLabel → existing question (so we can preserve answers already set)
  const answerByLabel = {};
  questions.forEach((q) => {
    // questionText stores "Section A" or just the label — extract last word/char
    const label = (q.questionText || '').replace(/^Section\s*/i, '').trim();
    if (label) answerByLabel[label] = q;
  });

  // Synced sections derived from passage paragraphs
  const syncedSections = hasSyncedPassage
    ? passageParagraphs.map((para, idx) => {
        const label = para.label || String.fromCharCode(65 + idx);
        const existing = answerByLabel[label];
        return {
          id: para.id,          // use passage para id as stable key
          paraLabel: label,
          questionText: `Section ${label}`,
          questionNumber: (group.fromQuestion ?? 1) + idx,
          answerText: existing?.answerText ?? '',
          qid: existing?.id ?? null,
        };
      })
    : null;

  // Handler: update answer for a synced section row
  const updateSyncedAnswer = (section, newAnswerText) => {
    if (section.qid) {
      // Update existing question record
      onUpdateQuestion(group.id, section.qid, { answerText: newAnswerText, questionText: section.questionText });
    } else {
      // Create a new question record for this section
      const newQ = {
        id: `${group.id}-q-${section.id}`,
        questionText: section.questionText,
        questionNumber: section.questionNumber,
        answerText: newAnswerText,
      };
      onUpdate(group.id, { questions: [...questions, newQ] });
    }
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
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
          placeholder="The reading passage has several paragraphs. Choose the correct heading for each paragraph from the list of headings below."
          onChange={(e) => onUpdate(group.id, { instructions: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* ── PHẦN 1: List of Headings ── */}
      <div className="exam-mh-section" onClick={(e) => e.stopPropagation()}>
        <div className="exam-mh-section-title">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} /> List of Headings</span>
          <span className="exam-mh-hint">
            ({headings.length} heading
            {hasSyncedPassage ? ` — ${passageParagraphs.length} đoạn, có thể thêm heading mồi` : ''})
          </span>
        </div>
        {headings.map((h, i) => (
          <div key={h.id} className="exam-mh-heading-row">
            <span className="exam-heading-roman">{toRoman(i + 1)}</span>
            <RichInput
              style={{ flex: 1 }}
              value={h.text || ''}
              placeholder="VD: How a concept from one field was applied in another"
              onChange={(html) => {
                const updated = headings.map((x) =>
                  x.id === h.id ? { ...x, text: html } : x
                );
                onUpdate(group.id, { headingBank: updated });
              }}
            />
            <button className="exam-q-del-btn"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(group.id, { headingBank: headings.filter((x) => x.id !== h.id) });
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="exam-add-btn" style={{ marginTop: 6 }}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(group.id, { headingBank: [...headings, { id: `h-${Date.now()}`, text: '' }] });
          }}>
          <Plus size={11} /> Thêm heading
        </button>
      </div>

      {/* ── PHẦN 2: Sections — synced from passage OR manual ── */}
      <div className="exam-mh-section" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
        <div className="exam-mh-section-title">
          <span>❓ Sections — chọn đáp án đúng</span>
          {hasSyncedPassage && (
            <span className="exam-mh-hint" style={{ color: '#16a34a' }}>
              ✓ Đồng bộ từ {passageParagraphs.length} đoạn passage
            </span>
          )}
        </div>

        {/* Phạm vi câu */}
        <div className="exam-q-range-header" style={{ marginBottom: 8 }}>
          Câu&nbsp;
          <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="14"
            onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} />
          &nbsp;–&nbsp;
          <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="17"
            onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} />
        </div>

        {/* ── SYNCED MODE: derived from passage paragraphs ── */}
        {hasSyncedPassage ? (
          <>
            {syncedSections.map((section) => {
              const ansIdx = headings.findIndex((h) => h.text === section.answerText);
              return (
                <div
                  key={section.id}
                  className="exam-mh-section-row"
                >
                  {/* Số câu */}
                  <div className="exam-q-num" style={{ flexShrink: 0 }}>{section.questionNumber}</div>

                  {/* Tên section — derived, read-only badge */}
                  <span className="exam-mh-section-label">
                    Section <strong>{section.paraLabel}</strong>
                  </span>

                  {/* Dropdown chọn heading đáp án đúng */}
                  <select
                    className="exam-mh-answer-select"
                    value={section.answerText}
                    onChange={(e) => updateSyncedAnswer(section, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">— Đáp án —</option>
                    {headings.map((h, i) => (
                      <option key={i} value={h.text}>
                        {toRoman(i + 1)}. {h.text}
                      </option>
                    ))}
                  </select>

                  {/* Badge đáp án đã chọn */}
                  {section.answerText && (
                    <span className="exam-mh-answer-badge-inline" title={section.answerText}>
                      {ansIdx >= 0 ? toRoman(ansIdx + 1) : '✓'}
                    </span>
                  )}
                </div>
              );
            })}
            {passageParagraphs.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 12, padding: '6px 0' }}>
                (Passage chưa có đoạn nào)
              </div>
            )}
          </>
        ) : (
          /* ── MANUAL MODE: no passage found ── */
          <>
            {questions.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 12, padding: '6px 0', fontStyle: 'italic' }}>
                💡 Thêm Reading Passage vào bên trái để tự đồng bộ sections, hoặc thêm thủ công bên dưới.
              </div>
            )}
            {questions.map((q) => {
              const ansIdx = headings.findIndex((h) => h.text === q.answerText);
              return (
                <div
                  key={q.id}
                  className={`exam-mh-section-row${selectedQuestionId === q.id ? ' selected' : ''}`}
                  onClick={() => onSelectQuestion(q)}
                >
                  <div className="exam-q-num" style={{ flexShrink: 0 }}>{q.questionNumber ?? '?'}</div>
                  <RichInput
                    style={{ flex: 1, minWidth: 80 }}
                    value={q.questionText || ''}
                    placeholder="Section A"
                    onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
                  <select
                    className="exam-mh-answer-select"
                    value={q.answerText || ''}
                    onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">— Đáp án —</option>
                    {headings.map((h, i) => (
                      <option key={i} value={h.text}>
                        {toRoman(i + 1)}. {h.text}
                      </option>
                    ))}
                  </select>
                  {q.answerText && (
                    <span className="exam-mh-answer-badge-inline" title={q.answerText}>
                      {ansIdx >= 0 ? toRoman(ansIdx + 1) : '✓'}
                    </span>
                  )}
                  <button className="exam-group-tool-btn danger"
                    onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                    <X size={11} />
                  </button>
                </div>
              );
            })}
            <button className="exam-add-btn" style={{ marginTop: 6 }}
              onClick={() => onAddQuestion(group)}>
              <Plus size={12} /> Thêm section
            </button>
          </>
        )}
      </div>
    </div>
  );
};


export default MatchingHeadingBlock;
