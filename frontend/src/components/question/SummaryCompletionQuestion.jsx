import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const SummaryCompletionQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const instructionText = q.instruction || q.title;

    const normalizeBlankTokens = (text) => {
        let s = String(text || '');
        // Replace editor blank chips with [blank]
        s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
        // Normalize token form
        s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
        return s;
    };

    // Parse text to find placeholders like [blank] or [24]
    const renderParagraph = () => {
        if (!q.text) return null;

        const normalizedText = normalizeBlankTokens(q.text);

        const hasBlank = /\[blank\]/i.test(normalizedText);
        const parts = hasBlank
            ? normalizedText.split(/\[blank\]/gi)
            : normalizedText.split(/(\[\d+\])/g);

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
                const normalizedAnswer = String(answer || '').trim().toLowerCase();
                const normalizedCorrect = String(subQ?.correctAnswer || '').trim().toLowerCase();
                const isCorrect = normalizedAnswer === normalizedCorrect;
                const displayAnswer = (isReview && !isCorrect)
                    ? String(subQ?.correctAnswer || '')
                    : String(answer || '');

                blankIndex++; // Tăng index cho ô trống tiếp theo
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
                            <input
                                ref={(el) => { if (inputRefs?.current) inputRefs.current[qNum] = el; }}
                                type="text"
                                className={`inline-input summary-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                placeholder={qNum.toString()}
                                value={displayAnswer}
                                onChange={(e) => { if (!isReview) handleAnswerChange?.(qId, e.target.value); }}
                                onFocus={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                                autoComplete="off"
                                spellCheck="false"
                                readOnly={isReview}
                            />
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
                const normalizedAnswer = String(answer || '').trim().toLowerCase();
                const normalizedCorrect = String(subQ?.correctAnswer || '').trim().toLowerCase();
                const isCorrect = normalizedAnswer === normalizedCorrect;
                const displayAnswer = (isReview && !isCorrect)
                    ? String(subQ?.correctAnswer || '')
                    : String(answer || '');

                return (
                    <span
                        key={index}
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
                        <input
                            ref={(el) => { if (inputRefs?.current) inputRefs.current[qNum] = el; }}
                            type="text"
                            className={`inline-input summary-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                            placeholder={qNum.toString()}
                            value={displayAnswer}
                            onChange={(e) => { if (!isReview) handleAnswerChange?.(qId, e.target.value); }}
                            onFocus={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                            autoComplete="off"
                            spellCheck="false"
                            readOnly={isReview}
                        />
                    </span>
                );
            }
            return <span key={index} dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part) }} />;
        });
    };

    return (
        <div className="summary-completion-container">
            {instructionText && <p className="summary-title" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instructionText) }} />}
            <div className="summary-text">
                {renderParagraph()}
            </div>
        </div>
    );
};

export default SummaryCompletionQuestion;
