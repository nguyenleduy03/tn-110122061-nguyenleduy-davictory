/**
 * ExamCanvas.jsx
 * WYSIWYG canvas — renders the exam exactly as students would see it,
 * with inline editing and drag-and-drop capabilities.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical, X, Volume2, Image, Plus, ChevronUp, ChevronDown, FileText, ClipboardList, Mic, PenLine } from 'lucide-react';
import RichInput from '../common/RichInput';
import { normalizeRichHtml } from '../../utils/textFormatters';
import SharedOptionsDropdownBlock from './SharedOptionsDropdownBlock';

// ---- Type metadata ----
const TYPE_META = {
  READING_PASSAGE:        { label: 'Đoạn văn',           bg: '#dcfce7', color: '#15803d' },
  AUDIO_TRANSCRIPT:       { label: 'Nghe',                bg: '#dbeafe', color: '#1d4ed8' },
  STANDALONE:             { label: 'Câu độc lập',         bg: '#f3f4f6', color: '#374151' },
  DIAGRAM:                { label: 'Sơ đồ',               bg: '#fef9c3', color: '#a16207' },
  MAP:                    { label: 'Bản đồ',              bg: '#fce7f3', color: '#be185d' },
  MAP_LABELLING:          { label: 'Map Labelling',        bg: '#f0fdf4', color: '#166534' },
  IMAGE_NOTE_FORM:        { label: 'Ảnh + Note Form',     bg: '#e0e7ff', color: '#4338ca' },
  TABLE_COMPLETION:       { label: 'Table Completion',     bg: '#e0e7ff', color: '#4338ca' },
  TABLE:                  { label: 'Bảng',                bg: '#e0e7ff', color: '#4338ca' },
  MATCHING_HEADING:       { label: 'Matching Headings',   bg: '#fff7ed', color: '#c2410c' },
  DRAG_MATCHING:          { label: 'Drag Matching',        bg: '#f0fdf4', color: '#166534' },
  SUMMARY_COMPLETION:     { label: 'Summary Completion',  bg: '#f0f9ff', color: '#0369a1' },
  NOTE_COMPLETION:        { label: 'Note Completion',      bg: '#fefce8', color: '#854d0e' },
  MULTIPLE_CHOICE_GROUP:  { label: 'Multiple Choice',      bg: '#ffe4e6', color: '#be123c' },
  MULTIPLE_CHOICE_MULTI:  { label: 'MC Nhiều đáp án',       bg: '#fce7f3', color: '#9d174d' },
  TRUE_FALSE_NG:          { label: 'True/False/NG',      bg: '#eff6ff', color: '#1d4ed8' },
  SENTENCE_COMPLETION:    { label: 'Sentence Completion',  bg: '#ecfdf5', color: '#065f46' },
  SHORT_ANSWER_GROUP:     { label: 'Short Answer',         bg: '#f0fdf4', color: '#166534' },
  FLOW_CHART:             { label: 'Flow-chart',           bg: '#f0fdfa', color: '#0f766e' },
  SHARED_OPTIONS_DROPDOWN:{ label: 'Dropdown chung',       bg: '#e0f2fe', color: '#0369a1' },
  WRITING_TASK:           { label: 'Writing',              bg: '#fef9c3', color: '#a16207' },
  SPEAKING_INTERVIEW:     { label: 'Phỏng vấn',            bg: '#fce7f3', color: '#be185d' },
  SPEAKING_CUECARD:       { label: 'Cue Card',             bg: '#fdf4ff', color: '#7e22ce' },
};

// ---- Helper ----
const toRoman = (n) => {
  const nums = [1, 4, 5, 9, 10, 40, 50];
  const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
  let r = '';
  for (let i = syms.length - 1; i >= 0; i--) { while (n >= nums[i]) { r += syms[i]; n -= nums[i]; } }
  return r;
};

const toPlainText = (value) => {
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

const countBlankTokens = (text = '') => (String(text).match(/\[blank\]|\(ô trống\)/gi) || []).length;

const isImagePinQuestion = (q) => q?.questionMode === 'image-pin' || (q?.pinX != null && q?.pinY != null);

const isNoteBlankQuestion = (q) => q?.questionMode === 'note-blank' || !isImagePinQuestion(q);

const getNextQuestionNumber = (questions = []) => {
  const maxNumber = questions.reduce((max, q) => {
    const num = Number(q?.questionNumber ?? 0);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return maxNumber + 1;
};

const fileToCompressedDataUrl = (file, { maxWidth = 1280, quality = 0.82 } = {}) => new Promise((resolve, reject) => {
  if (!file || !file.type?.startsWith('image/')) {
    reject(new Error('Invalid image file'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('Không tải được ảnh'));
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width || 1, img.height || 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(reader.result);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ---- Rich Blank Editor ----
// contentEditable editor for Summary / Note Completion.
// Drag the toolbar chip into the text to insert a numbered blank at that position.
const RichBlankEditor = ({ value, onChange, placeholder, preWrap = false, blankClass = 'rbe-blank-blue', startNumber = 1 }) => {
  const editorRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const toHTML = (text) => {
    if (!text) return '';
    let n = startNumber - 1;
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
    let n = startNumber - 1;
    editorRef.current?.querySelectorAll('[data-blank="true"] .rbe-blank-num').forEach((el) => {
      el.textContent = ++n;
    });
  };

  useEffect(() => {
    renumber();
  }, [startNumber]); // eslint-disable-line react-hooks/exhaustive-deps

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
          try {
            let range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
            if (!range && document.caretPositionFromPoint) {
              const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
              if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
              }
            }
            if (!range) return;
            const cont = range.startContainer?.nodeType === 1
              ? range.startContainer
              : range.startContainer?.parentElement;
            if (cont?.closest?.('[data-blank="true"]')) return;
            range.deleteContents();
            range.insertNode(createChip());
            renumber();
            if (editorRef.current) onChange(toText(editorRef.current));
          } catch (err) {
            console.error('RBE drop failed', err);
          }
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
const GroupToolbar = ({ group, dragHandleProps, onDelete, onMoveUp, onMoveDown }) => {
  const meta = TYPE_META[group.contentType] || TYPE_META.STANDALONE;
  return (
    <div className="exam-group-toolbar exam-group-toolbar-draggable" {...dragHandleProps}>
      <span className="exam-group-drag-handle"><GripVertical size={13} /></span>
      <span className="exam-type-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        <button className="exam-group-tool-btn" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onMoveUp?.(group.id); }} title="Di chuyển lên">
          <ChevronUp size={12} />
        </button>
        <button className="exam-group-tool-btn" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onMoveDown?.(group.id); }} title="Di chuyển xuống">
          <ChevronDown size={12} />
        </button>
      <button className="exam-group-tool-btn danger" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} title="Xóa nhóm">
        <X size={12} />
      </button>
    </div>
  );
};

// ---- Mini rich-text input (Bold / Italic / Underline) ----
// ---- Passage block ----
// Mỗi đoạn văn có tiêu đề (label A/B/C...) + nội dung editable.
// Không hiển thị heading drop-slot ở đây — Matching Headings được quản lý riêng ở pane phải.
// paragraphs: [{ id, label, text, imageUrl? }]
const PassageBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, mhHeadings = [], mhAnswersByLabel = {} }) => {
  const [draggingOverPara, setDraggingOverPara] = useState(null);
  const [pendingImagePara, setPendingImagePara] = useState(null);
  const fileInputRefs = useRef({});

  const isMulti = !!group.multiParagraph;

  const paragraphs = group.paragraphs && group.paragraphs.length > 0
    ? group.paragraphs
    : [{ id: `${group.id}-p0`, label: 'A', text: group.passageText || '' }];

  const PARA_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const updateParagraphs = (newParas) => {
    const labeled = newParas.map((p, i) => ({ ...p, label: PARA_LABELS[i] ?? String(i + 1) }));
    onUpdate(group.id, { paragraphs: labeled, passageText: labeled.map((p) => p.text).join('\n\n') });
  };

  const enableMulti = () => {
    // Giữ lại đoạn hiện tại, chỉ bật multi mode
    const labeled = paragraphs.map((p, i) => ({ ...p, label: PARA_LABELS[i] ?? String(i + 1) }));
    onUpdate(group.id, { multiParagraph: true, paragraphs: labeled });
  };

  const addParagraph = () => {
    const newId = `${group.id}-p${Date.now()}`;
    updateParagraphs([...paragraphs, { id: newId, label: '', text: '' }]);
  };

  const removeParagraph = (pid) => {
    if (paragraphs.length <= 1) return;
    updateParagraphs(paragraphs.filter((p) => p.id !== pid));
  };

  const updateParaImage = (pid, imageUrl) => {
    updateParagraphs(paragraphs.map((p) => p.id === pid ? { ...p, imageUrl } : p));
  };

  const applyImageFile = (pid, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    fileToCompressedDataUrl(file)
      .then((dataUrl) => updateParaImage(pid, dataUrl))
      .catch((err) => console.error('Image upload failed:', err));
  };

  // Accept both: sidebar palette drag AND direct image file drag from OS
  const isParaImageDrag = (e) => {
    const types = e.dataTransfer.types;
    if (types.includes('application/para-image')) return true;
    if (types.includes('Files')) {
      const items = e.dataTransfer.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type.startsWith('image/')) return true;
        }
      }
      return true;
    }
    return false;
  };

  const handleParaDragOver = (pid, e) => {
    if (!isParaImageDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDraggingOverPara(pid);
  };

  const handleParaDragLeave = (pid, e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDraggingOverPara(null);
    }
  };

  const handleParaDrop = (pid, e) => {
    if (!isParaImageDrag(e)) return;
    e.preventDefault();
    setDraggingOverPara(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      applyImageFile(pid, file);
    } else {
      setPendingImagePara(pid);
    }
  };

  // Render a single paragraph body (image + text)
  const renderParaBody = (para, idx) => (
    <>
      {para.imageUrl && (
        <div className="passage-para-img-wrap">
          <img src={para.imageUrl} alt={`Para ${para.label}`} className="passage-para-img" />
          <button className="passage-para-img-remove" title="Xóa ảnh"
            onClick={(e) => { e.stopPropagation(); updateParaImage(para.id, null); }}>
            <X size={11} />
          </button>
        </div>
      )}
      {draggingOverPara === para.id && (
        <div className="passage-para-drop-hint">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Image size={13} />
            Thả để thêm ảnh{isMulti ? ` vào đoạn ${PARA_LABELS[idx]}` : ''}
          </span>
        </div>
      )}
      {pendingImagePara === para.id && !para.imageUrl && (
        <div className="passage-para-img-pick"
          onClick={(e) => { e.stopPropagation(); fileInputRefs.current[para.id]?.click(); }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><Image size={14} /></span>
          <span>Click để chọn ảnh{isMulti ? ` cho đoạn ${PARA_LABELS[idx]}` : ''}</span>
          <button className="passage-para-img-pick-cancel"
            onClick={(e) => { e.stopPropagation(); setPendingImagePara(null); }}
            title="Bỏ qua">✕</button>
        </div>
      )}
      <input
        ref={(el) => { fileInputRefs.current[para.id] = el; }}
        type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => {
          applyImageFile(para.id, e.target.files?.[0]);
          setPendingImagePara(null);
          e.target.value = '';
        }}
      />
      <RichInput
        value={para.text || ''}
        placeholder={isMulti ? `Nội dung đoạn ${PARA_LABELS[idx] ?? idx + 1}...` : 'Nội dung đoạn văn...'}
        onChange={(html) => updateParagraphs(paragraphs.map((p) => p.id === para.id ? { ...p, text: html } : p))}
        style={{ marginTop: 4 }}
        multiline
      />
    </>
  );

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Passage title */}
      <RichInput
        value={group.title || ''}
        placeholder="Tiêu đề bài đọc (VD: The Physics of Traffic Behavior)..."
        onChange={(html) => onUpdate(group.id, { title: html })}
        style={{ marginBottom: 8 }}
        className="exam-passage-title-wrap"
      />

      {/* SIMPLE mode: 1 đoạn, không label */}
      {!isMulti && (
        <div
          className={`passage-para${draggingOverPara === paragraphs[0]?.id ? ' para-img-drag-over' : ''}`}
          onDragOver={(e) => handleParaDragOver(paragraphs[0]?.id, e)}
          onDragLeave={(e) => handleParaDragLeave(paragraphs[0]?.id, e)}
          onDrop={(e) => handleParaDrop(paragraphs[0]?.id, e)}
        >
          {renderParaBody(paragraphs[0], 0)}
        </div>
      )}

      {/* MULTI mode: nhiều đoạn với label A/B/C */}
      {isMulti && paragraphs.map((para, idx) => (
        <div
          key={para.id}
          className={`passage-para${draggingOverPara === para.id ? ' para-img-drag-over' : ''}`}
          onDragOver={(e) => handleParaDragOver(para.id, e)}
          onDragLeave={(e) => handleParaDragLeave(para.id, e)}
          onDrop={(e) => handleParaDrop(para.id, e)}
        >
          <div className="passage-para-header">
            <span className="passage-para-label">{PARA_LABELS[idx] ?? idx + 1}</span>
            {/* Heading đã gán — hiện nếu có MatchingHeading group */}
            {isMulti && mhHeadings.length > 0 && (() => {
              const assignedText = mhAnswersByLabel[PARA_LABELS[idx]];
              const hIdx = mhHeadings.findIndex((h) => h.text === assignedText);
              return assignedText ? (
                <span className="passage-para-mh-badge" title={assignedText}>
                  {hIdx >= 0 ? toRoman(hIdx + 1) + '. ' : ''}{assignedText}
                </span>
              ) : (
                <span className="passage-para-mh-empty">— chưa gán heading —</span>
              );
            })()}
            {paragraphs.length > 1 && (
              <button className="exam-group-tool-btn danger" style={{ flexShrink: 0, marginLeft: 'auto' }}
                onClick={(e) => { e.stopPropagation(); removeParagraph(para.id); }}
                title="Xóa đoạn này">
                <X size={11} />
              </button>
            )}
          </div>
          {renderParaBody(para, idx)}
        </div>
      ))}

      {/* Footer buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!isMulti && (
          <button className="exam-add-btn" style={{ borderColor: '#f59e0b', color: '#92400e', background: '#fffbeb' }}
            onClick={(e) => { e.stopPropagation(); enableMulti(); }}>
            <Plus size={12} /> Thêm heading
          </button>
        )}
        {isMulti && (
          <button className="exam-add-btn"
            onClick={(e) => { e.stopPropagation(); addParagraph(); }}>
            <Plus size={12} /> Thêm đoạn
          </button>
        )}
      </div>
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
        <RichInput
          style={{ flex: 1 }}
          value={question.questionText || ''}
          placeholder="Nội dung câu hỏi..."
          onChange={(html) => onUpdate({ questionText: html })} />

        {type === 'MULTIPLE_CHOICE' && (
          <div className="exam-q-options">
            {(question.options ?? []).map((opt, i) => (
              <div key={i} className="exam-q-option">
                <input type="radio" readOnly checked={false} onChange={() => {}} />
                <RichInput
                  style={{ flex: 1 }}
                  value={opt.optionText || ''}
                  placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                  onChange={(html) => {
                    const opts = [...(question.options ?? [])];
                    opts[i] = { ...opts[i], optionText: html };
                    onUpdate({ options: opts });
                  }} />
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
                  <RichInput
                    style={{ flex: 1 }}
                    value={opt.optionText || ''}
                    placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                    onChange={(html) => {
                      const opts = [...(question.options ?? [])];
                      opts[i] = { ...opts[i], optionText: html };
                      onUpdate({ options: opts });
                    }}
                  />
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
            <RichInput
              style={{ minWidth: 220 }}
              value={question.answerText || ''}
              placeholder="đáp án mẫu..."
              onChange={(html) => onUpdate({ answerText: html })}
            />
          </div>
        )}

        {type === 'SHORT_ANSWER' && (
          <RichInput
            multiline
            rows={2}
            style={{ width: '100%' }}
            placeholder="Gợi ý đáp án..."
            value={question.answerText || ''}
            onChange={(html) => onUpdate({ answerText: html })}
          />
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
    fileToCompressedDataUrl(file)
      .then((dataUrl) => onUpdate(group.id, { imageUrl: dataUrl }))
      .catch((err) => console.error('Image upload failed:', err));
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-field" onClick={(e) => e.stopPropagation()} style={{ marginBottom: 10 }}>
        <label className="exam-field-label">Yeu cau hien thi phia tren</label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          onChange={(html) => onUpdate(group.id, { instructions: html })}
          placeholder="VD: Label the map. Choose the correct answer and move it into the gap."
        />
      </div>

      {/* Upload controls */}
      <div className="exam-ml-upload-bar" onClick={(e) => e.stopPropagation()}>
        <input className="exam-img-url-field" style={{ flex: 1, minWidth: 0 }}
          value={group.imageUrl?.startsWith('data:') ? '(ảnh đã tải lên)' : (group.imageUrl ?? '')}
          placeholder="URL ảnh bản đồ..."
          readOnly={group.imageUrl?.startsWith('data:')}
          onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })} />
        <label className="exam-ml-upload-btn">
          Tải lên
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
          Rộng ảnh: <strong>{group.imageWidth ?? 100}%</strong>
          <input type="range" min={20} max={100} step={1}
            value={group.imageWidth ?? 100}
            onChange={(e) => onUpdate(group.id, { imageWidth: Number(e.target.value) })} />
        </label>
        <label className="exam-ml-size-label">
          Cỡ ô: <strong>{group.pinBoxWidth ?? 60}px</strong>
          <input type="range" min={30} max={180} step={2}
            value={group.pinBoxWidth ?? 60}
            onChange={(e) => onUpdate(group.id, { pinBoxWidth: Number(e.target.value) })} />
        </label>
        <label className="exam-ml-size-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={Boolean(group.constrainHalfPage)}
            onChange={(e) => onUpdate(group.id, { constrainHalfPage: e.target.checked })}
          />
          Ràng buộc hiển thị 1/2 trang
        </label>
      </div>

      {/* Image canvas */}
      <div ref={containerRef} className="exam-ml-container"
        style={{ cursor: group.imageUrl ? 'crosshair' : 'default' }}
        onClick={addPin}>
        {group.imageUrl
          ? <img src={group.imageUrl} alt="map" draggable={false}
              style={{ display: 'block', width: `${group.imageWidth ?? 100}%`, height: 'auto', pointerEvents: 'none' }} />
          : <div className="exam-ml-empty">Tải ảnh lên, sau đó nhấn vào ảnh để thêm ô đánh số</div>
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
              <RichInput
                style={{ flex: 1 }}
                value={o.text || ''} placeholder={`Lựa chọn ${i + 1}...`}
                onChange={(html) => {
                  const n = [...options]; n[i] = { ...n[i], text: html };
                  onUpdate(group.id, { optionBank: n });
                }} />
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

// ---- Flow-chart helpers ----
function syncFcQuestions(nodes, currentQs, fromQ) {
  let n = 0;
  for (const node of nodes) {
    n += ((node.text ?? '').match(/\[blank\]/g) ?? []).length;
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
          try {
            let range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
            if (!range && document.caretPositionFromPoint) {
              const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
              if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
            }
            if (!range) return;
            const cont = range.startContainer?.nodeType === 1 ? range.startContainer : range.startContainer?.parentElement;
            if (cont?.closest?.('[data-blank="true"]')) return;
            range.deleteContents();
            range.insertNode(createChip());
            renumber();
            if (editorRef.current) onChange(toText(editorRef.current));
          } catch (err) {
            console.error('RBE cell drop failed', err);
          }
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
              <RichInput
                style={{ flex: 1 }}
                value={q.answerText ?? ''}
                placeholder="Đáp án đúng..."
                onChange={(html) => onUpdateQuestion(group.id, q.id, { answerText: html })} />
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
            <RichInput
              style={{ width: '100%' }}
              value={group.leftTitle ?? ''}
              placeholder="Cột trái (VD: People)"
              onChange={(html) => onUpdate(group.id, { leftTitle: html })}
            />
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

// ---- Matching Heading Block ----
// Giao diện tạo đề tối giản:
//   • Phần trên: nhập "List of Headings" (i, ii, iii, ...) — danh sách heading có thể nhiều hơn số câu (headings dư để đánh lừa)
//   • Phần dưới: từng section (đoạn A/B/C) — nhập tên section + chọn đáp án đúng từ dropdown
// Không dùng drag & drop trong canvas soạn đề để tránh nhầm lẫn với DnD của DndContext.
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
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
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
      {questions.map((q) => {
        const opts = q.options ?? [];
        return (
          <div key={q.id}
            className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-mc-q-header">
              <div className="exam-q-num">{q.questionNumber ?? '?'}</div>
              <RichInput
                style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Nội dung câu hỏi..."
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>
            <div className="exam-mc-options">
              {opts.map((opt, i) => {
                const isImg = opt.optionMode === 'image';
                return (
                  <div key={i} className={`exam-mc-opt${opt.isCorrect ? ' correct' : ''}${isImg ? ' exam-mc-opt-img-row' : ''}`}>
                    <span className="exam-mc-opt-label">{String.fromCharCode(65 + i)}</span>
                    {isImg ? (
                      <div className="exam-mc-opt-image-cell">
                        {opt.optionImageUrl
                          ? <img src={opt.optionImageUrl} alt={`Opt ${String.fromCharCode(65 + i)}`} className="exam-mc-opt-img-preview" />
                          : <div className="exam-mc-opt-img-empty">Chưa có ảnh</div>}
                        <div className="exam-mc-opt-img-controls">
                          <input
                            type="text"
                            className="exam-mc-opt-url-input"
                            placeholder="Dán URL ảnh..."
                            value={opt.optionImageUrl || ''}
                            onChange={(e) => { const next = [...opts]; next[i] = { ...next[i], optionImageUrl: e.target.value }; onUpdateQuestion(group.id, q.id, { options: next }); }}
                            onClick={(e) => e.stopPropagation()} />
                          <label className="exam-mc-img-file-btn" title="Tải ảnh từ máy" onClick={(e) => e.stopPropagation()}>
                            <Image size={12} />
                            <input type="file" accept="image/*" hidden onChange={(e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                                fileToCompressedDataUrl(file)
                                  .then((dataUrl) => {
                                    const next = [...opts]; next[i] = { ...next[i], optionImageUrl: dataUrl };
                                    onUpdateQuestion(group.id, q.id, { options: next });
                                  })
                                  .catch((err) => console.error('Image upload failed:', err));
                                e.target.value = '';
                            }} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <RichInput
                        style={{ flex: 1 }}
                        value={opt.optionText || ''}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}...`}
                        onChange={(html) => {
                          const next = [...opts]; next[i] = { ...next[i], optionText: html };
                          onUpdateQuestion(group.id, q.id, { options: next });
                        }} />
                    )}
                    <button
                      className="exam-mc-opt-mode-btn"
                      title={isImg ? 'Chuyển sang văn bản' : 'Chuyển sang hình ảnh'}
                      onClick={(e) => { e.stopPropagation(); const next = [...opts]; next[i] = { ...next[i], optionMode: isImg ? 'text' : 'image' }; onUpdateQuestion(group.id, q.id, { options: next }); }}>
                      {isImg ? <span style={{ fontSize: 11, fontWeight: 700 }}>Aa</span> : <Image size={12} />}
                    </button>
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
                );
              })}
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
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
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
      {questions.map((q) => {
        const opts = q.options ?? [];
        return (
          <div key={q.id}
            className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-mc-q-header">
              <div className="exam-q-num" style={{ background: '#9d174d' }}>{q.questionNumber ?? '?'}</div>
              <RichInput
                style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Nội dung câu hỏi..."
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>
            <div className="exam-mc-options">
              {opts.map((opt, i) => {
                const isImg = opt.optionMode === 'image';
                return (
                  <div key={i} className={`exam-mc-opt${opt.isCorrect ? ' correct' : ''}${isImg ? ' exam-mc-opt-img-row' : ''}`}>
                    <span className="exam-mc-opt-label">{String.fromCharCode(65 + i)}</span>
                    {isImg ? (
                      <div className="exam-mc-opt-image-cell">
                        {opt.optionImageUrl
                          ? <img src={opt.optionImageUrl} alt={`Opt ${String.fromCharCode(65 + i)}`} className="exam-mc-opt-img-preview" />
                          : <div className="exam-mc-opt-img-empty">Chưa có ảnh</div>}
                        <div className="exam-mc-opt-img-controls">
                          <input
                            type="text"
                            className="exam-mc-opt-url-input"
                            placeholder="Dán URL ảnh..."
                            value={opt.optionImageUrl || ''}
                            onChange={(e) => { const next = [...opts]; next[i] = { ...next[i], optionImageUrl: e.target.value }; onUpdateQuestion(group.id, q.id, { options: next }); }}
                            onClick={(e) => e.stopPropagation()} />
                          <label className="exam-mc-img-file-btn" title="Tải ảnh từ máy" onClick={(e) => e.stopPropagation()}>
                            <Image size={12} />
                            <input type="file" accept="image/*" hidden onChange={(e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              fileToCompressedDataUrl(file)
                                .then((dataUrl) => {
                                  const next = [...opts]; next[i] = { ...next[i], optionImageUrl: dataUrl };
                                  onUpdateQuestion(group.id, q.id, { options: next });
                                })
                                .catch((err) => console.error('Image upload failed:', err));
                              e.target.value = '';
                            }} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <RichInput
                        style={{ flex: 1 }}
                        value={opt.optionText || ''}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}...`}
                        onChange={(html) => {
                          const next = [...opts]; next[i] = { ...next[i], optionText: html };
                          onUpdateQuestion(group.id, q.id, { options: next });
                        }} />
                    )}
                    <button
                      className="exam-mc-opt-mode-btn"
                      title={isImg ? 'Chuyển sang văn bản' : 'Chuyển sang hình ảnh'}
                      onClick={(e) => { e.stopPropagation(); const next = [...opts]; next[i] = { ...next[i], optionMode: isImg ? 'text' : 'image' }; onUpdateQuestion(group.id, q.id, { options: next }); }}>
                      {isImg ? <span style={{ fontSize: 11, fontWeight: 700 }}>Aa</span> : <Image size={12} />}
                    </button>
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
                );
              })}
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

// ---- True / False / Not Given Block ----
const TFNGBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      <div className="exam-mc-instructions">
        Choose <strong>TRUE</strong> if the statement agrees with the information,
        <strong> FALSE</strong> if it contradicts, or <strong>NOT GIVEN</strong> if there is no information.
      </div>
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Tiêu đề / ngữ cảnh chung (nếu có)..."
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />
      <div className="exam-q-range-header">
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1"
          onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="7"
          onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
      </div>
      {questions.map((q) => (
        <div key={q.id}
          className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
          <div className="exam-mc-q-header">
            <div className="exam-q-num" style={{ background: '#1d4ed8' }}>{q.questionNumber ?? '?'}</div>
            <RichInput
              style={{ flex: 1 }}
              value={q.questionText || ''}
              placeholder="Nội dung phát biểu..."
              onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
            <button className="exam-group-tool-btn danger"
              onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
              <X size={11} />
            </button>
          </div>
          {/* TRUE / FALSE / NOT GIVEN radio buttons */}
          <div className="exam-tfng-options">
            {['TRUE', 'FALSE', 'NOT GIVEN'].map((v) => (
              <label key={v} className={`exam-tfng-opt${q.answerText === v ? ' correct' : ''}`}
                onClick={(e) => e.stopPropagation()}>
                <input type="radio"
                  checked={q.answerText === v}
                  onChange={() => onUpdateQuestion(group.id, q.id, { answerText: v })}
                  onClick={(e) => e.stopPropagation()} />
                {v}
              </label>
            ))}
          </div>
        </div>
      ))}
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
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
      dangerouslySetInnerHTML={{ __html: group.title || '' }}
    />
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
          <RichInput
            value={q.questionText || ''}
            placeholder="VD: The conference will be held in ___ (câu hỏi / câu chứa chỗ trống)"
            onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Đáp án:</span>
            <RichInput
              style={{ flex: 1 }}
              value={q.answerText || ''}
              placeholder="nhập đáp án mẫu..."
              onChange={(html) => onUpdateQuestion(group.id, q.id, { answerText: html })} />
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
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
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
    {(group.questions ?? []).map((q) => (
      <div key={q.id}
        className={`exam-sc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
        <div className="exam-q-num" style={{ background: '#166534', flexShrink: 0 }}>{q.questionNumber ?? '?'}</div>
        <div className="exam-sc-body">
          <RichInput
            value={q.questionText || ''}
            placeholder="VD: What is the name of the street?"
            onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Đáp án:</span>
            <RichInput
              style={{ flex: 1 }}
              value={q.answerText || ''}
              placeholder="nhập đáp án mẫu..."
              onChange={(html) => onUpdateQuestion(group.id, q.id, { answerText: html })} />
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
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
      data-placeholder="Tiêu đề ghi chú (VD: Phone call about furniture)"
      dangerouslySetInnerHTML={{ __html: group.title || '' }}
    />

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

const ImageNoteFormBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [livePin, setLivePin] = useState(null);
  const imagePosition = group.imagePosition || 'top';
  const imageWidth = group.imageWidth || 100;
  const pinBoxWidth = group.pinBoxWidth || 60;
  const questions = group.questions ?? [];

  // KHÔNG tự động đánh số lại - giữ nguyên số câu người dùng đã tạo
  // useEffect(() => {
  //   const needsReorder = questions.some((q, idx) => q.questionNumber !== idx + 1);
  //   if (needsReorder && questions.length > 0) {
  //     const reordered = questions.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
  //     onUpdate(group.id, { questions: reordered });
  //   }
  // }, [questions.length]);

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
    if (dragRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Tính số câu tiếp theo
    const maxQuestionNumber = getNextQuestionNumber(questions) - 1;
    
    const newQ = {
      id: Date.now(),
      groupId: group.id,
      questionNumber: maxQuestionNumber + 1,
      questionText: '',
      answerText: '',
      pinX: Math.max(0, Math.min(92, x)),
      pinY: Math.max(0, Math.min(92, y)),
      questionMode: 'image-pin',
      questionType: { typeName: 'FILL_IN_BLANK' },
    };
    onUpdate(group.id, { questions: [...questions, newQ] });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToCompressedDataUrl(file)
      .then((dataUrl) => onUpdate(group.id, { imageUrl: dataUrl }))
      .catch((err) => console.error('Image upload failed:', err));
  };

  const imageSection = (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <input 
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
          value={group.imageUrl?.startsWith('data:') ? '(ảnh đã tải lên)' : (group.imageUrl || '')} 
          placeholder="URL ảnh hoặc tải lên..."
          readOnly={group.imageUrl?.startsWith('data:')}
          onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })}
        />
        <label style={{ padding: '4px 12px', background: '#3b82f6', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          Tải lên
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        </label>
        {group.imageUrl && (
          <button style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { imageUrl: '' }); }}>
            <X size={12} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={imagePosition === 'top'} onChange={() => onUpdate(group.id, { imagePosition: 'top' })} />
          Ảnh trên
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={imagePosition === 'bottom'} onChange={() => onUpdate(group.id, { imagePosition: 'bottom' })} />
          Ảnh dưới
        </label>
        <label style={{ marginLeft: 'auto' }}>
          Rộng ảnh: <strong>{imageWidth}%</strong>
          <input type="range" min={50} max={100} value={imageWidth} 
            onChange={(e) => onUpdate(group.id, { imageWidth: Number(e.target.value) })}
            style={{ marginLeft: 4, width: 80 }} />
        </label>
        <label>
          Cỡ ô: <strong>{pinBoxWidth}px</strong>
          <input type="range" min={30} max={120} value={pinBoxWidth} 
            onChange={(e) => onUpdate(group.id, { pinBoxWidth: Number(e.target.value) })}
            style={{ marginLeft: 4, width: 80 }} />
        </label>
      </div>
      
      {/* Image canvas with pins */}
      <div ref={containerRef} style={{ position: 'relative', cursor: group.imageUrl ? 'crosshair' : 'default', background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}
        onClick={addPin}>
        {group.imageUrl ? (
          <>
            <img src={group.imageUrl} alt="Question" draggable={false}
              style={{ display: 'block', width: `${imageWidth}%`, height: 'auto', pointerEvents: 'none', margin: '0 auto' }} />
            {questions.map((q) => {
              const x = livePin?.qId === q.id ? livePin.x : (q.pinX ?? 10);
              const y = livePin?.qId === q.id ? livePin.y : (q.pinY ?? 10);
              return (
                <div key={q.id}
                  style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    minWidth: `${pinBoxWidth}px`,
                    background: selectedQuestionId === q.id ? '#3b82f6' : '#fff',
                    color: selectedQuestionId === q.id ? '#fff' : '#000',
                    border: '2px solid #3b82f6',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 13,
                    fontWeight: 'bold',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    dragRef.current = { qId: q.id, origX: q.pinX ?? 10, origY: q.pinY ?? 10, startCX: e.clientX, startCY: e.clientY };
                  }}
                  onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
                  <span style={{ minWidth: 20, textAlign: 'center' }}>{q.questionNumber}</span>
                  {q.questionText && (
                    <span style={{ fontSize: 12, fontWeight: 'normal' }}>{q.questionText}:</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 'normal' }}>____</span>
                  <button
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>×</button>
                </div>
              );
            })}
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Tải ảnh lên, sau đó nhấn vào ảnh để thêm ô đánh số
          </div>
        )}
      </div>
      {group.imageUrl && (
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' }}>
          ↑ Nhấn vào ảnh để thêm ô · Kéo ô để di chuyển · × để xóa
        </div>
      )}
    </div>
  );

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Instructions */}
      <div className="exam-note-instructions">Complete the form below. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.</div>

      {/* Title */}
      <div contentEditable suppressContentEditableWarning className="exam-note-form-title"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
        data-placeholder="Tiêu đề (VD: House Plan)"
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />

      {/* Image on top */}
      {imagePosition === 'top' && imageSection}

      {/* Note text with blanks */}
      <RichBlankEditor
        value={group.noteText}
        onChange={(text) => {
          onUpdate(group.id, { noteText: text });
          
          // Tự động tạo câu hỏi khi phát hiện (ô trống)
          setTimeout(() => {
              const blankMatches = countBlankTokens(text);
            
            console.log('[DEBUG] Blanks found:', blankMatches);
            console.log('[DEBUG] Current questions:', questions);
            
            if (blankMatches > 0) {
              // Đếm câu hỏi cho note text (không có pinX, pinY)
                const noteQuestions = questions.filter(isNoteBlankQuestion);
              console.log('[DEBUG] Note questions:', noteQuestions.length);
              
              const needToCreate = blankMatches - noteQuestions.length;
              console.log('[DEBUG] Need to create:', needToCreate);
              
              if (needToCreate > 0) {
                // Tìm số câu lớn nhất trong TẤT CẢ câu hỏi
                  const maxNum = getNextQuestionNumber(questions) - 1;
                
                console.log('[DEBUG] Max question number:', maxNum);
                console.log('[DEBUG] Will create from:', maxNum + 1);
                
                const newQuestions = [];
                for (let i = 0; i < needToCreate; i++) {
                  newQuestions.push({
                    id: Date.now() + Math.random() * 1000,
                    groupId: group.id,
                    questionNumber: maxNum + i + 1,
                    questionText: '',
                    answerText: '',
                      questionMode: 'note-blank',
                    questionType: { typeName: 'FILL_IN_BLANK' },
                  });
                }
                
                console.log('[AUTO] Creating questions:', newQuestions);
                onUpdate(group.id, { questions: [...questions, ...newQuestions] });
              }
            }
          }, 100);
        }}
        placeholder={'VD:\nGround Floor:\n- Living room: (ô trống) square meters\n- Kitchen: Located in the (ô trống)'}
        preWrap
        blankClass="rbe-blank-amber"
        startNumber={getNextQuestionNumber(questions)}
      />

      {/* Image on bottom */}
      {imagePosition === 'bottom' && imageSection}

      <div className="exam-q-range-header" style={{ marginTop: 12 }}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="5" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      </div>
      {questions.map((q, idx) => (
        <div key={q.id} className={`exam-question${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
          <div className="exam-q-num" style={{ background: '#4338ca' }}>{q.questionNumber ?? idx + 1}</div>
          <div className="exam-q-body">
            {isImagePinQuestion(q) && (
              <>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Label (hiển thị trên ảnh):</div>
                <input className="exam-q-fill-answer" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8 }}
                  value={q.questionText || ''} placeholder="VD: Width, Height, Area..."
                  onChange={(e) => onUpdateQuestion(group.id, q.id, { questionText: e.target.value })}
                  onClick={(e) => e.stopPropagation()} />
              </>
            )}
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
        <Plus size={12} /> Thêm ô trống (cho note text)
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
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
      dangerouslySetInnerHTML={{ __html: group.title || '' }}
    />

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

// ---- Flow-chart Block ----
function FlowChartBlock({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onUpdateQuestion, selectedQuestionId }) {
  const flowNodes = group.flowNodes ?? [];
  const questions = group.questions ?? [];
  const options   = group.optionBank ?? [];
  const fromQ     = group.fromQuestion ?? 1;

  const syncAndSave = (nodes, qOverride) => {
    const newQs = qOverride ?? syncFcQuestions(nodes, questions, fromQ);
    onUpdate(group.id, { flowNodes: nodes, questions: newQs });
  };

  const setNodeText = (nodeId, text) => {
    syncAndSave(flowNodes.map((n) => n.id === nodeId ? { ...n, text } : n));
  };

  const addNode = () => {
    syncAndSave([...flowNodes, { id: `fn${Date.now()}`, text: '' }]);
  };

  const removeNode = (nodeId) => {
    if (flowNodes.length <= 1) return;
    syncAndSave(flowNodes.filter((n) => n.id !== nodeId));
  };

  // Cumulative start question number per node
  const nodeStartMap = {};
  let qCursor = fromQ;
  for (const node of flowNodes) {
    nodeStartMap[node.id] = qCursor;
    qCursor += ((node.text ?? '').match(/\[blank\]/g) ?? []).length;
  }

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Chart title */}
      <div className="exam-fc-title-row" onClick={(e) => e.stopPropagation()}>
        <input
          className="exam-img-url-field"
          style={{ width: '100%', fontWeight: 700, textAlign: 'center', fontSize: 13 }}
          value={group.title ?? ''}
          placeholder="Tiêu đề sơ đồ (VD: Procedure for detecting life on another planet)"
          onChange={(e) => onUpdate(group.id, { title: e.target.value })}
        />
      </div>

      {/* Two-column: flow nodes + word bank */}
      <div className="exam-fc-layout" onClick={(e) => e.stopPropagation()}>
        {/* Left: flow nodes */}
        <div className="exam-fc-nodes">
          {flowNodes.map((node, idx) => (
            <React.Fragment key={node.id}>
              <div className="exam-fc-node">
                <TcCellEditor
                  value={node.text}
                  onChange={(val) => setNodeText(node.id, val)}
                  startQNum={nodeStartMap[node.id] ?? fromQ}
                />
                {flowNodes.length > 1 && (
                  <button
                    className="exam-fc-node-del"
                    onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                    title="Xóa ô này"
                  >×</button>
                )}
              </div>
              {idx < flowNodes.length - 1 && (
                <div className="exam-fc-arrow">↓</div>
              )}
            </React.Fragment>
          ))}
          <button className="exam-add-btn" style={{ marginTop: 8 }}
            onClick={(e) => { e.stopPropagation(); addNode(); }}>
            <Plus size={11} /> Thêm ô
          </button>
        </div>

        {/* Right: word bank */}
        <div className="exam-fc-bank">
          <div className="exam-dm-col-header">
            <RichInput
              style={{ width: '100%' }}
              value={group.bankTitle ?? ''}
              placeholder="Tiêu đề ngân từ (tuỳ chọn)"
              onChange={(html) => onUpdate(group.id, { bankTitle: html })}
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

      {/* Question range */}
      <div className="exam-q-range-header" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="26"
          onChange={(e) => {
            const fq = e.target.value ? Number(e.target.value) : null;
            const newQs = syncFcQuestions(flowNodes, questions, fq);
            onUpdate(group.id, { fromQuestion: fq, questions: newQs, toQuestion: newQs.length > 0 ? (fq ?? 1) + newQs.length - 1 : group.toQuestion });
          }}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="30"
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
              <RichInput style={{ flex: 1 }}
                value={q.answerText ?? ''}
                placeholder="Đáp án đúng..."
                onChange={(html) => onUpdateQuestion(group.id, q.id, { answerText: html })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Speaking Interview Block ----
// Dùng cho Part 1 (Interview) và Part 3 (Discussion): danh sách câu hỏi giám khảo sẽ hỏi.
const SpeakingInterviewBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const questions = group.questions ?? [];
  const interviewType = group.interviewType ?? 'PART1';

  const addQuestion = (e) => {
    e.stopPropagation();
    onUpdate(group.id, {
      questions: [...questions, {
        id: `spkq-${Date.now()}`,
        questionText: '',
        questionType: { typeName: 'SPEAKING_INTERVIEW' },
        options: [], answers: [], points: 1,
      }],
    });
  };

  const updateQ = (qId, text) =>
    onUpdate(group.id, { questions: questions.map((q) => (q.id === qId ? { ...q, questionText: text } : q)) });

  const deleteQ = (qId, e) => {
    e.stopPropagation();
    onUpdate(group.id, { questions: questions.filter((q) => q.id !== qId) });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Part type toggle */}
      <div className="exam-spk-type-row" onClick={(e) => e.stopPropagation()}>
        {[['PART1', 'Part 1 · Interview'], ['PART3', 'Part 3 · Discussion']].map(([v, lbl]) => (
          <button key={v} type="button"
            className={`exam-spk-type-btn${interviewType === v ? ' active' : ''}`}
            onClick={() => onUpdate(group.id, { interviewType: v })}>{lbl}</button>
        ))}
      </div>

      {/* Instructions */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> Hướng dẫn (tuỳ chọn)
        </label>
        <RichInput
          value={group.partInstruction ?? ''}
          placeholder={interviewType === 'PART1'
            ? 'VD: In this part, the examiner asks you about yourself and familiar topics...'
            : 'VD: In this part, the examiner asks further questions related to the topic in Part 2...'}
          onChange={(html) => onUpdate(group.id, { partInstruction: html })}
        />
      </div>

      {/* Question list */}
      <div className="exam-spk-qlist" onClick={(e) => e.stopPropagation()}>
        {questions.map((q, i) => (
          <div key={q.id} className="exam-spk-qrow">
            <span className="exam-spk-qnum">Q{i + 1}</span>
            <RichInput
              value={q.questionText || q.text || ''}
              placeholder="Nhập câu hỏi của giám khảo..."
              onChange={(html) => updateQ(q.id, html)}
              className="exam-spk-rich-q"
            />
            <button className="exam-spk-qdel" title="Xóa câu hỏi"
              onClick={(e) => deleteQ(q.id, e)}><X size={12} /></button>
          </div>
        ))}
        <button className="exam-spk-qadd" onClick={addQuestion}>
          <Plus size={12} /> Thêm câu hỏi
        </button>
      </div>
    </div>
  );
};

// ---- Speaking Cue Card Block ----
// Dùng cho Part 2: xuất hiện thẻ gợi ý (cue card) với chủ đề và bullet points.
const SpeakingCueCardBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const bulletPoints = group.bulletPoints ?? ['', '', ''];

  const updateBullet = (i, val) => {
    const next = [...bulletPoints];
    next[i] = val;
    onUpdate(group.id, { bulletPoints: next });
  };

  const addBullet = (e) => {
    e.stopPropagation();
    onUpdate(group.id, { bulletPoints: [...bulletPoints, ''] });
  };

  const removeBullet = (i, e) => {
    e.stopPropagation();
    onUpdate(group.id, { bulletPoints: bulletPoints.filter((_, idx) => idx !== i) });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-spk-cc-card" onClick={(e) => e.stopPropagation()}>
        {/* Topic */}
        <div className="exam-wt-section">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Mic size={14} /> Chủ đề / Câu hỏi chính (Topic)
          </label>
          <RichInput
            multiline
            rows={2}
            value={group.topic ?? ''}
            placeholder="VD: Describe a time when you helped someone."
            onChange={(html) => onUpdate(group.id, { topic: html })}
          />
        </div>

        {/* You should say */}
        <div className="exam-wt-section">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <PenLine size={14} /> Nhãn nhắc
          </label>
          <RichInput
            value={group.shouldSayLabel ?? 'You should say:'}
            onChange={(html) => onUpdate(group.id, { shouldSayLabel: html })}
          />
        </div>

        {/* Bullet points */}
        <div className="exam-spk-qlist">
          {bulletPoints.map((bp, i) => (
            <div key={i} className="exam-spk-qrow">
              <span className="exam-spk-qnum" style={{ fontSize: 16 }}>•</span>
              <RichInput
                style={{ flex: 1 }}
                value={bp}
                placeholder={`VD: who you helped`}
                onChange={(html) => updateBullet(i, html)}
              />
              <button className="exam-spk-qdel" onClick={(e) => removeBullet(i, e)}><X size={12} /></button>
            </div>
          ))}
          <button className="exam-spk-qadd" onClick={addBullet}>
            <Plus size={12} /> Thêm bullet
          </button>
        </div>

        {/* Closing sentence */}
        <div className="exam-wt-section" style={{ marginTop: 8 }}>
          <label className="exam-wt-label">Câu kết thúc (tuỳ chọn)</label>
          <RichInput
            value={group.closingSentence ?? ''}
            placeholder="VD: and explain how you felt about helping this person."
            onChange={(html) => onUpdate(group.id, { closingSentence: html })}
          />
        </div>

        {/* Prep time */}
        <div className="exam-wt-meta-row" style={{ marginTop: 8 }}>
          <div className="exam-wt-meta-field">
            <label className="exam-wt-label">⏱ Thời gian chuẩn bị (giây)</label>
            <input type="number" className="exam-q-range-input" style={{ width: 72 }}
              value={group.prepSeconds ?? 60} min={0} max={120}
              onChange={(e) => onUpdate(group.id, { prepSeconds: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Writing Task Block ----
// Dùng cho kỹ năng WRITING: Task 1 (biểu đồ/graph) hoặc Task 2 (luận điểm).
// Không có sub-questions — thí sinh sẽ viết tự do vào textarea.
const WritingTaskBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToCompressedDataUrl(file)
      .then((dataUrl) => onUpdate(group.id, { imageUrl: dataUrl }))
      .catch((err) => console.error('Image upload failed:', err));
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Task instructions / prompt */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> Đề bài / Hướng dẫn
        </label>
        <RichInput
          multiline
          rows={7}
          value={group.taskInstruction ?? ''}
          placeholder="VD: The bar chart below shows the percentage of households with Internet access in five countries.\n\nSummarise the information by selecting and reporting the main features and make comparisons where relevant.\n\nWrite at least 150 words."
          onChange={(html) => onUpdate(group.id, { taskInstruction: html })}
        />
      </div>

      {/* Image upload */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Image size={14} /> Ảnh / Biểu đồ (tuỳ chọn)
        </label>
        <div className="exam-ml-upload-bar">
          <input
            className="exam-img-url-field"
            style={{ flex: 1, minWidth: 0 }}
            value={group.imageUrl?.startsWith('data:') ? '(ảnh đã tải lên)' : (group.imageUrl ?? '')}
            placeholder="Dán URL ảnh hoặc tải lên từ máy..."
            readOnly={group.imageUrl?.startsWith('data:')}
            onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })}
          />
          <label className="exam-ml-upload-btn">
            Tải lên
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          {group.imageUrl && (
            <button className="exam-group-tool-btn danger" title="Xóa ảnh"
              onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { imageUrl: '' }); }}>
              <X size={12} />
            </button>
          )}
        </div>
        {group.imageUrl && (
          <img src={group.imageUrl} alt="writing task diagram"
            style={{ maxWidth: '100%', marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 4, display: 'block' }} />
        )}
      </div>

      {/* Min words + recommended time */}
      <div className="exam-wt-meta-row" onClick={(e) => e.stopPropagation()}>
        <div className="exam-wt-meta-field">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Số từ tối thiểu
          </label>
          <input
            type="number"
            className="exam-q-range-input"
            style={{ width: 72 }}
            value={group.minWords ?? 150}
            min={50}
            onChange={(e) => onUpdate(group.id, { minWords: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="exam-wt-meta-field">
          <label className="exam-wt-label">⏱ Thời gian (phút)</label>
          <input
            type="number"
            className="exam-q-range-input"
            style={{ width: 72 }}
            value={group.recommendedMinutes ?? 20}
            min={1}
            onChange={(e) => onUpdate(group.id, { recommendedMinutes: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
};

// ---- Group renderer (dispatches by contentType) ----
const GroupRenderer = ({ group, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onMoveGroupUp, onMoveGroupDown, dragHandleProps, allGroups }) => {
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
  if (ct === 'IMAGE_NOTE_FORM') {
    return <ImageNoteFormBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
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
  if (ct === 'FLOW_CHART') {
    return <FlowChartBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'WRITING_TASK') {
    return <WritingTaskBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_INTERVIEW') {
    return <SpeakingInterviewBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_CUECARD') {
    return <SpeakingCueCardBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
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
      mhHeadings={mhHeadings} mhAnswersByLabel={mhAnswersByLabel} />;
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

// ---- Per-Part content view ----
const PartView = ({ skill, part, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onAddGroup, onMoveGroupUp, onMoveGroupDown, isDropOver, isPassagePaneOver, isPassagePaneLocked, isMHLocked }) => {
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
  onMoveGroupUp,
  onMoveGroupDown,
  dragOverPartId,
  dragOverPassagePaneId,
  draggingContentType,
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
              <span style={{ color: '#ddd' }}>|</span>
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
            {activePartInstructionText
              ? <> — <span dangerouslySetInnerHTML={{ __html: activePartInstructionHtml }} /></>
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
              onMoveGroupUp={onMoveGroupUp}
              onMoveGroupDown={onMoveGroupDown}
              isDropOver={isDropOver}
              isPassagePaneOver={isPassagePaneOver}
              isPassagePaneLocked={isPassagePaneLocked}
              isMHLocked={isMHLocked} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCanvas;
