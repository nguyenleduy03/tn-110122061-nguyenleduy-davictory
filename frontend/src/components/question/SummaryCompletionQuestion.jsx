import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const SummaryCompletionQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const opts = q.validationOptions || {};

    const parseEmbeddedQuestionPayload = (rawText) => {
        if (typeof rawText !== 'string') return null;
        const candidate = rawText.trim();
        if (!candidate.startsWith('{') || !candidate.endsWith('}')) return null;

        try {
            const parsed = JSON.parse(candidate);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    };

    const cleanInstructionText = (value) => {
        let text = String(value || '').trim();
        if (!text) return '';

        // Some legacy payloads include wrapper fragments like rubricContent_xxx">...
        if (/rubricContent_/i.test(text) && text.includes('>')) {
            text = text.slice(text.indexOf('>') + 1).trim();
        }

        return text;
    };

    const payloadFromText = parseEmbeddedQuestionPayload(q?.text);
    const textToRender = payloadFromText?.noteText || payloadFromText?.text || q?.text || '';
    const instructionsText = cleanInstructionText(payloadFromText?.title || payloadFromText?.instructions || q?.instructions || '');

    const normalizeBlankTokens = (text) => {
        let s = String(text || '');
        // Replace editor blank chips with [blank]
        s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
        // Normalize token form
        s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
        return s;
    };

    const normalizeAnswer = (text) => {
        let s = String(text || '').trim();
        if (opts.ignoreCase !== false) s = s.toLowerCase();
        if (opts.ignoreSpaces) s = s.replace(/\s+/g, '');
        if (opts.ignorePunctuation) s = s.replace(/[.,!?;:'"()]/g, '');
        if (opts.ignoreChars) {
            const chars = opts.ignoreChars.split('');
            chars.forEach(c => { s = s.split(c).join(''); });
        }
        return s;
    };

    const checkAnswer = (userAnswer, correctAnswer) => {
        const normalized = normalizeAnswer(userAnswer);
        const acceptedAnswers = String(correctAnswer || '').split('|').map(a => normalizeAnswer(a));
        return acceptedAnswers.includes(normalized);
    };

    // Parse text to find placeholders like [blank] or [24]
    const renderParagraph = () => {
        if (!textToRender) return null;

        const normalizedText = normalizeBlankTokens(textToRender);

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
                const isCorrect = checkAnswer(answer, subQ?.correctAnswer);
                const displayAnswer = (isReview && !isCorrect)
                    ? String(subQ?.correctAnswer || '').split('|')[0]
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
                                <BookmarkToggle
                                    className="summary-bookmark"
                                    size={16}
                                    active={Boolean(bookmarks?.[qNum])}
                                    onToggle={() => toggleBookmark?.(qNum)}
                                />
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
                const isCorrect = checkAnswer(answer, subQ?.correctAnswer);
                const displayAnswer = (isReview && !isCorrect)
                    ? String(subQ?.correctAnswer || '').split('|')[0]
                    : String(answer || '');

                return (
                    <span
                        key={index}
                        id={`question-${qNum}`}
                        className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} relative-pos`}
                        onClick={() => setActiveQuestion?.(qNum)}
                    >
                        {!isReview && (
                            <BookmarkToggle
                                className="summary-bookmark"
                                size={16}
                                active={Boolean(bookmarks?.[qNum])}
                                onToggle={() => toggleBookmark?.(qNum)}
                            />
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
            {instructionsText && (
                <p className="summary-instructions" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instructionsText) }} />
            )}
            <div className="summary-text">
                {renderParagraph()}
            </div>
        </div>
    );
};

export default SummaryCompletionQuestion;
