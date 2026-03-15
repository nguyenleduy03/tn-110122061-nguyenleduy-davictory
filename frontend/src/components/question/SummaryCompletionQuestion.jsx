import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const SummaryCompletionQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {

    // Parse text to find placeholders like [blank] or [24]
    const renderParagraph = () => {
        if (!q.text) return null;

        const hasBlank = /\[blank\]/i.test(q.text);
        const parts = hasBlank
            ? q.text.split(/\[blank\]/gi)
            : q.text.split(/(\[\d+\])/g);

        let blankIndex = 0; // Đếm ô trống từ 0

        return parts.map((part, index) => {
            if (hasBlank) {
                if (index >= parts.length - 1) {
                    return <span key={index} dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part) }} />;
                }

                const subQ = q.subQuestions?.[blankIndex];
                const qNum = subQ?.number ?? blankIndex + 1;
                const qId = subQ ? subQ.id : `q${qNum}`;
                const isActive = activeQuestion === qNum;
                const answer = answers?.[qId] || '';

                blankIndex++; // Tăng index cho ô trống tiếp theo

                return (
                    <span key={index}>
                        <span dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part) }} />
                        <span
                            className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} relative-pos`}
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
                                className={`inline-input summary-input ${isReview ? (answer?.trim().toLowerCase() === subQ?.correctAnswer?.trim().toLowerCase() ? 'review-correct' : 'review-wrong') : ''}`}
                                placeholder={qNum.toString()}
                                value={answer}
                                onChange={(e) => { if (!isReview) handleAnswerChange?.(qId, e.target.value); }}
                                onFocus={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                                autoComplete="off"
                                spellCheck="false"
                                readOnly={isReview}
                            />
                            {isReview && answer?.trim().toLowerCase() !== subQ?.correctAnswer?.trim().toLowerCase() && (
                                <span className="review-correct-label">
                                    <span dangerouslySetInnerHTML={{ __html: subQ?.correctAnswer }} />
                                </span>
                            )}
                        </span>
                    </span>
                );
            }

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
                        className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} relative-pos`}
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
                            className={`inline-input summary-input ${isReview ? (answer?.trim().toLowerCase() === subQ?.correctAnswer?.trim().toLowerCase() ? 'review-correct' : 'review-wrong') : ''}`}
                            placeholder={qNum.toString()}
                            value={answer}
                            onChange={(e) => { if (!isReview) handleAnswerChange?.(qId, e.target.value); }}
                            onFocus={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                            autoComplete="off"
                            spellCheck="false"
                            readOnly={isReview}
                        />
                        {isReview && answer?.trim().toLowerCase() !== subQ?.correctAnswer?.trim().toLowerCase() && (
                            <span className="review-correct-label">
                                <span dangerouslySetInnerHTML={{ __html: subQ?.correctAnswer }} />
                            </span>
                        )}
                    </span>
                );
            }
            return <span key={index} dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part) }} />;
        });
    };

    return (
        <div className="summary-completion-container">
            {q.title && <p className="summary-title" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.title) }} />}
            <div className="summary-text">
                {renderParagraph()}
            </div>
        </div>
    );
};

export default SummaryCompletionQuestion;
