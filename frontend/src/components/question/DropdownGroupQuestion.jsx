import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import { isQuestionMetaLabel } from '../../utils/questionLabelUtils';
import BookmarkToggle from '../common/BookmarkToggle';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';

const resolveImageWidthPercent = (value, fallback = 100) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const DropdownGroupQuestion = ({
  q,
  activeQuestion,
  setActiveQuestion,
  answers,
  handleAnswerChange,
  bookmarks,
  toggleBookmark,
  isReview,
}) => {
  const resolveText = (value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return value.text || value.label || value.value || value.optionText || value.optionLabel || value.key || '';
    }
    return String(value ?? '');
  };

  const sanitizeInstructionHtml = (value) => String(value || '')
    .replace(/<p\b[^>]*>\s*(?:&nbsp;|\u00A0|\s|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<div\b[^>]*>\s*(?:&nbsp;|\u00A0|\s|<br\s*\/?>)*<\/div>/gi, '')
    .replace(/<span\b[^>]*>\s*(?:&nbsp;|\u00A0|\s|<br\s*\/?>|[|│┃¦])*<\/span>/gi, '')
    .trim();

  const hasMeaningfulText = (value) => {
    const plain = String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\u00A0|&nbsp;/gi, ' ')
      .replace(/[|│┃¦]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return /[A-Za-z0-9À-ỹ]/.test(plain);
  };

  const group = q || {};
  const questions = group.subQuestions || group.questions || [];
  const options = (group.sharedOptions || []).map((opt, index) => {
    if (!opt || typeof opt !== 'object') {
      return { key: String.fromCharCode(65 + index), label: resolveText(opt), imageUrl: '' };
    }
    return {
      key: resolveText(opt.key || opt.optionLabel || String.fromCharCode(65 + index)).trim().charAt(0) || String.fromCharCode(65 + index),
      label: resolveText(opt.label || opt.optionText || opt.text || opt.value),
      imageUrl: resolveText(opt.imageUrl || ''),
    };
  });

  console.log('[DropdownGroupQuestion] Dropdown data:', {
    groupId: group.id,
    rawSharedOptions: group.sharedOptions,
    processedOptions: options,
    questionsCount: questions.length
  });

  console.log('DropdownGroupQuestion imageWidth:', group.imageWidth, 'imageUrl:', group.imageUrl);

  const headingRaw = sanitizeInstructionHtml(group.heading || group.title || '');
  const instructionParts = [group.mainInstruction, group.subInstruction]
    .map(resolveText)
    .map(sanitizeInstructionHtml)
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => hasMeaningfulText(item))
    .filter((item) => !isQuestionMetaLabel(item));
  const instructionRaw = instructionParts.length ? '' : sanitizeInstructionHtml(group.instruction || '');
  const optionsTableTitleRaw = sanitizeInstructionHtml(group.optionsTableTitle || '');
  const questionTitleRaw = sanitizeInstructionHtml(group.questionTitle || '');

  const headingText = (!hasMeaningfulText(headingRaw) || isQuestionMetaLabel(headingRaw)) ? '' : headingRaw;
  const instructionText = (!hasMeaningfulText(instructionRaw) || isQuestionMetaLabel(instructionRaw)) ? '' : instructionRaw;
  const optionsTableTitleText = (!hasMeaningfulText(optionsTableTitleRaw) || isQuestionMetaLabel(optionsTableTitleRaw)) ? '' : optionsTableTitleRaw;
  const questionTitleText = (!hasMeaningfulText(questionTitleRaw) || isQuestionMetaLabel(questionTitleRaw)) ? '' : questionTitleRaw;
  const configuredImageWidth = resolveImageWidthPercent(group.imageWidth);
  const showOptionsLegend = options.length > 0 && !group.hideOptionsTable;
  const layoutRef = React.useRef(null);
  const [floatingBookmarkTop, setFloatingBookmarkTop] = React.useState(null);
  const activeQuestionInGroup = questions.some((question) => {
    const number = question.number ?? question.questionNumber;
    return String(number) === String(activeQuestion);
  });

  React.useLayoutEffect(() => {
    if (isReview || !activeQuestionInGroup || !layoutRef.current) {
      setFloatingBookmarkTop(null);
      return undefined;
    }

    const updateFloatingBookmarkPosition = () => {
      if (!layoutRef.current) return;
      const activeRow = layoutRef.current.querySelector('.mcq-dropdown-row.active-question');
      if (!activeRow) {
        setFloatingBookmarkTop(null);
        return;
      }

      const layoutRect = layoutRef.current.getBoundingClientRect();
      const rowRect = activeRow.getBoundingClientRect();
      setFloatingBookmarkTop(Math.max(0, rowRect.top - layoutRect.top));
    };

    updateFloatingBookmarkPosition();
    const rafId = window.requestAnimationFrame(updateFloatingBookmarkPosition);
    window.addEventListener('resize', updateFloatingBookmarkPosition);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateFloatingBookmarkPosition);
    };
  }, [activeQuestion, activeQuestionInGroup, isReview, questions.length, showOptionsLegend]);

  const handleChange = (questionId, value) => {
    if (isReview) return;
    handleAnswerChange?.(questionId, value);
  };

  return (
    <div className="mcq-dropdown-group">
      {headingText && (
        <div
          className="question-heading"
          dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(headingText) }}
        />
      )}
      {instructionParts.length > 0
        ? instructionParts.map((instructionPart, idx) => (
          <div
            key={`dropdown-instruction-${idx}`}
            className="question-instruction"
            dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instructionPart) }}
          />
        ))
        : instructionText && (
          <div
            className="question-instruction"
            dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instructionText) }}
          />
        )}

      {group.imageUrl && (
        <div className="mcq-dropdown-group-image" style={{ width: `${configuredImageWidth}%` }}>
          <img
            src={resolveDrivePreviewUrl(group.imageUrl)}
            alt="Question illustration"
          />
        </div>
      )}

      <div ref={layoutRef} className="mcq-dropdown-shell">
        <div className={`mcq-dropdown-layout ${showOptionsLegend ? 'has-legend' : 'no-legend'}`}>
          <div className="mcq-dropdown-questions-col">
            {questionTitleText && (
              <div
                className="question-instruction dropdown-question-title"
                dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(questionTitleText) }}
              />
            )}

            <div className="mcq-dropdown-list">
              {questions.map((question) => {
                const number = question.number ?? question.questionNumber;
                const current = answers?.[question.id] ?? '';
                const correctKey = question.correctOptionKey ?? question.correctAnswer;
                const isActive = activeQuestion === number;
                const isBookmarked = Boolean(bookmarks?.[number]);

                let displayValue = current;
                let reviewClass = '';
                if (isReview && correctKey) {
                  const isCorrect = current && String(current) === String(correctKey);
                  displayValue = isCorrect ? current : correctKey;
                  reviewClass = isCorrect ? 'review-correct' : 'review-wrong';
                }

                return (
                  <div
                    key={question.id}
                    id={`question-${number}`}
                    className={`mcq-dropdown-row ${isActive ? 'active-question question-focus-active' : ''} ${!isReview && isBookmarked ? 'question-focus-bookmarked' : ''}`}
                    onClick={() => setActiveQuestion?.(number)}
                  >
                    <span className="mcq-dropdown-number">{number}</span>
                    <span
                      className="mcq-dropdown-text"
                      dangerouslySetInnerHTML={{
                        __html: formatTextWithWhitespace(
                          question.text || question.questionText || '',
                        ),
                      }}
                    />
                    <select
                      className={`mcq-dropdown-select ${reviewClass}`}
                      value={displayValue || ''}
                      disabled={isReview}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isReview) setActiveQuestion?.(number);
                      }}
                      onFocus={() => {
                        if (!isReview) setActiveQuestion?.(number);
                      }}
                      onChange={(e) => handleChange(question.id, e.target.value)}
                    >
                      <option value="">…</option>
                      {options.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.key}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {showOptionsLegend && (
            <div className="mcq-dropdown-legend-wrap">
              {optionsTableTitleText && (
                <div
                  className="mcq-dropdown-legend-title"
                  dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(optionsTableTitleText) }}
                />
              )}
              <ul className="mcq-dropdown-legend">
                {options.map((opt) => (
                  <li key={opt.key} className="mcq-dropdown-legend-item">
                    <div className="mcq-dropdown-legend-content">
                      <strong className="mcq-dropdown-key">{opt.key}</strong>
                      <span
                        dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(opt.label || '') }}
                      />
                    </div>
                    {opt.imageUrl && (
                      <img
                        src={resolveDrivePreviewUrl(opt.imageUrl)}
                        alt={`Option ${opt.key}`}
                        className="mcq-dropdown-legend-image"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!isReview && activeQuestionInGroup && floatingBookmarkTop !== null && (
          <BookmarkToggle
            className="question-bookmark mcq-dropdown-floating-bookmark"
            style={{ top: `${floatingBookmarkTop}px` }}
            active={Boolean(bookmarks?.[activeQuestion])}
            onToggle={() => toggleBookmark?.(activeQuestion)}
          />
        )}
      </div>
    </div>
  );
};

export default DropdownGroupQuestion;

