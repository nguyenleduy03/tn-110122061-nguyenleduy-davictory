import React from 'react';
import { Bookmark } from 'lucide-react';

const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark }) => {
    const nums = q.numberRange || [q.number];
    const isActive = nums.includes(activeQuestion);
    const isMultiple = q.allowMultipleAnswers;
    const selectCount = q.selectCount || 0;
    const selectedAnswers = isMultiple ? (Array.isArray(answer) ? answer : []) : answer;
    const isFull = isMultiple && selectCount > 0 && selectedAnswers.length >= selectCount;
    const displayNumber = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : q.number;

    const handleChange = (opt) => {
        if (!handleAnswerChange) return;
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
                {q.options && q.options.map((opt, idx) => {
                    const isChecked = isMultiple ? selectedAnswers.includes(opt) : selectedAnswers === opt;
                    const isDisabled = isMultiple && isFull && !isChecked;
                    return (
                        <label
                            key={idx}
                            className="tfng-radio-label"
                            style={{
                                padding: '4px 15px',
                                borderRadius: '6px',
                                backgroundColor: (!isMultiple && isChecked) ? '#e0e0e0' : 'transparent',
                                border: 'none',
                                opacity: isDisabled ? 0.4 : 1,
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
                            <span style={{ fontSize: '14px' }}>{opt}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoiceQuestion;
