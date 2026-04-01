import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const ImageBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, children, testTitle }) => (
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
  onUpdateQuestion, onDeleteQuestion, selectedQuestionId, testTitle }) {
  const containerRef = useRef(null);
  const imageWrapRef = useRef(null);
  const dragRef = useRef(null); // { qId, origX, origY, startCX, startCY }
  const [livePin, setLivePin] = useState(null); // { qId, x, y } during drag
  const questions = group.questions ?? [];
  const options = group.optionBank ?? [];

  const getImageRect = () => imageWrapRef.current?.getBoundingClientRect() || null;

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { origX, origY, startCX, startCY } = dragRef.current;
      const rect = getImageRect();
      if (!rect) return;
      const newX = Math.max(0, Math.min(92, origX + (e.clientX - startCX) / rect.width * 100));
      const newY = Math.max(0, Math.min(92, origY + (e.clientY - startCY) / rect.height * 100));
      setLivePin({ qId: dragRef.current.qId, x: newX, y: newY });
    };
    const onUp = (e) => {
      if (!dragRef.current) return;
      const { qId, origX, origY, startCX, startCY } = dragRef.current;
      const rect = getImageRect();
      if (!rect) return;
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
    if (!group.imageUrl) return;
    if (dragRef.current) return; // ignore click after drag
    const rect = getImageRect();
    if (!rect) return;
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
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    loadImageFile(file, (imageUrl) => onUpdate(group.id, { imageUrl }), 'READING', testTitle);
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
          <input type="file" accept="image/*" style={{ display: 'none' }} onClick={(e) => e.stopPropagation()} onChange={handleFileUpload} />
        </label>
        {group.imageUrl && (
          <button className="exam-group-tool-btn danger" title="Xóa ảnh"
            onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { imageUrl: '' }); }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Size controls */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>
            Kích thước ảnh: {group.imageWidth ?? 100}%
          </label>
          <input
            type="range"
            min="30"
            max="100"
            style={{ width: '100%' }}
            value={group.imageWidth ?? 100}
            onChange={(e) => onUpdate(group.id, { imageWidth: Number(e.target.value) })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>
            Kích thước ô: {group.pinBoxWidth ?? 60}px
          </label>
          <input
            type="range"
            min="40"
            max="120"
            style={{ width: '100%' }}
            value={group.pinBoxWidth ?? 60}
            onChange={(e) => onUpdate(group.id, { pinBoxWidth: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Image canvas */}
      <div ref={containerRef} className="exam-ml-container"
        style={{ cursor: group.imageUrl ? 'crosshair' : 'default' }}
        onClick={addPin}>
        {group.imageUrl ? (
          <div ref={imageWrapRef} style={{ position: 'relative', width: `${group.imageWidth ?? 100}%`, margin: '0 auto' }}>
            <img src={group.imageUrl} alt="map" draggable={false}
              style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} />
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
        ) : (
          <div className="exam-ml-empty">Tải ảnh lên, sau đó nhấn vào ảnh để thêm ô đánh số</div>
        )}
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

      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <input
          type="text"
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
          value={group.instructions || ''}
          placeholder="Complete the table. Write ONE WORD ONLY for each answer."
          onChange={(e) => onUpdate(group.id, { instructions: e.target.value })}
        />
      </div>

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

      {/* Answer validation options */}
      <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tùy chọn chấm điểm:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={group.ignoreCase !== false} onChange={(e) => onUpdate(group.id, { ignoreCase: e.target.checked })} />
            <span>Bỏ qua hoa/thường</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={group.ignoreSpaces || false} onChange={(e) => onUpdate(group.id, { ignoreSpaces: e.target.checked })} />
            <span>Bỏ qua khoảng trắng</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={group.ignorePunctuation || false} onChange={(e) => onUpdate(group.id, { ignorePunctuation: e.target.checked })} />
            <span>Bỏ qua dấu câu</span>
          </label>
        </div>
        <div style={{ marginTop: 6 }}>
          <input
            type="text"
            placeholder="Ký tự bỏ qua khác (vd: -_)"
            value={group.ignoreChars || ''}
            onChange={(e) => onUpdate(group.id, { ignoreChars: e.target.value })}
            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 12 }}
          />
        </div>
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
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic' }}>
            💡 Dùng | để tách nhiều đáp án đúng (vd: 1|one)
          </div>
          {questions.map((q) => (
            <div key={q.id} className="exam-ml-answer-row">
              <span className="exam-ml-answer-num">Câu {q.questionNumber}</span>
              <input
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
                value={q.answerText ?? ''}
                placeholder="Đáp án đúng (vd: 1|one)..."
                onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---- Drag Matching Block ----

export default ImageBlock;
export { MapLabellingBlock, TableCompletionBlock };
