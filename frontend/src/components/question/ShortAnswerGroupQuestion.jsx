import React from 'react';
import { isQuestionMetaLabel } from '../../utils/questionLabelUtils';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const normalizeComparableText = (htmlValue) => String(htmlValue || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([.,!?;:])\s*/g, '$1')
    .normalize('NFKC')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

const isLikelyDuplicateText = (leftValue, rightValue) => {
    if (!leftValue || !rightValue) return false;
    return leftValue === rightValue
        || leftValue.includes(rightValue)
        || rightValue.includes(leftValue);
};

const ShortAnswerGroupQuestion = ({
    q,
    activeQuestion,
    setActiveQuestion,
    answers,
    handleAnswerChange,
    inputRefs,
    bookmarks,
    toggleBookmark,
    isReview,
}) => {
    const subQuestions = Array.isArray(q?.subQuestions) ? [...q.subQuestions] : [];
    const validationOptions = q?.validationOptions || {};

    const titleHtml = formatTextWithWhitespace(q?.title || '');
    const instructionHtml = formatTextWithWhitespace(q?.groupInstruction || '');

    const hasRawTitle = titleHtml && !isQuestionMetaLabel(titleHtml);
    const hasRawInstruction = instructionHtml && !isQuestionMetaLabel(instructionHtml);

    const normalizedTitle = normalizeComparableText(titleHtml);
    const normalizedInstruction = normalizeComparableText(instructionHtml);
    const isTitleInstructionDuplicate = Boolean(normalizedTitle)
        && Boolean(normalizedInstruction)
        && isLikelyDuplicateText(normalizedTitle, normalizedInstruction);

    const editableRows = subQuestions.filter((row) => !row?.isSample);
    const rawStoredAnswers = answers?.[q.id];
    const storedAnswers = Array.isArray(rawStoredAnswers)
        ? rawStoredAnswers
        : (rawStoredAnswers == null || String(rawStoredAnswers).trim() === '' ? [] : [String(rawStoredAnswers)]);

    const normalizeAnswer = (value) => {
        let normalized = String(value || '').trim();
        if (validationOptions.ignoreCase !== false) normalized = normalized.toLowerCase();
        if (validationOptions.ignoreSpaces) normalized = normalized.replace(/\s+/g, '');
        if (validationOptions.ignorePunctuation) normalized = normalized.replace(/[.,!?;:'"()]/g, '');
        if (validationOptions.ignoreChars) {
            const chars = String(validationOptions.ignoreChars).split('');
            chars.forEach((char) => {
                normalized = normalized.split(char).join('');
            });
        }
        return normalized;
    };

    const checkAnswer = (userAnswer, correctAnswer) => {
        const normalizedUser = normalizeAnswer(userAnswer);
        const acceptedAnswers = String(correctAnswer || '')
            .split('|')
            .map((item) => normalizeAnswer(item))
            .filter(Boolean);

        if (acceptedAnswers.length === 0) return normalizedUser === '';
        return acceptedAnswers.includes(normalizedUser);
    };

    const getReviewAnswer = (correctAnswer) => {
        return String(correctAnswer || '')
            .split('|')
            .map((item) => item.trim())
            .find(Boolean) || '';
    };

    const updateEditableAnswer = (editableIndex, value) => {
        const nextAnswers = [...storedAnswers];
        nextAnswers[editableIndex] = value;
        handleAnswerChange?.(q.id, nextAnswers);
    };

    const resolveDisplayNumber = (row, fallbackIndex) => {
        if (row?.isSample) return null;

        const explicitNumber = Number(row?.displayNumber ?? row?.number);
        if (Number.isFinite(explicitNumber) && explicitNumber > 0) {
            return explicitNumber;
        }

        return fallbackIndex + 1;
    };

    const groupedQuestions = [];

    subQuestions.forEach((row, index) => {
        const promptHtml = formatTextWithWhitespace(row?.text || '');
        const promptKey = normalizeComparableText(promptHtml);

        const lastGroup = groupedQuestions[groupedQuestions.length - 1];
        const shouldMergeWithLast = Boolean(lastGroup) && Boolean(promptKey) && lastGroup.promptKey === promptKey;

        const targetGroup = shouldMergeWithLast
            ? lastGroup
            : {
                groupKey: row?.questionId ?? `group-${index}`,
                promptKey,
                promptHtml,
                rows: [],
            };

        if (!shouldMergeWithLast) {
            groupedQuestions.push(targetGroup);
        }

        targetGroup.rows.push({
            ...row,
            orderIndex: index,
        });
    });

    const firstPromptHtml = groupedQuestions[0]?.promptHtml || '';
    const firstPromptNormalized = normalizeComparableText(firstPromptHtml);

    const shouldRenderInstruction = Boolean(hasRawInstruction)
        && !isLikelyDuplicateText(normalizedInstruction, firstPromptNormalized);

    const shouldRenderTitle = Boolean(hasRawTitle)
        && !hasRawInstruction
        && !isTitleInstructionDuplicate
        && !isLikelyDuplicateText(normalizedTitle, firstPromptNormalized);

    if (!subQuestions.length) return null;

    return (
        <div className="short-answer-group-container">
            {shouldRenderTitle && (
                <div className="short-answer-title" dangerouslySetInnerHTML={{ __html: titleHtml }} />
            )}

            {shouldRenderInstruction && (
                <div className="short-answer-instruction" dangerouslySetInnerHTML={{ __html: instructionHtml }} />
            )}

            <ul className="short-answer-question-list">
                {groupedQuestions.map((group, groupIndex) => (
                    <li key={group.groupKey} className="short-answer-question-block">
                        {(() => {
                            const promptNormalized = normalizeComparableText(group.promptHtml);
                            const isPromptDuplicateHeader = Boolean(promptNormalized)
                                && (
                                    isLikelyDuplicateText(promptNormalized, normalizedTitle)
                                    || isLikelyDuplicateText(promptNormalized, normalizedInstruction)
                                );

                            if (!group.promptHtml || isPromptDuplicateHeader) {
                                return null;
                            }

                            return (
                                <div className="short-answer-question-prompt" dangerouslySetInnerHTML={{ __html: group.promptHtml }} />
                            );
                        })()}

                        <ul className="short-answer-row-list">
                            {group.rows.map((row, rowIndex) => {
                                const displayNumber = resolveDisplayNumber(row, rowIndex);
                                const isSample = Boolean(row?.isSample);
                                const editableIndex = isSample ? -1 : editableRows.findIndex((editableRow) => editableRow.id === row.id);
                                const currentAnswer = editableIndex >= 0 ? String(storedAnswers[editableIndex] || '') : '';
                                const rowCorrectAnswer = String(row?.answerText || row?.correctAnswer || '');
                                const isCorrect = isSample ? true : checkAnswer(currentAnswer, rowCorrectAnswer);
                                const displayAnswer = isSample
                                    ? rowCorrectAnswer
                                    : (isReview && !isCorrect ? getReviewAnswer(rowCorrectAnswer) : currentAnswer);
                                const isActive = displayNumber != null && activeQuestion === displayNumber;
                                const isBookmarked = displayNumber != null ? Boolean(bookmarks?.[displayNumber]) : false;

                                const itemKey = row?.id || `short-answer-${groupIndex}-${rowIndex}`;

                                return (
                                    <li
                                        key={itemKey}
                                        id={displayNumber != null ? `question-${displayNumber}` : itemKey}
                                        className={`fill-in-blank-item short-answer-row${isSample ? ' short-answer-row-sample' : ''}`}
                                        onClick={() => {
                                            if (!isSample && displayNumber != null) setActiveQuestion?.(displayNumber);
                                        }}
                                    >
                                        {!isReview && isActive && !isSample && displayNumber != null && (
                                            <BookmarkToggle
                                                className="question-bookmark"
                                                active={isBookmarked}
                                                onToggle={() => {
                                                    toggleBookmark?.(displayNumber);
                                                }}
                                            />
                                        )}

                                        <span className={`short-answer-prefix${displayNumber == null ? ' short-answer-prefix-sample' : ''}`} aria-hidden="true">
                                            <span className="short-answer-bullet">&bull;</span>
                                        </span>

                                        <span className="short-answer-row-content">
                                            {isSample ? (
                                                <span
                                                    className="short-answer-sample-text"
                                                    dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(displayAnswer || '') }}
                                                />
                                            ) : (
                                                <span
                                                    className={`inline-question short-answer-answer-wrap ${isActive ? 'active-question-input' : ''} ${isBookmarked ? 'bookmarked-question-input' : ''} relative-pos`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (!isSample && displayNumber != null) setActiveQuestion?.(displayNumber);
                                                    }}
                                                >
                                                    <input
                                                        ref={(element) => {
                                                            if (!inputRefs?.current || displayNumber == null) return;
                                                            inputRefs.current[displayNumber] = element;
                                                        }}
                                                        type="text"
                                                        className={`inline-input short-answer-input ${isReview && !isSample ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                                        placeholder={displayNumber != null ? String(displayNumber) : ''}
                                                        value={displayAnswer}
                                                        onChange={(event) => {
                                                            if (!isReview && !isSample && editableIndex >= 0) {
                                                                updateEditableAnswer(editableIndex, event.target.value);
                                                            }
                                                        }}
                                                        onFocus={() => {
                                                            if (!isReview && !isSample && displayNumber != null) setActiveQuestion?.(displayNumber);
                                                        }}
                                                        autoComplete="off"
                                                        spellCheck="false"
                                                        readOnly={isReview || isSample || editableIndex < 0}
                                                    />
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ShortAnswerGroupQuestion;
