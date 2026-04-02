import React, { useState, useRef, useEffect } from 'react';
import { List, ListOrdered, Indent } from 'lucide-react';
import { sanitizeRichPasteHtml, serializeContentEditableHtml } from '../../../../utils/textFormatters';

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
  const lastRangeRef = useRef(null);

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
    if (!el) return '';

    // Preserve rich HTML but convert blank chips to plain [blank] token safely.
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[data-blank="true"]').forEach((node) => {
      node.replaceWith(document.createTextNode('[blank]'));
    });

    // Clean any leftover chip controls from legacy markup.
    clone.querySelectorAll('[data-del="true"], .rbe-blank-del, .rbe-blank-num').forEach((node) => {
      node.remove();
    });

    return clone.innerHTML;
  };

  const saveValue = () => serializeContentEditableHtml(editorRef.current).replace(/\[blank\]/gi, '[blank]');

  // Set initial HTML on mount only (avoids cursor-jumping on re-renders)
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toHTML(value || '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const updateSelection = () => {
      const sel = window.getSelection?.();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const anchor = range.commonAncestorContainer;
      const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
      if (editorRef.current && anchorEl && editorRef.current.contains(anchorEl)) {
        lastRangeRef.current = range.cloneRange();
      }
    };

    document.addEventListener('selectionchange', updateSelection);
    return () => document.removeEventListener('selectionchange', updateSelection);
  }, []);

  const restoreSelection = () => {
    const sel = window.getSelection?.();
    if (!sel || !lastRangeRef.current) return false;
    try {
      sel.removeAllRanges();
      sel.addRange(lastRangeRef.current);
      return true;
    } catch {
      return false;
    }
  };

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

  const execFormatting = (cmd) => {
    editorRef.current?.focus();
    restoreSelection();
    try {
      document.execCommand(cmd, false, null);
    } catch (err) {
      console.error(`RichBlankEditor execCommand('${cmd}') failed:`, err);
    }
    onChange(saveValue());
  };

  const insertList = (ordered = false) => {
    execFormatting(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  const indentList = () => {
    execFormatting('indent');
  };

  const insertBlankShortcut = (e) => {
    const key = String(e.key || '').toLowerCase();
    const isInsertBlank = (e.ctrlKey || e.metaKey) && e.altKey && key === 'o';
    if (!isInsertBlank) return false;

    e.preventDefault();
    insertChipAtCaret();
    return true;
  };

  const promoteHeadingLikeFirstLine = (html) => {
    if (typeof html !== 'string' || !html.includes('<')) return html || '';

    try {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      const meaningfulNodes = Array.from(temp.childNodes).filter((node) => {
        if (node.nodeType === Node.TEXT_NODE) return Boolean((node.textContent || '').trim());
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        return Boolean((node.textContent || '').trim());
      });

      if (meaningfulNodes.length < 2) return html;

      const firstNode = meaningfulNodes[0];
      const firstText = (firstNode.textContent || '').replace(/\s+/g, ' ').trim();
      const wordCount = firstText ? firstText.split(/\s+/).length : 0;
      const looksLikeHeading =
        wordCount >= 2 &&
        wordCount <= 10 &&
        !/[.:!?]$/.test(firstText) &&
        !/\[blank\]/i.test(firstText) &&
        !/^(?:\d+[.)]|[•\-*–—])/u.test(firstText);

      if (!looksLikeHeading) return html;

      if (firstNode.nodeType === Node.ELEMENT_NODE) {
        const element = firstNode;
        if (!element.querySelector('strong')) {
          const strong = document.createElement('strong');
          strong.innerHTML = element.innerHTML;
          element.innerHTML = '';
          element.appendChild(strong);
        }
      } else if (firstNode.nodeType === Node.TEXT_NODE) {
        const strong = document.createElement('strong');
        strong.textContent = firstText;
        firstNode.replaceWith(strong);
      }

      return temp.innerHTML;
    } catch {
      return html;
    }
  };

  const preserveBlockAlignment = (html) => {
    if (typeof html !== 'string' || !html.includes('<')) return html || '';

    try {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      temp.querySelectorAll('div, p').forEach((node) => {
        const align = String(node.getAttribute('style') || '').match(/text-align\s*:\s*(left|center|right|justify)/i)?.[1];
        if (align) {
          node.style.textAlign = align.toLowerCase();
          node.style.margin = '0';
        }
      });

      return temp.innerHTML;
    } catch {
      return html;
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
    onChange(saveValue());
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
        <button type="button" className="rbe-insert-btn" onMouseDown={(e) => e.preventDefault()} onClick={insertChipAtCaret}>
          + Chèn tại con trỏ
        </button>
        <div className="rbe-sep" />
        <button type="button" className="rbe-insert-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => insertList(false)} title="Gạch đầu dòng">
          <List size={14} />
        </button>
        <button type="button" className="rbe-insert-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => insertList(true)} title="Đánh số">
          <ListOrdered size={14} />
        </button>
        <button type="button" className="rbe-insert-btn" onMouseDown={(e) => e.preventDefault()} onClick={indentList} title="Tăng cấp độ">
          <Indent size={14} />
        </button>
        <span className="rbe-hint">Windows/Linux: Ctrl+Alt+O · Mac: ⌘+⌥+O · × để xóa ô trống</span>
      </div>
      <div
        ref={editorRef}
        className={`rbe-editor${dragOver ? ' drag-over' : ''}${preWrap ? ' pre-wrap' : ''}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => { renumber(); onChange(saveValue()); }}
        onKeyUp={() => { renumber(); onChange(saveValue()); }}
        onPaste={(e) => {
          e.preventDefault();
          let html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
          // Tự động chuyển ký hiệu thành [blank]
          html = html.replace(/_{3,}|\.{3,}|-{3,}/g, '[blank]');
          const cleaned = sanitizeRichPasteHtml(html);
          const aligned = preserveBlockAlignment(cleaned);
          const enhanced = promoteHeadingLikeFirstLine(aligned);
          // Convert [blank] thành chip HTML
          const withChips = enhanced.replace(/\[blank\]/gi, () => {
            return `<span class="rbe-blank ${blankClass}" contenteditable="false" data-blank="true"><span class="rbe-blank-num">?</span><button class="rbe-blank-del" data-del="true" type="button">×</button></span>`;
          });
          document.execCommand('insertHTML', false, withChips);
          setTimeout(() => { renumber(); onChange(saveValue()); }, 0);
        }}
        onCut={() => {
          setTimeout(() => { renumber(); onChange(saveValue()); }, 0);
        }}
        onKeyDown={(e) => {
          if (insertBlankShortcut(e)) return;

          if (e.key === 'Enter') {
            const sel = window.getSelection?.();
            const anchor = sel?.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
            const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
            const inList = Boolean(anchorEl?.closest?.('li,ul,ol'));

            if (inList) {
              // Let the browser continue list items correctly.
              return;
            }

            e.preventDefault();
            // Insert a line break immediately so one Enter creates one new line.
            if (sel?.rangeCount) {
              try {
                document.execCommand('insertLineBreak');
              } catch {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const br = document.createElement('br');
                range.insertNode(br);
                range.setStartAfter(br);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
            onChange(saveValue());
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
            if (editorRef.current) onChange(saveValue());
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
              onChange(saveValue());
              e.preventDefault();
            }
          }
        }}
      />
    </div>
  );
};

export default RichBlankEditor;
