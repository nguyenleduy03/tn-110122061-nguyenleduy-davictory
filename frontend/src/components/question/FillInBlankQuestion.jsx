import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const normalizedText = String(q.text || '')
        .replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '_______')
        .replace(/\[\s*blank\s*\]/gi, '_______');
    const parts = normalizedText ? normalizedText.split('_______') : [];
    const opts = q.validationOptions || {};

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
    const isCorrect = checkAnswer(answer, q.correctAnswer);
    const displayAnswer = (isReview && !isCorrect)
        ? String(q.correctAnswer || '').split('|')[0]
        : String(answer || '');

    if (parts.length < 2) return <li id={`question-${q.number}`} className="fill-in-blank-item">{!isReview && <BookmarkToggle className="fill-in-blank-bookmark" active={Boolean(bookmarks?.[q.number])} onToggle={() => toggleBookmark?.(q.number)} />}{q.text}</li>;

    return (
        <li id={`question-${q.number}`} className="fill-in-blank-item">
            {!isReview && (
                <BookmarkToggle
                    className="fill-in-blank-bookmark"
                    active={Boolean(bookmarks?.[q.number])}
                    onToggle={() => toggleBookmark?.(q.number)}
                />
            )}
            {parts[0]}
            <span
                className={`inline-question ${activeQuestion === q.number ? 'active-question-input' : ''} relative-pos`}
                onClick={() => setActiveQuestion?.(q.number)}
            >
                <input
                    ref={(el) => { if (inputRefs?.current) inputRefs.current[q.number] = el; }}
                    type="text"
                    className={`inline-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                    placeholder={q.questionNumber || q.number}
                    value={displayAnswer}
                    onChange={(e) => { if (!isReview) handleAnswerChange?.(q.id, e.target.value); }}
                    onFocus={() => { if (!isReview) setActiveQuestion?.(q.number); }}
                    autoComplete="off"
                    spellCheck="false"
                    readOnly={isReview}
                />
            </span>
            {parts[1]}
        </li>
    );
};

export default FillInBlankQuestion;
