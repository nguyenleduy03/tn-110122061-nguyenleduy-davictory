/**
 * PreviewModal.jsx
 * Read-only student-view preview of the exam being built.
 */
import React, { useState } from 'react';
import { X, Volume2, BookOpen, Headphones, PenLine, Mic } from 'lucide-react';

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

const parseSummaryPreview = (text, questions) => {
  const parts = (text || '').split(/\[blank\]/gi);
  return parts.map((part, i) => {
    if (i >= parts.length - 1) return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
    const q = questions[i];
    const num = q?.questionNumber ?? i + 1;
    return (
      <React.Fragment key={i}>
        {part}
        <span className="pv-blank-box">{num}</span>
      </React.Fragment>
    );
  });
};

const SESSION_META = {
  LISTENING: { label: 'Listening', Icon: Headphones, color: '#1d4ed8', bg: '#dbeafe' },
  READING:   { label: 'Reading',   Icon: BookOpen,   color: '#15803d', bg: '#dcfce7' },
  WRITING:   { label: 'Writing',   Icon: PenLine,    color: '#a16207', bg: '#fef9c3' },
  SPEAKING:  { label: 'Speaking',  Icon: Mic,        color: '#be185d', bg: '#fce7f3' },
};

// ---- Question renderers (read-only) ----

const TFNGQuestion = ({ q }) => (
  <div className="pv-q">
    <div className="pv-q-num-text">
      <span className="pv-q-num">{q.questionNumber}</span>
      <span className="pv-q-text">{q.questionText || <em className="pv-empty">Chưa có nội dung</em>}</span>
    </div>
    <div className="pv-tfng-opts">
      {['True', 'False', 'Not Given'].map((label) => (
        <label key={label} className="pv-tfng-option">
          <input type="radio" name={`q${q.id}`} disabled />
          <span>{label}</span>
        </label>
      ))}
    </div>
  </div>
);

const MCQQuestion = ({ q, multiple }) => {
  const opts = q.options ?? [];
  return (
    <div className="pv-q">
      {multiple && (
        <div className="pv-choose-n">
          Chọn <strong>{q.chooseCount ?? 2}</strong> đáp án đúng
        </div>
      )}
      <div className="pv-q-num-text">
        <span className="pv-q-num">{q.questionNumber}</span>
        <span className="pv-q-text">{q.questionText || <em className="pv-empty">Chưa có nội dung</em>}</span>
      </div>
      <div className="pv-opts">
        {opts.length === 0
          ? <em className="pv-empty">Chưa có lựa chọn</em>
          : opts.map((o) => (
            <label key={o.id} className="pv-opt">
              <input type={multiple ? 'checkbox' : 'radio'} name={`q${q.id}`} disabled />
              <span className="pv-opt-label">{o.optionLabel}.</span>
              <span>{o.optionText || <em className="pv-empty">...</em>}</span>
            </label>
          ))
        }
      </div>
    </div>
  );
};

const FillQuestion = ({ q }) => (
  <div className="pv-q">
    <div className="pv-q-num-text">
      <span className="pv-q-num">{q.questionNumber}</span>
      <span className="pv-q-text">{q.questionText || <em className="pv-empty">Chưa có nội dung</em>}</span>
    </div>
    <input className="pv-fill-input" disabled placeholder="Nhập câu trả lời..." />
  </div>
);

const GenericQuestion = ({ q }) => (
  <div className="pv-q">
    <div className="pv-q-num-text">
      <span className="pv-q-num">{q.questionNumber}</span>
      <span className="pv-q-text">{q.questionText || <em className="pv-empty">Chưa có nội dung</em>}</span>
    </div>
    <textarea className="pv-textarea" disabled placeholder="Nhập câu trả lời..." rows={3} />
  </div>
);

const renderQuestion = (q) => {
  const type = q.questionType?.typeName ?? q.questionType ?? 'MULTIPLE_CHOICE';
  switch (type) {
    case 'TRUE_FALSE_NG': return <TFNGQuestion key={q.id} q={q} />;
    case 'MULTIPLE_CHOICE': return <MCQQuestion key={q.id} q={q} multiple={false} />;
    case 'MULTIPLE_CHOICE_MULTIPLE': return <MCQQuestion key={q.id} q={q} multiple />;
    case 'FILL_IN_BLANK':
    case 'NOTE_COMPLETION':
    case 'SHORT_ANSWER': return <FillQuestion key={q.id} q={q} />;
    default: return <GenericQuestion key={q.id} q={q} />;
  }
};

// ---- Group renderers ----

const ReadingGroup = ({ group }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group pv-split">
      <div className="pv-passage-side">
        <div className="pv-passage-title">{group.title || 'Đoạn văn'}</div>
        <div className="pv-passage-body">
          {group.passageText || <em className="pv-empty">Chưa có nội dung đoạn văn.</em>}
        </div>
      </div>
      <div className="pv-questions-side">
        <div className="pv-side-label">Câu hỏi {questions[0]?.questionNumber ?? ''}–{questions[questions.length - 1]?.questionNumber ?? ''}</div>
        {questions.length === 0
          ? <em className="pv-empty">Chưa có câu hỏi.</em>
          : questions.map(renderQuestion)}
      </div>
    </div>
  );
};

const AudioGroup = ({ group }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group">
      <div className="pv-audio-bar">
        <Volume2 size={18} />
        {group.audioUrl
          ? <audio controls src={group.audioUrl} className="pv-audio-player" />
          : <span className="pv-audio-placeholder">Audio chưa được tải lên</span>}
      </div>
      {group.title && <div className="pv-group-title">{group.title}</div>}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map(renderQuestion)}
    </div>
  );
};

const MatchingHeadingGroup = ({ group }) => {
  const questions = group.questions ?? [];
  const headings = group.headings ?? [];
  return (
    <div className="pv-group">
      {group.title && <div className="pv-group-title">{group.title}</div>}
      <div className="pv-heading-bank">
        <div className="pv-heading-bank-title">List of Headings</div>
        {headings.length === 0
          ? <em className="pv-empty">Chưa có heading.</em>
          : headings.map((h, i) => (
            <div key={i} className="pv-heading-bank-item">
              <span className="pv-heading-roman">{toRoman(i + 1)}</span>
              <span>{h.text || <em className="pv-empty">...</em>}</span>
            </div>
          ))
        }
      </div>
      <div className="pv-matching-slots">
        {questions.map((q) => (
          <div key={q.id} className="pv-matching-slot">
            <span className="pv-q-num">{q.questionNumber}</span>
            <span className="pv-matching-label">{q.questionText || <em className="pv-empty">Tên mục...</em>}</span>
            <select className="pv-matching-select" disabled>
              <option>— Chọn heading —</option>
              {headings.map((h, i) => <option key={i}>{toRoman(i + 1)} {h.text}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

const SummaryGroup = ({ group }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group">
      {group.instructions && <div className="pv-summary-instructions">{group.instructions}</div>}
      {group.title && <div className="pv-group-title">{group.title}</div>}
      <div className="pv-summary-text">
        {parseSummaryPreview(group.summaryText, questions)}
      </div>
      <div className="pv-summary-answers">
        {questions.map((q) => (
          <div key={q.id} className="pv-summary-answer-row">
            <span className="pv-q-num">{q.questionNumber}</span>
            <input className="pv-fill-input" disabled placeholder="Nhập câu trả lời..." />
          </div>
        ))}
      </div>
    </div>
  );
};

const StandaloneGroup = ({ group }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group">
      {group.title && <div className="pv-group-title">{group.title}</div>}
      {questions.length === 0
        ? <em className="pv-empty">Chưa có câu hỏi.</em>
        : questions.map(renderQuestion)}
    </div>
  );
};

const ImageGroup = ({ group }) => {
  const questions = group.questions ?? [];
  return (
    <div className="pv-group">
      {group.title && <div className="pv-group-title">{group.title}</div>}
      {group.imageUrl
        ? <img src={group.imageUrl} alt="diagram" className="pv-image" />
        : <div className="pv-image-placeholder">{group.contentType === 'MAP' ? '🗺️ Bản đồ chưa được tải lên' : '📊 Sơ đồ chưa được tải lên'}</div>}
      {questions.map(renderQuestion)}
    </div>
  );
};

const renderGroup = (group) => {
  const ct = group.contentType;
  if (ct === 'READING_PASSAGE') return <ReadingGroup key={group.id} group={group} />;
  if (ct === 'AUDIO_TRANSCRIPT') return <AudioGroup key={group.id} group={group} />;
  if (ct === 'MATCHING_HEADING') return <MatchingHeadingGroup key={group.id} group={group} />;
  if (ct === 'SUMMARY_COMPLETION') return <SummaryGroup key={group.id} group={group} />;
  if (ct === 'DIAGRAM' || ct === 'MAP') return <ImageGroup key={group.id} group={group} />;
  return <StandaloneGroup key={group.id} group={group} />;
};

// ---- Main modal ----

const PreviewModal = ({ test, sessions, onClose }) => {
  const skillKeys = Object.keys(SESSION_META).filter(
    (k) => sessions[k] && sessions[k].some((p) => (p.questionGroups ?? []).length > 0 || true)
  );
  const [activeSkill, setActiveSkill] = useState(skillKeys[0] ?? 'LISTENING');

  const parts = sessions[activeSkill] ?? [];

  // total question count for current skill
  const totalQ = parts.reduce(
    (acc, p) => acc + (p.questionGroups ?? []).reduce((a, g) => a + (g.questions?.length ?? 0), 0),
    0
  );

  return (
    <div className="pv-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pv-modal">
        {/* Modal header */}
        <div className="pv-modal-header">
          <div className="pv-modal-title">
            <span className="pv-modal-tag">XEM TRƯỚC</span>
            <span className="pv-modal-test-title">{test.title || 'Đề thi chưa đặt tên'}</span>
          </div>
          <div className="pv-skill-tabs">
            {skillKeys.map((key) => {
              const meta = SESSION_META[key];
              const Icon = meta.Icon;
              const count = (sessions[key] ?? []).reduce(
                (acc, p) => acc + (p.questionGroups ?? []).reduce((a, g) => a + (g.questions?.length ?? 0), 0),
                0
              );
              return (
                <button
                  key={key}
                  className={`pv-skill-tab${activeSkill === key ? ' active' : ''}`}
                  style={activeSkill === key ? { borderBottomColor: meta.color, color: meta.color } : {}}
                  onClick={() => setActiveSkill(key)}
                >
                  <Icon size={14} />
                  {meta.label}
                  <span className="pv-skill-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
          <button className="pv-close-btn" onClick={onClose} title="Đóng xem trước">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="pv-modal-body">
          {/* Skill info bar */}
          <div className="pv-skill-info-bar">
            <span>
              {SESSION_META[activeSkill]?.label} · {parts.length} phần · <strong>{totalQ}</strong> câu hỏi
            </span>
            <span className="pv-preview-note">Chế độ xem trước — thí sinh không thể chỉnh sửa</span>
          </div>

          {/* Parts */}
          {parts.length === 0 ? (
            <div className="pv-empty-state">Chưa có nội dung cho phần này.</div>
          ) : (
            parts.map((part) => (
              <div key={part.id} className="pv-part">
                <div className="pv-part-header">
                  <span className="pv-part-name">{part.name}</span>
                  {part.instructions && (
                    <p className="pv-part-instructions">{part.instructions}</p>
                  )}
                </div>
                {(part.questionGroups ?? []).length === 0 ? (
                  <em className="pv-empty">Phần này chưa có nhóm câu hỏi.</em>
                ) : (
                  (part.questionGroups ?? []).map(renderGroup)
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
