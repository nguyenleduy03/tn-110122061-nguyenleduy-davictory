import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    const nums = q.numberRange || [q.number];
    const isActive = nums.includes(activeQuestion);
    const isMultiple = q.allowMultipleAnswers;
    const selectCount = q.selectCount || 0;
    const selectedAnswers = isMultiple ? (Array.isArray(answer) ? answer : []) : answer;
    const isFull = isMultiple && selectCount > 0 && selectedAnswers.length >= selectCount;
    const displayNumber = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : q.number;

    const handleChange = (opt) => {
        if (!handleAnswerChange || isReview) return;
        if (isMultiple) {
            let newAnswers = [...selectedAnswers];
            if (newAnswers.includes(opt)) {
                newAnswers = newAnswers.filter(a => a !== opt);
            } else {
                if (selectCount > 0 && newAnswers.length >= selectCount) return;
                newAnswers.push(opt);
            }
            handleAnswerChange(q.id, newAnswers);
        } else {
            handleAnswerChange(q.id, opt);
        }
    };

    return (
        <div
            className="tfng-question"
            id={`question-${q.number}`}
            onFocus={() => setActiveQuestion?.(q.number)}
            onClick={() => setActiveQuestion?.(q.number)}
            style={{
                border: 'none',
                backgroundColor: 'transparent',
                borderRadius: '6px',
            }}
        >
            {isReview && (
                <div style={{ position: 'absolute', right: '10px', top: '10px' }}>
                    {isMultiple ? (
                        (() => {
                            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                            const isAllCorrect = selectedAnswers.length === correctArr.length && selectedAnswers.every(ans => correctArr.includes(ans));
                            return isAllCorrect ? <span style={{ color: '#107c41' }}>✓</span> : <span style={{ color: '#d13438' }}>✗</span>;
                        })()
                    ) : (
                        answer === q.correctAnswer ? <span style={{ color: '#107c41' }}>✓</span> : <span style={{ color: '#d13438' }}>✗</span>
                    )}
                </div>
            )}
            {isReview && (
                <div style={{ position: 'absolute', right: '10px', bottom: '10px', fontSize: '13px', color: '#555' }}>
                    {(() => {
                        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                        const isAllCorrect = isMultiple
                            ? selectedAnswers.length === correctArr.length && selectedAnswers.every(ans => correctArr.includes(ans))
                            : answer === q.correctAnswer;

                        if (!isAllCorrect && isReview) {
                            return <span className="review-correct-label">({correctArr.join(', ')})</span>;
                        }
                        return null;
                    })()}
                </div>
            )}
            <div className="tfng-text">
                <span className="tfng-bookmark" onClick={(e) => { e.stopPropagation(); nums.forEach(n => toggleBookmark?.(n)); }} >
                    <Bookmark size={18} fill={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "none"} color={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "#ccc"} />
                </span>
                <div className="tfng-question-content">
                    <span className="tfng-number">{displayNumber}</span>
                    <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.text) || '' }} />
                </div>
            </div>
            <div className="tfng-options">
                {q.options && q.options.map((opt, idx) => {
                    const isChecked = isMultiple ? selectedAnswers.includes(opt) : selectedAnswers === opt;
                    const isDisabled = (isMultiple && isFull && !isChecked) || isReview;

                    let reviewClass = '';
                    if (isReview && isChecked) {
                        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                        const isCorrectOpt = correctArr.includes(opt);
                        if (isCorrectOpt) {
                            reviewClass = 'review-choice-correct';
                        } else {
                            reviewClass = 'review-choice-wrong';
                        }
                    }

                    return (
                        <label
                            key={idx}
                            className={`tfng-radio-label${isChecked ? ' tfng-option-selected' : ''} ${reviewClass}`}
                            style={{
                                padding: '4px 15px',
                                border: 'none',
                                opacity: (isDisabled && !isReview) ? 0.4 : 1,
                                pointerEvents: isDisabled ? 'none' : 'auto',
                            }}
                        >
                            <input
                                type={isMultiple ? "checkbox" : "radio"}
                                name={`q-${q.id}`}
                                value={opt}
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleChange(opt)}
                                style={{ margin: 0 }}
                            />
                            <span style={{ fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: opt || '' }} />
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoiceQuestion;
