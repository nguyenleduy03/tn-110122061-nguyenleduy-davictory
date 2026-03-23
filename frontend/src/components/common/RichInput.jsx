import React, { useRef, useState, useEffect } from 'react';
import { stripInlineStyles } from '../../utils/textFormatters';

/**
 * RichInput — contentEditable text field with rich formatting toolbar.
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
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState({});

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const updateActive = () => {
    try {
      const states = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        superscript: document.queryCommandState('superscript'),
        subscript: document.queryCommandState('subscript'),
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false,
      };
      
      // Check CSS text-align for alignment state
      if (ref.current) {
        const computedStyle = window.getComputedStyle(ref.current);
        const textAlign = computedStyle.textAlign;
        
        states.justifyLeft = textAlign === 'left' || textAlign === 'start' || textAlign === '';
        states.justifyCenter = textAlign === 'center';
        states.justifyRight = textAlign === 'right' || textAlign === 'end';
      }
      
      setActive(states);
    } catch (_) {}
  };

  const exec = (cmd, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (ref.current) {
      ref.current.focus();
      
      // Direct CSS approach for alignment commands
      if (cmd.startsWith('justify')) {
        applyAlignment(cmd);
      } else {
        // Use execCommand for other formatting
        try {
          document.execCommand(cmd, false, null);
        } catch (error) {
          console.error(`execCommand '${cmd}' error:`, error);
        }
      }
      
      onChange(ref.current.innerHTML ?? '');
      updateActive();
    }
  };

  const applyAlignment = (cmd) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      // No selection, apply to entire content
      const alignMap = {
        'justifyLeft': 'left',
        'justifyCenter': 'center', 
        'justifyRight': 'right'
      };
      ref.current.style.textAlign = alignMap[cmd] || 'left';
      return;
    }
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    // Find parent element
    while (element && element.nodeType !== Node.ELEMENT_NODE) {
      element = element.parentNode;
    }
    
    // If we're in the editor, apply alignment
    if (element && ref.current.contains(element)) {
      const alignMap = {
        'justifyLeft': 'left',
        'justifyCenter': 'center', 
        'justifyRight': 'right'
      };
      
      // Apply to the element or create a div wrapper
      if (element === ref.current) {
        element.style.textAlign = alignMap[cmd] || 'left';
      } else {
        element.style.textAlign = alignMap[cmd] || 'left';
      }
    }
  };

  const minHeight = multiline ? `${(rows ?? 4) * 1.6}em` : undefined;
  const cls = (cmd) => `rich-tb-btn${active[cmd] ? ' active' : ''}`;

  return (
    <div
      className={`rich-input-wrap${multiline ? ' rich-input-multiline' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {focused && (
        <div className="rich-input-toolbar" onMouseDown={(e) => e.preventDefault()}>
          {/* Format */}
          <button type="button" className={cls('bold')}          onMouseDown={(e) => exec('bold', e)}          title="In đậm (Ctrl+B)"><b>B</b></button>
          <button type="button" className={cls('italic')}        onMouseDown={(e) => exec('italic', e)}        title="In nghiêng (Ctrl+I)"><i>I</i></button>
          <button type="button" className={cls('underline')}     onMouseDown={(e) => exec('underline', e)}     title="Gạch chân (Ctrl+U)"><u>U</u></button>
          <button type="button" className={cls('strikeThrough')} onMouseDown={(e) => exec('strikeThrough', e)} title="Gạch ngang"><s>S</s></button>
          <span className="rich-tb-sep" />
          {/* Super/Subscript */}
          <button type="button" className={cls('superscript')} onMouseDown={(e) => exec('superscript', e)} title="Chỉ số trên">x²</button>
          <button type="button" className={cls('subscript')}   onMouseDown={(e) => exec('subscript', e)}   title="Chỉ số dưới">x₂</button>
          <span className="rich-tb-sep" />
          {/* Alignment */}
          <button type="button" className={cls('justifyLeft')}   onMouseDown={(e) => exec('justifyLeft', e)}   title="Căn trái">⬅</button>
          <button type="button" className={cls('justifyCenter')} onMouseDown={(e) => exec('justifyCenter', e)} title="Căn giữa">⬌</button>
          <button type="button" className={cls('justifyRight')}  onMouseDown={(e) => exec('justifyRight', e)}  title="Căn phải">➡</button>
          <span className="rich-tb-sep" />
          {/* Clear */}
          <button type="button" className="rich-tb-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); ref.current?.focus(); document.execCommand('removeFormat'); onChange(ref.current?.innerHTML ?? ''); }}
            title="Xóa định dạng">✕</button>
        </div>
      )}
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
        onFocus={() => { setFocused(true); updateActive(); }}
        onBlur={(e) => { setFocused(false); onChange(e.currentTarget.innerHTML); }}
        onInput={(e) => { onChange(e.currentTarget.innerHTML); updateActive(); }}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
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
