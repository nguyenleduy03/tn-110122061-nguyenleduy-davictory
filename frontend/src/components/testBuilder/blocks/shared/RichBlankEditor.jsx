import React, { useState, useRef, useEffect } from 'react';
import { List, ListOrdered } from 'lucide-react';

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

  const toHTML = (htmlOrText) => {
    if (!htmlOrText) return '';
    
    // Nếu đã là HTML (có thẻ), giữ nguyên và chỉ xử lý [blank]
    if (htmlOrText.includes('<')) {
      let n = startNumber - 1;
      return htmlOrText.replace(/\[blank\]/gi, () => {
        n++;
        return `<span class="rbe-blank ${blankClass}" contenteditable="false" data-blank="true"><span class="rbe-blank-num">${n}</span><button class="rbe-blank-del" data-del="true" type="button">×</button></span>`;
      });
    }
    
    // Nếu là text thuần, chuyển thành HTML
    let n = startNumber - 1;
    return esc(htmlOrText)
      .replace(/\n/g, '<br>')
      .replace(/\[blank\]/gi, () => {
        n++;
        return `<span class="rbe-blank ${blankClass}" contenteditable="false" data-blank="true"><span class="rbe-blank-num">${n}</span><button class="rbe-blank-del" data-del="true" type="button">×</button></span>`;
      });
  };

  const toText = (el) => {
    // Giữ lại HTML để bảo toàn formatting, nhưng xử lý đặc biệt cho [blank]
    let html = el.innerHTML;
    
    // Chuyển các blank span thành [blank] token
    html = html.replace(/<span[^>]*data-blank="true"[^>]*>.*?<\/span>/g, '[blank]');
    
    return html;
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

  const insertList = (ordered = false) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      
      // Kiểm tra xem cursor có đang trong li không
      const currentLi = range.startContainer.nodeType === 3 
        ? range.startContainer.parentElement?.closest('li')
        : range.startContainer.closest?.('li');
      
      if (currentLi) {
        // Đang trong li, tạo nested list
        const listTag = ordered ? 'ol' : 'ul';
        const nestedList = document.createElement(listTag);
        const newLi = document.createElement('li');
        newLi.innerHTML = '&nbsp;';
        nestedList.appendChild(newLi);
        
        // Chèn nested list vào cuối li hiện tại
        currentLi.appendChild(nestedList);
        
        // Đặt cursor vào li mới
        const newRange = document.createRange();
        newRange.selectNodeContents(newLi);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else {
        // Không trong li, tạo list mới
        const listTag = ordered ? 'ol' : 'ul';
        const list = document.createElement(listTag);
        const li = document.createElement('li');
        li.innerHTML = '&nbsp;';
        list.appendChild(li);
        
        range.deleteContents();
        range.insertNode(list);
        
        // Đặt cursor vào li
        const newRange = document.createRange();
        newRange.selectNodeContents(li);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      
      onChange(toText(editorRef.current));
    }
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
        <div className="rbe-sep" />
        <button type="button" className="rbe-insert-btn" onClick={() => insertList(false)} title="Gạch đầu dòng">
          <List size={14} />
        </button>
        <button type="button" className="rbe-insert-btn" onClick={() => insertList(true)} title="Đánh số">
          <ListOrdered size={14} />
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
        onKeyUp={() => { renumber(); onChange(toText(editorRef.current)); }}
        onPaste={() => { 
          setTimeout(() => { renumber(); onChange(toText(editorRef.current)); }, 0); 
        }}
        onCut={() => { 
          setTimeout(() => { renumber(); onChange(toText(editorRef.current)); }, 0); 
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // Thay vì dùng execCommand deprecated, chèn <br> trực tiếp
            const sel = window.getSelection();
            if (sel.rangeCount) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const br = document.createElement('br');
              range.insertNode(br);
              range.setStartAfter(br);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
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
