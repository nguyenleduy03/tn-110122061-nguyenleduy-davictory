/**
 * PreviewModal.jsx
 * Student-view preview — styled like the real IELTS exam interface.
 */
import React, { useState, useMemo } from 'react';
import { X, Volume2, BookOpen, Headphones, PenLine, Mic, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

// ---- Helpers (mirrors ExamCanvas) ----
const toRoman = (n) => {
  const nums = [1, 4, 5, 9, 10, 40, 50];
  const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
  let r = '';
  for (let i = syms.length - 1; i >= 0; i--) {
    while (n >= nums[i]) { r += syms[i]; n -= nums[i]; }
  }
  return r;
};

const parseSummaryPreview = (text, questions, activeQ, onSetActive) => {
  const parts = (text || '').split(/\[blank\]/gi);
  return parts.map((part, i) => {
    if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
    const q = questions[i];
    const num = q?.questionNumber ?? i + 1;
    const isActive = activeQ === num;
    return (
      <React.Fragment key={i}>
        {part}
        <span
          className={`pv-blank-box${isActive ? ' active' : ''}`}
          onClick={() => onSetActive(num)}
        >{num}</span>
      </React.Fragment>
    );
  });
};

// Inline input version — for Note/Form Completion: input boxes embedded directly in the text
const parseNotePreview = (text, questions, activeQ, onSetActive, answers, onAnswer) => {
  const parts = (text || '').split(/\[blank\]/gi);
  return parts.map((part, i) => {
    if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
    const q = questions[i];
    const num = q?.questionNumber ?? i + 1;
    const isActive = activeQ === num;
    return (
      <React.Fragment key={i}>
        {part}
        <input
          className={`pv-note-inline-input${isActive ? ' active' : ''}`}
          value={answers?.[num] ?? ''}
          onChange={(e) => onAnswer?.(num, e.target.value)}
          onFocus={() => onSetActive(num)}
          placeholder={String(num)}
          onClick={(e) => e.stopPropagation()}
        />
      </React.Fragment>
    );
  });
};

const SESSION_META = {
  LISTENING: { label: 'Listening', Icon: Headphones, color: '#1d4ed8', bg: '#dbeafe', durationMinutes: 30 },
  READING:   { label: 'Reading',   Icon: BookOpen,   color: '#15803d', bg: '#dcfce7', durationMinutes: 60 },
  WRITING:   { label: 'Writing',   Icon: PenLine,    color: '#a16207', bg: '#fef9c3', durationMinutes: 60 },
  SPEAKING:  { label: 'Speaking',  Icon: Mic,        color: '#be185d', bg: '#fce7f3', durationMinutes: 15 },
};

// ---- Question renderers ----

const TFNGQuestion = ({ q, active, onSetActive }) => (
  <div className={`pv-q${active ? ' pv-q-active' : ''}`} onClick={() => onSetActive(q.questionNumber)}>
    <div className="pv-q-row">
      <span className={`pv-q-num-badge${active ? ' active' : ''}`}>{q.questionNumber}</span>
      <span className="pv-q-text">
        {q.questionText
          ? <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
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
            ? <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
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
                  : (o.optionText || <em className="pv-empty">...</em>)
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
            ? <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
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
          ? <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
          : <em className="pv-empty">Chưa có nội dung câu hỏi</em>}
      </span>
    </div>
    <textarea className="pv-textarea" disabled placeholder="Nhập câu trả lời..." rows={3} />
  </div>
);

const renderQuestion = (q, activeQ, onSetActive) => {
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

// ---- Group renderers ----

// Render a single passage group in the LEFT pane.
// mhAnswers: { [paraId]: { text, roman } | null } — heading assigned to each para
// onDropHeading(paraId, headingData) — called when user drops a heading chip
// onClearHeading(paraId) — called when user clicks × on filled slot
const PassageGroupPane = ({ group, mhAnswers = {}, onDropHeading, onClearHeading, hasMH = false }) => {
  const paragraphs = group.paragraphs && group.paragraphs.length > 0
    ? group.paragraphs
    : [{ id: `${group.id}-p0`, heading: '', text: group.passageText || '' }];
  const [overSlot, setOverSlot] = useState(null);

  return (
    <div style={{ marginBottom: 20 }}>
      {group.title && <div className="pv-passage-title" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {paragraphs.map((para, idx) => {
        const filled = mhAnswers[para.id];
        const isOver = overSlot === para.id;
        return (
          <div key={para.id ?? idx} style={{ marginBottom: 14 }}>
            {/* Heading slot — only show when there is a MatchingHeading group */}
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
                  } catch {}
                }}
              >
                <span className="pv-para-num">§{idx + 1}</span>
                {filled ? (
                  <div className="pv-para-heading-badge">
                    {filled.roman && <span className="pv-heading-roman">{filled.roman}</span>}
                    <span dangerouslySetInnerHTML={{ __html: filled.text }} />
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
                ? <div dangerouslySetInnerHTML={{ __html: para.text }} />
                : <em className="pv-empty">Chưa có nội dung đoạn {idx + 1}.</em>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AudioGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <div className="pv-audio-bar">
        <Volume2 size={16} style={{ flexShrink: 0 }} />
        {group.audioUrl
          ? <audio controls src={group.audioUrl} className="pv-audio-player" />
          : <span className="pv-audio-placeholder">Audio chưa được tải lên</span>}
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// In preview: only shows the heading bank (draggable chips).
// Answers are tracked in PartReadingLayout and displayed on passage paragraphs.
// assignedTexts: Set of heading texts already placed on a paragraph
const MatchingHeadingGroup = ({ group, assignedTexts = new Set() }) => {
  const headings = group.headingBank ?? [];
  const questions = group.questions ?? [];
  const first = questions[0]?.questionNumber;
  const last  = questions[questions.length - 1]?.questionNumber;
  const [dragging, setDragging] = useState(null);

  return (
    <div className="pv-group-block">
      {/* Question range label */}
      {first != null && (
        <div className="pv-questions-range">
          Questions {first}{last != null && last !== first ? `–${last}` : ''}
        </div>
      )}
      {group.title && <div className="pv-group-instructions" style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: group.title }} />}

      {/* Heading bank */}
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
                      ? <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: h.text }} />
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

const SummaryGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      {group.instructions && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.instructions }} />
      )}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: group.title }} />}
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

const NoteCompletionGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const [answers, setAnswers] = useState({});
  const handleAnswer = (num, val) => setAnswers((prev) => ({ ...prev, [num]: val }));
  return (
    <div className="pv-group-block">
      {group.instructions && (
        <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.instructions }} />
      )}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: group.title }} />}
      <div className="pv-note-text">
        {parseNotePreview(group.noteText, questions, activeQ, onSetActive, answers, handleAnswer)}
      </div>
    </div>
  );
};

const DragMatchingGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text }));

  // answers: { questionNumber -> { id, text } | null }
  const [answers, setAnswers] = useState({});
  const [dragId, setDragId] = useState(null); // id of chip being dragged
  const [dragOver, setDragOver] = useState(null); // questionNumber of gap being hovered

  // chips still in the bank = options not placed anywhere
  const placed = new Set(Object.values(answers).filter(Boolean).map((v) => v.id));
  const bankChips = allOptions.filter((o) => !placed.has(o.id));

  const placeChip = (qNum, chip) => {
    setAnswers((prev) => {
      // if this chip was in another slot, remove it first
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
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.instructions }} />}
      <div className="pv-dm-layout">
        {/* Left: items + drop zones */}
        <div className="pv-dm-left">
          {group.leftTitle && <div className="pv-dm-col-header">{group.leftTitle}</div>}
          {questions.map((q) => {
            const active = activeQ === q.questionNumber;
            const filled = answers[q.questionNumber];
            const isOver = dragOver === q.questionNumber;
            return (
              <div key={q.id} className={`pv-dm-row${active ? ' active' : ''}`}
                onClick={() => onSetActive(q.questionNumber)}>
                <span className="pv-dm-item-name">
                  {q.questionText
                    ? <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
                    : <em className="pv-empty">...</em>}
                </span>
                {/* Drop zone */}
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
                    ? <span className="pv-dm-gap-filled">{filled.text}</span>
                    : <span className="pv-dm-gap-num">{q.questionNumber}</span>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: word bank */}
        <div className="pv-dm-right">
          {group.rightTitle && <div className="pv-dm-col-header">{group.rightTitle}</div>}
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
                {chip.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MapLabellingGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text }));
  const [answers, setAnswers] = useState({});
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const placed = new Set(Object.values(answers).filter(Boolean).map((v) => v.id));
  const bankChips = allOptions.filter((o) => !placed.has(o.id));

  const placeChip = (qNum, chip) => {
    setAnswers((prev) => {
      const next = { ...prev };
      // remove chip from any other slot first
      Object.keys(next).forEach((k) => { if (next[k]?.id === chip.id) next[k] = null; });
      next[qNum] = chip;
      return next;
    });
    onSetActive(qNum);
  };

  return (
    <div className="pv-group-block">
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.instructions }} />}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: group.title }} />}
      <div className="pv-ml-layout">
        {/* Image area with positioned drop pins */}
        <div className="pv-ml-image-wrapper">
          {group.imageUrl
            ? <img src={group.imageUrl} alt="map" draggable={false} style={{ display: 'block', width: `${group.imageWidth ?? 100}%`, height: 'auto' }} />
            : <div className="pv-diagram-placeholder">🗺️ Bản đồ chưa được tải lên</div>
          }
          {questions.map((q) => {
            const filled = answers[q.questionNumber] ?? null;
            const isOver = dragOver === q.questionNumber;
            const active = activeQ === q.questionNumber;
            return (
              <div key={q.id}
                className={`pv-ml-pin${filled ? ' filled' : ''}${isOver ? ' drag-over' : ''}${active ? ' active' : ''}`}
                style={{ left: `${q.pinX ?? 10}%`, top: `${q.pinY ?? 10}%`, minWidth: `${group.pinBoxWidth ?? 60}px` }}
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

        {/* Word bank */}
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

const TableCompletionGroup = ({ group, activeQ, onSetActive }) => {
  const columns   = group.columns   ?? [];
  const tableRows = group.tableRows ?? [];
  const questions = group.questions ?? [];
  const [answers, setAnswers] = React.useState({});

  // Pre-compute blank→question mapping in reading order
  const blankMap = React.useMemo(() => {
    const map = []; // [{ rowId, colId, qNum }]
    for (const row of tableRows) {
      for (const col of columns) {
        const n = ((row.cells?.[col.id] ?? '').match(/\[blank\]/g) ?? []).length;
        for (let i = 0; i < n; i++) {
          map.push({ rowId: row.id, colId: col.id, qNum: questions[map.length]?.questionNumber ?? (group.fromQuestion ?? 1) + map.length });
        }
      }
    }
    return map;
  }, [tableRows, columns, questions, group.fromQuestion]);

  const parseBold = (text) =>
    text.split(/\*\*(.*?)\*\*/).map((chunk, i) =>
      i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
    );

  const renderCell = (cellText, rowId, colId) => {
    const parts = (cellText ?? '').split('[blank]');
    let localIdx = blankMap.filter((b) => {
      // count blanks that come before this cell in reading order
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
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.instructions }} />}
      {group.title && <div className="pv-summary-title" dangerouslySetInnerHTML={{ __html: group.title }} />}
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


// Flow-chart Completion — boxes connected by arrows, blanks are drag-and-drop targets
const FlowChartGroup = ({ group, activeQ, onSetActive }) => {
  const flowNodes = group.flowNodes ?? [];
  const questions = group.questions ?? [];
  const allOptions = (group.optionBank ?? []).map((o, i) => ({ id: i, text: o.text }));

  const [answers, setAnswers] = useState({});
  const [dragId, setDragId]   = useState(null);
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

  // Build a flat list of {blankIndex, subQ} in reading order across all nodes
  const blanks = [];
  for (const node of flowNodes) {
    const n = (node.text ?? '').split(/\[blank\]/gi).length - 1;
    for (let i = 0; i < n; i++) {
      blanks.push(questions[blanks.length] ?? null);
    }
  }

  // Render node text with blanks replaced by interactive drop-zones
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
              ? <span className="pv-fc-blank-text">{filled.text}</span>
              : <span className="pv-fc-blank-num">{qNum ?? '?'}</span>
            }
          </span>
        </React.Fragment>
      );
    });
  };

  // Calculate blank offsets per node
  let blankCursor = 0;
  const nodesWithOffset = flowNodes.map((node) => {
    const offset = blankCursor;
    blankCursor += (node.text ?? '').split(/\[blank\]/gi).length - 1;
    return { node, offset };
  });

  return (
    <div className="pv-group-block" onClick={(e) => e.stopPropagation()}>
      {group.instructions && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.instructions }} />}
      <div className="pv-fc-layout">
        {/* Left: flow chart */}
        <div className="pv-fc-chart">
          {group.title && <div className="pv-fc-chart-title" dangerouslySetInnerHTML={{ __html: group.title }} />}
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

        {/* Right: word bank */}
        <div className="pv-fc-bank">
          {group.bankTitle && <div className="pv-dm-col-header">{group.bankTitle}</div>}
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
                  {chip.text}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const StandaloneGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// ── Speaking: Interview Group (Part 1 & 3)
const SpeakingInterviewGroup = ({ group }) => {
  const questions = group.questions ?? [];
  const isP3 = group.interviewType === 'PART3';
  return (
    <div className="pv-spk-interview">
      <div className={`pv-spk-chip${isP3 ? ' pv-spk-chip--p3' : ' pv-spk-chip--p1'}`}>
        {isP3 ? '💬 Part 3 · Two-way Discussion' : '🎤 Part 1 · Interview'}
      </div>
      {group.partInstruction && (
        <div className="pv-spk-instruction" dangerouslySetInnerHTML={{ __html: group.partInstruction }} />
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
                    ? <span dangerouslySetInnerHTML={{ __html: q.text }} />
                    : <em className="pv-empty">Chưa có nội dung.</em>}
                </span>
                <span className="pv-spk-mic-badge" title="Ghi âm">🎤</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

// ── Speaking: Cue Card Group (Part 2)
const SpeakingCueCardGroup = ({ group }) => {
  const bulletPoints = (group.bulletPoints ?? []).filter(Boolean);
  const prepSec = group.prepSeconds ?? 60;
  return (
    <div className="pv-spk-cuecard-wrapper">
      <div className="pv-spk-prep-chip">⏳ Thời gian chuẩn bị: {prepSec}s</div>
      <div className="pv-spk-cuecard">
        <div className="pv-spk-cc-topic">
          {group.topic
            ? <span dangerouslySetInnerHTML={{ __html: group.topic }} />
            : <em className="pv-empty">Chưa có chủ đề.</em>}
        </div>
        {(bulletPoints.length > 0 || group.closingSentence) && (
          <>
            <div className="pv-spk-cc-youshould">{group.shouldSayLabel || 'You should say:'}</div>
            <ul className="pv-spk-cc-bullets">
              {bulletPoints.map((bp, i) => <li key={i}>{bp}</li>)}
            </ul>
            {group.closingSentence && (
              <div className="pv-spk-cc-closing">{group.closingSentence}</div>
            )}
          </>
        )}
      </div>
      <div className="pv-spk-cc-hint">🎤 Nói trong 1–2 phút sau khi chuẩn bị xong</div>
    </div>
  );
};

// Writing Task Group — split layout: left=prompt+image, right=textarea+word count
const WritingTaskGroup = ({ group }) => {
  const [text, setText] = React.useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const minWords = group.minWords ?? 150;
  const isUnder = wordCount < minWords;

  return (
    <div className="pv-wt-container">
      {/* Left: task prompt + image */}
      <div className="pv-wt-left">
        {group.recommendedMinutes && (
          <div className="pv-wt-time-hint">
            ⏱ Nên dành khoảng {group.recommendedMinutes} phút · Viết ít nhất {minWords} từ
          </div>
        )}
        <div className="pv-wt-instruction">
          {group.taskInstruction
            ? <div dangerouslySetInnerHTML={{ __html: group.taskInstruction }} />
            : <em className="pv-empty">Chưa có đề bài.</em>}
        </div>
        {group.imageUrl && (
          <img src={group.imageUrl} alt="task diagram" className="pv-wt-image" />
        )}
      </div>

      {/* Right: textarea + word count */}
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

// Multiple Choice group — instructions banner + list of MCQ questions
const MCQGroup = ({ group, activeQ, onSetActive, multi = false }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <div className="pv-mc-instructions">
        {multi
          ? <>Choose <strong>TWO</strong> letters, <strong>A–E</strong>.</>
          : <>Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.</>
        }
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Sentence Completion group
const SentenceCompletionGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <div className="pv-mc-instructions">
        Complete the sentences. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

// Short Answer group
const ShortAnswerGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      <div className="pv-mc-instructions">
        Answer the questions. Write <strong>NO MORE THAN THREE WORDS</strong> for each answer.
      </div>
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

const ImageGroup = ({ group, activeQ, onSetActive }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group-block">
      {group.title && <div className="pv-group-instructions" dangerouslySetInnerHTML={{ __html: group.title }} />}
      {group.imageUrl
        ? <img src={group.imageUrl} alt="diagram" className="pv-diagram-img" />
        : <div className="pv-diagram-placeholder">{group.contentType === 'MAP' ? '🗺️ Bản đồ chưa được tải lên' : '📊 Sơ đồ chưa được tải lên'}</div>}
      {questions.map((q) => renderQuestion(q, activeQ, onSetActive))}
    </div>
  );
};

const renderGroup = (group, activeQ, onSetActive) => {
  const ct = group.contentType;
  const props = { key: group.id, group, activeQ, onSetActive };
  // READING_PASSAGE is rendered via PartReadingLayout, not inline here
  if (ct === 'READING_PASSAGE') return null;
  if (ct === 'AUDIO_TRANSCRIPT') return <AudioGroup {...props} />;
  if (ct === 'MATCHING_HEADING') return <MatchingHeadingGroup {...props} />;
  if (ct === 'DRAG_MATCHING') return <DragMatchingGroup {...props} />;
  if (ct === 'TABLE_COMPLETION') return <TableCompletionGroup {...props} />;
  if (ct === 'MAP_LABELLING') return <MapLabellingGroup {...props} />;
  if (ct === 'SUMMARY_COMPLETION') return <SummaryGroup {...props} />;
  if (ct === 'NOTE_COMPLETION') return <NoteCompletionGroup {...props} />;
  if (ct === 'FLOW_CHART') return <FlowChartGroup {...props} />;
  if (ct === 'WRITING_TASK') return <WritingTaskGroup key={group.id} group={group} />;
  if (ct === 'SPEAKING_INTERVIEW') return <SpeakingInterviewGroup key={group.id} group={group} />;
  if (ct === 'SPEAKING_CUECARD') return <SpeakingCueCardGroup key={group.id} group={group} />;
  if (ct === 'DIAGRAM' || ct === 'MAP') return <ImageGroup {...props} />;
  if (ct === 'MULTIPLE_CHOICE_GROUP') return <MCQGroup {...props} multi={false} />;
  if (ct === 'MULTIPLE_CHOICE_MULTI') return <MCQGroup {...props} multi={true} />;
  if (ct === 'SENTENCE_COMPLETION') return <SentenceCompletionGroup {...props} />;
  if (ct === 'SHORT_ANSWER_GROUP') return <ShortAnswerGroup {...props} />;
  return <StandaloneGroup {...props} />;
};

// Reading: split layout — passages LEFT (with heading drop slots), question groups RIGHT
// PartReadingLayout owns the mhAnswers state so both panes can share it.
// mhAnswers: { [paraId]: { text, roman } }
const PartReadingLayout = ({ part, activeQ, onSetActive }) => {
  const groups = part.questionGroups ?? [];
  const passages = groups.filter((g) => g.contentType === 'READING_PASSAGE');
  const qGroups  = groups.filter((g) => g.contentType !== 'READING_PASSAGE');
  const mhGroups = qGroups.filter((g) => g.contentType === 'MATCHING_HEADING');
  const hasMH    = mhGroups.length > 0;

  // mhAnswers[paraId] = { text, roman } | undefined
  const [mhAnswers, setMhAnswers] = useState({});

  const assignedTexts = new Set(
    Object.values(mhAnswers).filter(Boolean).map((v) => v.text)
  );

  const handleDrop = (paraId, data) => {
    setMhAnswers((prev) => {
      const next = { ...prev };
      // Remove this heading from any other para first
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

// ---- Main modal ----

const PreviewModal = ({ test, sessions, onClose }) => {
  const skillKeys = Object.keys(SESSION_META);
  const [activeSkill, setActiveSkill] = useState(skillKeys[0] ?? 'LISTENING');
  const [activeQ, setActiveQ] = useState(null);

  const parts = sessions[activeSkill] ?? [];

  // Flat list of all questions for current skill (for footer nav)
  const allQuestions = useMemo(() =>
    parts.flatMap((p) =>
      (p.questionGroups ?? []).flatMap((g) => g.questions ?? [])
    ), [parts]);

  const totalQ = allQuestions.length;

  const goToQ = (num) => setActiveQ(num);

  const goPrev = () => {
    const idx = allQuestions.findIndex((q) => q.questionNumber === activeQ);
    if (idx > 0) setActiveQ(allQuestions[idx - 1].questionNumber);
    else if (allQuestions.length > 0) setActiveQ(allQuestions[0].questionNumber);
  };

  const goNext = () => {
    const idx = allQuestions.findIndex((q) => q.questionNumber === activeQ);
    if (idx < allQuestions.length - 1) setActiveQ(allQuestions[idx + 1].questionNumber);
  };

  // Part info for footer
  const activePart = parts.find((p) =>
    (p.questionGroups ?? []).some((g) =>
      (g.questions ?? []).some((q) => q.questionNumber === activeQ)
    )
  ) ?? parts[0];

  const skillMeta = SESSION_META[activeSkill];

  return (
    <div className="pv-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pv-shell">

        {/* ── IELTS Exam Header ── */}
        <header className="pv-ielts-header">
          <div className="pv-ielts-header-left">
            <span className="pv-ielts-logo">IELTS</span>
            <div className="pv-ielts-test-info">
              <span className="pv-ielts-test-name">{test.title || 'Đề thi chưa đặt tên'}</span>
              <span className="pv-ielts-test-type">{test.testType ?? 'ACADEMIC'}</span>
            </div>
          </div>

          <div className="pv-ielts-skill-tabs">
            {skillKeys.map((key) => {
              const meta = SESSION_META[key];
              const Icon = meta.Icon;
              const count = (sessions[key] ?? []).reduce(
                (acc, p) => acc + (p.questionGroups ?? []).reduce((a, g) => a + (g.questions?.length ?? 0), 0), 0
              );
              return (
                <button
                  key={key}
                  className={`pv-ielts-tab${activeSkill === key ? ' active' : ''}`}
                  onClick={() => { setActiveSkill(key); setActiveQ(null); }}
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
              <span>{skillMeta?.durationMinutes ?? 60}:00</span>
            </div>
            <span className="pv-preview-badge">XEM TRƯỚC</span>
            <button className="pv-close-btn" onClick={onClose} title="Đóng xem trước">
              <X size={18} /> Đóng
            </button>
          </div>
        </header>

        {/* ── Part instruction bar ── */}
        {activePart && (
          <div className="pv-instruction-bar">
            <strong>{activePart.name}</strong>
            {activePart.instructions && (
              <span className="pv-instruction-text"> — {activePart.instructions}</span>
            )}
            <span className="pv-instruction-meta">
              {totalQ} câu hỏi · {skillMeta?.durationMinutes ?? 60} phút
            </span>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="pv-main">
          {parts.length === 0 ? (
            <div className="pv-empty-state">
              <div className="pv-empty-icon">📄</div>
              <div>Chưa có nội dung cho phần này.<br /><small>Thêm nhóm câu hỏi trong trình tạo đề.</small></div>
            </div>
          ) : (
            parts.map((part) => (
              <div key={part.id} className="pv-part-section">
                <div className="pv-part-banner">
                  <span className="pv-part-banner-name">{part.name}</span>
                  {part.instructions && <span className="pv-part-banner-inst">{part.instructions}</span>}
                </div>
                {activeSkill === 'READING'
                  ? <PartReadingLayout part={part} activeQ={activeQ} onSetActive={goToQ} />
                  : activeSkill === 'SPEAKING'
                    ? <div className="pv-spk-layout">{(part.questionGroups ?? []).map((g) => renderGroup(g, activeQ, goToQ))}</div>
                    : (part.questionGroups ?? []).map((g) => renderGroup(g, activeQ, goToQ))
                }
              </div>
            ))
          )}
        </div>

        {/* ── Footer navigation ── */}
        <footer className="pv-footer">
          <div className="pv-footer-left">
            <button className="pv-nav-btn" onClick={goPrev} disabled={!activeQ || allQuestions[0]?.questionNumber === activeQ}>
              <ChevronLeft size={18} />
            </button>
            <button className="pv-nav-btn" onClick={goNext} disabled={!activeQ || allQuestions[allQuestions.length - 1]?.questionNumber === activeQ}>
              <ChevronRight size={18} />
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
            <span className="pv-footer-count">
              {totalQ > 0 ? `${totalQ} câu` : '0 câu'}
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default PreviewModal;
