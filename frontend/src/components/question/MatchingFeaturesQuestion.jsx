import React from 'react';
import { Bookmark } from 'lucide-react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

/**
 * MatchingFeaturesQuestion
 * Dạng câu hỏi học sinh chọn một chữ cái (A, B, C, ...) từ danh sách categories
 * cho mỗi item. Có thể chọn lại cùng một chữ cái cho nhiều câu.
 *
 * q.type = 'matching_features'
 * q.categories = [{ label: 'A', text: 'the Chinese' }, ...]
 * q.categoryTitle = 'First invented or used by'
 * q.instruction = 'Choose the correct group (A–E)...'
 * q.subQuestions = [{ id, number, text, correctAnswer }]
 */
const MatchingFeaturesQuestion = ({
    q,
    activeQuestion,
    setActiveQuestion,
    answers,
    handleAnswerChange,
    bookmarks,
    toggleBookmark,
    isReview,
}) => {
    const categories = q.categories || [];
    const subQuestions = q.subQuestions || [];
    const answerMap = answers || {};

    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const heading = q.heading
        || (minNum !== null && maxNum !== null
            ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}–${maxNum}`)
            : 'Questions');

    const instruction = q.instruction
        || `Choose the correct group (${categories.map((c) => c.label).join('–') || 'A–E'}) for each item. You may choose any group more than once.`;

    const handleSelect = (subQId, label) => {
        if (isReview) return;
        const current = answerMap[subQId];
        handleAnswerChange?.(subQId, current === label ? '' : label);
    };

    return (
        <div className="mf-container">
            {/* Heading + instruction */}
            <div className="question-header-container">
                <p className="question-heading">{heading}</p>
                <p
                    className="question-instruction"
                    dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instruction) }}
                />
            </div>

            {/* Categories reference table */}
            {categories.length > 0 && (
                <div className="mf-categories-box">
                    {q.categoryTitle && (
                        <div className="mf-category-title">{q.categoryTitle}</div>
                    )}
                    <div className="mf-category-list">
                        {categories.map((cat) => (
                            <div key={cat.label} className="mf-category-row">
                                <span className="mf-cat-label">{cat.label}</span>
                                <span className="mf-cat-text">{cat.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Questions table */}
            <div className="mf-table-wrap">
                <table className="mf-table">
                    <thead>
                        <tr className="mf-header-row">
                            {/* Empty cell for question number + text */}
                            <th className="mf-th-item"></th>
                            {categories.map((cat) => (
                                <th key={cat.label} className="mf-th-cat">{cat.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {subQuestions.map((subQ) => {
                            const isActive = activeQuestion === subQ.number;
                            const selectedLabel = answerMap[subQ.id] || '';
                            const isCorrect = String(selectedLabel).trim() === String(subQ.correctAnswer || '').trim();

                            return (
                                <tr
                                    key={subQ.id}
                                    id={`question-${subQ.number}`}
                                    className={`mf-question-row ${isActive ? 'mf-row-active' : ''}`}
                                    onClick={() => setActiveQuestion?.(subQ.number)}
                                >
                                    {/* Item cell: bookmark + number + text */}
                                    <td className="mf-td-item">
                                        <div className="mf-item-inner">
                                            {!isReview && (
                                                <span
                                                    className="mf-bookmark-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleBookmark?.(subQ.number);
                                                    }}
                                                >
                                                    <Bookmark
                                                        size={15}
                                                        fill={bookmarks?.[subQ.number] ? '#1a73e8' : 'none'}
                                                        color={bookmarks?.[subQ.number] ? '#1a73e8' : '#bbb'}
                                                    />
                                                </span>
                                            )}
                                            <span className="mf-q-num">{subQ.number}</span>
                                            <span
                                                className="mf-q-text"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatTextWithWhitespace(subQ.text || '')
                                                }}
                                            />
                                        </div>
                                    </td>

                                    {/* Category choice cells */}
                                    {categories.map((cat) => {
                                        const isSelected = selectedLabel === cat.label;
                                        const isCorrectCell = isReview && cat.label === String(subQ.correctAnswer || '').trim();
                                        const isWrongCell = isReview && isSelected && !isCorrect;

                                        let cellClass = 'mf-choice-cell';
                                        if (isSelected && !isReview) cellClass += ' mf-selected';
                                        if (isCorrectCell) cellClass += ' mf-review-correct';
                                        if (isWrongCell) cellClass += ' mf-review-wrong';
                                        // Also show selected (even in review) for the chosen cell
                                        if (isReview && isSelected && isCorrect) cellClass += ' mf-review-correct';

                                        return (
                                            <td
                                                key={cat.label}
                                                className={cellClass}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(subQ.id, cat.label);
                                                }}
                                                title={isReview ? undefined : `Chọn ${cat.label}`}
                                            >
                                                {isSelected && (
                                                    <span className="mf-check-mark">
                                                        {isReview
                                                            ? (isCorrect ? '✓' : '✗')
                                                            : '✓'}
                                                    </span>
                                                )}
                                                {isReview && isCorrectCell && !isSelected && (
                                                    <span className="mf-correct-hint">✓</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MatchingFeaturesQuestion;
