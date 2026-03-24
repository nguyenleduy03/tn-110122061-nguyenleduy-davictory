import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const SummaryCompletionBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    
    {/* Instructions field */}
    <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
        Hướng dẫn:
      </label>
      <RichInput
        multiline
        rows={2}
        value={group.instructions || ''}
        placeholder="Complete the summary. Write ONE WORD ONLY from the text for each answer."
        onChange={(html) => onUpdate(group.id, { instructions: html })}
      />
    </div>

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

// ---- Flow-chart Cell Editor ----
function FcCellEditor({ value, onChange, startQNum }) {
  const editorRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const startQRef = useRef(startQNum);

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

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toHTML(value || '', startQNum);
  }, []);

  useEffect(() => {
    startQRef.current = startQNum;
    renumber();
  });

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

      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Complete the flow-chart below. Choose NO MORE THAN TWO WORDS from the passage for each answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

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
                <FcCellEditor
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
              {options.length > 0 ? (
                <select
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                  value={q.answerText ?? ''}
                  onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
                >
                  <option value="">-- Chọn đáp án --</option>
                  {options.map((opt, i) => (
                    <option key={i} value={opt.text}>{opt.text || `Lựa chọn ${i + 1}`}</option>
                  ))}
                </select>
              ) : (
                <RichInput style={{ flex: 1 }}
                  value={q.answerText ?? ''}
                  placeholder="Đáp án đúng..."
                  onChange={(html) => onUpdateQuestion(group.id, q.id, { answerText: html })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function for FlowChart
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

export default SummaryCompletionBlock;
export { FlowChartBlock };
