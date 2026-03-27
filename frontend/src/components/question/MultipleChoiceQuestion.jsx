import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    const nums = q.numberRange || [q.number];
    const isActive = nums.includes(activeQuestion);
    const isMultiple = q.allowMultipleAnswers;
    const selectCount = q.selectCount || 0;
    const selectedAnswers = isMultiple ? (Array.isArray(answer) ? answer : []) : answer;
    const isFull = isMultiple && selectCount > 0 && selectedAnswers.length >= selectCount;
    const hasGroupInstruction = isMultiple && q.groupInstruction;

    // Check if options contain images (either URL strings or HTML with <img>)
    const hasImageOptions = q.options && q.options.some(opt =>
        typeof opt === 'string' && (
            opt.includes('<img') ||
            opt.startsWith('http') ||
            (opt.startsWith('/') && opt.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))
        )
    );

    const handleChange = (opt) => {
        if (!handleAnswerChange || isReview) return;
        if (isMultiple) {
            let newAnswers = [...selectedAnswers];
            if (newAnswers.includes(opt)) {
                newAnswers = newAnswers.filter(a => a !== opt);
            } else {
                if (selectCount > 0 && newAnswers.length >= selectCount) return;
                newAnswers.push(opt);
            }
            handleAnswerChange(q.id, newAnswers);
        } else {
            handleAnswerChange(q.id, opt);
        }
    };

    // Image-based MCQ layout (like IELTS Listening image selection)
    if (hasImageOptions) {
        return (
            <div className="tfng-question relative-pos">
                <div className="tfng-text">
                    {!isReview && (
                        <span className="tfng-bookmark" onClick={(e) => { e.stopPropagation(); nums.forEach(n => toggleBookmark?.(n)); }}>
                            <Bookmark size={18} fill={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "none"} color={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "#ccc"} />
                        </span>
                    )}
                    <div className="tfng-question-content">
                        <span className="tfng-number">{q.number}</span>
                        <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.text) || '' }} />
                    </div>
                </div>
                <div className="mcq-image-grid">
                    {q.options && q.options.map((opt, idx) => {
                        const optLabel = String.fromCharCode(65 + idx); // A, B, C...
                        const isChecked = isMultiple ? selectedAnswers.includes(opt) : selectedAnswers === opt;
                        const isDisabled = (isMultiple && isFull && !isChecked) || isReview;

                        let reviewClass = '';
                        if (isReview) {
                            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                            const normalizedOpt = String(opt).trim().toLowerCase();
                            const isCorrectOpt = correctArr.some(ans => String(ans).trim().toLowerCase() === normalizedOpt);
                            if (isCorrectOpt) reviewClass = 'mcq-image-correct';
                            else if (isChecked) reviewClass = 'mcq-image-wrong';
                        }

                        return (
                            <label
                                key={idx}
                                className={`mcq-image-option${isChecked ? ' mcq-image-selected' : ''} ${reviewClass}`}
                                style={{ opacity: (isDisabled && !isReview) ? 0.5 : 1 }}
                                onClick={() => !isDisabled && handleChange(opt)}
                            >
                                {opt.includes('<img') || opt.startsWith('http') || opt.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
                                    ? (
                                        <div
                                            className="mcq-image-img-wrap"
                                            dangerouslySetInnerHTML={{ __html: opt.includes('<img') ? opt : `<img src="${opt}" alt="Option ${optLabel}" />` }}
                                        />
                                    )
                                    : <span dangerouslySetInnerHTML={{ __html: opt }} />
                                }
                                <div className="mcq-image-radio">
                                    <input
                                        type={isMultiple ? "checkbox" : "radio"}
                                        name={`q-${q.id}`}
                                        value={String(idx)}
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => handleChange(opt)}
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Text-based MCQ layout (original)
    return (
        <div className="tfng-question relative-pos">
            <div className="tfng-text">
                {!isReview && (
                    <span className="tfng-bookmark" onClick={(e) => { e.stopPropagation(); nums.forEach(n => toggleBookmark?.(n)); }} >
                        <Bookmark size={18} fill={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "none"} color={nums.some(n => bookmarks?.[n]) ? "#1a73e8" : "#ccc"} />
                    </span>
                )}
                <div className="tfng-question-content">
                    <span className="tfng-number">{q.number}</span>
                    <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.text) || '' }} />
                </div>
            </div>
            <div className="tfng-options">
                {q.options && q.options.map((opt, idx) => {
                    const isChecked = isMultiple ? selectedAnswers.includes(opt) : selectedAnswers === opt;
                    const isDisabled = (isMultiple && isFull && !isChecked) || isReview;

                    let reviewClass = '';
                    if (isReview) {
                        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                        const normalizedOpt = String(opt).trim().toLowerCase();
                        const isCorrectOpt = correctArr.some(ans => String(ans).trim().toLowerCase() === normalizedOpt);

                        if (isCorrectOpt) {
                            reviewClass = 'review-choice-correct';
                        } else if (isChecked) {
                            reviewClass = 'review-choice-wrong';
                        }
                    }

                    return (
                        <label
                            key={idx}
                            className={`tfng-radio-label${isChecked ? ' tfng-option-selected' : ''} ${reviewClass}`}
                            style={{
                                opacity: (isDisabled && !isReview) ? 0.4 : 1
                            }}
                        >
                            <input
                                type={isMultiple ? "checkbox" : "radio"}
                                name={`q-${q.id}`}
                                value={opt}
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleChange(opt)}
                            />
                            <span className="opt-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(opt || '') }} />
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoiceQuestion;
