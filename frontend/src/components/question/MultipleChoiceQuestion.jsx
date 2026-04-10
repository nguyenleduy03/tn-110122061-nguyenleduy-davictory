import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';

const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    const isImageLikeText = (text) => {
        const value = String(text || '').trim();
        if (!value) return false;
        return value.includes('<img')
            || value.startsWith('/api/files/preview/')
            || /^https?:\/\//i.test(value)
            || (value.startsWith('/') && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value));
    };

    const getOptionImageUrl = (opt) => {
        if (opt && typeof opt === 'object') {
            const rawUrl = opt.optionImageUrl || opt.imageUrl || opt.url || '';
            return String(rawUrl || '').trim();
        }
        return '';
    };

    const getOptionText = (opt) => {
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object') {
            return opt.optionText
                || opt.text
                || opt.value
                || opt.label
                || opt.optionLabel
                || '';
        }
        return String(opt ?? '');
    };

    const getOptionValue = (opt) => {
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object') {
            const optionImageUrl = getOptionImageUrl(opt);
            const value = opt.value
                || opt.optionValue
                || opt.optionText
                || opt.text
                || opt.label
                || opt.optionLabel
                || (optionImageUrl ? opt.optionLabel || optionImageUrl : '');
            return String(value || '');
        }
        return String(opt ?? '');
    };

    const nums = q.numberRange || [q.number];
    const isActive = nums.includes(activeQuestion);
    const isMultiple = q.allowMultipleAnswers;
    const selectCount = q.selectCount || 0;
    const isRange = nums.length > 1;
    const numberLabel = isRange ? `${nums[0]}-${nums[nums.length - 1]}` : String(q.number);
    const selectedAnswers = isMultiple ? (Array.isArray(answer) ? answer : []) : answer;
    const isFull = isMultiple && selectCount > 0 && selectedAnswers.length >= selectCount;
    const hasGroupInstruction = isMultiple && q.groupInstruction;

    // Check if options contain images (either URL strings or HTML with <img>)
    const hasImageOptions = q.options && q.options.some(opt => {
        const optionImageUrl = getOptionImageUrl(opt);
        if (optionImageUrl) return true;
        return isImageLikeText(getOptionText(opt));
    });

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
            <div
                className="tfng-question relative-pos"
                onClick={() => setActiveQuestion?.(q.number)}
                onFocus={() => setActiveQuestion?.(q.number)}
            >
                <div className="tfng-text">
                    {!isReview && isActive && (
                        <BookmarkToggle
                            className="question-bookmark"
                            active={nums.some(n => bookmarks?.[n])}
                            onToggle={() => nums.forEach(n => toggleBookmark?.(n))}
                        />
                    )}
                    <div className="tfng-question-content">
                        <span className="tfng-number">{numberLabel}</span>
                        <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.text) || '' }} />
                    </div>
                </div>
                <div className="mcq-image-grid">
                    {q.options && q.options.map((opt, idx) => {
                        const optionText = getOptionText(opt);
                        const optionValue = getOptionValue(opt);
                        const optionImageUrl = getOptionImageUrl(opt);
                        const optLabel = String.fromCharCode(65 + idx); // A, B, C...
                        const isChecked = isMultiple ? selectedAnswers.includes(optionValue) : selectedAnswers === optionValue;
                        const isDisabled = (isMultiple && isFull && !isChecked) || isReview;

                        let reviewClass = '';
                        if (isReview) {
                            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                            const normalizedOpt = String(optionValue).trim().toLowerCase();
                            const isCorrectOpt = correctArr.some(ans => String(ans).trim().toLowerCase() === normalizedOpt);
                            if (isCorrectOpt) reviewClass = 'mcq-image-correct';
                            else if (isChecked) reviewClass = 'mcq-image-wrong';
                        }

                        return (
                            <label
                                key={idx}
                                className={`mcq-image-option${isChecked ? ' mcq-image-selected' : ''} ${reviewClass}`}
                                style={{ opacity: (isDisabled && !isReview) ? 0.5 : 1 }}
                                onClick={() => !isDisabled && handleChange(optionValue)}
                            >
                                {optionImageUrl
                                    ? (
                                        <div className="mcq-image-img-wrap">
                                            <img src={resolveDrivePreviewUrl(optionImageUrl)} alt={`Option ${optLabel}`} />
                                        </div>
                                    )
                                    : (isImageLikeText(optionText)
                                        ? (
                                            <div
                                                className="mcq-image-img-wrap"
                                                dangerouslySetInnerHTML={{ __html: optionText.includes('<img') ? optionText : `<img src="${resolveDrivePreviewUrl(optionText)}" alt="Option ${optLabel}" />` }}
                                            />
                                        )
                                        : <span dangerouslySetInnerHTML={{ __html: optionText }} />)
                                }
                                <div className="mcq-image-radio">
                                    <input
                                        type={isMultiple ? "checkbox" : "radio"}
                                        name={`q-${q.id}`}
                                        value={String(idx)}
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => handleChange(optionValue)}
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
        <div
            className="tfng-question relative-pos"
            onClick={() => setActiveQuestion?.(q.number)}
            onFocus={() => setActiveQuestion?.(q.number)}
        >
            <div className="tfng-text">
                {!isReview && isActive && (
                    <BookmarkToggle
                        className="question-bookmark"
                        active={nums.some(n => bookmarks?.[n])}
                        onToggle={() => nums.forEach(n => toggleBookmark?.(n))}
                    />
                )}
                <div className="tfng-question-content">
                    <span className="tfng-number">{numberLabel}</span>
                    <span className="tfng-question-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(q.text) || '' }} />
                </div>
            </div>
            <div className="tfng-options">
                {q.options && q.options.map((opt, idx) => {
                    const optionText = getOptionText(opt);
                    const optionValue = getOptionValue(opt);
                    const isChecked = isMultiple ? selectedAnswers.includes(optionValue) : selectedAnswers === optionValue;
                    const isDisabled = (isMultiple && isFull && !isChecked) || isReview;

                    let reviewClass = '';
                    if (isReview) {
                        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                        const normalizedOpt = String(optionValue).trim().toLowerCase();
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
                                value={optionValue}
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleChange(optionValue)}
                            />
                            <span className="opt-text" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(optionText || '') }} />
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoiceQuestion;
