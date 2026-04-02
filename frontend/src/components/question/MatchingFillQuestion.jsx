import React from 'react';
import { formatTextWithWhitespace, stripInlineStyles } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const formatAndClean = (text) => stripInlineStyles(formatTextWithWhitespace(text));

const normalizeBlankTokens = (text) => {
  let s = String(text || '');
  s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
  s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
  return s;
};

const MatchingFillQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
  const subQuestions = q.subQuestions || [];

  // Validation options
  const validationOptions = q.validationOptions || {};
  const ignoreCase = validationOptions.ignoreCase !== false;
  const ignoreSpaces = validationOptions.ignoreSpaces || false;
  const ignorePunctuation = validationOptions.ignorePunctuation || false;
  const ignoreChars = validationOptions.ignoreChars || '';

  const normalizeAnswer = (text) => {
    let normalized = String(text || '').trim();
    if (ignoreCase) normalized = normalized.toLowerCase();
    if (ignoreSpaces) normalized = normalized.replace(/\s+/g, '');
    if (ignorePunctuation) normalized = normalized.replace(/[.,!?;:'"()]/g, '');
    if (ignoreChars) {
      const charsToRemove = ignoreChars.split('');
      charsToRemove.forEach(char => {
        normalized = normalized.split(char).join('');
      });
    }
    return normalized;
  };

  const checkAnswer = (userAnswer, correctAnswers) => {
    const normalizedUser = normalizeAnswer(userAnswer);
    const acceptedAnswers = correctAnswers.split('\n').map(a => normalizeAnswer(a)).filter(Boolean);
    return acceptedAnswers.some(accepted => normalizedUser === accepted);
  };

  const extractInlineBlankParts = (text) => {
    const normalized = normalizeBlankTokens(text);
    const match = normalized.match(/\[blank\]/i);
    if (!match || typeof match.index !== 'number') return null;

    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;
    const before = normalized.slice(0, tokenStart);
    const afterRaw = normalized.slice(tokenEnd);
    const after = afterRaw.replace(/\[blank\]/gi, '');

    return { before, after };
  };

  return (
    <div className="matching-fill-container">
      {subQuestions.map((subQ) => {
        const isActive = activeQuestion === subQ.number;
        const answer = answers[subQ.id] || '';
        const correctAnswers = subQ.correctAnswer || '';
        const isCorrect = checkAnswer(answer, correctAnswers);
        const showCorrect = isReview && !isCorrect;
        const inlineBlankParts = extractInlineBlankParts(subQ.text || '');
        const hasInlineBlank = !!inlineBlankParts;

        return (
          <div
            key={subQ.id}
            id={`question-${subQ.number}`}
            className={`tfng-question relative-pos ${isActive ? 'active' : ''}`}
            onClick={() => !isReview && setActiveQuestion(subQ.number)}
            style={{ marginBottom: 10 }}
          >
            <div className="tfng-text">
              {!isReview && isActive && (
                <BookmarkToggle
                  className="tfng-bookmark"
                  active={Boolean(bookmarks?.[subQ.number])}
                  onToggle={() => toggleBookmark?.(subQ.number)}
                />
              )}
              <div className="tfng-question-content">
                <span className="tfng-number">{subQ.number}</span>
                {hasInlineBlank ? (
                  <span className="tfng-question-text">
                    <span dangerouslySetInnerHTML={{ __html: formatAndClean(inlineBlankParts.before) }} />
                    <input
                      type="text"
                      className={`fill-blank-input inline ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                      value={answer}
                      onChange={(e) => !isReview && handleAnswerChange(subQ.id, e.target.value)}
                      placeholder={isReview ? '' : '...'}
                      disabled={isReview}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isReview) setActiveQuestion?.(subQ.number);
                      }}
                      onFocus={() => {
                        if (!isReview) setActiveQuestion?.(subQ.number);
                      }}
                      style={{ width: `clamp(80px, ${Math.max(8, answer.length + 2)}ch, 300px)` }}
                    />
                    <span dangerouslySetInnerHTML={{ __html: formatAndClean(inlineBlankParts.after) }} />
                    {showCorrect && (
                      <span className="fill-blank-correct-inline">
                        (✓ {correctAnswers.split('\n')[0]})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatAndClean(subQ.text || '') }} />
                )}
              </div>
            </div>
            {!hasInlineBlank && (
              <div className="tfng-options" style={{ marginTop: 10 }}>
                <input
                  type="text"
                  className={`fill-blank-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                  value={answer}
                  onChange={(e) => !isReview && handleAnswerChange(subQ.id, e.target.value)}
                  placeholder={isReview ? '' : 'Your answer...'}
                  disabled={isReview}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isReview) setActiveQuestion?.(subQ.number);
                  }}
                  onFocus={() => {
                    if (!isReview) setActiveQuestion?.(subQ.number);
                  }}
                />
                {showCorrect && (
                  <div className="fill-blank-correct">
                    ✓ Correct answer: {correctAnswers.split('\n')[0]}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MatchingFillQuestion;
