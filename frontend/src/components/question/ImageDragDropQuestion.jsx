import React from 'react';
import { Bookmark } from 'lucide-react';

const ImageDragDropQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    // Collect used options so they disappear from bank or look disabled
    const usedOptions = Object.values(answers || {});

    const handleDragStart = (e, option) => {
        e.dataTransfer.setData('text/plain', option);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragStartFromZone = (e, option, sourceQId) => {
        e.dataTransfer.setData('text/plain', option);
        e.dataTransfer.setData('sourceQId', sourceQId);
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
            // If moved from another dropzone, clear the old one
            if (sourceQId && sourceQId !== String(subQId)) {
                handleAnswerChange(sourceQId, '');
            }
        }
    };

    const handleBankDrop = (e) => {
        e.preventDefault();
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (sourceQId) {
            handleAnswerChange(sourceQId, ''); // remove from zone -> return to bank
        }
    };

    const handleClear = (subQId) => {
        handleAnswerChange(subQId, '');
    };

    return (
        <div className="image-drag-drop-container">

            {/* Left side: Image and Drop nodes */}
            <div className="image-area">
                {/* Fallback text if no image provided in mock data */}
                {q.imageUrl ? (
                    <img src={q.imageUrl} alt="Map" className="idd-map-image" />
                ) : (
                    <div className="image-placeholder">
                        Image Placeholder (Add imageUrl to data)
                    </div>
                )}

                {/* Render Drop Zones on top of the image */}
                {(q.subQuestions || []).map((subQ) => {
                    const answer = answers[subQ.id];
                    const isActive = activeQuestion === subQ.number;

                    return (
                        <div
                            key={subQ.id}
                            className={`drop-zone ${isActive ? 'active' : ''} ${isReview ? (answer?.trim() === subQ.correctAnswer?.trim() ? 'review-correct' : 'review-wrong') : ''}`}
                            onClick={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                            onDrop={isReview ? undefined : (e) => handleDrop(e, subQ.id)}
                            onDragOver={isReview ? undefined : handleDragOver}
                            style={{
                                top: subQ.top || '50%',   // Dynamic inline needed
                                left: subQ.left || '50%', // Dynamic inline needed
                            }}
                        >
                            {/* Bookmark Icon */}
                            <span
                                className="drop-zone-bookmark"
                                onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }}
                            >
                                <Bookmark size={18} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                            </span>

                            {/* Number label */}
                            <strong className="drop-zone-number">{subQ.number}</strong>

                            {/* Dropped Answer */}
                            {answer ? (
                                <div
                                    className="dz-answered"
                                    draggable={!isReview}
                                    onDragStart={(e) => {
                                        if (isReview) return;
                                        handleDragStartFromZone(e, answer, subQ.id)
                                    }}
                                >
                                    {answer}
                                    {!isReview && (
                                        <span
                                            className="dz-clear"
                                            onClick={(e) => { e.stopPropagation(); handleClear(subQ.id); }}
                                        >
                                            ×
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="dz-placeholder">Drop here</div>
                            )}
                            {isReview && answer?.trim() !== subQ.correctAnswer?.trim() && (
                                <div className="review-correct-label" style={{ position: 'absolute', bottom: '-20px', left: 0, whiteSpace: 'nowrap', backgroundColor: 'rgba(255,255,255,0.8)', padding: '2px 4px', borderRadius: '4px' }}>
                                    ({subQ.correctAnswer})
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Right side: Options Bank */}
            <div
                className="bank-area"
                onDragOver={handleDragOver}
                onDrop={handleBankDrop}
            >
                <div className="bank-options-list">
                    {q.bankOptions.map((opt, idx) => {
                        const isUsed = usedOptions.includes(opt);
                        if (isUsed) return null; // Hide if used

                        return (
                            <div
                                key={idx}
                                className="bank-option-item"
                                draggable={!isReview}
                                onDragStart={(e) => { if (!isReview) handleDragStart(e, opt); }}
                            >
                                {opt}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default ImageDragDropQuestion;
