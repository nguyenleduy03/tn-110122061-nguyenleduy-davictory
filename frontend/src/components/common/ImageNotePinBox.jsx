import React from 'react';

const getBorderColor = ({ bookmarked, active, isReview, isCorrect }) => {
  if (bookmarked) return '#fea706';
  if (isReview) return isCorrect ? '#22c55e' : '#ef4444';
  if (active) return '#5b9bd5';
  return '#3b82f6';
};

const getBoxShadow = ({ bookmarked, active }) => {
  if (bookmarked) return '0 0 0 1px rgba(254, 167, 6, 0.35)';
  if (active) return '0 0 0 1px #5b9bd5';
  return '0 2px 4px rgba(0,0,0,0.2)';
};

const ImageNotePinBox = ({
  id,
  number,
  left,
  top,
  value,
  displayValue,
  active = false,
  bookmarked = false,
  isReview = false,
  isCorrect = true,
  boxWidth = 60,
  blankWidth,
  readOnly = false,
  onActivate,
  onChange,
  inputRef,
  questionText = '',
  showQuestionText = false,
  showDeleteButton = false,
  onDelete,
  onMouseDown,
  className = '',
}) => {
  const resolvedValue = String(displayValue ?? value ?? '');
  const resolvedBlankWidth = Number.isFinite(blankWidth)
    ? blankWidth
    : Math.max(26, boxWidth - 68);
  const outerBorderColor = getBorderColor({ bookmarked, active, isReview, isCorrect });
  const outerBoxShadow = getBoxShadow({ bookmarked, active });
  const outerClassName = [
    'summary-image-note-pin',
    isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      id={id}
      className={outerClassName}
      onClick={() => { onActivate?.(); }}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left,
        top,
        transform: 'translate(-50%, -50%)',
        minWidth: `${boxWidth}px`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: '#fff',
        color: '#111',
        border: `2px solid ${outerBorderColor}`,
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        boxShadow: outerBoxShadow,
        cursor: onMouseDown ? 'move' : 'default',
      }}
    >
      <span style={{ minWidth: 20, textAlign: 'center', flexShrink: 0 }}>{number}</span>
      {showQuestionText && questionText ? (
        <span style={{ fontSize: 12, fontWeight: 'normal', flexShrink: 0 }}>{questionText}:</span>
      ) : null}
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${resolvedBlankWidth}px`,
          minWidth: `${resolvedBlankWidth}px`,
          maxWidth: `${resolvedBlankWidth}px`,
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: 12,
            fontWeight: 'normal',
            lineHeight: 1,
            visibility: resolvedValue ? 'hidden' : 'visible',
            whiteSpace: 'nowrap',
          }}
        >
          ____
        </span>
        <input
          ref={inputRef}
          type="text"
          value={resolvedValue}
          onChange={onChange}
          onClick={(e) => { e.stopPropagation(); if (!readOnly) onActivate?.(); }}
          onFocus={() => { onActivate?.(); }}
          readOnly={readOnly}
          spellCheck="false"
          autoComplete="off"
          placeholder=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 400,
            color: '#111',
            boxSizing: 'border-box',
            lineHeight: '1',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            caretColor: '#111',
            pointerEvents: readOnly ? 'none' : 'auto',
          }}
        />
      </span>
      <button
        type="button"
        aria-hidden={!showDeleteButton}
        tabIndex={showDeleteButton ? 0 : -1}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); if (showDeleteButton) onDelete?.(); }}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: showDeleteButton ? 'pointer' : 'default',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          visibility: showDeleteButton ? 'visible' : 'hidden',
          pointerEvents: showDeleteButton ? 'auto' : 'none',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default ImageNotePinBox;
