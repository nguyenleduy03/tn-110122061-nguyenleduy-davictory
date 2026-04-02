import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const TFNGQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark, isReview, customOptions }) => {
    const options = customOptions || ['TRUE', 'FALSE', 'NOT GIVEN'];
    const nums = q.numberRange || [q.number];
    const isActive = nums.includes(activeQuestion);
    const selectedAnswer = answer;
    const displayNumber = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : q.number;

    const handleChange = (opt) => {
        if (!handleAnswerChange || isReview) return;
        handleAnswerChange(q.id, opt);
    };

    return (
        <div
            className="tfng-question relative-pos"
            id={`question-${q.number}`}
            onFocus={() => setActiveQuestion?.(q.number)}
            onClick={() => setActiveQuestion?.(q.number)}
        >

            <div className="tfng-text">
                {!isReview && isActive && (
                    <BookmarkToggle
                        className="question-bookmark"
                        active={nums.some(n => bookmarks?.[n])}
                        onToggle={() => nums.forEach(n => toggleBookmark?.(n))}
                    />
                )}
                <div className="tfng-question-content">
                    <span className="tfng-number">{displayNumber}</span>
                    <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.text) || '' }} />
                </div>
            </div>
            <div className="tfng-options">
                {options.map((opt, idx) => {
                    const isChecked = selectedAnswer === opt;
                    const isDisabled = isReview;
                    let reviewClass = '';
                    if (isReview) {
                        const normalizedOpt = String(opt).trim().toLowerCase();
                        const normalizedCorrect = String(q.correctAnswer).trim().toLowerCase();
                        const isCorrectOpt = normalizedOpt === normalizedCorrect;

                        if (isCorrectOpt) {
                            reviewClass = 'review-choice-correct';
                        } else if (isChecked) {
                            reviewClass = 'review-choice-wrong';
                        }
                    }
                    return (
                        <label
                            key={idx}
                            className={`tfng-radio-label${isChecked ? ' tfng-option-selected' : ''} ${reviewClass}`}
                        >
                            <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt}
                                checked={isChecked}
                                disabled={isDisabled}
                                className="tfng-input-no-margin"
                                onChange={() => handleChange(opt)}
                            />
                            <span className="opt-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(opt || '') }} />
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default TFNGQuestion;
