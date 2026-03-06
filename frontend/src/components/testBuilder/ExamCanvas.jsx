/**
 * ExamCanvas.jsx
 * WYSIWYG canvas — renders the exam exactly as students would see it,
 * with inline editing and drag-and-drop capabilities.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical, X, Volume2, Image, Plus } from 'lucide-react';

// ---- Type metadata ----
const TYPE_META = {
  READING_PASSAGE:   { label: 'Đoạn văn',          bg: '#dcfce7', color: '#15803d' },
  AUDIO_TRANSCRIPT:  { label: 'Nghe',               bg: '#dbeafe', color: '#1d4ed8' },
  STANDALONE:        { label: 'Câu độc lập',        bg: '#f3f4f6', color: '#374151' },
  DIAGRAM:           { label: 'Sơ đồ',              bg: '#fef9c3', color: '#a16207' },
  MAP:               { label: 'Bản đồ',             bg: '#fce7f3', color: '#be185d' },
  TABLE:             { label: 'Bảng',               bg: '#e0e7ff', color: '#4338ca' },
  MATCHING_HEADING:  { label: 'Matching Headings',  bg: '#fff7ed', color: '#c2410c' },
  SUMMARY_COMPLETION:{ label: 'Summary Completion', bg: '#f0f9ff', color: '#0369a1' },
};

// ---- Helper ----
const toRoman = (n) => {
  const nums = [1, 4, 5, 9, 10, 40, 50];
  const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
  let r = '';
  for (let i = syms.length - 1; i >= 0; i--) { while (n >= nums[i]) { r += syms[i]; n -= nums[i]; } }
  return r;
};

const parseSummary = (text, questions) => {
  const parts = (text || '').split(/\[blank\]/gi);
  return parts.map((part, i) => {
    if (i >= parts.length - 1) return part;
    const q = questions[i];
    return (
      <React.Fragment key={i}>
        {part}
        <span className="exam-summary-blank">{q?.questionNumber ?? i + 1}</span>
      </React.Fragment>
    );
  });
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
const GroupDropZone = ({ partId, isOver, onAddGroup, part }) => {
  const { setNodeRef } = useDroppable({ id: `canvas-drop-${partId}`, data: { type: 'part', partId } });
  return (
    <div ref={setNodeRef} className={`exam-group-drop${isOver ? ' is-over' : ''}`}
      onClick={(e) => { e.stopPropagation(); onAddGroup(part); }}>
      {isOver ? '↓ Thả xuống để thêm nhóm' : '+ Kéo từ thanh bên hoặc nhấn để thêm nhóm câu hỏi'}
    </div>
  );
};

// ---- Group toolbar ----
const GroupToolbar = ({ group, dragHandleProps, onDelete }) => {
  const meta = TYPE_META[group.contentType] || TYPE_META.STANDALONE;
  return (
    <div className="exam-group-toolbar">
      <span className="exam-group-drag-handle" {...dragHandleProps}><GripVertical size={13} /></span>
      <span className="exam-type-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      <button className="exam-group-tool-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} title="Xóa nhóm">
        <X size={12} />
      </button>
    </div>
  );
};

// ---- Passage block ----
const PassageBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      <div
        contentEditable suppressContentEditableWarning
        className="exam-passage-title"
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}
        data-placeholder="Tiêu đề đoạn văn..."
      >{group.title || ''}</div>
      {group.passageText ? (
        <div
          contentEditable suppressContentEditableWarning
          className="exam-passage-body"
          onBlur={(e) => onUpdate(group.id, { passageText: e.currentTarget.textContent })}
        >{group.passageText}</div>
      ) : (
        <div className="exam-passage-empty" onClick={(e) => e.currentTarget.previousSibling?.focus?.()}>
          Nhấn để nhập nội dung đoạn văn...
        </div>
      )}
    </div>
  );
};

// ---- Audio block ----
const AudioBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, children }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`}
    onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-audio-player">
      <button className="exam-audio-play-btn"><Volume2 size={15} /></button>
      <div className="exam-audio-bar" />
      <span className="exam-audio-time">0:00 / --:--</span>
      <input className="exam-audio-url-input" placeholder="URL audio..."
        value={group.audioUrl || ''}
        onChange={(e) => onUpdate(group.id, { audioUrl: e.target.value })}
        onClick={(e) => e.stopPropagation()} />
    </div>
    {children}
  </div>
);

// ---- Image / Diagram / Map block ----
const ImageBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, children }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`}
    onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-image-area">
      {group.imageUrl ? (
        <>
          <img src={group.imageUrl} alt="diagram" />
          <div className="exam-image-url-bar">
            <input className="exam-image-url-input" value={group.imageUrl}
              onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })}
              onClick={(e) => e.stopPropagation()} placeholder="URL ảnh..." />
          </div>
        </>
      ) : (
        <>
          <Image size={26} />
          <span>Nhập URL ảnh</span>
          <input className="exam-img-url-field" placeholder="https://..." value={group.imageUrl || ''}
            onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
        </>
      )}
    </div>
    {children}
  </div>
);

// ---- Question list ----
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

// ---- Individual question ----
const QuestionItem = ({ question, selected, onClick, onUpdate, onDelete }) => {
  const type = question.questionType?.typeName ?? question.questionType ?? 'FILL_IN_BLANK';
  return (
    <div className={`exam-question${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className="exam-q-num">{question.questionNumber ?? '?'}</div>
      <div className="exam-q-body">
        <input className="exam-q-text-input"
          value={question.questionText || ''}
          placeholder="Nội dung câu hỏi..."
          onChange={(e) => onUpdate({ questionText: e.target.value })}
          onClick={(e) => e.stopPropagation()} />

        {type === 'MULTIPLE_CHOICE' && (
          <div className="exam-q-options">
            {(question.options ?? []).map((opt, i) => (
              <div key={i} className="exam-q-option">
                <input type="radio" readOnly checked={false} onChange={() => {}} />
                <input className="exam-q-option-text-input"
                  value={opt.optionText || ''}
                  placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                  onChange={(e) => {
                    const opts = [...(question.options ?? [])];
                    opts[i] = { ...opts[i], optionText: e.target.value };
                    onUpdate({ options: opts });
                  }}
                  onClick={(e) => e.stopPropagation()} />
                <input type="checkbox" className="exam-q-option-correct"
                  checked={!!opt.isCorrect} title="Đáp án đúng"
                  onChange={(e) => {
                    const opts = [...(question.options ?? [])];
                    opts[i] = { ...opts[i], isCorrect: e.target.checked };
                    onUpdate({ options: opts });
                  }}
                  onClick={(e) => e.stopPropagation()} />
                <button className="exam-q-del-btn"
                  onClick={(e) => { e.stopPropagation(); onUpdate({ options: question.options.filter((_, j) => j !== i) }); }}>×</button>
              </div>
            ))}
            <button className="exam-add-btn" style={{ padding: '3px 10px', fontSize: 11, marginTop: 4 }}
              onClick={(e) => { e.stopPropagation(); onUpdate({ options: [...(question.options ?? []), { optionText: '', isCorrect: false }] }); }}>
              <Plus size={10} /> Thêm lựa chọn
            </button>
          </div>
        )}

        {type === 'MULTIPLE_CHOICE_MULTIPLE' && (
          <>
            <div className="exam-choose-n-row">
              Chọn&nbsp;
              <input className="exam-choose-n-input" type="number" min={1} max={10}
                value={question.chooseCount ?? 2}
                onChange={(e) => onUpdate({ chooseCount: Number(e.target.value) })}
                onClick={(e) => e.stopPropagation()} />
              &nbsp;đáp án đúng
            </div>
            <div className="exam-q-options">
              {(question.options ?? []).map((opt, i) => (
                <div key={i} className="exam-q-option">
                  <input type="checkbox" readOnly checked={false} onChange={() => {}} />
                  <input className="exam-q-option-text-input"
                    value={opt.optionText || ''}
                    placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                    onChange={(e) => {
                      const opts = [...(question.options ?? [])];
                      opts[i] = { ...opts[i], optionText: e.target.value };
                      onUpdate({ options: opts });
                    }}
                    onClick={(e) => e.stopPropagation()} />
                  <input type="checkbox" className="exam-q-option-correct"
                    checked={!!opt.isCorrect} title="Đáp án đúng"
                    onChange={(e) => {
                      const opts = [...(question.options ?? [])];
                      opts[i] = { ...opts[i], isCorrect: e.target.checked };
                      onUpdate({ options: opts });
                    }}
                    onClick={(e) => e.stopPropagation()} />
                  <button className="exam-q-del-btn"
                    onClick={(e) => { e.stopPropagation(); onUpdate({ options: question.options.filter((_, j) => j !== i) }); }}>×</button>
                </div>
              ))}
              <button className="exam-add-btn" style={{ padding: '3px 10px', fontSize: 11, marginTop: 4 }}
                onClick={(e) => { e.stopPropagation(); onUpdate({ options: [...(question.options ?? []), { optionText: '', isCorrect: false }] }); }}>
                <Plus size={10} /> Thêm lựa chọn
              </button>
            </div>
          </>
        )}

        {type === 'TRUE_FALSE_NG' && (
          <div className="exam-q-options">
            {['TRUE', 'FALSE', 'NOT GIVEN'].map((v) => (
              <div key={v} className="exam-q-option">
                <input type="radio" readOnly checked={false} onChange={() => {}} />
                <span style={{ fontSize: 14, minWidth: 80 }}>{v}</span>
                <input type="checkbox" className="exam-q-option-correct"
                  checked={question.answerText === v} title="Đáp án đúng"
                  onChange={() => onUpdate({ answerText: v })}
                  onClick={(e) => e.stopPropagation()} />
              </div>
            ))}
          </div>
        )}

        {(type === 'FILL_IN_BLANK' || type === 'NOTE_COMPLETION') && (
          <div>
            <div style={{ fontSize: 13, color: '#777', marginBottom: 4 }}>Đáp án:</div>
            <input className="exam-q-fill-answer"
              value={question.answerText || ''}
              placeholder="đáp án mẫu..."
              onChange={(e) => onUpdate({ answerText: e.target.value })}
              onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {type === 'SHORT_ANSWER' && (
          <textarea className="exam-q-answer-area" rows={2}
            placeholder="Gợi ý đáp án..."
            value={question.answerText || ''}
            onChange={(e) => onUpdate({ answerText: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
        )}
      </div>
      <button className="exam-group-tool-btn danger" style={{ flexShrink: 0, marginTop: 3 }}
        onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Xóa câu hỏi">
        <X size={11} />
      </button>
    </div>
  );
};

// ---- Group renderer (dispatches by contentType) ----
const MatchingHeadingBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const headings = group.headingBank ?? [];
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Heading bank */}
      <div className="exam-heading-bank">
        <div className="exam-heading-bank-title">List of Headings</div>
        {headings.map((h, i) => (
          <div key={i} className="exam-heading-bank-item">
            <span className="exam-heading-roman">{toRoman(i + 1)}</span>
            <input className="exam-q-text-input" style={{ flex: 1, margin: 0 }}
              value={h.text || ''} placeholder={`Heading ${toRoman(i + 1)}...`}
              onChange={(e) => { const n = [...headings]; n[i] = { ...n[i], text: e.target.value }; onUpdate(group.id, { headingBank: n }); }}
              onClick={(e) => e.stopPropagation()} />
            <button className="exam-q-del-btn" onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { headingBank: headings.filter((_, j) => j !== i) }); }}>×</button>
          </div>
        ))}
        <button className="exam-add-btn" style={{ marginTop: 6 }}
          onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { headingBank: [...headings, { id: Date.now(), text: '' }] }); }}>
          <Plus size={11} /> Thêm heading
        </button>
      </div>

      {/* Section slots */}
      <div className="exam-q-range-header" style={{ marginTop: 12 }}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="4" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      </div>
      {(group.questions ?? []).map((q) => (
        <div key={q.id} className={`exam-matching-slot${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
          <div className="exam-q-num">{q.questionNumber ?? '?'}</div>
          <input className="exam-q-text-input" value={q.questionText || ''}
            placeholder="Tên section (VD: Section A)..."
            onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
          <select className="exam-heading-select"
            value={q.answerText || ''}
            onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
            onClick={(e) => e.stopPropagation()}>
            <option value="">— Đáp án đúng —</option>
            {headings.map((h, i) => <option key={i} value={h.text}>{toRoman(i + 1)} {h.text}</option>)}
          </select>
          <button className="exam-group-tool-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}><X size={11} /></button>
        </div>
      ))}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm section
      </button>
    </div>
  );
};

const SummaryCompletionBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-summary-instructions">Complete the summary. Write <strong>ONE WORD ONLY</strong> from the text for each answer.</div>

    {/* Summary title */}
    <div contentEditable suppressContentEditableWarning className="exam-passage-title"
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}>
      {group.title || ''}
    </div>

    {/* Preview with blanks rendered */}
    <div className="exam-summary-preview">
      {parseSummary(group.summaryText, group.questions ?? [])}
    </div>

    {/* Edit area */}
    <div className="exam-summary-edit">
      <div className="exam-summary-edit-label">✏ Nhập văn bản — dùng <code>[blank]</code> cho mỗi ô trống:</div>
      <textarea className="exam-q-answer-area" rows={5}
        value={group.summaryText ?? ''}
        placeholder="VD: Physicists showed that congestion can arise [blank] without external causes..."
        onChange={(e) => onUpdate(group.id, { summaryText: e.target.value })}
        onClick={(e) => e.stopPropagation()} />
    </div>

    <div className="exam-q-range-header" style={{ marginTop: 12 }}>
      Câu&nbsp;
      <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="24" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      &nbsp;–&nbsp;
      <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="26" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
    </div>
    {(group.questions ?? []).map((q, idx) => (
      <div key={q.id} className={`exam-question${selectedQuestionId === q.id ? ' selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
        <div className="exam-q-num" style={{ background: '#0369a1' }}>{q.questionNumber ?? idx + 1}</div>
        <div className="exam-q-body">
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Đáp án (1 từ):</div>
          <input className="exam-q-fill-answer" style={{ display: 'block', width: '100%', textAlign: 'left' }}
            value={q.answerText || ''} placeholder="nhập đáp án..."
            onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
        </div>
        <button className="exam-group-tool-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}><X size={11} /></button>
      </div>
    ))}
    <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
      <Plus size={12} /> Thêm ô trống
    </button>
  </div>
);

// ---- Group renderer (dispatches by contentType) ----
const GroupRenderer = ({ group, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, dragHandleProps }) => {
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

  if (ct === 'MATCHING_HEADING') {
    return <MatchingHeadingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SUMMARY_COMPLETION') {
    return <SummaryCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'READING_PASSAGE') {
    return <PassageBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'AUDIO_TRANSCRIPT') {
    return <AudioBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}>
      {questionList}
    </AudioBlock>;
  }
  if (ct === 'DIAGRAM' || ct === 'MAP') {
    return <ImageBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}>
      {questionList}
    </ImageBlock>;
  }

  // STANDALONE / TABLE / default
  return (
    <div className={`exam-group${isSelected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelectGroup(group, group.partId); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDeleteGroup} />
      {ct === 'TABLE' && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '8px 12px', marginBottom: 10, background: '#f9fafb', fontSize: 13, color: '#888', textAlign: 'center' }}>
          📊 Bảng — thêm nội dung bảng trong panel bên phải
        </div>
      )}
      {questionList}
    </div>
  );
};

// ---- Per-Part content view ----
const PartView = ({ skill, part, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onAddGroup, isDropOver }) => {
  const groups = part.questionGroups ?? [];

  const renderGroup = (group) => (
    <SortableGroupWrapper key={group.id} group={{ ...group, partId: part.id }}>
      {({ dragHandleProps }) => (
        <GroupRenderer
          group={{ ...group, partId: part.id }}
          selection={selection}
          onSelectGroup={onSelectGroup}
          onSelectQuestion={onSelectQuestion}
          onUpdateGroup={onUpdateGroup}
          onUpdateQuestion={onUpdateQuestion}
          onDeleteGroup={onDeleteGroup}
          onDeleteQuestion={onDeleteQuestion}
          onAddQuestion={onAddQuestion}
          dragHandleProps={dragHandleProps} />
      )}
    </SortableGroupWrapper>
  );

  if (skill === 'READING') {
    const passages = groups.filter((g) => g.contentType === 'READING_PASSAGE');
    const qGroups  = groups.filter((g) => g.contentType !== 'READING_PASSAGE');
    return (
      <div className="exam-split">
        <div className="exam-pane passage">
          <SortableContext items={passages.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
            {passages.map(renderGroup)}
          </SortableContext>
          <GroupDropZone partId={`left-${part.id}`} isOver={false} onAddGroup={onAddGroup} part={part} />
        </div>
        <div className="exam-pane-divider" />
        <div className="exam-pane questions">
          <SortableContext items={qGroups.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
            {qGroups.map(renderGroup)}
          </SortableContext>
          <GroupDropZone partId={part.id} isOver={isDropOver} onAddGroup={onAddGroup} part={part} />
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
      <GroupDropZone partId={part.id} isOver={isDropOver} onAddGroup={onAddGroup} part={part} />
    </div>
  );
};

// ---- Main ExamCanvas ----
const ExamCanvas = ({
  skill,
  parts,
  selection,
  onSelectGroup,
  onSelectQuestion,
  onUpdateGroup,
  onUpdateQuestion,
  onDeleteGroup,
  onDeleteQuestion,
  onAddQuestion,
  onAddPart,
  onAddGroup,
  dragOverPartId,
}) => {
  const [activePartId, setActivePartId] = useState(null);

  // Reset active part when skill changes
  useEffect(() => { setActivePartId(null); }, [skill]);

  const activePart = useMemo(() => {
    if (parts.length === 0) return null;
    return parts.find((p) => p.id === activePartId) ?? parts[0];
  }, [parts, activePartId]);

  if (parts.length === 0) {
    return (
      <div className="tb-canvas">
        <div className="tb-canvas-empty">
          <div className="tb-canvas-empty-icon">📄</div>
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

  return (
    <div className="tb-canvas" onClick={() => {}}>
      {/* Part tabs */}
      <div className="tb-part-tabs">
        {parts.map((p) => (
          <button key={p.id}
            className={`tb-part-tab${activePart?.id === p.id ? ' active' : ''}`}
            onClick={() => setActivePartId(p.id)}>
            {p.name || `Part ${p.orderIndex}`}
          </button>
        ))}
        <button className="tb-part-tab-add" title="Thêm Part mới" onClick={onAddPart}>+</button>
      </div>

      {/* Exam paper */}
      {activePart && (
        <div className="exam-viewport">
          {/* Mocked exam header */}
          <div className="exam-mock-header">
            <span className="exam-mock-logo">IELTS</span>
            <div className="exam-mock-info">
              <span>Nguyễn Văn A</span>
              <span style={{ color: '#ddd' }}>|</span>
              <span>ID: 12345678</span>
              <span className="exam-mock-timer">60:00</span>
              <div className="exam-mock-nav">
                <button className="exam-mock-nav-btn">‹</button>
                <button className="exam-mock-nav-btn">›</button>
              </div>
            </div>
          </div>

          {/* Part instruction bar */}
          <div className="exam-instruction">
            <strong>{activePart.name}</strong>
            {activePart.instructions
              ? <> — {activePart.instructions}</>
              : <span style={{ color: '#aaa', fontStyle: 'italic' }}> — Chọn Part để thêm hướng dẫn</span>}
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
              isDropOver={isDropOver} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCanvas;
