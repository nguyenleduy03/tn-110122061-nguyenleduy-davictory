import React from 'react';

const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange }) => {
    const isActive = activeQuestion === q.number;
    const isMultiple = q.allowMultipleAnswers;
    const selectedAnswers = isMultiple ? (Array.isArray(answer) ? answer : []) : answer;

    const handleChange = (opt) => {
        if (!handleAnswerChange) return;
        if (isMultiple) {
            let newAnswers = [...selectedAnswers];
            if (newAnswers.includes(opt)) {
                newAnswers = newAnswers.filter(a => a !== opt);
            } else {
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
            onFocus={() => setActiveQuestion?.(q.number)}
            onClick={() => setActiveQuestion?.(q.number)}
            style={{
                borderColor: isActive ? '#333' : '#ddd',
                boxShadow: isActive ? '0 0 0 1px #333' : 'none',
            }}
        >
            <div className="tfng-text">
                <div className="tfng-number">{q.number}</div>
                <div style={{ fontSize: '15px', fontWeight: '500', lineHeight: '1.5' }}>{q.text}</div>
            </div>
            <div className="tfng-options">
                {q.options && q.options.map((opt, idx) => {
                    const isChecked = isMultiple ? selectedAnswers.includes(opt) : selectedAnswers === opt;
                    return (
                        <label
                            key={idx}
                            className="tfng-radio-label"
                            style={{
                                padding: '10px 15px',
                                borderRadius: '6px',
                                backgroundColor: isChecked ? '#f8f9fa' : 'transparent',
                                border: isChecked ? '1px solid #ccc' : '1px solid transparent',
                            }}
                        >
                            <input
                                type={isMultiple ? "checkbox" : "radio"}
                                name={`q-${q.id}`}
                                value={opt}
                                checked={isChecked}
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
