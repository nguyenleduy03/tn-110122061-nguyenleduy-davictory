import React from 'react';
import { Bookmark } from 'lucide-react';

const ImageDragDropQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    // Collect used options so they disappear from bank or look disabled
    const usedOptions = Object.values(answers || {});
    const numbers = (q.subQuestions || []).map((subQ) => subQ.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const fallbackHeading = (minNum !== null && maxNum !== null)
        ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}\u2013${maxNum}`)
        : '';
    const heading = q.heading || fallbackHeading;
    const instruction = q.instruction || '';
    const imageWidth = Number.isFinite(Number(q.imageWidth)) ? Number(q.imageWidth) : 100;
    const pinBoxWidth = Number.isFinite(Number(q.pinBoxWidth)) ? Number(q.pinBoxWidth) : 60;
    const constrainHalfPage = Boolean(q.constrainHalfPage);

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

            {(heading || instruction) && (
                <div className="question-header-container">
                    {heading && (
                        <p className="question-heading">
                            {heading}
                        </p>
                    )}
                    {instruction && (
                        <div className="question-instruction" dangerouslySetInnerHTML={{ __html: instruction }} />
                    )}
                </div>
            )}

            <div className="image-drag-drop-body">
                {/* Left side: Image and Drop nodes */}
                <div className={`image-area${constrainHalfPage ? ' half-page' : ''}`}>
                    {/* Fallback text if no image provided in mock data */}
                    {q.imageUrl ? (
                        <img src={q.imageUrl} alt="Map" className="idd-map-image" style={{ width: `${imageWidth}%` }} />
                    ) : (
                        <div className="image-placeholder">
                            Image Placeholder (Add imageUrl to data)
                        </div>
                    )}

                    {/* Render Drop Zones on top of the image */}
                    {(q.subQuestions || []).map((subQ) => {
                        const answer = answers[subQ.id];
                        const normalizedAnswer = String(answer || '').trim().toLowerCase();
                        const normalizedCorrect = String(subQ.correctAnswer || '').trim().toLowerCase();
                        const isCorrect = normalizedAnswer === normalizedCorrect;
                        const displayAnswer = (isReview && !isCorrect)
                            ? String(subQ.correctAnswer || '')
                            : String(answer || '');
                        const hasAnswer = displayAnswer.trim() !== '';
                        const isActive = activeQuestion === subQ.number;

                        return (
                            <div
                                key={subQ.id}
                                className={`drop-zone ml-drop-zone ${isActive ? 'active' : ''} ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                onClick={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                                onDrop={isReview ? undefined : (e) => handleDrop(e, subQ.id)}
                                onDragOver={isReview ? undefined : handleDragOver}
                                style={{
                                    top: subQ.top || '50%',
                                    left: subQ.left || '50%',
                                    width: `${pinBoxWidth}px`,
                                    minWidth: `${pinBoxWidth}px`
                                }}
                            >
                                {/* Bookmark Icon */}
                                {!isReview && (
                                    <span
                                        className="drop-zone-bookmark"
                                        onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }}
                                    >
                                        <Bookmark size={18} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                                    </span>
                                )}

                                {/* Number label */}
                                <strong className={`drop-zone-number${hasAnswer ? ' with-answer' : ''}`}>{subQ.number}</strong>

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
                                        {displayAnswer}
                                        {!isReview && (
                                            <span
                                                className="dz-clear"
                                                onClick={(e) => { e.stopPropagation(); handleClear(subQ.id); }}
                                            >
                                                ×
                                            </span>
                                        )}
                                    </div>
                                ) : null}
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
                    {q.rightTitle && (
                        <div className="dd-bank-title" dangerouslySetInnerHTML={{ __html: q.rightTitle }} />
                    )}
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

        </div>
    );
};

export default ImageDragDropQuestion;
