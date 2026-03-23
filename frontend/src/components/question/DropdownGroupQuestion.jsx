import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

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
  const group = q || {};
  const questions = group.subQuestions || group.questions || [];
  const options = group.sharedOptions || [];

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

      {options.length > 0 && (
        <ul className="mcq-dropdown-legend">
          {options.map((opt) => (
            <li key={opt.key}>
              <strong>{opt.key}</strong>{' '}
              <span
                dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(opt.label || '') }}
              />
            </li>
          ))}
        </ul>
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
              {!isReview && (
                <span
                  className="mcq-dropdown-bookmark"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark?.(number);
                  }}
                >
                  <Bookmark
                    size={18}
                    fill={bookmarks?.[number] ? '#1a73e8' : 'none'}
                    color={bookmarks?.[number] ? '#1a73e8' : '#ccc'}
                  />
                </span>
              )}
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
  );
};

export default DropdownGroupQuestion;

