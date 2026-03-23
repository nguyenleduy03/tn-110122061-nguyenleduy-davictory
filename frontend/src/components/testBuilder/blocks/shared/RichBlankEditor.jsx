import React, { useState, useRef, useEffect } from 'react';

/**
 * RichBlankEditor
 * contentEditable editor for Summary / Note Completion.
 * Drag the toolbar chip into the text to insert a numbered blank at that position.
 */
const RichBlankEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  preWrap = false, 
  blankClass = 'rbe-blank-blue', 
  startNumber = 1 
}) => {
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
            if (chip) { 
              chip.remove(); 
              renumber(); 
              onChange(toText(editorRef.current)); 
              e.preventDefault(); 
            }
          }
        }}
      />
    </div>
  );
};

export default RichBlankEditor;
