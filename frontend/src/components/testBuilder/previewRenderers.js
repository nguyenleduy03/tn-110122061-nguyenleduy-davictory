/**
 * previewRenderers.js
 * Shared rendering logic for exam preview (used by both PreviewModal and ExamCanvas PreviewContent)
 * 
 * Exports all group/question renderers and helper functions.
 */
import React, { useState, useMemo } from 'react';
import { Volume2, Headphones, BookOpen, PenLine, Mic, Clock, FileText, X } from 'lucide-react';
import { normalizeRichHtml, preserveBlockLineBreaks, stripInlineStyles } from '../../utils/textFormatters';
import { getLockedImageQuestionLayout, getLockedImageFrameStyle, getLockedImageStyle } from '../../utils/imageQuestionLayout';
import ImageNotePinBox from '../common/ImageNotePinBox';
import DropdownGroupQuestion from '../question/DropdownGroupQuestion';
import { IMAGE_NOTE_SECTIONS, isImagePinQuestion } from '../../utils/imageNoteForm';

// ─── Constants ───────────────────────────────────────────────────────────

export const SERIES_LOGO_SRC = {
  IELTS: '/IELTS%20Logo.png',
  Cambridge: '/Cambridge%20Logo.png',
};

export const SESSION_META = {
  LISTENING: { label: 'Listening', Icon: Headphones, color: '#1d4ed8', bg: '#dbeafe', durationMinutes: 30 },
  READING: { label: 'Reading', Icon: BookOpen, color: '#15803d', bg: '#dcfce7', durationMinutes: 60 },
  WRITING: { label: 'Writing', Icon: PenLine, color: '#a16207', bg: '#fef9c3', durationMinutes: 60 },
  SPEAKING: { label: 'Speaking', Icon: Mic, color: '#be185d', bg: '#fce7f3', durationMinutes: 12 },
};

// ─── Helper Functions ───────────────────────────────────────────────────

export const formatPreviewText = (text) => {
  if (!text) return '';
  const normalized = normalizeRichHtml(text);
  const withPreservedBreaks = preserveBlockLineBreaks(normalized);
  return stripInlineStyles(withPreservedBreaks)
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*){3,}/gi, '<br/><br/>')
    .replace(/^(?:<br\s*\/?>(?:\s|&nbsp;)*)+/i, '')
    .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*)+$/i, '');
};

const mapDomAttributesToProps = (node, key) => {
  const props = { key };
  Array.from(node.attributes || []).forEach((attr) => {
    const attrName = String(attr.name || '').toLowerCase();
    if (!attrName || attrName === 'style' || attrName === 'contenteditable') return;
    if (attrName === 'class') {
      props.className = attr.value;
      return;
    }
    props[attr.name] = attr.value;
  });
  return props;
};

const renderPreviewTextWithTokens = (text, keyPrefix, blankState, renderToken) => {
  const tokenRegex = /\[(blank|\d+)\]/gi;
  const rawText = String(text || '');
  const rendered = [];
  let cursor = 0;
  let match;

  while ((match = tokenRegex.exec(rawText)) !== null) {
    const before = rawText.slice(cursor, match.index);
    if (before) rendered.push(before);
    rendered.push(renderToken(match[1], `${keyPrefix}-token-${cursor}`, blankState));
    cursor = tokenRegex.lastIndex;
  }

  const after = rawText.slice(cursor);
  if (after) rendered.push(after);

  return rendered.length ? rendered : rawText;
};

const renderPreviewDomNodeWithTokens = (node, keyPrefix, blankState, renderToken) => {
  if (!node) return null;

  if (node.nodeType === 3) {
    return renderPreviewTextWithTokens(node.textContent || '', keyPrefix, blankState, renderToken);
  }

  if (node.nodeType !== 1) return null;

  const tagName = String(node.tagName || '').toLowerCase();
  if (!tagName || tagName === 'script' || tagName === 'style') return null;

  const children = Array.from(node.childNodes || []).flatMap((child, idx) => {
    const childNode = renderPreviewDomNodeWithTokens(child, `${keyPrefix}-${idx}`, blankState, renderToken);
    if (Array.isArray(childNode)) {
      return childNode.filter((entry) => entry !== null && entry !== undefined);
    }
    return childNode === null || childNode === undefined ? [] : [childNode];
  });

  const props = mapDomAttributesToProps(node, keyPrefix);
  return React.createElement(tagName, props, children.length ? children : undefined);
};

const renderCompletionPreviewHtml = (value, renderToken, blankState = { cursor: 0 }) => {
  const normalized = formatPreviewText(value || '');
  if (!normalized) return null;

  if (typeof DOMParser === 'undefined') {
    return <span dangerouslySetInnerHTML={{ __html: normalized }} />;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${normalized}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return null;

    return Array.from(root.childNodes || []).flatMap((node, idx) => {
      const renderedNode = renderPreviewDomNodeWithTokens(node, `completion-node-${idx}`, blankState, renderToken);
      if (Array.isArray(renderedNode)) {
        return renderedNode.filter((entry) => entry !== null && entry !== undefined);
      }
      return renderedNode === null || renderedNode === undefined ? [] : [renderedNode];
    });
  } catch {
    return <span dangerouslySetInnerHTML={{ __html: normalized }} />;
  }
};

export const toRoman = (n) => {
  const nums = [1, 4, 5, 9, 10, 40, 50];
  const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
  let r = '';
  for (let i = syms.length - 1; i >= 0; i--) {
    while (n >= nums[i]) { r += syms[i]; n -= nums[i]; }
  }
  return r;
};

export const toPlainText = (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);
  const normalized = normalizeRichHtml(value);
  if (!normalized.includes('<')) return normalized.trim();
  try {
    const el = document.createElement('div');
    el.innerHTML = normalized;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  } catch {
    return normalized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

// ─── QuestionRange Helper ──────────────────────────────────────────────

export const QuestionRange = ({ group }) => {
  const questions = group.questions ?? [];
  const allNums = questions.flatMap(q => {
    if (q?.subQuestions?.length) {
      return q.subQuestions.map(sq => sq.number).filter(n => n != null);
    }
    return q?.numberRange || (q?.questionNumber ? [q.questionNumber] : []);
  }).filter(n => n != null);

  if (allNums.length === 0) return null;

  const first = Math.min(...allNums);
  const last = Math.max(...allNums);

  return (
    <div className="pv-questions-range">
      Questions {first}{last !== first ? `–${last}` : ''}
    </div>
  );
};

// ─── Parse Helpers ────────────────────────────────────────────────────

export const parseSummaryPreview = (text, questions, activeQ, onSetActive) => {
  return renderCompletionPreviewHtml(text, (tokenValue, key, blankState) => {
    const token = String(tokenValue || '').toLowerCase();
    const numeric = Number(tokenValue);

    const q = token === 'blank' || Number.isNaN(numeric)
      ? questions[blankState.cursor++]
      : questions.find((item) => Number(item?.questionNumber) === numeric) || questions[blankState.cursor++];
    const num = q?.questionNumber ?? (Number.isFinite(numeric) ? numeric : blankState.cursor);
    const isActive = activeQ === num;

    return (
      <span
        key={key}
        className={`pv-blank-box${isActive ? ' active' : ''}`}
        onClick={() => onSetActive(num)}
      >{num}</span>
    );
  });
};

export const parseNotePreview = (text, questions, activeQ, onSetActive, answers, onAnswer, blankState = { cursor: 0 }) => {
  return renderCompletionPreviewHtml(text, (tokenValue, key, sharedBlankState) => {
    const token = String(tokenValue || '').toLowerCase();
    const numeric = Number(tokenValue);
    const questionList = Array.isArray(sharedBlankState?.questions) && sharedBlankState.questions.length > 0
      ? sharedBlankState.questions
      : questions;

    const q = token === 'blank' || Number.isNaN(numeric)
      ? questionList[sharedBlankState.cursor++]
      : questionList.find((item) => Number(item?.questionNumber ?? item?.number) === numeric) || questionList[sharedBlankState.cursor++];
    const num = q?.questionNumber ?? q?.number ?? (Number.isFinite(numeric) ? numeric : blankState.cursor);
    const isActive = activeQ === num;

    return (
      <input
        key={key}
        className={`pv-note-inline-input${isActive ? ' active' : ''}`}
        value={answers?.[num] ?? ''}
        onChange={(e) => onAnswer?.(num, e.target.value)}
        onFocus={() => onSetActive(num)}
        placeholder={String(num)}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }, blankState);
};

// ─── Question Renderers ────────────────────────────────────────────────

const TFNGQuestion = ({ q, active, onSetActive }) => (
  <div className={`pv-q${active ? ' pv-q-active' : ''}`} onClick={() => onSetActive(q.questionNumber)}>
    <div className="pv-q-row">
      <span className={`pv-q-num-badge${active ? ' active' : ''}`}>{q.questionNumber}</span>
      <span className="pv-q-text">
        {q.questionText
          ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
          : <em className="pv-empty">Chưa có nội dung câu hỏi</em>}
      </span>
    </div>
    <div className="pv-tfng-opts">
      {['True', 'False', 'Not Given'].map((label) => (
        <label key={label} className="pv-tfng-radio-label">
          <input type="radio" name={`q${q.id}`} disabled />
          <span>{label}</span>
        </label>
      ))}
    </div>
  </div>
);

const MCQQuestion = ({ q, multiple, active, onSetActive }) => {
  const opts = q.options ?? [];
  return (
    <div className={`pv-q${active ? ' pv-q-active' : ''}`} onClick={() => onSetActive(q.questionNumber)}>
      {multiple && (
        <div className="pv-choose-n-badge">
          Chọn <strong>{q.chooseCount ?? 2}</strong> đáp án đúng
        </div>
      )}
      <div className="pv-q-row">
        <span className={`pv-q-num-badge${active ? ' active' : ''}`}>{q.questionNumber}</span>
        <span className="pv-q-text">
          {q.questionText
            ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
            : <em className="pv-empty">Chưa có nội dung câu hỏi</em>}
        </span>
      </div>
      <div className="pv-opts">
        {opts.length === 0
          ? <em className="pv-empty">Chưa có lựa chọn</em>
          : opts.map((o) => (
            <label key={o.id} className="pv-opt">
              <input type={multiple ? 'checkbox' : 'radio'} name={`q${q.id}`} disabled />
              <span className="pv-opt-key">{o.optionLabel}</span>
              <span className="pv-opt-text">
                {o.optionMode === 'image' && o.optionImageUrl
                  ? <img src={o.optionImageUrl} alt={o.optionLabel} style={{ maxWidth: 140, maxHeight: 90, borderRadius: 4, display: 'block' }} />
                  : (o.optionText
                    ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(o.optionText) }} />
                    : <em className="pv-empty">...</em>)
                }
              </span>
            </label>
          ))
        }
      </div>
    </div>
  );
};

const FillQuestion = ({ q, active, onSetActive }) => (
  <div className={`pv-q${active ? ' pv-q-active' : ''}`} onClick={() => onSetActive(q.questionNumber)}>
    <div className="pv-q-row">
      <span className={`pv-q-num-badge${active ? ' active' : ''}`}>{q.questionNumber}</span>
      <div className="pv-fill-row">
        <span className="pv-q-text">
          {q.questionText
            ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
            : <em className="pv-empty">Chưa có nội dung</em>}
        </span>
        <input className="pv-inline-input" disabled placeholder={`Câu ${q.questionNumber}`} />
      </div>
    </div>
  </div>
);

const GenericQuestion = ({ q, active, onSetActive }) => (
  <div className={`pv-q${active ? ' pv-q-active' : ''}`} onClick={() => onSetActive(q.questionNumber)}>
    <div className="pv-q-row">
      <span className={`pv-q-num-badge${active ? ' active' : ''}`}>{q.questionNumber}</span>
      <span className="pv-q-text">
        {q.questionText
          ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
          : <em className="pv-empty">Chưa có nội dung câu hỏi</em>}
      </span>
    </div>
    <textarea className="pv-textarea" disabled placeholder="Nhập câu trả lời..." rows={3} />
  </div>
);

export const renderQuestion = (q, activeQ, onSetActive) => {
  const type = q.questionType?.typeName ?? q.questionType ?? 'MULTIPLE_CHOICE';
  const active = activeQ === q.questionNumber;
  const props = { key: q.id, q, active, onSetActive };
  switch (type) {
    case 'TRUE_FALSE_NG': return <TFNGQuestion {...props} />;
    case 'MULTIPLE_CHOICE': return <MCQQuestion {...props} multiple={false} />;
    case 'MULTIPLE_CHOICE_MULTIPLE': return <MCQQuestion {...props} multiple />;
    case 'FILL_IN_BLANK':
    case 'NOTE_COMPLETION':
    case 'SHORT_ANSWER': return <FillQuestion {...props} />;
    default: return <GenericQuestion {...props} />;
  }
};

// ─── Group Renderers ───────────────────────────────────────────────────

// Passage Group Pane (Reading)
export const PassageGroupPane = ({ group, mhAnswers = {}, onDropHeading, onClearHeading, hasMH = false }) => {
  const paragraphs = group.paragraphs && group.paragraphs.length > 0
    ? group.paragraphs
    : [{ id: `${group.id}-p0`, heading: '', text: group.passageText || '' }];
  const [overSlot, setOverSlot] = useState(null);

  return (
    <div style={{ marginBottom: 20 }}>
      {group.title && !group.title.toLowerCase().startsWith('nhóm') && (
        <div className="pv-passage-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />
      )}
      {paragraphs.map((para, idx) => {
        const filled = mhAnswers[para.id];
        const isOver = overSlot === para.id;
        return (
          <div key={para.id ?? idx} style={{ marginBottom: 14 }}>
            {hasMH && (
              <div
                className={`pv-para-drop-row${isOver ? ' over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOverSlot(para.id); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverSlot(null); }}
                onDrop={(e) => {
                  e.preventDefault(); setOverSlot(null);
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('text/x-mh'));
                    if (data?.text && onDropHeading) onDropHeading(para.id, data);
                  } catch { }
                }}
              >
                <span className="pv-para-num">§{idx + 1}</span>
                {filled ? (
                  <div className="pv-para-heading-badge">
                    {filled.roman && <span className="pv-heading-roman">{filled.roman}</span>}
                    <span dangerouslySetInnerHTML={{ __html: formatPreviewText(filled.text) }} />
                    <button className="pv-mh-clear" title="Xóa"
                      onClick={(e) => { e.stopPropagation(); if (onClearHeading) onClearHeading(para.id); }}>
                      ×
                    </button>
                  </div>
                ) : (
                  <div className={`pv-para-slot${isOver ? ' over' : ''}`}>
                    {isOver ? '↓ Thả heading vào đây' : '⬚ Kéo heading vào đây'}
                  </div>
                )}
              </div>
            )}
            <div className="pv-passage-body">
              {para.text
                ? <div dangerouslySetInnerHTML={{ __html: formatPreviewText(para.text) }} />
                : <em className="pv-empty">Chưa có nội dung đoạn {idx + 1}.</em>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Audio Group (Listening)
export const AudioGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      <div className="pv-audio-bar">
        <Volume2 size={16} style={{ flexShrink: 0 }} />
        {group.audioUrl
          ? <audio controls src={group.audioUrl} className="pv-audio-player" />
          : <span className="pv-audio-placeholder">Audio chưa được tải lên</span>}
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Matching Heading Group
export const MatchingHeadingGroup = ({ group, assignedTexts = new Set() }) => {
  const headings = group.headingBank ?? [];
  const [dragging, setDragging] = useState(null);

  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.title && <div className="pv-group-instructions" style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}

      <div className="pv-heading-bank">
        <div className="pv-heading-bank-title">List of Headings</div>
        <div className="pv-heading-bank-subtitle">Kéo heading vào từng đoạn văn bên trái</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {headings.length === 0
            ? <em className="pv-empty">Chưa có heading.</em>
            : headings.map((h, i) => {
              const isAssigned = assignedTexts.has(h.text);
              return (
                <div key={i}
                  className={`pv-mh-chip${isAssigned ? ' assigned' : ''}${dragging === h.text ? ' dragging' : ''}`}
                  draggable={!isAssigned}
                  onDragStart={(e) => {
                    if (isAssigned) { e.preventDefault(); return; }
                    e.dataTransfer.setData('text/x-mh', JSON.stringify({ text: h.text, roman: toRoman(i + 1), index: i }));
                    e.dataTransfer.effectAllowed = 'copy';
                    setDragging(h.text);
                  }}
                  onDragEnd={() => setDragging(null)}
                  title={isAssigned ? 'Đã gán vào đoạn văn' : 'Kéo vào đoạn văn bên trái'}
                >
                  <span className="pv-heading-roman">{toRoman(i + 1)}</span>
                  {h.text
                    ? <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: formatPreviewText(h.text) }} />
                    : <em className="pv-empty" style={{ flex: 1 }}>...</em>}
                  {isAssigned && <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>}
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
};

// Summary Group
export const SummaryGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.instructions && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />
      )}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      <div className="pv-summary-text">
        {parseSummaryPreview(group.summaryText, questions, activeQ, onSetActive)}
      </div>
      <div className="pv-summary-answer-list">
        {questions.map((q) => {
          const active = activeQ === q.questionNumber;
          return (
            <div key={q.id} className={`pv-summary-answer-row${active ? ' active' : ''}`}
              onClick={() => onSetActive(q.questionNumber)}>
              <span className={`pv-q-num-badge${active ? ' active' : ''}`}>{q.questionNumber}</span>
              <input className="pv-inline-input" disabled placeholder={`Câu ${q.questionNumber}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Note Completion Group
export const NoteCompletionGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const [answers, setAnswers] = useState({});
  const handleAnswer = (num, val) => setAnswers((prev) => ({ ...prev, [num]: val }));
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.instructions && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />
      )}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      <div className="pv-note-text">
        {parseNotePreview(group.noteText, questions, activeQ, onSetActive, answers, handleAnswer)}
      </div>
    </div>
  );
};

// Summary Completion Select Group
export const SummaryCompletionSelectGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const options = group.optionBank ?? [];
  const allowReuse = group.allowOptionReuse !== false;
  const [answers, setAnswers] = useState({});
  const usedOptions = new Set(allowReuse ? [] : Object.values(answers).filter(Boolean));

  const handleDrop = (e, qNum) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    const sourceQNum = e.dataTransfer.getData('sourceQNum');

    if (text) {
      setAnswers(prev => ({ ...prev, [qNum]: text }));
      if (sourceQNum && sourceQNum !== String(qNum)) {
        setAnswers(prev => ({ ...prev, [sourceQNum]: '' }));
      }
    }
  };

  const handleBankDrop = (e) => {
    e.preventDefault();
    const sourceQNum = e.dataTransfer.getData('sourceQNum');
    if (sourceQNum) {
      setAnswers(prev => ({ ...prev, [sourceQNum]: '' }));
    }
  };

  const parts = (group.noteText || '').split(/\[blank\]/gi);

  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.instructions && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />
      )}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}

      <div className="pv-summary-text">
        {parts.map((part, i) => {
          if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
          const q = questions[i];
          const num = q?.questionNumber ?? i + 1;
          const isActive = activeQ === num;
          const answer = answers[num] || '';

          return (
            <React.Fragment key={i}>
              {part}
              <span
                className={`pv-blank-box pv-drop-blank${isActive ? ' active' : ''}`}
                onClick={() => onSetActive(num)}
                onDrop={(e) => handleDrop(e, num)}
                onDragOver={(e) => e.preventDefault()}
                style={{ minWidth: 100, cursor: 'pointer' }}
              >
                {answer ? (
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', answer);
                      e.dataTransfer.setData('sourceQNum', String(num));
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    {answer}
                  </span>
                ) : num}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }} onDragOver={(e) => e.preventDefault()} onDrop={handleBankDrop}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {options.map((o, i) => {
            const text = typeof o === 'string' ? o : (o.text || '');
            const isUsed = usedOptions.has(text);
            if (isUsed) return null;

            return (
              <div
                key={i}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', text)}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: 'grab',
                  userSelect: 'none'
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Image Note Form Group
export const ImageNoteFormGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const [answers, setAnswers] = useState({});
  const handleAnswer = (num, val) => setAnswers((prev) => ({ ...prev, [num]: val }));
  const imagePosition = group.imagePosition || 'middle';
  const pinBoxWidth = group.pinBoxWidth || 60;
  const topNoteText = group.topNoteText ?? (group.imagePosition === 'bottom' ? '' : (group.noteText || ''));
  const bottomNoteText = group.bottomNoteText ?? (group.imagePosition === 'bottom' ? (group.noteText || '') : '');
  const imagePinQuestions = questions.filter(isImagePinQuestion)
    .sort((a, b) => Number(a?.questionNumber ?? a?.number ?? 0) - Number(b?.questionNumber ?? b?.number ?? 0));
  const noteQuestions = questions.filter((q) => !isImagePinQuestion(q))
    .sort((a, b) => Number(a?.questionNumber ?? a?.number ?? 0) - Number(b?.questionNumber ?? b?.number ?? 0));
  const topQuestions = questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.TOP)
    .sort((a, b) => Number(a?.questionNumber ?? a?.number ?? 0) - Number(b?.questionNumber ?? b?.number ?? 0));
  const bottomQuestions = questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.BOTTOM)
    .sort((a, b) => Number(a?.questionNumber ?? a?.number ?? 0) - Number(b?.questionNumber ?? b?.number ?? 0));
  const hasSectionedNotes = topQuestions.length > 0 || bottomQuestions.length > 0;
  const combinedText = [topNoteText, bottomNoteText].filter(Boolean).join('\n\n');

  const imageSection = group.imageUrl && (
    <div style={{ marginBottom: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...getLockedImageFrameStyle('IMAGE_NOTE_FORM') }}>
          <img src={group.imageUrl} alt="Question" style={{ ...getLockedImageStyle('IMAGE_NOTE_FORM') }} />
          {imagePinQuestions.map((q) => {
            const active = activeQ === q.questionNumber;
            const userAnswer = answers[q.questionNumber] || '';
            const boxWidth = Math.max(56, pinBoxWidth);
            return (
              <ImageNotePinBox
                key={q.id}
                id={`question-${q.questionNumber}`}
                number={q.questionNumber}
                left={`${q.pinX}%`}
                top={`${q.pinY}%`}
                value={userAnswer}
                active={active}
                boxWidth={boxWidth}
                blankWidth={Math.max(26, boxWidth - 68)}
                onActivate={() => onSetActive(q.questionNumber)}
                onChange={(e) => { e.stopPropagation(); handleAnswer(q.questionNumber, e.target.value); }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.instructions && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />
      )}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}

      {hasSectionedNotes ? (
        <>
          {imagePosition === 'top' && imageSection}
          {imagePosition === 'top' && combinedText && (
            <div className="pv-note-text">
              {parseNotePreview(combinedText, noteQuestions, activeQ, onSetActive, answers, handleAnswer, { cursor: 0, questions: noteQuestions })}
            </div>
          )}

          {imagePosition === 'middle' && topNoteText && (
            <div className="pv-note-text">
              {parseNotePreview(topNoteText, topQuestions, activeQ, onSetActive, answers, handleAnswer, { cursor: 0, questions: topQuestions })}
            </div>
          )}

          {imagePosition === 'middle' && imageSection}

          {imagePosition === 'middle' && bottomNoteText && (
            <div className="pv-note-text">
              {parseNotePreview(bottomNoteText, bottomQuestions, activeQ, onSetActive, answers, handleAnswer, { cursor: 0, questions: bottomQuestions })}
            </div>
          )}

          {imagePosition === 'bottom' && combinedText && (
            <div className="pv-note-text">
              {parseNotePreview(combinedText, noteQuestions, activeQ, onSetActive, answers, handleAnswer, { cursor: 0, questions: noteQuestions })}
            </div>
          )}

          {imagePosition === 'bottom' && imageSection}
        </>
      ) : (
        <>
          {imagePosition === 'top' && imageSection}

          {imagePosition === 'top' && topNoteText && (
            <div className="pv-note-text">
              {parseNotePreview(topNoteText, questions, activeQ, onSetActive, answers, handleAnswer)}
            </div>
          )}

          {imagePosition === 'middle' && topNoteText && (
            <div className="pv-note-text">
              {parseNotePreview(topNoteText, questions, activeQ, onSetActive, answers, handleAnswer)}
            </div>
          )}

          {imagePosition === 'middle' && imageSection}

          {imagePosition === 'middle' && bottomNoteText && (
            <div className="pv-note-text">
              {parseNotePreview(bottomNoteText, questions, activeQ, onSetActive, answers, handleAnswer)}
            </div>
          )}

          {imagePosition === 'bottom' && bottomNoteText && (
            <div className="pv-note-text">
              {parseNotePreview(bottomNoteText, questions, activeQ, onSetActive, answers, handleAnswer)}
            </div>
          )}

          {imagePosition === 'bottom' && imageSection}
        </>
      )}
    </div>
  );
};

// Drag Matching Group
export const DragMatchingGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text }));
  const allowReuse = (typeof group.allowOptionReuse === 'boolean') ? group.allowOptionReuse : true;

  const [answers, setAnswers] = useState({});
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const placed = new Set(Object.values(answers).filter(Boolean).map((v) => v.id));
  const bankChips = allowReuse ? allOptions : allOptions.filter((o) => !placed.has(o.id));

  const placeChip = (qNum, chip) => {
    setAnswers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k]?.id === chip.id) next[k] = null; });
      next[qNum] = chip;
      return next;
    });
    onSetActive(qNum);
  };

  const removeAnswer = (qNum) => {
    setAnswers((prev) => ({ ...prev, [qNum]: null }));
  };

  return (
    <div className="pv-group-block" onClick={(e) => e.stopPropagation()}>
      <QuestionRange group={group} />
      {(group.instructions || group.instruction || group.groupInstruction) && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions || group.instruction || group.groupInstruction) }} />}
      <div className="pv-dm-layout">
        <div className="pv-dm-left">
          {group.leftTitle && <div className="pv-dm-col-header" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.leftTitle) }} />}
          {questions.map((q) => {
            const active = activeQ === q.questionNumber;
            const filled = answers[q.questionNumber];
            const isOver = dragOver === q.questionNumber;
            return (
              <div key={q.id} className={`pv-dm-row${active ? ' active' : ''}`}
                onClick={() => onSetActive(q.questionNumber)}>
                <span className="pv-dm-item-name">
                  {q.questionText
                    ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
                    : <em className="pv-empty">...</em>}
                </span>
                <div
                  className={`pv-dm-gap${isOver ? ' drag-over' : ''}${filled ? ' filled' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(q.questionNumber); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = Number(e.dataTransfer.getData('text/x-dm'));
                    const chip = allOptions.find((o) => o.id === id);
                    if (chip) placeChip(q.questionNumber, chip);
                  }}
                  onClick={(e) => { e.stopPropagation(); if (filled) removeAnswer(q.questionNumber); }}
                  title={filled ? 'Click để trả lại' : 'Thả đáp án vào đây'}
                >
                  {filled
                    ? <span className="pv-dm-gap-filled" dangerouslySetInnerHTML={{ __html: formatPreviewText(filled.text) }} />
                    : <span className="pv-dm-gap-num">{q.questionNumber}</span>
                  }
                </div>
              </div>
            );
          })}
        </div>

        <div className="pv-dm-right">
          {group.rightTitle && <div className="pv-dm-col-header" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.rightTitle) }} />}
          <div className="pv-dm-bank">
            {bankChips.map((chip) => (
              <div
                key={chip.id}
                className={`pv-dm-chip${dragId === chip.id ? ' dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/x-dm', String(chip.id));
                  e.dataTransfer.effectAllowed = 'move';
                  setDragId(chip.id);
                }}
                onDragEnd={() => setDragId(null)}
              >
                <span dangerouslySetInnerHTML={{ __html: formatPreviewText(chip.text) }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Map Labelling Group
export const MapLabellingGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const showTitle = group.title && !/^Map\s*Labelling/i.test(group.title.trim());
  const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text }));
  const [answers, setAnswers] = useState({});
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const lockedLayout = getLockedImageQuestionLayout('MAP_LABELLING');

  const placed = new Set(Object.values(answers).filter(Boolean).map((v) => v.id));
  const bankChips = allOptions.filter((o) => !placed.has(o.id));

  const placeChip = (qNum, chip) => {
    setAnswers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k]?.id === chip.id) next[k] = null; });
      next[qNum] = chip;
      return next;
    });
    onSetActive(qNum);
  };

  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />}
      {showTitle && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      <div className="pv-ml-layout">
        <div className="pv-ml-image-wrapper" style={{ textAlign: 'center' }}>
          {group.imageUrl ? (
            <div style={{ ...getLockedImageFrameStyle('MAP_LABELLING'), maxHeight: `${lockedLayout.imageMaxHeight}px` }}>
              <img src={group.imageUrl} alt="map" draggable={false} style={{ ...getLockedImageStyle('MAP_LABELLING') }} />
              {questions.map((q) => {
                const filled = answers[q.questionNumber] ?? null;
                const isOver = dragOver === q.questionNumber;
                const active = activeQ === q.questionNumber;
                const basePinWidth = Math.max(56, Number(group.pinBoxWidth) || 60);
                return (
                  <div key={q.id}
                    className={`pv-ml-pin${filled ? ' filled' : ''}${isOver ? ' drag-over' : ''}${active ? ' active' : ''}`}
                    style={{
                      left: `${q.pinX ?? 10}%`,
                      top: `${q.pinY ?? 10}%`,
                      width: `${basePinWidth}px`,
                      minWidth: `${basePinWidth}px`,
                      maxWidth: `${basePinWidth}px`,
                      height: '26px',
                      minHeight: '26px',
                      padding: '0 10px',
                      overflow: 'hidden',
                      justifyContent: 'flex-start',
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(q.questionNumber); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      const id = Number(e.dataTransfer.getData('text/x-dm'));
                      const chip = allOptions.find((o) => o.id === id);
                      if (chip) placeChip(q.questionNumber, chip);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (filled) {
                        setAnswers((prev) => ({ ...prev, [q.questionNumber]: null }));
                      } else {
                        onSetActive(q.questionNumber);
                      }
                    }}
                    title={filled ? 'Click để trả lại' : `Kéo đáp án vào ô ${q.questionNumber}`}
                  >
                    {filled
                      ? <span className="pv-ml-pin-text">{filled.text}</span>
                      : <span className="pv-ml-pin-num">{q.questionNumber}</span>
                    }
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pv-diagram-placeholder">Bản đồ chưa được tải lên</div>
          )}
        </div>

        <div className="pv-ml-bank">
          {group.rightTitle && <div className="pv-dm-col-header">{group.rightTitle}</div>}
          <div className="pv-dm-bank">
            {bankChips.length === 0 && <em style={{ fontSize: 12, color: '#9ca3af' }}>Tất cả đã được đặt</em>}
            {bankChips.map((chip) => (
              <div key={chip.id}
                className={`pv-dm-chip${dragId === chip.id ? ' dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/x-dm', String(chip.id));
                  e.dataTransfer.effectAllowed = 'move';
                  setDragId(chip.id);
                }}
                onDragEnd={() => setDragId(null)}>
                {chip.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Table Completion Group
export const TableCompletionGroup = ({ group, activeQ, onSetActive }) => {
  const columns = group.columns ?? [];
  const tableRows = group.tableRows ?? [];
  const questions = group.questions ?? [];
  const [answers, setAnswers] = useState({});

  const blankMap = useMemo(() => {
    const map = [];
    for (const row of tableRows) {
      for (const col of columns) {
        const n = ((row.cells?.[col.id] ?? '').match(/\[blank\]/g) ?? []).length;
        for (let i = 0; i < n; i++) {
          const q = questions[map.length];
          map.push({ rowId: row.id, colId: col.id, qNum: q?.questionNumber ?? null });
        }
      }
    }
    return map;
  }, [tableRows, columns, questions]);

  const parseBold = (text) =>
    text.split(/\*\*(.*?)\*\*/).map((chunk, i) =>
      i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
    );

  const renderCell = (cellText, rowId, colId) => {
    const parts = (cellText ?? '').split('[blank]');
    let localIdx = blankMap.filter((b) => {
      const colOrder = columns.map((c) => c.id);
      const rowOrder = tableRows.map((r) => r.id);
      const bColIdx = colOrder.indexOf(b.colId);
      const bRowIdx = rowOrder.indexOf(b.rowId);
      const curColIdx = colOrder.indexOf(colId);
      const curRowIdx = rowOrder.indexOf(rowId);
      return bRowIdx < curRowIdx || (bRowIdx === curRowIdx && bColIdx < curColIdx);
    }).length;

    return parts.map((part, i) => {
      const entry = blankMap[localIdx + i - 1] ?? null;
      return (
        <React.Fragment key={i}>
          {parseBold(part)}
          {i < parts.length - 1 && (() => {
            const info = blankMap[localIdx + i];
            if (!info) return null;
            const qNum = info.qNum;
            const isActive = activeQ === qNum;
            return (
              <input
                key={`tc-blank-${qNum}`}
                className={`pv-tc-blank${isActive ? ' active' : ''}`}
                value={answers[qNum] ?? ''}
                onChange={(e) => { setAnswers((p) => ({ ...p, [qNum]: e.target.value })); onSetActive(qNum); }}
                onClick={() => onSetActive(qNum)}
                placeholder={String(qNum)}
              />
            );
          })()}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      <div className="pv-tc-scroll">
        <table className="pv-tc-table">
          {group.tableTitle && (
            <thead>
              <tr><th className="pv-tc-title-cell" colSpan={columns.length}>{group.tableTitle}</th></tr>
              <tr>
                {columns.map((col) => (
                  <th key={col.id} className="pv-tc-header-cell">{col.header}</th>
                ))}
              </tr>
            </thead>
          )}
          {!group.tableTitle && columns.some((c) => c.header) && (
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.id} className="pv-tc-header-cell">{col.header}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.id}>
                {columns.map((col, ci) => (
                  <td key={col.id} className={`pv-tc-cell${ci === 0 ? ' pv-tc-row-label' : ''}`}>
                    {renderCell(row.cells?.[col.id] ?? '', row.id, col.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Flow Chart Group
export const FlowChartGroup = ({ group, activeQ, onSetActive }) => {
  const flowNodes = group.flowNodes ?? [];
  const questions = group.questions ?? [];
  const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text }));

  const [answers, setAnswers] = useState({});
  const [dragId, setDragId] = useState(null);
  const [dragOverQ, setDragOverQ] = useState(null);

  const placed = new Set(Object.values(answers).filter(Boolean).map((v) => v.id));
  const bankChips = allOptions.filter((o) => !placed.has(o.id));

  const placeChip = (qNum, chip) => {
    setAnswers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k]?.id === chip.id) next[k] = null; });
      next[qNum] = chip;
      return next;
    });
    onSetActive(qNum);
  };

  const blanks = [];
  for (const node of flowNodes) {
    const n = (node.text ?? '').split(/\[blank\]/gi).length - 1;
    for (let i = 0; i < n; i++) {
      blanks.push(questions[blanks.length] ?? null);
    }
  }

  const renderNodeText = (nodeText, blankOffset) => {
    const parts = (nodeText ?? '').split(/\[blank\]/gi);
    return parts.map((part, i) => {
      if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
      const subQ = blanks[blankOffset + i];
      const qNum = subQ?.questionNumber;
      const filled = qNum !== undefined ? answers[qNum] : undefined;
      const isActive = qNum !== undefined ? activeQ === qNum : false;
      const isOver = dragOverQ === qNum;
      return (
        <React.Fragment key={i}>
          {part}
          <span
            className={`pv-fc-blank${filled ? ' filled' : ''}${isActive ? ' active' : ''}${isOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverQ(qNum); }}
            onDragLeave={() => setDragOverQ(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverQ(null);
              const id = Number(e.dataTransfer.getData('text/x-fc'));
              const chip = allOptions.find((o) => o.id === id);
              if (chip && qNum !== undefined) placeChip(qNum, chip);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (filled && qNum !== undefined) {
                setAnswers((prev) => ({ ...prev, [qNum]: null }));
              } else if (qNum !== undefined) {
                onSetActive(qNum);
              }
            }}
            title={filled ? 'Click để xóa' : `Kéo đáp án vào ô ${qNum}`}
          >
            {filled
              ? <span className="pv-fc-blank-text" dangerouslySetInnerHTML={{ __html: formatPreviewText(filled.text) }} />
              : <span className="pv-fc-blank-num">{qNum ?? '?'}</span>
            }
          </span>
        </React.Fragment>
      );
    });
  };

  let blankCursor = 0;
  const nodesWithOffset = flowNodes.map((node) => {
    const offset = blankCursor;
    blankCursor += (node.text ?? '').split(/\[blank\]/gi).length - 1;
    return { node, offset };
  });

  return (
    <div className="pv-group-block" onClick={(e) => e.stopPropagation()}>
      <QuestionRange group={group} />
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />}
      <div className="pv-fc-layout">
        <div className="pv-fc-chart">
          {group.title && <div className="pv-fc-chart-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
          {nodesWithOffset.map(({ node, offset }, idx) => (
            <React.Fragment key={node.id ?? idx}>
              <div className="pv-fc-node">
                <p className="pv-fc-node-text">
                  {renderNodeText(node.text, offset)}
                </p>
              </div>
              {idx < nodesWithOffset.length - 1 && (
                <div className="pv-fc-arrow">↓</div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="pv-fc-bank">
          {group.bankTitle && <div className="pv-dm-col-header" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.bankTitle) }} />}
          <div className="pv-dm-bank">
            {bankChips.length === 0
              ? <em style={{ fontSize: 12, color: '#9ca3af' }}>Tất cả đã được đặt</em>
              : bankChips.map((chip) => (
                <div
                  key={chip.id}
                  className={`pv-dm-chip${dragId === chip.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/x-fc', String(chip.id));
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(chip.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                >
                  <span dangerouslySetInnerHTML={{ __html: formatPreviewText(chip.text) }} />
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// Standalone Group
export const StandaloneGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Speaking Interview Group
export const SpeakingInterviewGroup = ({ group }) => {
  const questions = group.questions ?? [];
  const isP3 = group.interviewType === 'PART3';
  return (
    <div className="pv-spk-interview">
      <div className={`pv-spk-chip${isP3 ? ' pv-spk-chip--p3' : ' pv-spk-chip--p1'}`}>
        {isP3 ? 'Part 3 · Two-way Discussion' : 'Part 1 · Interview'}
      </div>
      {group.partInstruction && (
        <div className="pv-spk-instruction" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.partInstruction) }} />
      )}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : (
          <div className="pv-spk-qlist">
            {questions.map((q, i) => (
              <div key={q.id ?? i} className="pv-spk-qrow">
                <span className="pv-spk-qnum">Q{i + 1}.</span>
                <span className="pv-spk-qtext">
                  {q.text
                    ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.text) }} />
                    : <em className="pv-empty">Chưa có nội dung.</em>}
                </span>
                <span className="pv-spk-mic-badge" title="Ghi âm"><Mic size={12} /></span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

// Speaking Cue Card Group
export const SpeakingCueCardGroup = ({ group }) => {
  const bulletPoints = (group.bulletPoints ?? []).filter(Boolean);
  const prepSec = group.prepSeconds ?? 60;
  return (
    <div className="pv-spk-cuecard-wrapper">
      <div className="pv-spk-prep-chip">Thời gian chuẩn bị: {prepSec}s</div>
      <div className="pv-spk-cuecard">
        <div className="pv-spk-cc-topic">
          {group.topic
            ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(group.topic) }} />
            : <em className="pv-empty">Chưa có chủ đề.</em>}
        </div>
        {(bulletPoints.length > 0 || group.closingSentence) && (
          <>
            <div className="pv-spk-cc-youshould">
              <span dangerouslySetInnerHTML={{ __html: formatPreviewText(group.shouldSayLabel || 'You should say:') }} />
            </div>
            <ul className="pv-spk-cc-bullets">
              {bulletPoints.map((bp, i) => <li key={i} dangerouslySetInnerHTML={{ __html: formatPreviewText(bp) }} />)}
            </ul>
            {group.closingSentence && (
              <div className="pv-spk-cc-closing">
                <span dangerouslySetInnerHTML={{ __html: formatPreviewText(group.closingSentence) }} />
              </div>
            )}
          </>
        )}
      </div>
      <div className="pv-spk-cc-hint">Nói trong 1–2 phút sau khi chuẩn bị xong</div>
    </div>
  );
};

// Writing Task Group
export const WritingTaskGroup = ({ group }) => {
  const [text, setText] = React.useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const minWords = group.minWords ?? 150;
  const isUnder = wordCount < minWords;

  return (
    <div className="pv-wt-container">
      <div className="pv-wt-left">
        {group.recommendedMinutes && (
          <div className="pv-wt-time-hint">
            ⏱ Nên dành khoảng {group.recommendedMinutes} phút · Viết ít nhất {minWords} từ
          </div>
        )}
        <div className="pv-wt-instruction">
          {group.taskInstruction
            ? <div dangerouslySetInnerHTML={{ __html: formatPreviewText(group.taskInstruction) }} />
            : <em className="pv-empty">Chưa có đề bài.</em>}
        </div>
        {group.imageUrl && (
          <img src={group.imageUrl} alt="task diagram" className="pv-wt-image" />
        )}
      </div>

      <div className="pv-wt-right">
        <textarea
          className="pv-wt-textarea"
          placeholder="Nhập bài viết của bạn tại đây..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="pv-wt-wordcount">
          <span className={isUnder ? 'pv-wt-wc-under' : 'pv-wt-wc-ok'}>
            Từ: <strong>{wordCount}</strong>
          </span>
          <span className="pv-wt-wc-min"> (tối thiểu: {minWords})</span>
        </div>
      </div>
    </div>
  );
};

// Shared Options Dropdown Group
export const SharedOptionsDropdownGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const [answers, setAnswers] = useState({});
  const sharedOptions = (group.sharedOptions || []).map((o) => ({
    key: o.key,
    label: o.label ?? '',
    imageUrl: o.imageUrl ?? '',
  }));
  const subQuestions = questions.map((q) => ({
    id: q.id,
    number: q.questionNumber,
    text: q.questionText,
    questionText: q.questionText,
    correctOptionKey: (q.answerText ?? q.answers?.[0]?.answerText ?? '').trim(),
  }));
  const previewQ = {
    heading: group.title || '',
    optionsTableTitle: group.optionsTableTitle || '',
    questionTitle: group.questionTitle || '',
    instruction: [group.mainInstruction, group.subInstruction].filter(Boolean).join('<br/><br/>'),
    imageUrl: group.imageUrl,
    imageWidth: group.imageWidth,
    hideOptionsTable: group.hideOptionsTable,
    sharedOptions,
    subQuestions,
  };
  const handleAnswerChange = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };
  return (
    <div className="pv-group-block">
      <DropdownGroupQuestion
        q={previewQ}
        activeQuestion={activeQ}
        setActiveQuestion={onSetActive}
        answers={answers}
        handleAnswerChange={handleAnswerChange}
        bookmarks={{}}
        toggleBookmark={() => { }}
        isReview={false}
      />
    </div>
  );
};

// MCQ Group
export const MCQGroup = ({ group, activeQ, onSetActive, multi = false }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      <div className="pv-mc-instructions">
        {multi
          ? <>Choose <strong>TWO</strong> letters, <strong>A–E</strong>.</>
          : <>Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.</>
        }
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Sentence Completion Group
export const SentenceCompletionGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      <div className="pv-mc-instructions">
        Complete the sentences. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Short Answer Group
export const ShortAnswerGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <QuestionRange group={group} />
      <div className="pv-mc-instructions">
        Answer the questions. Write <strong>NO MORE THAN THREE WORDS</strong> for each answer.
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Image/Diagram Group
export const ImageGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
      {group.imageUrl
        ? <img src={group.imageUrl} alt="diagram" className="pv-diagram-img" />
        : <div className="pv-diagram-placeholder">{group.contentType === 'MAP' ? 'Bản đồ chưa được tải lên' : 'Sơ đồ chưa được tải lên'}</div>}
      {questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Matching Features Group
export const MatchingFeaturesGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const [answers, setAnswers] = useState({});

  let parsedMeta = { categoryTitle: '', categories: [] };
  try { if (group.passageText) parsedMeta = JSON.parse(group.passageText); } catch { /**/ }
  const categories = Array.isArray(parsedMeta.categories) ? parsedMeta.categories : [];
  const categoryTitle = parsedMeta.categoryTitle || '';

  const toggle = (qNum, label) => {
    setAnswers(prev => ({ ...prev, [qNum]: prev[qNum] === label ? '' : label }));
    onSetActive(qNum);
  };

  if (questions.length === 0) {
    return (
      <div className="pv-group-block">
        <QuestionRange group={group} />
        <em className="pv-empty">Chưa có câu hỏi.</em>
      </div>
    );
  }

  return (
    <div className="pv-group-block" onClick={(e) => e.stopPropagation()}>
      <QuestionRange group={group} />
      {(group.instructions || group.instruction || group.groupInstruction) && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions || group.instruction || group.groupInstruction) }} />
      )}

      {categories.length > 0 && (
        <div className="pv-mf-categories-box">
          {categoryTitle && <div className="pv-mf-category-title">{categoryTitle}</div>}
          <div className="pv-mf-category-list">
            {categories.map((cat) => (
              <div key={cat.label} className="pv-mf-category-row">
                <span className="pv-mf-cat-label">{cat.label}</span>
                <span className="pv-mf-cat-text">{cat.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pv-mf-table-wrap">
        <table className="pv-mf-table">
          <thead>
            <tr className="pv-mf-header-row">
              <th className="pv-mf-th-item"></th>
              {categories.map((cat) => (
                <th key={cat.label} className="pv-mf-th-cat">{cat.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const qNum = q.questionNumber;
              const isActive = activeQ === qNum;
              const selected = answers[qNum] || '';
              return (
                <tr key={q.id}
                  className={`pv-mf-question-row${isActive ? ' pv-mf-row-active' : ''}`}
                  onClick={() => onSetActive(qNum)}>
                  <td className="pv-mf-td-item">
                    <div className="pv-mf-item-inner">
                      <span className={`pv-q-num-badge${isActive ? ' active' : ''}`}>{qNum}</span>
                      <span className="pv-mf-q-text">
                        {q.questionText
                          ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
                          : <em className="pv-empty">...</em>}
                      </span>
                    </div>
                  </td>
                  {categories.map((cat) => (
                    <td key={cat.label}
                      className={`pv-mf-choice-cell${selected === cat.label ? ' pv-mf-selected' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggle(qNum, cat.label); }}
                      title={`Chọn ${cat.label}`}>
                      {selected === cat.label && <span className="pv-mf-check">✓</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Group Dispatcher ──────────────────────────────────────────────

/**
 * Main dispatcher that routes group contentType to the appropriate renderer.
 * @param {Object} group - The question group object
 * @param {number|null} activeQ - Currently active question number
 * @param {Function} onSetActive - Callback to set active question
 * @param {Object} extraProps - Additional props to pass to specific renderers
 */
export const renderGroup = (group, activeQ, onSetActive, extraProps = {}) => {
  const ct = group.contentType;
  const props = { key: group.id, group, activeQ, onSetActive };

  // READING_PASSAGE is rendered via PartReadingLayout, not inline here
  if (ct === 'READING_PASSAGE') return null;
  if (ct === 'AUDIO_TRANSCRIPT') return <AudioGroup {...props} />;
  if (ct === 'MATCHING_HEADING') return <MatchingHeadingGroup {...props} />;
  if (ct === 'DRAG_MATCHING') return <DragMatchingGroup {...props} />;
  if (ct === 'MATCHING_FEATURES') return <MatchingFeaturesGroup {...props} />;
  if (ct === 'TABLE_COMPLETION') return <TableCompletionGroup {...props} />;
  if (ct === 'MAP_LABELLING') return <MapLabellingGroup {...props} />;
  if (ct === 'SUMMARY_COMPLETION') return <SummaryGroup {...props} />;
  if (ct === 'SUMMARY_COMPLETION_SELECT') return <SummaryCompletionSelectGroup {...props} />;
  if (ct === 'NOTE_COMPLETION') return <NoteCompletionGroup {...props} />;
  if (ct === 'IMAGE_NOTE_FORM') return <ImageNoteFormGroup {...props} />;
  if (ct === 'FLOW_CHART') return <FlowChartGroup {...props} />;
  if (ct === 'WRITING_TASK') return <WritingTaskGroup key={group.id} group={group} />;
  if (ct === 'SPEAKING_INTERVIEW') return <SpeakingInterviewGroup key={group.id} group={group} />;
  if (ct === 'SPEAKING_CUECARD') return <SpeakingCueCardGroup key={group.id} group={group} />;
  if (ct === 'DIAGRAM' || ct === 'MAP') return <ImageGroup {...props} />;
  if (ct === 'MULTIPLE_CHOICE_GROUP') return <MCQGroup {...props} multi={false} />;
  if (ct === 'MULTIPLE_CHOICE_MULTI') return <MCQGroup {...props} multi={true} />;
  if (ct === 'SHARED_OPTIONS_DROPDOWN') return <SharedOptionsDropdownGroup {...props} />;
  if (ct === 'SENTENCE_COMPLETION') return <SentenceCompletionGroup {...props} />;
  if (ct === 'SHORT_ANSWER_GROUP') return <ShortAnswerGroup {...props} />;
  return <StandaloneGroup {...props} />;
};

// ─── Part Reading Layout ────────────────────────────────────────────────

/**
 * Reading split layout: passages on the left, question groups on the right.
 * Manages Matching Heading answers state for interaction between panes.
 */
export const PartReadingLayout = ({ part, activeQ, onSetActive }) => {
  const groups = part.questionGroups ?? [];
  const passages = groups.filter((g) => g.contentType === 'READING_PASSAGE');
  const qGroups = groups.filter((g) => g.contentType !== 'READING_PASSAGE');
  const mhGroups = qGroups.filter((g) => g.contentType === 'MATCHING_HEADING');
  const hasMH = mhGroups.length > 0;

  const [mhAnswers, setMhAnswers] = useState({});

  const assignedTexts = new Set(
    Object.values(mhAnswers).filter(Boolean).map((v) => v.text)
  );

  const handleDrop = (paraId, data) => {
    setMhAnswers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k]?.text === data.text) next[k] = null;
      });
      next[paraId] = { text: data.text, roman: data.roman ?? '' };
      return next;
    });
  };

  const handleClear = (paraId) => {
    setMhAnswers((prev) => ({ ...prev, [paraId]: null }));
  };

  if (passages.length === 0 && qGroups.length === 0) {
    return <div className="pv-empty-state" style={{ padding: 32 }}><em>Chưa có nội dung.</em></div>;
  }

  return (
    <div className="pv-reading-split">
      <div className="pv-passage-pane">
        {passages.length === 0
          ? <em className="pv-empty">Chưa có đoạn văn.</em>
          : passages.map((g) => (
            <PassageGroupPane key={g.id} group={g}
              hasMH={hasMH}
              mhAnswers={mhAnswers}
              onDropHeading={handleDrop}
              onClearHeading={handleClear}
            />
          ))}
      </div>
      <div className="pv-divider" />
      <div className="pv-questions-pane">
        {qGroups.length === 0
          ? <em className="pv-empty">Chưa có câu hỏi.</em>
          : qGroups.map((g) => {
            if (g.contentType === 'MATCHING_HEADING') {
              return <MatchingHeadingGroup key={g.id} group={g} assignedTexts={assignedTexts} />;
            }
            return renderGroup(g, activeQ, onSetActive);
          })}
      </div>
    </div>
  );
};
