import React from 'react';
import { Bookmark } from 'lucide-react';

const TFNGQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
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
                    {selectedAnswer === q.correctAnswer ? <span style={{color: '#107c41'}}>&#10003;</span> : <span style={{color: '#d13438'}}>&#10007;</span>}
                </div>
            )}
            <div className="tfng-text">
                <span className="tfng-bookmark" onClick={(e) => { e.stopPropagation(); nums.forEach(n => toggleBookmark?.(n)); }} >
                    <Bookmark size={18} fill={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "none"} color={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "#ccc"} />
                </span>
                <div className="tfng-question-content">
                    <span className="tfng-number">{displayNumber}</span>
                    <span className="tfng-question-text">{q.text}</span>
                </div>
            </div>
            <div className="tfng-options">
                {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt, idx) => {
                    const isChecked = selectedAnswer === opt;
                    const isDisabled = isReview;
                    let reviewClass = '';
                    if (isReview && isChecked) {
                        reviewClass = selectedAnswer === q.correctAnswer ? 'review-choice-correct' : 'review-choice-wrong';
                    }
                    return (
                        <label
                            key={idx}
                            className={`tfng-radio-label${isChecked ? ' tfng-option-selected' : ''} ${reviewClass}`}
                            style={{
                                padding: '4px 15px',
                                border: 'none',
                                opacity: isDisabled ? 0.4 : 1,
                                pointerEvents: isDisabled ? 'none' : 'auto',
                            }}
                        >
                            <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt}
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleChange(opt)}
                                style={{ margin: 0 }}
                            />
                            <span style={{ fontSize: '14px' }}>{opt}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default TFNGQuestion;
