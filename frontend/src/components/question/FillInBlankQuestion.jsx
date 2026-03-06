import React from 'react';

const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs }) => {
    const parts = q.text ? q.text.split('_______') : [];
    if (parts.length < 2) return <li>{q.text}</li>;

    return (
        <li>
            {parts[0]}
            <span
                className={`inline-question ${activeQuestion === q.number ? 'active-question-input' : ''}`}
                onClick={() => setActiveQuestion?.(q.number)}
            >
                <input
                    ref={(el) => { if (inputRefs?.current) inputRefs.current[q.number] = el; }}
                    type="text"
                    className="inline-input"
                    placeholder={q.number}
                    value={answer || ''}
                    onChange={(e) => handleAnswerChange?.(q.id, e.target.value)}
                    onFocus={() => setActiveQuestion?.(q.number)}
                    autoComplete="off"
                    spellCheck="false"
                />
            </span>
            {parts[1]}
        </li>
    );
};

export default FillInBlankQuestion;
