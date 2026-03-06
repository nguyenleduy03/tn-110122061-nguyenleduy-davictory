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
            id={`question-${q.number}`}
            onFocus={() => setActiveQuestion?.(q.number)}
            onClick={() => setActiveQuestion?.(q.number)}
            style={{
                border: 'none',
                backgroundColor: 'transparent',
                borderRadius: '6px',
            }}
        >
            <div className="tfng-text" style={{ display: "flex", alignItems: "flex-start", gap: "15px", marginBottom: "15px" }}>
                <div className="tfng-number" style={{ height: "auto", lineHeight: "1.5", fontSize: "16px", paddingTop: "0", margin: "0", alignItems: "flex-start" }}>{q.number}</div>
                <div style={{ fontSize: "16px", fontWeight: "400", lineHeight: "1.5", margin: "0", paddingTop: "0" }}>{q.text}</div>
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
                                backgroundColor: isChecked ? '#e0e0e0' : 'transparent',
                                border: 'none',
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
