/**
 * ExamCanvas.jsx
 * WYSIWYG canvas — renders the exam exactly as students would see it,
 * with inline editing and drag-and-drop capabilities.
 * 
 * Supports two modes:
 * - 'edit' (default): WYSIWYG editing canvas with drag-drop, Part tabs, and mock header
 * - 'preview': Student exam interface (like PreviewModal) — renders real exam look
 *              data comes directly from parent state (no database)
 * 
 * NOTE: Block components đã được tách ra thành các file riêng trong thư mục blocks/
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { Plus, X, Clock, TimerReset, Check, Eye, Headphones, BookOpen, PenLine, Mic, Volume2, FileText } from 'lucide-react';
import { normalizeRichHtml, preserveBlockLineBreaks, stripInlineStyles } from '../../utils/textFormatters';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';
import { getLockedImageQuestionLayout } from '../../utils/imageQuestionLayout';
import SharedOptionsDropdownBlock from './SharedOptionsDropdownBlock';

// Series logo mapping (mirrors TestHeader.jsx)
const SERIES_LOGO_SRC = {
  IELTS: '/IELTS%20Logo.png',
  Cambridge: '/Cambridge%20Logo.png',
};

// Import tất cả block components
import {
  PassageBlock,
  AudioBlock,
  ImageBlock,
  MapLabellingBlock,
  TableCompletionBlock,
  DragMatchingBlock,
  MatchingFeaturesBlock,
  MatchingHeadingBlock,
  MatchingFillBlock,
  MultipleChoiceBlock,
  MultipleChoiceMultiBlock,
  TFNGBlock,
  SentenceCompletionBlock,
  ShortAnswerBlock,
  NoteCompletionBlock,
  ImageNoteFormBlock,
  SummaryCompletionBlock,
  SummaryCompletionSelectBlock,
  FlowChartBlock,
  SpeakingInterviewBlock,
  SpeakingCueCardBlock,
  SpeakingPart1Block,
  SpeakingPart2Block,
  SpeakingPart3Block,
  WritingTaskBlock,
  GroupToolbar,
  TYPE_META,
  toRoman,
  toPlainText,
  countBlankTokens,
  getQuestionWeight,
  getPartQuestionStartNumber,
  getNextQuestionNumber,
} from './blocks';
// ---- Preview Content — Student-view rendered inside ExamCanvas in preview mode ----
// This mirrors the PreviewModal layout but lives inside the canvas workspace.
const PreviewContent = ({ test, sessions, sessionDurations, activeSkill, onSetActiveSkill, onClose, seriesLabel }) => {
  const skillKeys = Object.keys(PREVIEW_SESSION_META);
  const [activeQ, setActiveQ] = React.useState(null);
  const [skillTimes, setSkillTimes] = React.useState(() =>
    skillKeys.reduce((acc, key) => {
      acc[key] = sessionDurations?.[key] ?? PREVIEW_SESSION_META[key]?.durationMinutes ?? 60;
      return acc;
    }, {})
  );

  const skillMeta = PREVIEW_SESSION_META[activeSkill];
  const currentDuration = Number.isFinite(skillTimes[activeSkill])
    ? skillTimes[activeSkill]
    : (skillMeta?.durationMinutes ?? 60);
  const resolvedLogoSrc = SERIES_LOGO_SRC[seriesLabel] || SERIES_LOGO_SRC.IELTS;
  const resolvedLogoAlt = seriesLabel || 'IELTS';
  const parts = sessions[activeSkill] ?? [];

  // Flat list of all questions for footer nav
  const allQuestions = React.useMemo(() =>
    parts.flatMap((p) =>
      (p.questionGroups ?? []).flatMap((g) => g.questions ?? [])
    ), [parts]);

  const totalQ = allQuestions.length;

  const goToQ = (num) => setActiveQ(num);

  const handleSetSkillTime = () => {
    const raw = window.prompt(
      `Đặt thời gian cho ${skillMeta?.label || 'kỹ năng'} (phút, 0 = không giới hạn)`,
      String(currentDuration)
    );
    if (raw === null) return;
    const next = Number.parseInt(raw, 10);
    if (!Number.isFinite(next) || next < 0) return;
    setSkillTimes((prev) => ({ ...prev, [activeSkill]: next }));
  };

  // Find active part for instruction bar
  const activePart = parts.find((p) =>
    (p.questionGroups ?? []).some((g) =>
      (g.questions ?? []).some((q) => q.questionNumber === activeQ)
    )
  ) ?? parts[0];

  // ── Group rendering helpers (preview-only, read-only) ──

  const renderTFNG = (q) => (
    <div className="pv-q" onClick={() => goToQ(q.questionNumber)}>
      <div className="pv-q-row">
        <span className="pv-q-num-badge">{q.questionNumber}</span>
        <span className="pv-q-text">
          {q.questionText
            ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
            : <em className="pv-empty">Chưa có nội dung câu hỏi</em>}
        </span>
      </div>
      <div className="pv-tfng-opts">
        {['True', 'False', 'Not Given'].map((label) => (
          <label key={label} className="pv-tfng-radio-label">
            <input type="radio" name={`pv-q-${q.id}`} disabled />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderMCQ = (q, multiple = false) => {
    const opts = q.options ?? [];
    return (
      <div className="pv-q">
        {multiple && (
          <div className="pv-choose-n-badge">Chọn <strong>{q.chooseCount ?? 2}</strong> đáp án đúng</div>
        )}
        <div className="pv-q-row">
          {!multiple && <span className="pv-q-num-badge">{q.questionNumber}</span>}
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
                <input type={multiple ? 'checkbox' : 'radio'} name={`pv-q-${q.id}`} disabled />
                <span className="pv-opt-key">{o.optionLabel}</span>
                <span className="pv-opt-text">
                  {o.optionMode === 'image' && o.optionImageUrl
                    ? <img src={resolveDrivePreviewUrl(o.optionImageUrl)} alt={o.optionLabel} style={{ maxWidth: 140, maxHeight: 90, borderRadius: 4, display: 'block' }} />
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

  const renderFill = (q) => (
    <div className="pv-q">
      <div className="pv-q-row">
        <span className="pv-q-num-badge">{q.questionNumber}</span>
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

  const renderGeneric = (q) => (
    <div className="pv-q">
      <div className="pv-q-row">
        <span className="pv-q-num-badge">{q.questionNumber}</span>
        <span className="pv-q-text">
          {q.questionText
            ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
            : <em className="pv-empty">Chưa có nội dung câu hỏi</em>}
        </span>
      </div>
      <textarea className="pv-textarea" disabled placeholder="Nhập câu trả lời..." rows={3} />
    </div>
  );

  const renderQuestion = (q) => {
    const type = q.questionType?.typeName ?? q.questionType ?? 'MULTIPLE_CHOICE';
    const isMultipleChoice = type === 'MULTIPLE_CHOICE_MULTIPLE' || Number(q.chooseCount || 0) > 1;
    switch (type) {
      case 'TRUE_FALSE_NG': return renderTFNG(q);
      case 'MULTIPLE_CHOICE': return renderMCQ(q, isMultipleChoice);
      case 'MULTIPLE_CHOICE_MULTIPLE': return renderMCQ(q, true);
      case 'FILL_IN_BLANK':
      case 'NOTE_COMPLETION':
      case 'SHORT_ANSWER': return renderFill(q);
      default: return renderGeneric(q);
    }
  };

  // QuestionRange helper
  const QuestionRange = ({ group }) => {
    const questions = group.questions ?? [];
    const allNums = questions.flatMap(q => {
      if (q?.subQuestions?.length) return q.subQuestions.map(sq => sq.number).filter(n => n != null);
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

  // SharedOptionsDropdown preview
  const renderSharedOptionsDropdown = (group, activeQ, goToQ) => {
    const questions = group.questions ?? [];
    const sharedOptions = (group.sharedOptions || []).map((o) => ({
      key: o.key,
      label: o.label ?? '',
      imageUrl: o.imageUrl ?? '',
    }));
    return (
      <div className="pv-group-block">
        <QuestionRange group={group} />
        {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
        {(group.mainInstruction || group.subInstruction) && (
          <div className="pv-group-instructions" style={{ marginTop: 4 }}>
            <span dangerouslySetInnerHTML={{ __html: [group.mainInstruction, group.subInstruction].filter(Boolean).join('<br/><br/>') }} />
          </div>
        )}
        {questions.map((q) => {
          const num = q.questionNumber;
          return (
            <div key={q.id} className="pv-q" onClick={() => goToQ(num)}>
              <div className="pv-q-row">
                <span className="pv-q-num-badge">{num}</span>
                <span className="pv-q-text">
                  {q.questionText
                    ? <span dangerouslySetInnerHTML={{ __html: formatPreviewText(q.questionText) }} />
                    : <em className="pv-empty">...</em>}
                </span>
              </div>
              <div style={{ marginLeft: 32, marginTop: 8 }}>
                <select disabled style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}>
                  <option value="">-- Chọn đáp án --</option>
                  {sharedOptions.map((o) => (
                    <option key={o.key} value={o.key}>{o.label || o.key}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Summary completion select preview
  const renderSummarySelect = (group, activeQ, goToQ) => {
    const questions = group.questions ?? [];
    const options = group.optionBank ?? [];
    const noteText = group.noteText || '';
    const parts = noteText.split(/\[blank\]/gi);
    const [answers, setAnswers] = React.useState({});

    const handleDrop = (e, qNum) => {
      e.preventDefault();
      const text = e.dataTransfer.getData('text/plain');
      if (text) setAnswers((prev) => ({ ...prev, [qNum]: text }));
    };

    return (
      <div className="pv-group-block">
        <QuestionRange group={group} />
        {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
        <div className="pv-summary-text">
          {parts.map((part, i) => {
            if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
            const q = questions[i];
            const num = q?.questionNumber ?? i + 1;
            const answer = answers[num] || '';
            return (
              <React.Fragment key={i}>
                {part}
                <span
                  className={`pv-blank-box pv-drop-blank`}
                  onDrop={(e) => handleDrop(e, num)}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ minWidth: 100 }}
                >
                  {answer || num}
                </span>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {options.map((o, i) => (
              <div key={i} draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', o.text || String(o))}
                style={{ padding: '6px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, cursor: 'grab', userSelect: 'none' }}>
                {typeof o === 'string' ? o : (o.text || '')}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Passage + heading drop (Reading preview)
  const [mhAnswers, setMhAnswers] = React.useState({});
  const mhGroupRef = React.useRef(null);

  const PassageGroupPane = ({ group, allParts }) => {
    const paragraphs = group.paragraphs && group.paragraphs.length > 0
      ? group.paragraphs
      : [{ id: `${group.id}-p0`, heading: '', text: group.passageText || '' }];
    const mhGroups = (allParts ?? []).flatMap(p => (p.questionGroups ?? [])).filter(g => g.contentType === 'MATCHING_HEADING');
    const hasMH = mhGroups.length > 0;
    const [overSlot, setOverSlot] = React.useState(null);

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
                      setMhAnswers(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(k => { if (next[k]?.text === data.text) next[k] = null; });
                        next[para.id] = { text: data.text, roman: data.roman ?? '' };
                        return next;
                      });
                    } catch { }
                  }}
                >
                  <span className="pv-para-num">§{idx + 1}</span>
                  {filled ? (
                    <div className="pv-para-heading-badge">
                      {filled.roman && <span className="pv-heading-roman">{filled.roman}</span>}
                      <span dangerouslySetInnerHTML={{ __html: formatPreviewText(filled.text) }} />
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

  const MatchingHeadingGroup = ({ group }) => {
    const headings = group.headingBank ?? [];
    const [dragging, setDragging] = React.useState(null);
    const assignedTexts = new Set(Object.values(mhAnswers).filter(Boolean).map(v => v.text));
    const toRoman = (n) => {
      const nums = [1, 4, 5, 9, 10, 40, 50];
      const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
      let r = '';
      for (let i = syms.length - 1; i >= 0; i--) {
        while (n >= nums[i]) { r += syms[i]; n -= nums[i]; }
      }
      return r;
    };

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

  const NoteCompletionGroup = ({ group, activeQ, goToQ }) => {
    const questions = group.questions ?? [];
    const [answers, setAnswers] = React.useState({});
    const handleAnswer = (num, val) => setAnswers(prev => ({ ...prev, [num]: val }));
    const parseNotePreview = (text, qs, active, onSetActive, ans, onAnswer) => {
      const parts = (text || '').split(/\[blank\]/gi);
      return parts.map((part, i) => {
        if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
        const q = qs[i];
        const num = q?.questionNumber ?? i + 1;
        const isActive = active === num;
        return (
          <React.Fragment key={i}>
            {part}
            <input
              className={`pv-note-inline-input${isActive ? ' active' : ''}`}
              value={ans?.[num] ?? ''}
              onChange={(e) => onAnswer?.(num, e.target.value)}
              onFocus={() => onSetActive(num)}
              placeholder={String(num)}
              onClick={(e) => e.stopPropagation()}
            />
          </React.Fragment>
        );
      });
    };
    return (
      <div className="pv-group-block">
        <QuestionRange group={group} />
        {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
        <div className="pv-note-text">
          {parseNotePreview(group.noteText, questions, activeQ, goToQ, answers, handleAnswer)}
        </div>
      </div>
    );
  };

  const WritingTaskGroup = ({ group }) => {
    const [text, setText] = React.useState('');
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const minWords = group.minWords ?? 150;
    const isUnder = wordCount < minWords;
    return (
      <div className="pv-wt-container">
        <div className="pv-wt-left">
          {group.recommendedMinutes && (
            <div className="pv-wt-time-hint">⏱ Nên dành khoảng {group.recommendedMinutes} phút · Viết ít nhất {minWords} từ</div>
          )}
          <div className="pv-wt-instruction">
            {group.taskInstruction
              ? <div dangerouslySetInnerHTML={{ __html: formatPreviewText(group.taskInstruction) }} />
              : <em className="pv-empty">Chưa có đề bài.</em>}
          </div>
          {group.imageUrl && <img src={resolveDrivePreviewUrl(group.imageUrl)} alt="task diagram" className="pv-wt-image" />}
        </div>
        <div className="pv-wt-right">
          <textarea className="pv-wt-textarea" placeholder="Nhập bài viết của bạn tại đây..." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="pv-wt-wordcount">
            <span className={isUnder ? 'pv-wt-wc-under' : 'pv-wt-wc-ok'}>Từ: <strong>{wordCount}</strong></span>
            <span className="pv-wt-wc-min"> (tối thiểu: {minWords})</span>
          </div>
        </div>
      </div>
    );
  };

  const SpeakingCueCardGroup = ({ group }) => {
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

  const renderGroup = (group) => {
    const ct = group.contentType;
    if (ct === 'READING_PASSAGE') return null;
    if (ct === 'MATCHING_HEADING') return <MatchingHeadingGroup key={group.id} group={group} />;
    if (ct === 'SHARED_OPTIONS_DROPDOWN') return renderSharedOptionsDropdown(group, activeQ, goToQ);
    if (ct === 'SUMMARY_COMPLETION_SELECT') return renderSummarySelect(group, activeQ, goToQ);
    if (ct === 'NOTE_COMPLETION') return <NoteCompletionGroup key={group.id} group={group} activeQ={activeQ} goToQ={goToQ} />;
    if (ct === 'WRITING_TASK') return <WritingTaskGroup key={group.id} group={group} />;
    if (ct === 'SPEAKING_CUECARD') return <SpeakingCueCardGroup key={group.id} group={group} />;
    return (
      <div className="pv-group-block" key={group.id}>
        <QuestionRange group={group} />
        {group.instructions && (
          <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />
        )}
        {group.title && !ct.startsWith('MULTIPLE') && !ct.startsWith('SENTENCE') && !ct.startsWith('SHORT') && !ct.startsWith('DRAG') && (
          <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />
        )}
        {ct === 'MULTIPLE_CHOICE_GROUP' && (
          <div className="pv-mc-instructions">Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.</div>
        )}
        {ct === 'MULTIPLE_CHOICE_MULTI' && (
          <div className="pv-mc-instructions">Choose <strong>TWO</strong> letters, <strong>A–E</strong>.</div>
        )}
        {ct === 'SENTENCE_COMPLETION' && (
          <div className="pv-mc-instructions">Complete the sentences. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.</div>
        )}
        {ct === 'SHORT_ANSWER_GROUP' && (
          <div className="pv-mc-instructions">Answer the questions. Write <strong>NO MORE THAN THREE WORDS</strong> for each answer.</div>
        )}
        {(group.questions ?? []).length === 0
          ? <em className="pv-empty">Chưa có câu hỏi.</em>
          : (group.questions ?? []).map((q) => renderQuestion(q))
        }
      </div>
    );
  };

  // Reading split layout
  const PartReadingLayout = ({ part }) => {
    const groups = part.questionGroups ?? [];
    const passages = groups.filter(g => g.contentType === 'READING_PASSAGE');
    const qGroups = groups.filter(g => g.contentType !== 'READING_PASSAGE');

    return (
      <div className="pv-reading-split">
        <div className="pv-passage-pane">
          {passages.length === 0
            ? <em className="pv-empty">Chưa có đoạn văn.</em>
            : passages.map(g => <PassageGroupPane key={g.id} group={g} allParts={parts} />)
          }
        </div>
        <div className="pv-divider" />
        <div className="pv-questions-pane">
          {qGroups.length === 0
            ? <em className="pv-empty">Chưa có câu hỏi.</em>
            : qGroups.map(g => renderGroup(g))
          }
        </div>
      </div>
    );
  };

  // Audio group preview
  const AudioGroup = ({ group }) => {
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
          : questions.map(q => renderQuestion(q))
        }
      </div>
    );
  };

  // Map labelling preview
  const MapLabellingGroup = ({ group }) => {
    const questions = group.questions ?? [];
    const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text || String(o) }));
    const [answers, setAnswers] = React.useState({});
    const [dragId, setDragId] = React.useState(null);
    const lockedLayout = getLockedImageQuestionLayout('MAP_LABELLING');
    const placed = new Set(Object.values(answers).filter(Boolean).map(v => v.id));
    const bankChips = allOptions.filter(o => !placed.has(o.id));

    const placeChip = (qNum, chip) => {
      setAnswers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k]?.id === chip.id) next[k] = null; });
        next[qNum] = chip;
        return next;
      });
      goToQ(qNum);
    };

    return (
      <div className="pv-group-block">
        <QuestionRange group={group} />
        {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.instructions) }} />}
        <div className="pv-ml-layout">
          <div className="pv-ml-image-wrapper" style={{ textAlign: 'center' }}>
            {group.imageUrl ? (
              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: `${lockedLayout.imageMaxHeight}px` }}>
                <img src={resolveDrivePreviewUrl(group.imageUrl)} alt="map" draggable={false} style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: `${lockedLayout.imageMaxHeight}px` }} />
                {questions.map(q => {
                  const filled = answers[q.questionNumber] ?? null;
                  return (
                    <div key={q.id}
                      style={{ position: 'absolute', left: `${q.pinX ?? 10}%`, top: `${q.pinY ?? 10}%`, minWidth: `${group.pinBoxWidth ?? 60}px`, background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData('text/x-dm')); const chip = allOptions.find(o => o.id === id); if (chip) placeChip(q.questionNumber, chip); }}
                      onClick={() => { if (filled) setAnswers(prev => ({ ...prev, [q.questionNumber]: null })); else goToQ(q.questionNumber); }}
                      title={filled ? 'Click để trả lại' : `Kéo đáp án vào ô ${q.questionNumber}`}
                    >
                      {filled ? <span>{filled.text}</span> : <span style={{ color: '#64748b', fontSize: 12 }}>{q.questionNumber}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pv-diagram-placeholder">Bản đồ chưa được tải lên</div>
            )}
          </div>
          <div className="pv-ml-bank">
            <div className="pv-dm-bank">
              {bankChips.length === 0 && <em style={{ fontSize: 12, color: '#9ca3af' }}>Tất cả đã được đặt</em>}
              {bankChips.map(chip => (
                <div key={chip.id} className={`pv-dm-chip${dragId === chip.id ? ' dragging' : ''}`} draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/x-dm', String(chip.id)); e.dataTransfer.effectAllowed = 'move'; setDragId(chip.id); }}
                  onDragEnd={() => setDragId(null)}>
                  <span dangerouslySetInnerHTML={{ __html: formatPreviewText(chip.text) }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Table completion preview
  const TableCompletionGroup = ({ group }) => {
    const columns = group.columns ?? [];
    const tableRows = group.tableRows ?? [];
    const questions = group.questions ?? [];
    const [answers, setAnswers] = React.useState({});
    const blankMap = React.useMemo(() => {
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
    const parseBold = (text) => text.split(/\*\*(.*?)\*\*/).map((chunk, i) => i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk);
    const renderCell = (cellText, rowId, colId) => {
      const parts = (cellText ?? '').split('[blank]');
      let localIdx = blankMap.filter(b => {
        const colOrder = columns.map(c => c.id);
        const rowOrder = tableRows.map(r => r.id);
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
              return (
                <input key={`tc-blank-${qNum}`} className="pv-tc-blank" value={answers[qNum] ?? ''}
                  onChange={(e) => { setAnswers(p => ({ ...p, [qNum]: e.target.value })); goToQ(qNum); }}
                  placeholder={String(qNum)} disabled />
              );
            })()}
          </React.Fragment>
        );
      });
    };
    return (
      <div className="pv-group-block">
        <QuestionRange group={group} />
        {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: formatPreviewText(group.title) }} />}
        <div className="pv-tc-scroll">
          <table className="pv-tc-table">
            {group.tableTitle && (
              <thead>
                <tr><th className="pv-tc-title-cell" colSpan={columns.length}>{group.tableTitle}</th></tr>
                <tr>{columns.map(col => <th key={col.id} className="pv-tc-header-cell">{col.header}</th>)}</tr>
              </thead>
            )}
            {!group.tableTitle && columns.some(c => c.header) && (
              <thead><tr>{columns.map(col => <th key={col.id} className="pv-tc-header-cell">{col.header}</th>)}</tr></thead>
            )}
            <tbody>
              {tableRows.map(row => (
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

  const renderPartGroup = (group) => {
    const ct = group.contentType;
    if (ct === 'READING_PASSAGE') return null;
    if (ct === 'AUDIO_TRANSCRIPT') return <AudioGroup key={group.id} group={group} />;
    if (ct === 'MAP_LABELLING') return <MapLabellingGroup key={group.id} group={group} />;
    if (ct === 'TABLE_COMPLETION') return <TableCompletionGroup key={group.id} group={group} />;
    return renderGroup(group);
  };

  return (
    <div className="pv-overlay" style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div className="pv-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── IELTS Exam Header ── */}
        <header className="pv-ielts-header" style={{ flexShrink: 0 }}>
          <div className="pv-ielts-header-left">
            <img src={resolvedLogoSrc} alt={resolvedLogoAlt} className="pv-ielts-logo-image" />
            <div className="pv-ielts-test-info">
              <span className="pv-ielts-test-name">{test.title || 'Đề thi chưa đặt tên'}</span>
              <span className="pv-ielts-test-type">{test.testType ?? 'ACADEMIC'}</span>
            </div>
          </div>

          <div className="pv-ielts-skill-tabs">
            {skillKeys.map((key) => {
              const meta = PREVIEW_SESSION_META[key];
              const Icon = meta.Icon;
              const count = (sessions[key] ?? []).reduce(
                (acc, p) => acc + (p.questionGroups ?? []).reduce((a, g) => a + (g.questions?.length ?? 0), 0), 0
              );
              return (
                <button
                  key={key}
                  className={`pv-ielts-tab${activeSkill === key ? ' active' : ''}`}
                  onClick={() => { onSetActiveSkill(key); setActiveQ(null); }}
                >
                  <Icon size={13} />
                  <span>{meta.label}</span>
                  {count > 0 && <span className="pv-tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="pv-ielts-header-right">
            <div className="pv-timer">
              <Clock size={14} />
              <span>{currentDuration === 0 ? 'Không giới hạn' : `${currentDuration}:00`}</span>
            </div>
            <span className="pv-preview-badge">XEM TRƯỚC</span>
            <button className="pv-close-btn" onClick={onClose} title="Đóng xem trước">
              ✕ Đóng
            </button>
          </div>
        </header>

        {/* ── Part instruction bar ── */}
        {activePart && (
          <div className="pv-instruction-bar" style={{ flexShrink: 0 }}>
            <strong>{activePart.name}</strong>
            {(activePart.instructions || activePart.instruction) && (
              <span
                className="pv-instruction-text"
                dangerouslySetInnerHTML={{ __html: ` — ${formatPreviewText(activePart.instructions || activePart.instruction)}` }}
              />
            )}
            <span className="pv-instruction-meta">
              {totalQ} câu hỏi · {currentDuration === 0 ? 'Không giới hạn' : `${currentDuration} phút`}
            </span>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="pv-main" style={{ flex: 1, overflow: 'auto' }}>
          {parts.length === 0 ? (
            <div className="pv-empty-state">
              <div className="pv-empty-icon"><FileText size={28} /></div>
              <div>Chưa có nội dung cho phần này.<br /><small>Thêm nhóm câu hỏi trong trình tạo đề.</small></div>
            </div>
          ) : (
            parts.map((part) => (
              <div key={part.id} className="pv-part-section">
                <div className="pv-part-banner">
                  <span className="pv-part-banner-name">{part.name}</span>
                  {(part.instructions || part.instruction) && (
                    <span
                      className="pv-part-banner-inst"
                      dangerouslySetInnerHTML={{ __html: formatPreviewText(part.instructions || part.instruction) }}
                    />
                  )}
                </div>
                {activeSkill === 'READING'
                  ? <PartReadingLayout part={part} />
                  : (part.questionGroups ?? []).map(g => renderPartGroup(g))
                }
              </div>
            ))
          )}
        </div>

        {/* ── Footer navigation ── */}
        <footer className="pv-footer" style={{ flexShrink: 0 }}>
          <div className="pv-footer-left">
            <button className="pv-set-time-btn" onClick={handleSetSkillTime}>
              <Clock size={16} />
              <span>
                Đặt thời gian
                <small>{skillMeta?.label || 'Kỹ năng'} · {currentDuration === 0 ? 'Không giới hạn' : `${currentDuration} phút`}</small>
              </span>
            </button>
            {activePart && (
              <span className="pv-footer-part-label">{activePart.name}</span>
            )}
          </div>

          <div className="pv-q-num-track">
            {allQuestions.map((q) => {
              const isActive = activeQ === q.questionNumber;
              return (
                <div key={q.id} className="pv-q-cell" onClick={() => goToQ(q.questionNumber)}>
                  <div className={`pv-q-dash${isActive ? ' active' : ''}`} />
                  <span className={`pv-q-num${isActive ? ' active' : ''}`}>{q.questionNumber}</span>
                </div>
              );
            })}
            {allQuestions.length === 0 && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Chưa có câu hỏi</span>
            )}
          </div>

          <div className="pv-footer-right">
            <span className="pv-footer-count">{totalQ > 0 ? `${totalQ} câu` : '0 câu'}</span>
          </div>
        </footer>

      </div>
    </div>
  );
};

// ---- Preview mode helpers (mirrors PreviewModal.jsx) ----
const PREVIEW_SESSION_META = {
  LISTENING: { label: 'Listening', Icon: Headphones, color: '#1d4ed8', bg: '#dbeafe', durationMinutes: 30 },
  READING: { label: 'Reading', Icon: BookOpen, color: '#15803d', bg: '#dcfce7', durationMinutes: 60 },
  WRITING: { label: 'Writing', Icon: PenLine, color: '#a16207', bg: '#fef9c3', durationMinutes: 60 },
  SPEAKING: { label: 'Speaking', Icon: Mic, color: '#be185d', bg: '#fce7f3', durationMinutes: 12 },
};

const formatPreviewText = (text) => {
  if (!text) return '';
  const normalized = normalizeRichHtml(text);
  return stripInlineStyles(preserveBlockLineBreaks(normalized));
};

// ---- Sortable wrapper ----
const SortableGroupWrapper = ({ group, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${group.id}`,
    data: { type: 'group', group, partId: group.partId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative' }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
};

// ---- Drop zone ----
const GroupDropZone = ({ partId, isOver, onAddGroup, part, paneType = 'part', label }) => {
  const { setNodeRef } = useDroppable({
    id: `canvas-drop-${partId}`,
    data: { type: paneType, partId: part?.id },
  });
  const defaultLabel = paneType === 'passage-pane'
    ? '+ Kéo "Reading Passage" vào đây'
    : '+ Kéo nhóm câu hỏi vào đây hoặc nhấn để thêm';
  return (
    <div ref={setNodeRef} className={`exam-group-drop${isOver ? ' is-over' : ''}`}
      onClick={(e) => { e.stopPropagation(); onAddGroup(part); }}>
      {isOver ? '↓ Thả xuống để thêm' : (label ?? defaultLabel)}
    </div>
  );
};

// ---- Question Item ----
const QuestionItem = ({ question, selected, onClick, onUpdate, onDelete }) => {
  const type = question.questionType?.typeName ?? question.questionType ?? 'FILL_IN_BLANK';
  return (
    <div className={`exam-question${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className="exam-q-num">{question.questionNumber ?? '?'}</div>
      <div className="exam-q-body">
        <input
          style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: 4 }}
          value={question.questionText || ''}
          placeholder="Nội dung câu hỏi..."
          onChange={(e) => onUpdate({ questionText: e.target.value })} />
        <button className="exam-q-del-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
      </div>
    </div>
  );
};

const QuestionList = ({ group, onUpdateGroup, onUpdateQuestion, onDeleteQuestion, onAddQuestion, onSelectQuestion, selectedQuestionId }) => (
  <>
    <div className="exam-q-range-header">
      Câu&nbsp;
      <input className="exam-q-range-input" value={group.fromQuestion ?? ''}
        placeholder="1"
        onChange={(e) => onUpdateGroup(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
      &nbsp;–&nbsp;
      <input className="exam-q-range-input" value={group.toQuestion ?? ''}
        placeholder="10"
        onChange={(e) => onUpdateGroup(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
    </div>

    {(group.questions ?? []).map((q) => (
      <QuestionItem key={q.id} question={q}
        selected={selectedQuestionId === q.id}
        onClick={() => onSelectQuestion(q)}
        onUpdate={(upd) => onUpdateQuestion(group.id, q.id, upd)}
        onDelete={() => onDeleteQuestion(group.id, q.id)} />
    ))}

    <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
      <Plus size={12} /> Thêm câu hỏi
    </button>
  </>
);

const GroupRenderer = ({ group, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onMoveGroupUp, onMoveGroupDown, dragHandleProps, allGroups, testTitle, testId, skill }) => {
  const selectedGroupId = selection?.type === 'group' ? selection.data.id : null;
  const selectedQuestionId = selection?.type === 'question' ? selection.data.id : null;
  const isSelected = selectedGroupId === group.id;

  const questionList = (
    <QuestionList group={group}
      onUpdateGroup={onUpdateGroup}
      onUpdateQuestion={onUpdateQuestion}
      onDeleteQuestion={onDeleteQuestion}
      onAddQuestion={onAddQuestion}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      selectedQuestionId={selectedQuestionId} />
  );

  const ct = group.contentType;

  if (ct === 'NOTE_COMPLETION') {
    return <NoteCompletionBlock group={group} allGroups={allGroups} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} testId={testId} />;
  }
  if (ct === 'IMAGE_NOTE_FORM') {
    return <ImageNoteFormBlock group={group} allGroups={allGroups} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} testId={testId} module={skill} />;
  }
  if (ct === 'MULTIPLE_CHOICE_GROUP') {
    return <MultipleChoiceBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} testTitle={testTitle} testId={testId} module={skill} />;
  }
  if (ct === 'MULTIPLE_CHOICE_MULTI') {
    return <MultipleChoiceMultiBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} testTitle={testTitle} testId={testId} module={skill} />;
  }
  if (ct === 'SHARED_OPTIONS_DROPDOWN') {
    return (
      <SharedOptionsDropdownBlock
        toolbar={(
          <GroupToolbar
            group={group}
            dragHandleProps={dragHandleProps}
            onDelete={onDeleteGroup}
            onMoveUp={onMoveGroupUp}
            onMoveDown={onMoveGroupDown}
          />
        )}
        group={group}
        onUpdate={onUpdateGroup}
        onSelect={(g) => onSelectGroup(g, g.partId)}
        selected={isSelected}
        onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
        onUpdateQuestion={onUpdateQuestion}
        onDeleteQuestion={onDeleteQuestion}
        onAddQuestion={onAddQuestion}
        selectedQuestionId={selectedQuestionId}
        testTitle={testTitle}
        testId={testId}
        module={skill}
      />
    );
  }
  if (ct === 'TRUE_FALSE_NG') {
    return <TFNGBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SENTENCE_COMPLETION') {
    return <SentenceCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SHORT_ANSWER_GROUP') {
    return <ShortAnswerBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'DRAG_MATCHING') {
    return <DragMatchingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MATCHING_FILLABLE' || ct === 'MATCHING_HEADINGS_FILLABLE') {
    return <MatchingFillBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MATCHING_FEATURES') {
    return <MatchingFeaturesBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'TABLE_COMPLETION') {
    return <TableCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MAP_LABELLING') {
    return <MapLabellingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion}
      testTitle={testTitle}
      testId={testId}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MATCHING_HEADING') {
    // Collect paragraphs only from READING_PASSAGE groups that have multi-paragraph mode enabled
    const passageParagraphs = (allGroups ?? [])
      .filter((g) => g.contentType === 'READING_PASSAGE' && g.multiParagraph)
      .flatMap((g) => g.paragraphs ?? []);
    return <MatchingHeadingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId}
      passageParagraphs={passageParagraphs} />;
  }
  if (ct === 'SUMMARY_COMPLETION') {
    return <SummaryCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SUMMARY_COMPLETION_SELECT') {
    return <SummaryCompletionSelectBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'FLOW_CHART') {
    return <FlowChartBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'WRITING_TASK') {
    return <WritingTaskBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      testTitle={testTitle} module={skill} />;
  }
  if (ct === 'SPEAKING_INTERVIEW') {
    return <SpeakingInterviewBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_CUECARD') {
    return <SpeakingCueCardBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_DISCUSSION') {
    return <SpeakingInterviewBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_PART1') {
    return <SpeakingPart1Block group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_PART2') {
    return <SpeakingPart2Block group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_PART3') {
    return <SpeakingPart3Block group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'READING_PASSAGE') {
    // Collect heading bank + answers from all MATCHING_HEADING groups in this part
    const mhGroup = (allGroups ?? []).find((g) => g.contentType === 'MATCHING_HEADING');
    const mhHeadings = mhGroup?.headingBank ?? [];
    // Build map: paraLabel → heading text (from mhGroup.questions)
    const mhAnswersByLabel = {};
    (mhGroup?.questions ?? []).forEach((q) => {
      const label = (q.questionText || '').replace(/^Section\s*/i, '').trim();
      if (label && q.answerText) mhAnswersByLabel[label] = q.answerText;
    });
    return <PassageBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      mhHeadings={mhHeadings} mhAnswersByLabel={mhAnswersByLabel} testTitle={testTitle} testId={testId} module={skill} />;
  }
  if (ct === 'AUDIO_TRANSCRIPT') {
    return <AudioBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      testTitle={testTitle} testId={testId} module={skill} />;
  }
  if (ct === 'DIAGRAM' || ct === 'MAP') {
    return <ImageBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      testTitle={testTitle} testId={testId} module={skill}>
      {questionList}
    </ImageBlock>;
  }

  // STANDALONE / TABLE / default
  return (
    <div className={`exam-group${isSelected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelectGroup(group, group.partId); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDeleteGroup} onMoveUp={onMoveGroupUp} onMoveDown={onMoveGroupDown} />
      {ct === 'TABLE' && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '8px 12px', marginBottom: 10, background: '#f9fafb', fontSize: 13, color: '#888', textAlign: 'center' }}>
          Bảng — thêm nội dung bảng trong panel bên phải
        </div>
      )}
      {questionList}
    </div>
  );
};

const PartView = ({ skill, part, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onAddGroup, onMoveGroupUp, onMoveGroupDown, isDropOver, isPassagePaneOver, isPassagePaneLocked, isMHLocked, test, testId }) => {
  const groups = part.questionGroups ?? [];

  const renderGroup = (group) => (
    <SortableGroupWrapper key={group.id} group={{ ...group, partId: part.id }}>
      {({ dragHandleProps }) => (
        <GroupRenderer
          group={{ ...group, partId: part.id }}
          allGroups={groups}
          selection={selection}
          onSelectGroup={onSelectGroup}
          onSelectQuestion={onSelectQuestion}
          onUpdateGroup={onUpdateGroup}
          onUpdateQuestion={onUpdateQuestion}
          onDeleteGroup={onDeleteGroup}
          onDeleteQuestion={onDeleteQuestion}
          onAddQuestion={onAddQuestion}
          onMoveGroupUp={onMoveGroupUp}
          onMoveGroupDown={onMoveGroupDown}
          dragHandleProps={dragHandleProps}
          testTitle={test?.title}
          testId={testId}
          skill={skill}
          showPlayCount={skill === 'LISTENING' && part.orderIndex === 1}
        />
      )}
    </SortableGroupWrapper>
  );

  if (skill === 'READING') {
    const passages = groups.filter((g) => g.contentType === 'READING_PASSAGE');
    const qGroups = groups.filter((g) => g.contentType !== 'READING_PASSAGE');
    return (
      <div className="exam-split">
        {/* LEFT: passage texts only */}
        <div className={`exam-pane passage${isPassagePaneLocked ? ' pane-locked' : ''}`}>
          {isPassagePaneLocked && (
            <div className="exam-pane-lock-overlay">Chỉ nhận <strong>Đoạn văn</strong></div>
          )}
          <SortableContext items={passages.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
            {passages.map(renderGroup)}
          </SortableContext>
          <GroupDropZone
            partId={`left-${part.id}`}
            isOver={isPassagePaneOver}
            onAddGroup={(p) => onAddGroup(p, 'READING_PASSAGE')}
            part={part}
            paneType="passage-pane"
          />
        </div>
        <div className="exam-pane-divider" />
        {/* RIGHT: question groups */}
        <div className={`exam-pane questions${isMHLocked ? ' pane-locked' : ''}`}>
          {isMHLocked && (
            <div className="exam-pane-lock-overlay">Cần bật <strong>chế độ đa đoạn</strong> ở Đoạn văn trước</div>
          )}
          <SortableContext items={qGroups.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
            {qGroups.map(renderGroup)}
          </SortableContext>
          <GroupDropZone
            partId={part.id}
            isOver={isDropOver}
            onAddGroup={onAddGroup}
            part={part}
            paneType="question-pane"
          />
        </div>
      </div>
    );
  }

  // Single-pane for Listening / Writing / Speaking
  return (
    <div className="exam-single">
      <SortableContext items={groups.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
        {groups.map(renderGroup)}
      </SortableContext>
      <GroupDropZone partId={part.id} isOver={isDropOver} onAddGroup={onAddGroup} part={part} paneType="part" />
    </div>
  );
};

const ExamCanvas = ({
  skill,
  seriesLabel = 'IELTS',
  parts,
  selection,
  onSelectGroup,
  onSelectQuestion,
  onUpdateGroup,
  onUpdateQuestion,
  onUpdatePart,
  onDeleteGroup,
  onDeleteQuestion,
  onAddQuestion,
  onAddPart,
  onAddGroup,
  onMoveGroupUp,
  onMoveGroupDown,
  dragOverPartId,
  dragOverPassagePaneId,
  draggingContentType,
  sessionDuration,
  onUpdateSessionTime,
  // Preview mode props
  mode = 'edit', // 'edit' | 'preview'
  test,
  sessions,
  sessionDurations,
  onPreviewClose,
  onSetActiveSkill,
  testId,
}) => {
  const [activePartId, setActivePartId] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [draftTimeValue, setDraftTimeValue] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showFooter, setShowFooter] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(false);
  const hideFooterTimeoutRef = useRef(null);
  const hideZoomTimeoutRef = useRef(null);
  const zoomRatio = zoomLevel / 100;
  const zoomDisplay = `${zoomLevel.toFixed(1)}%`;

  const skillLabel = useMemo(() => {
    const map = {
      LISTENING: 'Listening',
      READING: 'Reading',
      WRITING: 'Writing',
      SPEAKING: 'Speaking',
    };
    return map[skill] || skill || 'Skill';
  }, [skill]);
  const skillDefaultDuration = useMemo(() => ({
    LISTENING: 30,
    READING: 60,
    WRITING: 60,
    SPEAKING: 12,
  }[skill] ?? 60), [skill]);

  // Handle scroll to show/hide footer and zoom controls
  useEffect(() => {
    const handleScroll = () => {
      setShowFooter(true);
      setShowZoomControls(true);

      if (hideFooterTimeoutRef.current) {
        clearTimeout(hideFooterTimeoutRef.current);
      }
      if (hideZoomTimeoutRef.current) {
        clearTimeout(hideZoomTimeoutRef.current);
      }

      hideFooterTimeoutRef.current = setTimeout(() => {
        setShowFooter(false);
      }, 3000);

      hideZoomTimeoutRef.current = setTimeout(() => {
        setShowZoomControls(false);
      }, 3000);
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (hideFooterTimeoutRef.current) {
        clearTimeout(hideFooterTimeoutRef.current);
      }
      if (hideZoomTimeoutRef.current) {
        clearTimeout(hideZoomTimeoutRef.current);
      }
    };
  }, []);

  // Handle zoom with touchpad (Ctrl + scroll)
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY;
        setZoomLevel((prev) => {
          const newZoom = prev - delta * 1.33;
          return Math.round(Math.max(50, Math.min(150, newZoom)) * 10) / 10;
        });

        // Show zoom controls when zooming
        setShowZoomControls(true);
        if (hideZoomTimeoutRef.current) {
          clearTimeout(hideZoomTimeoutRef.current);
        }
        hideZoomTimeoutRef.current = setTimeout(() => {
          setShowZoomControls(false);
        }, 3000);
      }
    };

    const canvas = document.querySelector('.tb-canvas');
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Reset active part when skill changes
  useEffect(() => { setActivePartId(null); }, [skill]);

  // ── PREVIEW MODE: render student exam view ──
  if (mode === 'preview') {
    return (
      <div className="tb-canvas" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
        <PreviewContent
          test={test}
          sessions={sessions}
          sessionDurations={sessionDurations}
          activeSkill={skill}
          onSetActiveSkill={onSetActiveSkill || (() => { })}
          onClose={onPreviewClose || (() => { })}
          seriesLabel={seriesLabel}
        />
      </div>
    );
  }

  const activePart = useMemo(() => {
    if (parts.length === 0) return null;
    return parts.find((p) => p.id === activePartId) ?? parts[0];
  }, [parts, activePartId]);

  const currentDuration = Number.isFinite(sessionDuration) ? sessionDuration : skillDefaultDuration;
  const resolvedLogoSrc = SERIES_LOGO_SRC[seriesLabel] || SERIES_LOGO_SRC.IELTS;
  const resolvedLogoAlt = seriesLabel || 'IELTS';

  const handleSetPartTime = () => {
    setDraftTimeValue(String(currentDuration));
    setShowTimeModal(true);
  };

  const confirmSetPartTime = () => {
    const nextValue = Number.parseInt(String(draftTimeValue).trim(), 10);
    if (!Number.isFinite(nextValue) || nextValue < 0) return;
    if (onUpdateSessionTime) {
      onUpdateSessionTime(skill, nextValue);
    }
    setShowTimeModal(false);
  };

  const resetPartTime = () => {
    setDraftTimeValue(String(skillDefaultDuration));
  };

  const closeTimeModal = () => {
    setShowTimeModal(false);
  };

  if (parts.length === 0) {
    return (
      <div className="tb-canvas">
        <div className="tb-canvas-empty">
          <div className="tb-canvas-empty-icon"><FileText size={36} /></div>
          <h3>Chưa có Part nào</h3>
          <p>Nhấn nút bên dưới để bắt đầu tạo đề</p>
          <button className="exam-add-btn" style={{ marginTop: 8 }} onClick={onAddPart}>
            <Plus size={13} /> Thêm Part mới
          </button>
        </div>
      </div>
    );
  }

  const isDropOver = !!dragOverPartId && (
    dragOverPartId === `part-${activePart?.id}` ||
    dragOverPartId === `canvas-drop-${activePart?.id}`
  );

  const activePartInstructionText = toPlainText(activePart?.instructions);
  const activePartInstructionHtml = normalizeRichHtml(activePart?.instructions || '');

  // For Reading: passage pane highlights when dragging a READING_PASSAGE over the left pane
  const isPassagePaneOver = !!dragOverPassagePaneId && (
    dragOverPassagePaneId === `canvas-drop-left-${activePart?.id}`
  );
  // Locked = đang kéo một item KHÔNG phải READING_PASSAGE
  const isPassagePaneLocked = !!draggingContentType && draggingContentType !== 'READING_PASSAGE';
  // MH locked = đang kéo MATCHING_HEADING nhưng part chưa có READING_PASSAGE với multiParagraph
  const isMHLocked = draggingContentType === 'MATCHING_HEADING' && !(activePart?.questionGroups ?? []).some(
    (g) => g.contentType === 'READING_PASSAGE' && g.multiParagraph === true
  );

  return (
    <div className="tb-canvas" onClick={() => { }} style={{ position: 'relative' }}>
      {/* Zoom controls */}
      {showZoomControls && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 100,
          display: 'flex',
          gap: 4,
          background: 'white',
          padding: '4px 8px',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          alignItems: 'center',
          transition: 'opacity 0.3s ease',
          opacity: showZoomControls ? 1 : 0
        }}>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(50, Math.round((prev - 10) * 10) / 10))}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
            title="Thu nhỏ"
          >
            −
          </button>
          <span style={{ fontSize: 12, color: '#64748b', minWidth: 45, textAlign: 'center' }}>
            {zoomDisplay}
          </span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(150, Math.round((prev + 10) * 10) / 10))}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
            title="Phóng to"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              background: 'white',
              cursor: 'pointer',
              fontSize: 11,
              marginLeft: 4
            }}
            title="Đặt lại 100%"
          >
            Reset
          </button>
        </div>
      )}

      {/* Part tabs */}
      <div className="tb-part-tabs">
        {parts.map((p) => {
          const questionCount = (p.questionGroups ?? []).reduce((sum, g) => {
            if (g.contentType === 'AUDIO_TRANSCRIPT') return sum;
            return sum + (g.questions ?? []).reduce((qSum, q) => qSum + (q.questionCount || 1), 0);
          }, 0);
          return (
            <button key={p.id}
              className={`tb-part-tab${activePart?.id === p.id ? ' active' : ''}`}
              onClick={() => setActivePartId(p.id)}>
              {p.name || `Part ${p.orderIndex}`}
              <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>
                ({questionCount} câu)
              </span>
            </button>
          );
        })}
        <button className="tb-part-tab-add" title="Thêm Part mới" onClick={onAddPart}>+</button>
      </div>

      {/* Exam paper with zoom */}
      {activePart && (
        <div className="exam-viewport-shell" style={{ zoom: String(zoomRatio) }}>
          <div className="exam-viewport">
            {/* Mocked exam header */}
            <div className="exam-mock-header">
              <img
                src={resolvedLogoSrc}
                alt={resolvedLogoAlt}
                className="exam-mock-logo-image"
              />
              <div className="exam-mock-info">
                <span>Nguyễn Văn A</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>ID: 12345678</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span className="exam-mock-timer">
                  {currentDuration === 0 ? 'No limit' : `${String(currentDuration).padStart(2, '0')}:00`}
                </span>
                <button type="button" className="exam-mock-time-btn" onClick={handleSetPartTime}>
                  <Clock size={14} />
                  <span>
                    Đặt thời gian
                    <small>{skillLabel} · {currentDuration === 0 ? 'Không giới hạn' : `${currentDuration} phút`}</small>
                  </span>
                </button>
              </div>
            </div>

            {/* Part instruction bar */}
            <div className="exam-instruction">
              <div><strong>{activePart.name}</strong></div>
              {activePartInstructionText && (
                <div style={{ marginTop: '4px' }} dangerouslySetInnerHTML={{ __html: activePartInstructionHtml }} />
              )}
              {!activePartInstructionText && (
                <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: '4px' }}>Chọn Part để thêm hướng dẫn</div>
              )}
            </div>

            {/* WYSIWYG content */}
            <div className="exam-body">
              <PartView
                skill={skill}
                part={activePart}
                selection={selection}
                onSelectGroup={onSelectGroup}
                onSelectQuestion={onSelectQuestion}
                onUpdateGroup={onUpdateGroup}
                onUpdateQuestion={onUpdateQuestion}
                onDeleteGroup={onDeleteGroup}
                onDeleteQuestion={onDeleteQuestion}
                onAddQuestion={onAddQuestion}
                onAddGroup={onAddGroup}
                onMoveGroupUp={onMoveGroupUp}
                onMoveGroupDown={onMoveGroupDown}
                isDropOver={isDropOver}
                isPassagePaneOver={isPassagePaneOver}
                isPassagePaneLocked={isPassagePaneLocked}
                isMHLocked={isMHLocked}
                test={test}
                testId={testId} />
            </div>
          </div>
        </div>
      )}

      {showTimeModal && createPortal(
        <div className="exam-time-modal-overlay" onClick={closeTimeModal}>
          <div className="exam-time-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exam-time-modal-header">
              <div className="exam-time-modal-icon">
                <Clock size={18} />
              </div>
              <div>
                <h3>Đặt thời gian</h3>
                <p>{skillLabel}</p>
              </div>
            </div>

            <div className="exam-time-modal-body">
              <label className="exam-time-modal-label">Số phút</label>
              <input
                type="number"
                min={0}
                className="exam-time-modal-input"
                value={draftTimeValue}
                onChange={(e) => setDraftTimeValue(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                autoFocus
              />
              <div className="exam-time-modal-hint">
                Thời gian này áp dụng cho toàn bộ kỹ năng <strong>{skillLabel}</strong>.
              </div>
            </div>

            <div className="exam-time-modal-actions">
              <button type="button" className="exam-time-modal-btn secondary" onClick={closeTimeModal}>
                Hủy
              </button>
              <button type="button" className="exam-time-modal-btn ghost" onClick={resetPartTime}>
                <TimerReset size={14} /> Mặc định
              </button>
              <button type="button" className="exam-time-modal-btn primary" onClick={confirmSetPartTime}>
                <Check size={14} /> Lưu
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExamCanvas;
