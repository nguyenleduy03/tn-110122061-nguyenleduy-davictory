import React from 'react';
import { Bookmark } from 'lucide-react';

const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark }) => {
    const parts = q.text ? q.text.split('_______') : [];
    if (parts.length < 2) return <li id={`question-${q.number}`} style={{ position: "relative" }}><span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ position: "absolute", left: "-28px", top: "5px", cursor: "pointer", display: "flex" }}><Bookmark size={16} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} /></span>{q.text}</li>;

    return (
        <li id={`question-${q.number}`} style={{ position: "relative" }}>
            <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ position: "absolute", left: "-28px", top: "5px", cursor: "pointer", display: "flex" }}>
                <Bookmark size={16} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} />
            </span>
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
