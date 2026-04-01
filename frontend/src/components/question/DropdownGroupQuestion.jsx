import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';

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

  console.log('DropdownGroupQuestion imageWidth:', group.imageWidth, 'imageUrl:', group.imageUrl);

  const handleChange = (questionId, value) => {
    if (isReview) return;
    handleAnswerChange?.(questionId, value);
  };

  return (
    <div className="mcq-dropdown-group">
      {group.instruction && (
        <p
          className="question-instruction"
          dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(group.instruction) }}
        />
      )}

      {(group.imageUrl || (options.length > 0 && !group.hideOptionsTable)) && (
        <div style={{ display: 'flex', gap: '20px', margin: '16px 0', alignItems: 'flex-end' }}>
          {group.imageUrl && (
            <div style={{ width: `${group.imageWidth || 100}%` }}>
              <img
                src={resolveDrivePreviewUrl(group.imageUrl)}
                alt="Question illustration"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
          )}

          {options.length > 0 && !group.hideOptionsTable && (
            <ul className="mcq-dropdown-legend" style={{ flex: group.imageUrl ? 1 : 'none', margin: 0, width: group.imageUrl ? 'auto' : '100%' }}>
              {options.map((opt) => (
                <li key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <strong className="mcq-dropdown-key">{opt.key}</strong>
                    <span
                      dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(opt.label || '') }}
                    />
                  </div>
                  {opt.imageUrl && (
                    <img
                      src={resolveDrivePreviewUrl(opt.imageUrl)}
                      alt={`Option ${opt.key}`}
                      style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'contain' }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mcq-dropdown-list">
        {questions.map((question) => {
          const number = question.number ?? question.questionNumber;
          const current = answers?.[question.id] ?? '';
          const correctKey = question.correctOptionKey ?? question.correctAnswer;
          const isActive = activeQuestion === number;

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
              className={`mcq-dropdown-row ${isActive ? 'active-question' : ''}`}
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
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleChange(question.id, e.target.value)}
              >
                <option value="">…</option>
                {options.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.key}
                  </option>
                ))}
              </select>
              {!isReview && (
                <BookmarkToggle
                  className="mcq-dropdown-bookmark"
                  size={16}
                  active={Boolean(bookmarks?.[number])}
                  onToggle={() => toggleBookmark?.(number)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DropdownGroupQuestion;

