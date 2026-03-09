/**
 * ExamCanvas.jsx
 * WYSIWYG canvas — renders the exam exactly as students would see it,
 * with inline editing and drag-and-drop capabilities.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical, X, Volume2, Image, Plus } from 'lucide-react';

// ---- Type metadata ----
const TYPE_META = {
  READING_PASSAGE:        { label: 'Đoạn văn',           bg: '#dcfce7', color: '#15803d' },
  AUDIO_TRANSCRIPT:       { label: 'Nghe',                bg: '#dbeafe', color: '#1d4ed8' },
  STANDALONE:             { label: 'Câu độc lập',         bg: '#f3f4f6', color: '#374151' },
  DIAGRAM:                { label: 'Sơ đồ',               bg: '#fef9c3', color: '#a16207' },
  MAP:                    { label: 'Bản đồ',              bg: '#fce7f3', color: '#be185d' },
  MAP_LABELLING:          { label: 'Map Labelling',        bg: '#f0fdf4', color: '#166534' },
  TABLE_COMPLETION:       { label: 'Table Completion',     bg: '#e0e7ff', color: '#4338ca' },
  TABLE:                  { label: 'Bảng',                bg: '#e0e7ff', color: '#4338ca' },
  MATCHING_HEADING:       { label: 'Matching Headings',   bg: '#fff7ed', color: '#c2410c' },
  DRAG_MATCHING:          { label: 'Drag Matching',        bg: '#f0fdf4', color: '#166534' },
  SUMMARY_COMPLETION:     { label: 'Summary Completion',  bg: '#f0f9ff', color: '#0369a1' },
  NOTE_COMPLETION:        { label: 'Note Completion',      bg: '#fefce8', color: '#854d0e' },
  MULTIPLE_CHOICE_GROUP:  { label: 'Multiple Choice',      bg: '#ffe4e6', color: '#be123c' },
  MULTIPLE_CHOICE_MULTI:  { label: 'MC Nhiều đáp án',       bg: '#fce7f3', color: '#9d174d' },
  SENTENCE_COMPLETION:    { label: 'Sentence Completion',  bg: '#ecfdf5', color: '#065f46' },
  SHORT_ANSWER_GROUP:     { label: 'Short Answer',         bg: '#f0fdf4', color: '#166534' },
};

// ---- Helper ----
const toRoman = (n) => {
  const nums = [1, 4, 5, 9, 10, 40, 50];
  const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
  let r = '';
  for (let i = syms.length - 1; i >= 0; i--) { while (n >= nums[i]) { r += syms[i]; n -= nums[i]; } }
  return r;
};

// ---- Rich Blank Editor ----
// contentEditable editor for Summary / Note Completion.
// Drag the toolbar chip into the text to insert a numbered blank at that position.
const RichBlankEditor = ({ value, onChange, placeholder, preWrap = false, blankClass = 'rbe-blank-blue' }) => {
  const editorRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const toHTML = (text) => {
    if (!text) return '';
    let n = 0;
    return esc(text)
      .replace(/\n/g, '<br>')
      .replace(/\[blank\]/gi, () => {
        n++;
        return `<span class="rbe-blank ${blankClass}" contenteditable="false" data-blank="true"><span class="rbe-blank-num">${n}</span><button class="rbe-blank-del" data-del="true" type="button">×</button></span>`;
      });
  };

  const toText = (el) => {
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        out += node.textContent;
      } else if (node.nodeName === 'BR') {
        out += '\n';
      } else if (node.dataset?.blank === 'true') {
        out += '[blank]';
      } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
        out += '\n' + toText(node);
      } else {
        out += toText(node);
      }
    }
    return out;
  };

  // Set initial HTML on mount only (avoids cursor-jumping on re-renders)
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toHTML(value || '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renumber = () => {
    let n = 0;
    editorRef.current?.querySelectorAll('[data-blank="true"] .rbe-blank-num').forEach((el) => {
      el.textContent = ++n;
    });
  };

  const createChip = () => {
    const span = document.createElement('span');
    span.className = `rbe-blank ${blankClass}`;
    span.contentEditable = 'false';
    span.draggable = false;
    span.dataset.blank = 'true';
    const num = document.createElement('span');
    num.className = 'rbe-blank-num';
    num.textContent = '?';
    const btn = document.createElement('button');
    btn.className = 'rbe-blank-del';
    btn.dataset.del = 'true';
    btn.type = 'button';
    btn.textContent = '×';
    span.appendChild(num);
    span.appendChild(btn);
    return span;
  };

  const insertChipAtCaret = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    let range;
    if (sel?.rangeCount && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }
    range.deleteContents();
    const chip = createChip();
    range.insertNode(chip);
    const nr = document.createRange();
    nr.setStartAfter(chip);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);
    renumber();
    onChange(toText(editorRef.current));
  };

  return (
    <div className="rbe-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className="rbe-toolbar">
        <div
          className="rbe-drag-chip"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/x-rbe', '1');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          title="Kéo vào văn bản"
        >
          ▣ Kéo ô trống
        </div>
        <div className="rbe-sep" />
        <button type="button" className="rbe-insert-btn" onClick={insertChipAtCaret}>
          + Chèn tại con trỏ
        </button>
        <span className="rbe-hint">× để xóa ô trống</span>
      </div>
      <div
        ref={editorRef}
        className={`rbe-editor${dragOver ? ' drag-over' : ''}${preWrap ? ' pre-wrap' : ''}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => { renumber(); onChange(toText(editorRef.current)); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertLineBreak');
            onChange(toText(editorRef.current));
          }
        }}
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes('text/x-rbe')) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!editorRef.current?.contains(e.relatedTarget)) setDragOver(false);
        }}
        onDrop={(e) => {
          if (![...e.dataTransfer.types].includes('text/x-rbe')) return;
          e.preventDefault();
          setDragOver(false);
          let range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
          if (!range && document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
          }
          if (!range) return;
          const cont = range.startContainer.nodeType === 1
            ? range.startContainer
            : range.startContainer.parentElement;
          if (cont?.closest('[data-blank="true"]')) return;
          range.deleteContents();
          range.insertNode(createChip());
          renumber();
          onChange(toText(editorRef.current));
        }}
        onClick={(e) => {
          if (e.target.dataset.del === 'true' || e.target.closest?.('[data-del]')) {
            const chip = e.target.closest('[data-blank="true"]');
            if (chip) { chip.remove(); renumber(); onChange(toText(editorRef.current)); e.preventDefault(); }
          }
        }}
      />
    </div>
  );
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
// paneType: 'passage-pane' | 'question-pane' | 'part'
const GroupDropZone = ({ partId, isOver, onAddGroup, part, paneType = 'part', label }) => {
  // Always store the real numeric part.id in data so handleDragEnd can find the part
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
// Supports multiple paragraphs, each with an optional heading drop-slot.
// paragraphs: [{ id, heading, text }]
const PassageBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, allGroups = [] }) => {
  const titleRef = useRef(null);
  const paraRefs = useRef({}); // { [paraId]: domNode }
  const [overSlotId, setOverSlotId] = useState(null);

  const paragraphs = group.paragraphs && group.paragraphs.length > 0
    ? group.paragraphs
    : [{ id: `${group.id}-p0`, heading: '', text: group.passageText || '' }];

  // Collect all headings from MatchingHeading groups in the same part
  const allHeadings = allGroups
    .filter((g) => g.contentType === 'MATCHING_HEADING')
    .flatMap((g) => (g.headingBank ?? []).map((h, i) => ({ ...h, roman: toRoman(i + 1) })));

  // Sync paragraph text refs when group.id changes
  useEffect(() => {
    paragraphs.forEach((p) => {
      const el = paraRefs.current[p.id];
      if (el && el !== document.activeElement) el.textContent = p.text || '';
    });
  }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (titleRef.current && titleRef.current !== document.activeElement) {
      titleRef.current.textContent = group.title || '';
    }
  }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateParagraphs = (newParas) => {
    onUpdate(group.id, { paragraphs: newParas, passageText: newParas.map((p) => p.text).join('\n\n') });
  };

  const addParagraph = () => {
    const newId = `${group.id}-p${Date.now()}`;
    updateParagraphs([...paragraphs, { id: newId, heading: '', text: '' }]);
  };

  const removeParagraph = (pid) => {
    if (paragraphs.length <= 1) return;
    updateParagraphs(paragraphs.filter((p) => p.id !== pid));
  };

  const updateParagraphText = (pid, text) => {
    updateParagraphs(paragraphs.map((p) => p.id === pid ? { ...p, text } : p));
  };

  const setParaHeading = (pid, heading) => {
    updateParagraphs(paragraphs.map((p) => p.id === pid ? { ...p, heading } : p));
  };

  const assignedHeadings = new Set(paragraphs.map((p) => p.heading).filter(Boolean));

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Overall passage title */}
      <div
        ref={titleRef}
        contentEditable suppressContentEditableWarning
        className="exam-passage-title"
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}
        data-placeholder="Tiêu đề đoạn văn..."
      />

      {/* Paragraphs */}
      {paragraphs.map((para, idx) => {
        const isOver = overSlotId === para.id;
        const hasHeading = !!para.heading;
        const hObj = allHeadings.find((h) => h.text === para.heading);
        return (
          <div key={para.id} className="passage-para">
            {/* Heading drop slot */}
            <div className="passage-para-header">
              <span className="passage-para-num">§{idx + 1}</span>

              {hasHeading ? (
                <div className="mh-answer-badge" style={{ flex: 1 }}>
                  {hObj && <span className="mh-answer-roman">{hObj.roman}</span>}
                  <span className="mh-answer-text">{para.heading}</span>
                  <button className="mh-clear-btn" title="Xóa heading"
                    onClick={(e) => { e.stopPropagation(); setParaHeading(para.id, ''); }}>×</button>
                </div>
              ) : (
                <div
                  className={`mh-drop-target${isOver ? ' over' : ''}`}
                  style={{ flex: 1 }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverSlotId(para.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverSlotId(null); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation(); setOverSlotId(null);
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/x-heading'));
                      if (data?.text) setParaHeading(para.id, data.text);
                    } catch {}
                  }}
                >
                  {isOver
                    ? '↓ Thả heading vào đây'
                    : allHeadings.length > 0
                      ? '⬚ Kéo heading từ cột phải vào đây'
                      : '⬚ (Thêm Match Headings ở cột phải để kéo)'}
                </div>
              )}

              {paragraphs.length > 1 && (
                <button className="exam-group-tool-btn danger" style={{ flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); removeParagraph(para.id); }}
                  title="Xóa đoạn này">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Paragraph text */}
            <div
              ref={(el) => { paraRefs.current[para.id] = el; }}
              contentEditable suppressContentEditableWarning
              className="exam-passage-body"
              data-placeholder={`Nội dung đoạn ${idx + 1}...`}
              style={{ marginBottom: 0 }}
              onBlur={(e) => updateParagraphText(para.id, e.currentTarget.textContent)}
            />
          </div>
        );
      })}

      <button className="exam-add-btn" style={{ marginTop: 8 }}
        onClick={(e) => { e.stopPropagation(); addParagraph(); }}>
        <Plus size={12} /> Thêm đoạn
      </button>
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

// ---- Map Labelling Block ----
// Teacher uploads image, clicks to place numbered pins, student drags bank chips onto pins.
function MapLabellingBlock({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onUpdateQuestion, onDeleteQuestion, selectedQuestionId }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null); // { qId, origX, origY, startCX, startCY }
  const [livePin, setLivePin] = useState(null); // { qId, x, y } during drag
  const questions = group.questions ?? [];
  const options = group.optionBank ?? [];

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !containerRef.current) return;
      const { origX, origY, startCX, startCY } = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(92, origX + (e.clientX - startCX) / rect.width * 100));
      const newY = Math.max(0, Math.min(92, origY + (e.clientY - startCY) / rect.height * 100));
      setLivePin({ qId: dragRef.current.qId, x: newX, y: newY });
    };
    const onUp = (e) => {
      if (!dragRef.current || !containerRef.current) return;
      const { qId, origX, origY, startCX, startCY } = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(92, origX + (e.clientX - startCX) / rect.width * 100));
      const newY = Math.max(0, Math.min(92, origY + (e.clientY - startCY) / rect.height * 100));
      onUpdateQuestion(group.id, qId, { pinX: newX, pinY: newY });
      dragRef.current = null;
      setLivePin(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [group.id, onUpdateQuestion]);

  const addPin = (e) => {
    if (!containerRef.current || !group.imageUrl) return;
    if (dragRef.current) return; // ignore click after drag
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newQ = {
      id: Date.now(),
      groupId: group.id,
      questionNumber: questions.length + 1,
      questionText: '',
      answerText: '',
      pinX: Math.max(0, Math.min(92, x)),
      pinY: Math.max(0, Math.min(92, y)),
      questionType: { typeName: 'FILL_IN_BLANK' },
    };
    onUpdate(group.id, { questions: [...questions, newQ] });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdate(group.id, { imageUrl: ev.target.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Upload controls */}
      <div className="exam-ml-upload-bar" onClick={(e) => e.stopPropagation()}>
        <input className="exam-img-url-field" style={{ flex: 1, minWidth: 0 }}
          value={group.imageUrl?.startsWith('data:') ? '(ảnh đã tải lên)' : (group.imageUrl ?? '')}
          placeholder="URL ảnh bản đồ..."
          readOnly={group.imageUrl?.startsWith('data:')}
          onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })} />
        <label className="exam-ml-upload-btn">
          📁 Tải lên
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        </label>
        {group.imageUrl && (
          <button className="exam-group-tool-btn danger" title="Xóa ảnh"
            onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { imageUrl: '' }); }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Size controls */}
      <div className="exam-ml-size-bar" onClick={(e) => e.stopPropagation()}>
        <label className="exam-ml-size-label">
          🖼 Rộng ảnh: <strong>{group.imageWidth ?? 100}%</strong>
          <input type="range" min={20} max={100} step={1}
            value={group.imageWidth ?? 100}
            onChange={(e) => onUpdate(group.id, { imageWidth: Number(e.target.value) })} />
        </label>
        <label className="exam-ml-size-label">
          📦 Cỡ ô: <strong>{group.pinBoxWidth ?? 60}px</strong>
          <input type="range" min={30} max={180} step={2}
            value={group.pinBoxWidth ?? 60}
            onChange={(e) => onUpdate(group.id, { pinBoxWidth: Number(e.target.value) })} />
        </label>
      </div>

      {/* Image canvas */}
      <div ref={containerRef} className="exam-ml-container"
        style={{ cursor: group.imageUrl ? 'crosshair' : 'default' }}
        onClick={addPin}>
        {group.imageUrl
          ? <img src={group.imageUrl} alt="map" draggable={false}
              style={{ display: 'block', width: `${group.imageWidth ?? 100}%`, height: 'auto', pointerEvents: 'none' }} />
          : <div className="exam-ml-empty">📸 Tải ảnh lên, sau đó nhấn vào ảnh để thêm ô đánh số</div>
        }
        {questions.map((q) => {
          const x = livePin?.qId === q.id ? livePin.x : (q.pinX ?? 10);
          const y = livePin?.qId === q.id ? livePin.y : (q.pinY ?? 10);
          return (
            <div key={q.id}
              className={`exam-ml-pin${selectedQuestionId === q.id ? ' selected' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, minWidth: `${group.pinBoxWidth ?? 60}px` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                dragRef.current = { qId: q.id, origX: q.pinX ?? 10, origY: q.pinY ?? 10, startCX: e.clientX, startCY: e.clientY };
              }}
              onClick={(e) => e.stopPropagation()}>
              <span className="exam-ml-pin-num">{q.questionNumber}</span>
              <button className="exam-ml-pin-del"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>×</button>
            </div>
          );
        })}
      </div>

      {group.imageUrl && (
        <div className="exam-ml-hint">↑ Nhấn vào ảnh để thêm ô · Kéo ô để di chuyển · × để xóa</div>
      )}

      {/* Question range */}
      <div className="exam-q-range-header" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="16"
          onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="20"
          onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
      </div>

      {/* Word bank */}
      <div className="exam-ml-bank-section" onClick={(e) => e.stopPropagation()}>
        <div className="exam-dm-col-header">
          <input className="exam-dm-col-title-input"
            value={group.rightTitle ?? ''}
            placeholder="Tiêu đề ngân từ (VD: Cookery room, Games room...)"
            onChange={(e) => onUpdate(group.id, { rightTitle: e.target.value })} />
        </div>
        <div className="exam-dm-bank">
          {options.map((o, i) => (
            <div key={i} className="exam-dm-option">
              <input className="exam-q-text-input" style={{ flex: 1, margin: 0 }}
                value={o.text || ''} placeholder={`Lựa chọn ${i + 1}...`}
                onChange={(e) => {
                  const n = [...options]; n[i] = { ...n[i], text: e.target.value };
                  onUpdate(group.id, { optionBank: n });
                }}
                onClick={(e) => e.stopPropagation()} />
              <button className="exam-q-del-btn"
                onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { optionBank: options.filter((_, j) => j !== i) }); }}>×</button>
            </div>
          ))}
          <button className="exam-add-btn" style={{ marginTop: 6 }}
            onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { optionBank: [...options, { id: Date.now(), text: '' }] }); }}>
            <Plus size={11} /> Thêm lựa chọn
          </button>
        </div>
      </div>

      {/* Answer key: map each pin to correct option; each option usable only once */}
      {questions.length > 0 && options.length > 0 && (
        <div className="exam-ml-answer-section" onClick={(e) => e.stopPropagation()}>
          <div className="exam-ml-answer-title">🔑 Đáp án đúng cho từng ô</div>
          {questions.map((q) => {
            const usedByOthers = new Set(
              questions.filter((other) => other.id !== q.id && other.answerText).map((other) => other.answerText)
            );
            return (
              <div key={q.id} className="exam-ml-answer-row">
                <span className="exam-ml-answer-num">Ô {q.questionNumber}</span>
                <select
                  className="exam-heading-select"
                  style={{ flex: 1 }}
                  value={q.answerText || ''}
                  onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
                  onClick={(e) => e.stopPropagation()}>
                  <option value="">— Chọn đáp án —</option>
                  {options
                    .filter((o) => !usedByOthers.has(o.text) || o.text === q.answerText)
                    .map((o, i) => (
                      <option key={i} value={o.text}>{o.text}</option>
                    ))}
                </select>
                {q.answerText && <span className="exam-ml-answer-check">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Table Completion Block ----
// Each cell uses TcCellEditor: contentEditable with drag/click-at-cursor to insert
// globally-numbered blank chips.  Data model unchanged: cells store "[blank]" text.

function syncTcQuestions(cols, rows, currentQs, fromQ) {
  let n = 0;
  for (const row of rows) {
    for (const col of cols) {
      n += ((row.cells?.[col.id] ?? '').match(/\[blank\]/g) ?? []).length;
    }
  }
  const base = fromQ ?? 1;
  const newQs = [];
  for (let i = 0; i < n; i++) {
    newQs.push(currentQs[i]
      ? { ...currentQs[i], questionNumber: base + i }
      : { id: Date.now() + i, questionNumber: base + i, answerText: '' });
  }
  return newQs;
}

// ---- Per-cell rich editor for TableCompletion ----
// Works like RichBlankEditor but chips display the GLOBAL question number.
function TcCellEditor({ value, onChange, startQNum }) {
  const editorRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const startQRef  = useRef(startQNum);

  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const toHTML = (text, firstNum) => {
    if (!text) return '';
    let n = firstNum - 1;
    return esc(text).replace(/\[blank\]/gi, () => {
      n++;
      return `<span class="rbe-blank rbe-blank-indigo" contenteditable="false" data-blank="true">`
           + `<span class="rbe-blank-num">${n}</span>`
           + `<button class="rbe-blank-del" data-del="true" type="button">×</button></span>`;
    });
  };

  const toText = (el) => {
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) out += node.textContent;
      else if (node.nodeName === 'BR') out += '\n';
      else if (node.dataset?.blank === 'true') out += '[blank]';
      else out += toText(node);
    }
    return out;
  };

  const renumber = () => {
    let n = startQRef.current - 1;
    editorRef.current?.querySelectorAll('[data-blank="true"] .rbe-blank-num').forEach((el) => {
      el.textContent = ++n;
    });
  };

  // Initial mount
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toHTML(value || '', startQNum);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When startQNum changes (prev cells changed), re-number chips without disrupting focus
  useEffect(() => {
    startQRef.current = startQNum;
    renumber();
  }); // run every render — cheap, just updates text nodes

  const createChip = () => {
    const span = document.createElement('span');
    span.className = 'rbe-blank rbe-blank-indigo';
    span.contentEditable = 'false';
    span.dataset.blank = 'true';
    const num = document.createElement('span');
    num.className = 'rbe-blank-num';
    num.textContent = '?';
    const btn = document.createElement('button');
    btn.className = 'rbe-blank-del';
    btn.dataset.del = 'true';
    btn.type = 'button';
    btn.textContent = '×';
    span.appendChild(num);
    span.appendChild(btn);
    return span;
  };

  const insertAtCaret = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    let range;
    if (sel?.rangeCount && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }
    range.deleteContents();
    const chip = createChip();
    range.insertNode(chip);
    const nr = document.createRange();
    nr.setStartAfter(chip);
    nr.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(nr);
    renumber();
    onChange(toText(editorRef.current));
  };

  return (
    <div className="tc-cell-rbe" onClick={(e) => e.stopPropagation()}>
      <div className="tc-cell-toolbar">
        <div className="rbe-drag-chip" draggable
          title="Kéo vào ô"
          onDragStart={(e) => {
            e.dataTransfer.setData('text/x-rbe','1');
            e.dataTransfer.effectAllowed = 'copy';
          }}>▣</div>
        <button type="button" className="exam-tc-blank-btn" onClick={insertAtCaret} title="Chèn ô tại con trỏ">+□</button>
      </div>
      <div
        ref={editorRef}
        className={`tc-cell-editor${dragOver ? ' drag-over' : ''}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Nhập nội dung…"
        onInput={() => { renumber(); onChange(toText(editorRef.current)); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); onChange(toText(editorRef.current)); }
        }}
        onDragOver={(e) => { if ([...e.dataTransfer.types].includes('text/x-rbe')) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={(e) => { if (!editorRef.current?.contains(e.relatedTarget)) setDragOver(false); }}
        onDrop={(e) => {
          if (![...e.dataTransfer.types].includes('text/x-rbe')) return;
          e.preventDefault(); setDragOver(false);
          let range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
          if (!range && document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
          }
          if (!range) return;
          const cont = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
          if (cont?.closest('[data-blank="true"]')) return;
          range.deleteContents();
          range.insertNode(createChip());
          renumber();
          onChange(toText(editorRef.current));
        }}
        onClick={(e) => {
          if (e.target.dataset?.del === 'true' || e.target.closest?.('[data-del]')) {
            const chip = e.target.closest('[data-blank="true"]');
            if (chip) { chip.remove(); renumber(); onChange(toText(editorRef.current)); e.preventDefault(); }
          }
        }}
      />
    </div>
  );
}

function TableCompletionBlock({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onUpdateQuestion, selectedQuestionId }) {
  const columns   = group.columns   ?? [{ id: 'c0', header: '' }, { id: 'c1', header: 'Cột 1' }, { id: 'c2', header: 'Cột 2' }];
  const tableRows = group.tableRows ?? [];
  const questions = group.questions ?? [];
  const fromQ     = group.fromQuestion ?? 1;

  const syncAndSave = (cols, rows, qOverride) => {
    const newQs = qOverride ?? syncTcQuestions(cols, rows, questions, fromQ);
    onUpdate(group.id, { columns: cols, tableRows: rows, questions: newQs });
  };

  const setCell = (rowId, colId, val) => {
    const newRows = tableRows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r
    );
    syncAndSave(columns, newRows);
  };

  const addColumn = () => {
    const id = `c${Date.now()}`;
    const newCols = [...columns, { id, header: '' }];
    const newRows = tableRows.map((r) => ({ ...r, cells: { ...r.cells, [id]: '' } }));
    syncAndSave(newCols, newRows);
  };

  const removeColumn = (colId) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((c) => c.id !== colId);
    const newRows = tableRows.map((r) => { const c = { ...r.cells }; delete c[colId]; return { ...r, cells: c }; });
    syncAndSave(newCols, newRows);
  };

  const addRow = () => {
    const id = `r${Date.now()}`;
    const cells = Object.fromEntries(columns.map((c) => [c.id, '']));
    syncAndSave(columns, [...tableRows, { id, cells }]);
  };

  const removeRow = (rowId) => {
    syncAndSave(columns, tableRows.filter((r) => r.id !== rowId));
  };

  const setColHeader = (colId, val) => {
    onUpdate(group.id, { columns: columns.map((c) => c.id === colId ? { ...c, header: val } : c) });
  };

  // Compute startQNum for each cell (reading order: row by row, col by col)
  const cellStartMap = {};
  let qCursor = fromQ;
  for (const row of tableRows) {
    for (const col of columns) {
      cellStartMap[`${row.id}-${col.id}`] = qCursor;
      qCursor += ((row.cells?.[col.id] ?? '').match(/\[blank\]/g) ?? []).length;
    }
  }

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Table title */}
      <div className="exam-tc-title-row" onClick={(e) => e.stopPropagation()}>
        <input
          className="exam-img-url-field"
          style={{ width: '100%', fontWeight: 700, textAlign: 'center', fontSize: 13 }}
          value={group.tableTitle ?? ''}
          placeholder="Tiêu đề bảng (VD: Research findings)"
          onChange={(e) => onUpdate(group.id, { tableTitle: e.target.value })}
        />
      </div>

      {/* Table */}
      <div className="exam-tc-scroll" onClick={(e) => e.stopPropagation()}>
        <table className="exam-tc-table">
          <thead>
            <tr>
              {columns.map((col, ci) => (
                <th key={col.id} className="exam-tc-header-cell">
                  <input
                    className="exam-tc-header-input"
                    value={col.header}
                    placeholder={ci === 0 ? '(nhãn hàng)' : `Tiêu đề cột ${ci}`}
                    onChange={(e) => setColHeader(col.id, e.target.value)}
                  />
                  {columns.length > 2 && (
                    <button className="exam-tc-del-col" onClick={() => removeColumn(col.id)} title="Xóa cột">×</button>
                  )}
                </th>
              ))}
              <th className="exam-tc-add-col-th">
                <button className="exam-add-btn" style={{ padding: '2px 7px', fontSize: 14 }}
                  onClick={addColumn} title="Thêm cột">+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.id}>
                {columns.map((col, ci) => (
                  <td key={col.id} className={`exam-tc-cell${ci === 0 ? ' exam-tc-row-label-cell' : ''}`}>
                    <TcCellEditor
                      value={row.cells?.[col.id] ?? ''}
                      onChange={(val) => setCell(row.id, col.id, val)}
                      startQNum={cellStartMap[`${row.id}-${col.id}`] ?? fromQ}
                    />
                  </td>
                ))}
                <td className="exam-tc-del-row-td">
                  <button className="exam-q-del-btn" onClick={() => removeRow(row.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="exam-add-btn" style={{ marginTop: 8 }}
          onClick={(e) => { e.stopPropagation(); addRow(); }}>
          <Plus size={11} /> Thêm hàng
        </button>
      </div>

      {/* Question range */}
      <div className="exam-q-range-header" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="33"
          onChange={(e) => {
            const fq = e.target.value ? Number(e.target.value) : null;
            const newQs = syncTcQuestions(columns, tableRows, questions, fq);
            onUpdate(group.id, { fromQuestion: fq, questions: newQs, toQuestion: newQs.length > 0 ? (fq ?? 1) + newQs.length - 1 : group.toQuestion });
          }}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="37"
          readOnly style={{ background: '#f9fafb', color: '#9ca3af' }}
          onClick={(e) => e.stopPropagation()} />
        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(tự động)</span>
      </div>

      {/* Answer key */}
      {questions.length > 0 && (
        <div className="exam-ml-answer-section" onClick={(e) => e.stopPropagation()}>
          <div className="exam-ml-answer-title">🔑 Đáp án (theo thứ tự ô trống)</div>
          {questions.map((q) => (
            <div key={q.id} className="exam-ml-answer-row">
              <span className="exam-ml-answer-num">Câu {q.questionNumber}</span>
              <input className="exam-q-text-input" style={{ flex: 1, margin: 0 }}
                value={q.answerText ?? ''}
                placeholder="Đáp án đúng..."
                onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
                onClick={(e) => e.stopPropagation()} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---- Drag Matching Block ----
// Two-column: left = items with numbered gap, right = word bank (editable options)
const DragMatchingBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const options = group.optionBank ?? [];
  const questions = group.questions ?? [];
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Two-column layout */}
      <div className="exam-dm-layout">
        {/* Left column: items */}
        <div className="exam-dm-left">
          <div className="exam-dm-col-header">
            <input className="exam-dm-col-title-input"
              value={group.leftTitle ?? ''}
              placeholder="Cột trái (VD: People)"
              onChange={(e) => onUpdate(group.id, { leftTitle: e.target.value })}
              onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="exam-q-range-header" style={{ marginTop: 6, marginBottom: 8 }}>
            Câu&nbsp;
            <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1"
              onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
              onClick={(e) => e.stopPropagation()} />
            &nbsp;–&nbsp;
            <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="5"
              onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
              onClick={(e) => e.stopPropagation()} />
          </div>
          {questions.map((q) => (
            <div key={q.id}
              className={`exam-dm-row${selectedQuestionId === q.id ? ' selected' : ''}`}
              onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
              <input className="exam-dm-item-name"
                value={q.questionText || ''}
                placeholder="Tên mục (VD: Mary Brown)"
                onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
                onClick={(e) => e.stopPropagation()} />
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
            <input className="exam-dm-col-title-input"
              value={group.rightTitle ?? ''}
              placeholder="Cột phải (VD: Staff Responsibilities)"
              onChange={(e) => onUpdate(group.id, { rightTitle: e.target.value })}
              onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="exam-dm-bank">
            {options.map((o, i) => (
              <div key={i} className="exam-dm-option">
                <input className="exam-q-text-input" style={{ flex: 1, margin: 0 }}
                  value={o.text || ''}
                  placeholder={`Lựa chọn ${i + 1}...`}
                  onChange={(e) => {
                    const n = [...options];
                    n[i] = { ...n[i], text: e.target.value };
                    onUpdate(group.id, { optionBank: n });
                  }}
                  onClick={(e) => e.stopPropagation()} />
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

// ---- Group renderer (dispatches by contentType) ----
const MatchingHeadingBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const headings = group.headingBank ?? [];
  const questions = group.questions ?? [];
  const [draggingHeading, setDraggingHeading] = useState(null); // { text, index }
  const [overSlotId, setOverSlotId] = useState(null);

  // Which headings are already assigned
  const assignedTexts = new Set(questions.map((q) => q.answerText).filter(Boolean));

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Heading bank — draggable chips */}
      <div className="exam-heading-bank">
        <div className="exam-heading-bank-title">List of Headings — kéo vào section bên dưới</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {headings.map((h, i) => {
            const isAssigned = assignedTexts.has(h.text);
            return (
              <div key={i} className="exam-heading-bank-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="exam-heading-roman">{toRoman(i + 1)}</span>
                <input className="exam-q-text-input" style={{ flex: 1, margin: 0 }}
                  value={h.text || ''} placeholder={`Heading ${toRoman(i + 1)}...`}
                  onChange={(e) => { const n = [...headings]; n[i] = { ...n[i], text: e.target.value }; onUpdate(group.id, { headingBank: n }); }}
                  onClick={(e) => e.stopPropagation()} />
                {/* Draggable chip */}
                <div
                  className={`mh-chip${isAssigned ? ' assigned' : ''}`}
                  draggable={!isAssigned}
                  title={isAssigned ? 'Đã gán' : 'Kéo vào section'}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('text/x-heading', JSON.stringify({ text: h.text, index: i }));
                    e.dataTransfer.effectAllowed = 'copy';
                    setDraggingHeading({ text: h.text, index: i });
                  }}
                  onDragEnd={() => setDraggingHeading(null)}
                >
                  {isAssigned ? '✓' : '⠿'}
                </div>
                <button className="exam-q-del-btn" onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { headingBank: headings.filter((_, j) => j !== i) }); }}>×</button>
              </div>
            );
          })}
        </div>
        <button className="exam-add-btn" style={{ marginTop: 6 }}
          onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { headingBank: [...headings, { id: Date.now(), text: '' }] }); }}>
          <Plus size={11} /> Thêm heading
        </button>
      </div>

      {/* Section slots — drop targets */}
      <div className="exam-q-range-header" style={{ marginTop: 12 }}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="4" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      </div>
      {questions.map((q) => {
        const isOver = overSlotId === q.id;
        const hasAnswer = !!q.answerText;
        // Find heading index for badge
        const hIdx = headings.findIndex((h) => h.text === q.answerText);
        return (
          <div key={q.id}
            className={`exam-matching-slot${selectedQuestionId === q.id ? ' selected' : ''}${isOver ? ' drop-over' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverSlotId(q.id); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverSlotId(null); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              setOverSlotId(null);
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/x-heading'));
                if (data?.text) onUpdateQuestion(group.id, q.id, { answerText: data.text });
              } catch {}
            }}
          >
            <div className="exam-q-num">{q.questionNumber ?? '?'}</div>
            <input className="exam-q-text-input" value={q.questionText || ''}
              placeholder="Tên section (VD: Section A)..."
              onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
              onClick={(e) => e.stopPropagation()} />

            {/* Answer badge — drop here or click × to clear */}
            {hasAnswer ? (
              <div className="mh-answer-badge">
                {hIdx >= 0 && <span className="mh-answer-roman">{toRoman(hIdx + 1)}</span>}
                <span className="mh-answer-text">{q.answerText}</span>
                <button className="mh-clear-btn" title="Xóa đáp án"
                  onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { answerText: '' }); }}>
                  ×
                </button>
              </div>
            ) : (
              <div className={`mh-drop-target${isOver ? ' over' : ''}`}>
                {isOver ? '↓ Thả heading' : '⬚ Kéo heading vào'}
              </div>
            )}

            <button className="exam-group-tool-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}><X size={11} /></button>
          </div>
        );
      })}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm section
      </button>
    </div>
  );
};

// ---- Multiple Choice Block (nhóm câu MCQ chọn 1 đáp án) ----
const MultipleChoiceBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      <div className="exam-mc-instructions">
        Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.
      </div>
      {/* Optional shared context / instructions */}
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Ngữ cảnh chung (nếu có, VD: What does the speaker say about...)"
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}>
        {group.title || ''}
      </div>
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
      {questions.map((q) => {
        const opts = q.options ?? [];
        return (
          <div key={q.id}
            className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-mc-q-header">
              <div className="exam-q-num">{q.questionNumber ?? '?'}</div>
              <input className="exam-q-text-input" style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Nội dung câu hỏi..."
                onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
                onClick={(e) => e.stopPropagation()} />
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>
            <div className="exam-mc-options">
              {opts.map((opt, i) => (
                <div key={i} className={`exam-mc-opt${opt.isCorrect ? ' correct' : ''}`}>
                  <span className="exam-mc-opt-label">{String.fromCharCode(65 + i)}</span>
                  <input className="exam-q-option-text-input"
                    value={opt.optionText || ''}
                    placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}...`}
                    onChange={(e) => {
                      const next = [...opts]; next[i] = { ...next[i], optionText: e.target.value };
                      onUpdateQuestion(group.id, q.id, { options: next });
                    }}
                    onClick={(e) => e.stopPropagation()} />
                  <input type="radio" className="exam-mc-opt-radio"
                    checked={!!opt.isCorrect} title="Đánh dấu đáp án đúng"
                    onChange={() => {
                      const next = opts.map((o, j) => ({ ...o, isCorrect: j === i }));
                      onUpdateQuestion(group.id, q.id, { options: next, answerText: opt.optionText });
                    }}
                    onClick={(e) => e.stopPropagation()} />
                  <button className="exam-q-del-btn"
                    onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { options: opts.filter((_, j) => j !== i) }); }}>×</button>
                </div>
              ))}
              <button className="exam-add-btn" style={{ padding: '3px 10px', fontSize: 11, marginTop: 4 }}
                onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { options: [...opts, { id: Date.now(), optionText: '', isCorrect: false }] }); }}>
                <Plus size={10} /> Thêm lựa chọn
              </button>
            </div>
          </div>
        );
      })}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};

// ---- Multiple Choice Multi Block (chọn nhiều đáp án) ----
const MultipleChoiceMultiBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      <div className="exam-mc-instructions">
        Choose <strong>TWO</strong> letters, <strong>A–E</strong>.
        <input type="number" min={1} max={8} className="exam-choose-n-input" style={{ marginLeft: 8, width: 38 }}
          value={group.chooseCount ?? 2}
          onChange={(e) => onUpdate(group.id, { chooseCount: Number(e.target.value) })}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;đáp án đúng mỗi câu
      </div>
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Ngữ cảnh chung (nếu có)..."
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}>
        {group.title || ''}
      </div>
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
      {questions.map((q) => {
        const opts = q.options ?? [];
        return (
          <div key={q.id}
            className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-mc-q-header">
              <div className="exam-q-num" style={{ background: '#9d174d' }}>{q.questionNumber ?? '?'}</div>
              <input className="exam-q-text-input" style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Nội dung câu hỏi..."
                onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
                onClick={(e) => e.stopPropagation()} />
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>
            <div className="exam-mc-options">
              {opts.map((opt, i) => (
                <div key={i} className={`exam-mc-opt${opt.isCorrect ? ' correct' : ''}`}>
                  <span className="exam-mc-opt-label">{String.fromCharCode(65 + i)}</span>
                  <input className="exam-q-option-text-input"
                    value={opt.optionText || ''}
                    placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}...`}
                    onChange={(e) => {
                      const next = [...opts]; next[i] = { ...next[i], optionText: e.target.value };
                      onUpdateQuestion(group.id, q.id, { options: next });
                    }}
                    onClick={(e) => e.stopPropagation()} />
                  <input type="checkbox" className="exam-q-option-correct"
                    checked={!!opt.isCorrect} title="Đáp án đúng"
                    onChange={(e) => {
                      const next = [...opts]; next[i] = { ...next[i], isCorrect: e.target.checked };
                      onUpdateQuestion(group.id, q.id, { options: next });
                    }}
                    onClick={(e) => e.stopPropagation()} />
                  <button className="exam-q-del-btn"
                    onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { options: opts.filter((_, j) => j !== i) }); }}>×</button>
                </div>
              ))}
              <button className="exam-add-btn" style={{ padding: '3px 10px', fontSize: 11, marginTop: 4 }}
                onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { options: [...opts, { id: Date.now(), optionText: '', isCorrect: false }] }); }}>
                <Plus size={10} /> Thêm lựa chọn
              </button>
            </div>
          </div>
        );
      })}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};

// ---- Sentence Completion Block ----
// Each question is a sentence with a blank: "The train departs at ___."
const SentenceCompletionBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`}
    onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-mc-instructions">
      Complete the sentences. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.
    </div>
    <div contentEditable suppressContentEditableWarning className="exam-mc-context"
      data-placeholder="Tiêu đề / ngữ cảnh (nếu có)..."
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}>
      {group.title || ''}
    </div>
    <div className="exam-q-range-header">
      Câu&nbsp;
      <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1"
        onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
      &nbsp;–&nbsp;
      <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="5"
        onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
    </div>
    {(group.questions ?? []).map((q) => (
      <div key={q.id}
        className={`exam-sc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
        <div className="exam-q-num" style={{ background: '#065f46', flexShrink: 0 }}>{q.questionNumber ?? '?'}</div>
        <div className="exam-sc-body">
          <input className="exam-q-text-input"
            value={q.questionText || ''}
            placeholder="VD: The conference will be held in ___ (câu hỏi / câu chứa chỗ trống)"
            onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Đáp án:</span>
            <input className="exam-q-fill-answer" style={{ flex: 1 }}
              value={q.answerText || ''}
              placeholder="nhập đáp án mẫu..."
              onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
              onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
        <button className="exam-group-tool-btn danger"
          onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
          <X size={11} />
        </button>
      </div>
    ))}
    <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
      <Plus size={12} /> Thêm câu
    </button>
  </div>
);

// ---- Short Answer Block ----
const ShortAnswerBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`}
    onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-mc-instructions">
      Answer the questions. Write <strong>NO MORE THAN THREE WORDS</strong> for each answer.
    </div>
    <div contentEditable suppressContentEditableWarning className="exam-mc-context"
      data-placeholder="Tiêu đề / ngữ cảnh (nếu có)..."
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}>
      {group.title || ''}
    </div>
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
          <input className="exam-q-text-input"
            value={q.questionText || ''}
            placeholder="VD: What is the name of the street?"
            onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Đáp án:</span>
            <input className="exam-q-fill-answer" style={{ flex: 1 }}
              value={q.answerText || ''}
              placeholder="nhập đáp án mẫu..."
              onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
              onClick={(e) => e.stopPropagation()} />
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

// ---- Note Completion Block ----
const NoteCompletionBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

    {/* Instructions */}
    <div className="exam-note-instructions">Complete the notes below. Write <strong>ONE WORD AND/OR A NUMBER</strong> for each answer.</div>

    {/* Note title (e.g. "Phone call about second-hand furniture") */}
    <div contentEditable suppressContentEditableWarning className="exam-note-form-title"
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}
      data-placeholder="Tiêu đề ghi chú (VD: Phone call about furniture)">
      {group.title || ''}
    </div>

    <RichBlankEditor
      value={group.noteText}
      onChange={(text) => onUpdate(group.id, { noteText: text })}
      placeholder={'VD:\nItems:\nDining table:\n  - (ô trống) shape\n  - medium size\n  - (ô trống) old'}
      preWrap
      blankClass="rbe-blank-amber"
    />

    <div className="exam-q-range-header" style={{ marginTop: 12 }}>
      Câu&nbsp;
      <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      &nbsp;–&nbsp;
      <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="10" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
    </div>
    {(group.questions ?? []).map((q, idx) => (
      <div key={q.id} className={`exam-question${selectedQuestionId === q.id ? ' selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
        <div className="exam-q-num" style={{ background: '#854d0e' }}>{q.questionNumber ?? idx + 1}</div>
        <div className="exam-q-body">
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Đáp án:</div>
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

const SummaryCompletionBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-summary-instructions">Complete the summary. Write <strong>ONE WORD ONLY</strong> from the text for each answer.</div>

    {/* Summary title */}
    <div contentEditable suppressContentEditableWarning className="exam-passage-title"
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.textContent })}>
      {group.title || ''}
    </div>

    <RichBlankEditor
      value={group.summaryText}
      onChange={(text) => onUpdate(group.id, { summaryText: text })}
      placeholder="VD: Physicists showed that congestion can arise (ô trống) without external causes..."
      blankClass="rbe-blank-blue"
    />

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
const GroupRenderer = ({ group, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, dragHandleProps, allGroups }) => {
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
    return <NoteCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MULTIPLE_CHOICE_GROUP') {
    return <MultipleChoiceBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MULTIPLE_CHOICE_MULTI') {
    return <MultipleChoiceMultiBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
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
      selectedQuestionId={selectedQuestionId} />;
  }
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
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      allGroups={allGroups ?? []} />;
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
const PartView = ({ skill, part, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onAddGroup, isDropOver, isPassagePaneOver }) => {
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
          dragHandleProps={dragHandleProps} />
      )}
    </SortableGroupWrapper>
  );

  if (skill === 'READING') {
    const passages = groups.filter((g) => g.contentType === 'READING_PASSAGE');
    const qGroups  = groups.filter((g) => g.contentType !== 'READING_PASSAGE');
    return (
      <div className="exam-split">
        {/* LEFT: passage texts only */}
        <div className="exam-pane passage">
          <div className="exam-pane-label">📄 Đoạn văn</div>
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
        <div className="exam-pane questions">
          <div className="exam-pane-label">❓ Câu hỏi</div>
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
  dragOverPassagePaneId,
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

  // For Reading: passage pane highlights when dragging a READING_PASSAGE over the left pane
  const isPassagePaneOver = !!dragOverPassagePaneId && (
    dragOverPassagePaneId === `canvas-drop-left-${activePart?.id}`
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
              isDropOver={isDropOver}
              isPassagePaneOver={isPassagePaneOver} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCanvas;
