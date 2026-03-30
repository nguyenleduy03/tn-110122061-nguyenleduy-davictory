import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const SummaryCompletionSelectQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    // Parse data if it's a JSON string
    let questionData = q;
    if (typeof q === 'string') {
        try {
            questionData = JSON.parse(q);
        } catch (e) {
            questionData = q;
        }
    }
    
    const resolveText = (value) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
            return value.text || value.label || value.value || value.optionText || value.optionLabel || '';
        }
        return String(value ?? '');
    };

    const options = (questionData.optionBank || []).map(resolveText).filter(Boolean);
    const instructions = questionData.instructions || '';
    const noteText = questionData.noteText || questionData.text || '';
    const allowOptionReuse = questionData.allowOptionReuse !== false;
    
    const [isDragOverBank, setIsDragOverBank] = React.useState(false);
    
    const normalizeBlankTokens = (text) => {
        let s = String(text || '');
        s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
        s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
        return s;
    };

    const handleDragStart = (e, option, sourceQId = null) => {
        const optionText = resolveText(option);
        e.dataTransfer.setData('text/plain', optionText.replace(/<[^>]*>/g, ''));
        if (sourceQId) {
            e.dataTransfer.setData('sourceQId', String(sourceQId));
        }
    };

    const handleDrop = (e, qId, qNum) => {
        e.preventDefault();
        const droppedText = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');
        
        if (!isReview && droppedText) {
            handleAnswerChange?.(qId, droppedText);
            setActiveQuestion?.(qNum);
            
            // Clear source if dragging from another blank
            if (sourceQId && sourceQId !== String(qId)) {
                handleAnswerChange?.(sourceQId, '');
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleBankDrop = (e) => {
        e.preventDefault();
        setIsDragOverBank(false);
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (sourceQId && !isReview) {
            handleAnswerChange?.(sourceQId, '');
        }
    };
    
    const handleBankDragOver = (e) => {
        e.preventDefault();
        setIsDragOverBank(true);
    };
    
    const handleBankDragLeave = (e) => {
        e.preventDefault();
        setIsDragOverBank(false);
    };
    
    // Track used options
    const usedOptions = new Set();
    if (!allowOptionReuse) {
        Object.values(answers || {}).filter(Boolean).forEach(ans => usedOptions.add(ans));
    }

    const renderParagraph = () => {
        if (!noteText) return null;
        const normalizedText = normalizeBlankTokens(noteText);
        const parts = normalizedText.split(/\[blank\]/gi);
        let blankIndex = 0;

        return parts.map((part, index) => {
            if (index >= parts.length - 1) {
                return <span key={index} dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part) }} />;
            }

            const subQ = questionData.subQuestions?.[blankIndex];
            const qNum = subQ?.number ?? blankIndex + 1;
            const qId = subQ ? subQ.id : `q${qNum}`;
            const isActive = activeQuestion === qNum;
            const answer = answers?.[qId] || '';
            const isCorrect = answer === subQ?.correctAnswer;
            const displayAnswer = (isReview && !isCorrect) ? subQ?.correctAnswer : answer;

            blankIndex++;
            return (
                <span key={index}>
                    <span dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part) }} />
                    <span
                        id={`question-${qNum}`}
                        className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} relative-pos`}
                        onClick={() => setActiveQuestion?.(qNum)}
                    >
                        {!isReview && (
                            <span
                                className="summary-bookmark"
                                onClick={(e) => { e.stopPropagation(); toggleBookmark?.(qNum); }}
                            >
                                <Bookmark size={18} fill={bookmarks?.[qNum] ? "#1a73e8" : "none"} color={bookmarks?.[qNum] ? "#1a73e8" : "#ccc"} />
                            </span>
                        )}
                        <span
                            ref={(el) => { if (inputRefs?.current) inputRefs.current[qNum] = el; }}
                            className={`inline-input summary-input drag-drop-blank ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                            onDrop={(e) => handleDrop(e, qId, qNum)}
                            onDragOver={handleDragOver}
                            onClick={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                            style={{ minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: isReview ? 'default' : 'pointer' }}
                        >
                            {displayAnswer ? (
                                <span 
                                    draggable={!isReview}
                                    onDragStart={(e) => { if (!isReview) handleDragStart(e, displayAnswer, qId); }}
                                    style={{ 
                                        cursor: isReview ? 'default' : 'grab',
                                        padding: '2px 4px'
                                    }}
                                >
                                    {displayAnswer}
                                </span>
                            ) : (
                                <span style={{ color: '#9ca3af' }}>{qNum}</span>
                            )}
                        </span>
                    </span>
                </span>
            );
        });
    };

    return (
        <div className="summary-completion-container">
            {instructions && (
                <p className="summary-instructions" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instructions) }} />
            )}
            <div className="summary-text">
                {renderParagraph()}
            </div>
            <div 
                className={`summary-word-bank ${isDragOverBank ? 'drag-over' : ''}`}
                onDragOver={handleBankDragOver} 
                onDragLeave={handleBankDragLeave}
                onDrop={handleBankDrop}
            >
                <div className="summary-bank-options">
                    {options.map((o, i) => {
                        const optionText = resolveText(o);
                        const isUsed = !allowOptionReuse && usedOptions.has(optionText);
                        
                        if (isUsed && !isReview) return null;
                        
                        return (
                            <div 
                                key={i} 
                                className={`summary-bank-chip ${isUsed ? 'used' : ''}`}
                                draggable={!isReview}
                                onDragStart={(e) => handleDragStart(e, o)}
                            >
                                {optionText}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SummaryCompletionSelectQuestion;
