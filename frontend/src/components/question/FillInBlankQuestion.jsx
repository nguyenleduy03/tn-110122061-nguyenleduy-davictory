import React from 'react';
import { Bookmark } from 'lucide-react';

const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const parts = q.text ? q.text.split('_______') : [];
    if (parts.length < 2) return <li id={`question-${q.number}`} className="fill-in-blank-item"><span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} className="fill-in-blank-bookmark"><Bookmark size={16} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} /></span>{q.text}</li>;

    return (
        <li id={`question-${q.number}`} className="fill-in-blank-item">
            <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} className="fill-in-blank-bookmark">
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
                    className={`inline-input ${isReview ? (answer?.trim().toLowerCase() === q.correctAnswer?.toLowerCase() ? 'review-correct' : 'review-wrong') : ''}`}
                    placeholder={q.number}
                    value={answer || ''}
                    onChange={(e) => { if (!isReview) handleAnswerChange?.(q.id, e.target.value); }}
                    onFocus={() => { if (!isReview) setActiveQuestion?.(q.number); }}
                    autoComplete="off"
                    spellCheck="false"
                    readOnly={isReview}
                />
            </span>
            {isReview && answer?.trim().toLowerCase() !== q.correctAnswer?.toLowerCase() && (
                <span className="review-correct-label" style={{ marginLeft: '8px', color: '#107c41', fontWeight: 'bold' }}>
                    ({q.correctAnswer})
                </span>
            )}
            {parts[1]}
        </li>
    );
};

export default FillInBlankQuestion;
