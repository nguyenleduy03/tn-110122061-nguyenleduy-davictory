import React from 'react';
import { Bookmark } from 'lucide-react';

const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark }) => {
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
            <div className="tfng-text" style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "15px" }}>
                
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ cursor: "pointer", display: "flex", marginTop: "2px" }}>
                        <Bookmark size={18} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} />
                    </span>
                    
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ cursor: "pointer", display: "flex", marginTop: "2px" }}>
                        <Bookmark size={18} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} />
                    </span>
                    <div className="tfng-number" style={{ height: "auto", lineHeight: "1.5", fontSize: "16px", paddingTop: "0", margin: "0", alignItems: "flex-start", fontWeight: "bold", minWidth: "auto" }}>{q.number}</div>
                </div>
                </div>
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
