import React from 'react';
import { Bookmark } from 'lucide-react';

const DragDropGroupQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark }) => {
    const handleDragStart = (e, option) => {
        e.dataTransfer.setData('text/plain', option);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, subQId) => {
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
    const maxOptionChars = Math.max(0, ...(q.bankOptions || []).map(opt => String(opt).length));
    const dropZoneWidth = isMatchingInfo ? `max(150px, ${maxOptionChars * 8 + 30}px)` : '150px';

    // Gather all currently used options to highlight or disable them
    const usedOptions = (q.subQuestions || []).map(subQ => answers[subQ.id]).filter(Boolean);

    const renderBank = () => (
        <div className={`bank-section ${isMatchingHeading ? 'bank-heading' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleBankDrop}>
            {isMatchingHeading && <h4 className="bank-section-title">List of Headings</h4>}
            {isMatchingInfo && <h4 className="bank-section-title info-title">{q.rightHeader || 'Options'}</h4>}
            <div className="options-bank">
                {q.bankOptions.map((opt, idx) => {
                    const isUsed = usedOptions.includes(opt);
                    return (
                        <div
                            key={idx}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, opt)}
                            className={`bank-option ${isUsed ? 'used' : ''} ${isMatchingHeading ? 'bank-option-heading' : ''}`}
                            style={{
                                display: isUsed ? 'none' : 'inline-flex',
                                height: '32px',
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

                    return (
                        <div
                            key={subQ.id}
                            id={`question-${subQ.number}`}
                            className={`dd-question-row ${isMatchingInfo ? 'dd-row-info' : 'dd-row-default'}`}
                            onClick={() => setActiveQuestion?.(subQ.number)}
                        >
                            {isMatchingInfo && subQ.text ? (
                                <div className="dd-info-text">
                                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }} className="dd-bookmark-btn">
                                        <Bookmark size={15} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                                    </span>
                                    <span>{subQ.text}</span>
                                </div>
                            ) : null}

                            <div className="dd-default-meta">
                                {!isMatchingInfo && <div className="dd-default-label">
                                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }} className="dd-bookmark-btn">
                                        <Bookmark size={15} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                                    </span>
                                    <span className="dd-question-num">{subQ.number}</span>
                                </div>}
                                {!isMatchingInfo && <span className="dd-question-text">{subQ.text}</span>}

                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, subQ.id)}
                                    className={`dd-drop-zone ${isMatchingInfo ? 'dd-drop-info' : ''} ${answer ? 'dd-drop-filled' : ''} ${isActive && !answer ? 'dd-drop-active' : ''}`}
                                    style={{ minWidth: dropZoneWidth, width: dropZoneWidth }}
                                >
                                    {answer ? (
                                        <>
                                            <span
                                                draggable={true}
                                                onDragStart={(e) => {
                                                    handleDragStart(e, answer);
                                                    e.dataTransfer.setData('sourceQId', subQ.id);
                                                }}
                                                className="dd-drop-answer"
                                            >
                                                {answer}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleClear(subQ.id); }}
                                                className="dd-drop-clear"
                                            >
                                                ×
                                            </button>
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
