import React, { useRef, useState, useEffect } from 'react';

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
      setActive({
        bold:          document.queryCommandState('bold'),
        italic:        document.queryCommandState('italic'),
        underline:     document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        superscript:   document.queryCommandState('superscript'),
        subscript:     document.queryCommandState('subscript'),
      });
    } catch (_) {}
  };

  const exec = (cmd, e) => {
    e.preventDefault();
    e.stopPropagation();
    ref.current?.focus();
    document.execCommand(cmd, false, null);
    onChange(ref.current?.innerHTML ?? '');
    updateActive();
  };

  const minHeight = multiline ? `${(rows ?? 4) * 1.6}em` : undefined;
  const cls = (cmd) => `rich-tb-btn${active[cmd] ? ' active' : ''}`;

  return (
    <div
      className={`rich-input-wrap${multiline ? ' rich-input-multiline' : ''}${className ? ` ${className}` : ''}`}
      style={style}
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
        onFocus={() => { setFocused(true); updateActive(); }}
        onBlur={(e) => { setFocused(false); onChange(e.currentTarget.innerHTML); }}
        onInput={(e) => { onChange(e.currentTarget.innerHTML); updateActive(); }}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
      />
    </div>
  );
};

export default RichInput;
