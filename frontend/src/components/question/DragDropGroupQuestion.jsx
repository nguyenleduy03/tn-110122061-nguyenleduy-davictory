import React from 'react';
import { Bookmark } from 'lucide-react';

const DragDropGroupQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    const handleDragStart = (e, option, sourceQId = null) => {
        e.dataTransfer.setData('text/plain', option);
        if (sourceQId) {
            e.dataTransfer.setData('sourceQId', String(sourceQId));
        }
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, subQId) => {
        if (isReview) return;
        e.preventDefault();
        const option = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (option) {
            handleAnswerChange(subQId, option);
            if (sourceQId && sourceQId !== String(subQId)) {
                handleAnswerChange(sourceQId, '');
            }
        }
    };

    const handleBankDrop = (e) => {
        e.preventDefault();
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (sourceQId) {
            handleClear(sourceQId);
        }
    };

    const handleClear = (subQId) => {
        handleAnswerChange(subQId, '');
    };

    const isMatchingHeading = q.type === 'matching_heading';
    const isMatchingInfo = q.type === 'matching_info';

    // Calculate max length of bank options for sizing dropzones
    const bankOptions = q.bankOptions || [];
    const maxOptionChars = Math.max(0, ...bankOptions.map(opt => String(opt).length));
    const fixedBankWidth = Math.max(220, Math.min(720, Math.ceil(maxOptionChars * 8 + 30)));
    const rowHeight = isMatchingHeading ? 52 : 48;
    const titleHeight = (isMatchingHeading || isMatchingInfo) ? 44 : 0;
    const fixedBankHeight = Math.max(180, bankOptions.length * rowHeight + titleHeight + 16);
    const dropZoneWidth = isMatchingInfo ? `${fixedBankWidth}px` : '150px';

    // Gather all currently used options to highlight or disable them
    const usedOptions = (q.subQuestions || []).map(subQ => answers[subQ.id]).filter(Boolean);

    const renderBank = () => (
        <div className={`bank-section ${isMatchingHeading ? 'bank-heading' : ''} ${(isMatchingHeading || isMatchingInfo) ? 'bank-drop-target' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleBankDrop}
            style={(isMatchingHeading || isMatchingInfo)
                ? {
                    '--dd-bank-fixed-width': `${fixedBankWidth}px`,
                    '--dd-bank-fixed-height': `${fixedBankHeight}px`
                }
                : undefined}
        >
            {isMatchingHeading && <h4 className="bank-section-title">List of Headings</h4>}
            {isMatchingInfo && <h4 className="bank-section-title info-title">{q.rightHeader || 'Options'}</h4>}
            <div className="options-bank">
                {bankOptions.map((opt, idx) => {
                    const isUsed = usedOptions.includes(opt);
                    if (isUsed && !isReview) return null; // Ẩn heading đã được thả
                    return (
                        <div
                            key={idx}
                            draggable={!isReview}
                            onDragStart={(e) => { if (!isReview) handleDragStart(e, opt, null); }}
                            className={`bank-option ${isUsed ? 'used' : ''} ${isMatchingHeading ? 'bank-option-heading' : ''}`}
                            style={{
                                width: isMatchingInfo ? dropZoneWidth : undefined
                            }}
                        >
                            {opt}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderQuestions = () => (
        <div className={`dd-sub-questions ${isMatchingInfo ? 'dd-info-padded' : ''}`}>
            {isMatchingInfo && <h4 className="bank-section-title info-title">{q.leftHeader || 'Questions'}</h4>}
            <div className="dd-questions-list">
                {(q.subQuestions || []).map((subQ) => {
                    const isActive = activeQuestion === subQ.number;
                    const answer = answers[subQ.id];
                    const normalizedAnswer = String(answer || '').trim().toLowerCase();
                    const normalizedCorrect = String(subQ.correctAnswer || '').trim().toLowerCase();
                    const isCorrect = normalizedAnswer === normalizedCorrect;
                    const displayAnswer = (isReview && !isCorrect)
                        ? String(subQ.correctAnswer || '')
                        : String(answer || '');
                    const hasDisplayAnswer = displayAnswer.trim() !== '';

                    return (
                        <div
                            key={subQ.id}
                            id={`question-${subQ.number}`}
                            className={`dd-question-row ${isMatchingInfo ? 'dd-row-info' : 'dd-row-default'}`}
                            onClick={() => setActiveQuestion?.(subQ.number)}
                        >
                            {isMatchingInfo && subQ.text ? (
                                <div className="dd-info-text">
                                    {!isReview && (
                                        <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }} className="dd-bookmark-btn">
                                            <Bookmark size={18} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                                        </span>
                                    )}
                                    <span>{subQ.text}</span>
                                </div>
                            ) : null}

                            <div className="dd-default-meta">
                                {!isMatchingInfo && <div className="dd-default-label">
                                    {!isReview && (
                                        <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }} className="dd-bookmark-btn">
                                            <Bookmark size={18} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                                        </span>
                                    )}
                                    <span className="dd-question-num">{subQ.number}</span>
                                </div>}
                                {!isMatchingInfo && <span className="dd-question-text">{subQ.text}</span>}

                                <div
                                    onDrop={isReview ? undefined : (e) => handleDrop(e, subQ.id)}
                                    onDragOver={isReview ? undefined : handleDragOver}
                                    draggable={!isReview && hasDisplayAnswer}
                                    onDragStart={(e) => {
                                        if (isReview || !hasDisplayAnswer) return;
                                        handleDragStart(e, displayAnswer, subQ.id);
                                    }}
                                    className={`dd-drop-zone ${isMatchingInfo ? 'dd-drop-info' : ''} ${hasDisplayAnswer ? 'dd-drop-filled' : ''} ${isActive && !hasDisplayAnswer ? 'dd-drop-active' : ''} ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''} relative-pos`}
                                >
                                    {hasDisplayAnswer ? (
                                        <>
                                            <span className="dd-drop-answer">
                                                {displayAnswer}
                                            </span>
                                            {!isReview && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleClear(subQ.id); }}
                                                    className="dd-drop-clear"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        isMatchingInfo ? (
                                            <div className="dd-drop-number">
                                                {subQ.number}
                                            </div>
                                        ) : (
                                            <span className="dd-drop-placeholder">Drop here</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (isMatchingHeading) {
        return (
            <div className="drag-drop-group matching-heading">
                <p className="dd-heading-instruction">
                    Choose the correct heading for each section and move it into the gap.
                </p>
                {renderBank()}
            </div>
        );
    }

    if (isMatchingInfo) {
        return (
            <div className="drag-drop-group matching-info">
                <div className="dd-info-questions-col">
                    {renderQuestions()}
                </div>
                <div className="dd-info-bank-col">
                    {renderBank()}
                </div>
            </div>
        );
    }

    // Default drag-and-drop
    return (
        <div className="drag-drop-group">
            {renderBank()}
            {renderQuestions()}
        </div>
    );
};

export default DragDropGroupQuestion;
