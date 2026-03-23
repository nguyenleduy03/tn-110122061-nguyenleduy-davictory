import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const parts = q.text ? q.text.split('_______') : [];
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

    if (parts.length < 2) return <li id={`question-${q.number}`} className="fill-in-blank-item">{!isReview && <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} className="fill-in-blank-bookmark"><Bookmark size={18} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} /></span>}{q.text}</li>;

    return (
        <li id={`question-${q.number}`} className="fill-in-blank-item">
            {!isReview && (
                <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} className="fill-in-blank-bookmark">
                    <Bookmark size={18} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} />
                </span>
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
