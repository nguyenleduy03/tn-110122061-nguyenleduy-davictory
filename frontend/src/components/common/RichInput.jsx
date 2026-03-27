import React, { useRef, useEffect } from 'react';
import { stripInlineStyles } from '../../utils/textFormatters';

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
        onBlur={(e) => { onChange(e.currentTarget.innerHTML); }}
        onInput={(e) => { onChange(e.currentTarget.innerHTML); }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
          const cleaned = stripInlineStyles(text);
          document.execCommand('insertHTML', false, cleaned);
          onChange(ref.current.innerHTML);
        }}
      />
    </div>
  );
};

export default RichInput;
