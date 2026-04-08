import React, { useRef, useEffect } from 'react';
import { sanitizeRichPasteHtml, serializeContentEditableHtml } from '../../utils/textFormatters';

/**
 * RichInput — contentEditable text field used by the shared top toolbar.
 *
 * Props:
 *   value       {string}   HTML string stored in state
 *   onChange    {fn}       called with new HTML string on every change
 *   placeholder {string}
 *   multiline   {bool}     taller field with white-space:pre-wrap
 *   style       {object}   extra wrapper style
 *   className   {string}   extra class on wrapper
 *   rows        {number}   approximate height in lines when multiline (default 4)
 */
const RichInput = ({ value, onChange, placeholder, style, multiline, className, rows }) => {
  const ref = useRef(null);

  const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const minHeight = multiline ? `${(rows ?? 4) * 1.6}em` : undefined;

  return (
    <div
      className={`rich-input-wrap${multiline ? ' rich-input-multiline' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`rich-input-content${multiline ? ' rich-input-content--multiline' : ''}`}
        data-placeholder={placeholder}
        style={minHeight ? { minHeight } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => { onChange(serializeContentEditableHtml(e.currentTarget)); }}
        onInput={(e) => { onChange(serializeContentEditableHtml(e.currentTarget)); }}
        onKeyDown={(e) => {
          if (!multiline || e.key !== 'Enter') return;
          e.preventDefault();

          const sel = window.getSelection?.();
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
            onChange(serializeContentEditableHtml(ref.current));
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const pastedHtml = e.clipboardData.getData('text/html');
          const pastedText = e.clipboardData.getData('text/plain');
          const cleaned = pastedHtml
            ? sanitizeRichPasteHtml(pastedHtml)
            : (multiline
              ? escapeHtml(pastedText).replace(/\r\n?/g, '\n').replace(/\n/g, '<br/>')
              : sanitizeRichPasteHtml(pastedText));
          document.execCommand('insertHTML', false, cleaned);
          onChange(serializeContentEditableHtml(ref.current));
        }}
      />
    </div>
  );
};

export default RichInput;
