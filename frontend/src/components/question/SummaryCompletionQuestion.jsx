import React from 'react';
import { Bookmark } from 'lucide-react';

const SummaryCompletionQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark }) => {
    
    // Parse text to find placeholders like [24], [25]
    const renderParagraph = () => {
        if (!q.text) return null;
        
        // Regex to split by [number]
        const parts = q.text.split(/(\[\d+\])/g);
        
        return parts.map((part, index) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (match) {
                const qNum = parseInt(match[1], 10);
                const subQ = q.subQuestions?.find(sq => sq.number === qNum);
                const qId = subQ ? subQ.id : `q${qNum}`;
                const isActive = activeQuestion === qNum;
                const answer = answers?.[qId] || '';

                return (
                    <span 
                        key={index} 
                        className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''}`}
                        onClick={() => setActiveQuestion?.(qNum)}
                    >
                        <span 
                            className="summary-bookmark" 
                            onClick={(e) => { e.stopPropagation(); toggleBookmark?.(qNum); }} 
                        >
                            <Bookmark size={15} fill={bookmarks?.[qNum] ? "#1a73e8" : "none"} color={bookmarks?.[qNum] ? "#1a73e8" : "#ccc"} />
                        </span>
                        <input
                            ref={(el) => { if (inputRefs?.current) inputRefs.current[qNum] = el; }}
                            type="text"
                            className="inline-input summary-input"
                            placeholder={qNum.toString()}
                            value={answer}
                            onChange={(e) => handleAnswerChange?.(qId, e.target.value)}
                            onFocus={() => setActiveQuestion?.(qNum)}
                            autoComplete="off"
                            spellCheck="false"
                        />
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="summary-completion-container">
            {q.title && <h3 className="summary-title">{q.title}</h3>}
            <div className="summary-text">
                {renderParagraph()}
            </div>
        </div>
    );
};

export default SummaryCompletionQuestion;
