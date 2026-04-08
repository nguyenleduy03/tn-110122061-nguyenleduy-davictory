import React from 'react';
import FillInBlankQuestion from './FillInBlankQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TFNGQuestion from './TFNGQuestion';
import DragDropGroupQuestion from './DragDropGroupQuestion';
import SummaryCompletionQuestion from './SummaryCompletionQuestion';
import SummaryCompletionSelectQuestion from './SummaryCompletionSelectQuestion';
import DropdownGroupQuestion from './DropdownGroupQuestion';
import MatchingFillQuestion from './MatchingFillQuestion';
import ShortAnswerGroupQuestion from './ShortAnswerGroupQuestion';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';
import BookmarkToggle from '../common/BookmarkToggle';

const normalizeQuestionType = (rawType) => {
    const normalized = String(rawType || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');

    switch (normalized) {
        case 'fill_in_the_blank': return 'fill-in-the-blank';
        case 'multiple_choice': return 'multiple-choice';
        case 'summary_completion': return 'summary-completion';
        case 'summary_completion_select': return 'summary-completion-select';
        case 'note_completion': return 'note-completion';
        case 'table_completion': return 'table-completion';
        case 'image_drag_drop': return 'image-drag-drop';
        case 'matching_headings':
        case 'matching_heading':
        case 'matching_para':
            return 'matching_heading';
        case 'matching_information':
        case 'matching_info':
            return 'matching_info';
        case 'matching_feature':
        case 'matching_features':
        case 'matchingfeatures':
            return 'matching_features';
        case 'drag_and_drop':
        case 'drag_and_drop_group':
        case 'drag_drop_group':
        case 'draganddropgroup':
            return 'drag_drop_group';
        case 'mcq_dropdown_group':
        case 'shared_options_dropdown':
            return 'mcq_dropdown_group';
        case 'short_answer_group':
        case 'short_answer':
            return 'short-answer-group';
        default:
            return normalized;
    }
};

const resolveImageWidthPercent = (value, fallback = 100) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace('%', '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const QuestionRenderer = ({ q, activeQuestion, setActiveQuestion, answers, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    if (!q) return null;
    const normalizedType = normalizeQuestionType(q.type);

    if (normalizedType === 'mcq_dropdown_group') {
        return (
            <DropdownGroupQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answers={answers || {}}
                handleAnswerChange={handleAnswerChange}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'fill-in-the-blank') {
        return (
            <FillInBlankQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answer={answer !== undefined ? answer : answers?.[q.id]}
                handleAnswerChange={handleAnswerChange}
                inputRefs={inputRefs}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'multiple-choice') {
        return (
            <MultipleChoiceQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answer={answer !== undefined ? answer : answers?.[q.id]}
                handleAnswerChange={handleAnswerChange}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'tfng') {
        return (
            <TFNGQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answer={answer !== undefined ? answer : answers?.[q.id]}
                handleAnswerChange={handleAnswerChange}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'ynng') {
        return (
            <TFNGQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answer={answer !== undefined ? answer : answers?.[q.id]}
                handleAnswerChange={handleAnswerChange}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
                customOptions={['YES', 'NO', 'NOT GIVEN']}
            />
        );
    }

    if (
        normalizedType === 'drag_drop_group'
        || normalizedType === 'matching_heading'
        || normalizedType === 'matching_info'
        || normalizedType === 'matching_features'
        || normalizedType === 'flow_chart'
        || normalizedType === 'image-drag-drop'
    ) {
        return (
            <DragDropGroupQuestion
                q={q}
                resolvedType={normalizedType}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answers={answers || {}}
                handleAnswerChange={handleAnswerChange}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'matching_fillable' || normalizedType === 'matching_fill') {
        return (
            <MatchingFillQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answers={answers || {}}
                handleAnswerChange={handleAnswerChange}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'short-answer-group') {
        return (
            <ShortAnswerGroupQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answers={answers || {}}
                handleAnswerChange={handleAnswerChange}
                inputRefs={inputRefs}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'summary-completion' || normalizedType === 'note-completion') {
        const shouldRenderStandaloneImage = q.imageUrl && !q.imagePosition;
        return (
            <>
                {shouldRenderStandaloneImage && (
                    <div className="summary-completion-image-standalone-wrap">
                        <img
                            src={resolveDrivePreviewUrl(q.imageUrl)}
                            alt="Question diagram"
                            className="summary-completion-image"
                        />
                    </div>
                )}
                <SummaryCompletionQuestion
                    q={q}
                    activeQuestion={activeQuestion}
                    setActiveQuestion={setActiveQuestion}
                    answers={answers || {}}
                    handleAnswerChange={handleAnswerChange}
                    inputRefs={inputRefs}
                    bookmarks={bookmarks}
                    toggleBookmark={toggleBookmark}
                    isReview={isReview}
                />
            </>
        );
    }

    if (normalizedType === 'summary-completion-select') {
        return (
            <SummaryCompletionSelectQuestion
                q={q}
                activeQuestion={activeQuestion}
                setActiveQuestion={setActiveQuestion}
                answers={answers || {}}
                handleAnswerChange={handleAnswerChange}
                inputRefs={inputRefs}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                isReview={isReview}
            />
        );
    }

    if (normalizedType === 'table-completion') {
        const columns = q.columns || [];
        const tableRows = q.tableRows || [];
        const subQuestions = q.subQuestions || [];
        const answerMap = answers || answer || {};
        const opts = q.validationOptions || {};

        const tableContainerRef = React.useRef(null);
        const [tableBookmarkTop, setTableBookmarkTop] = React.useState(null);
        const activeTableSubQ = React.useMemo(() => {
            const activeNumber = Number(activeQuestion);
            if (!Number.isFinite(activeNumber)) return null;
            return subQuestions.find((sq) => Number(sq.number) === activeNumber) || null;
        }, [activeQuestion, subQuestions]);

        const syncTableBookmarkPosition = React.useCallback(() => {
            if (isReview || !activeTableSubQ) {
                setTableBookmarkTop(null);
                return;
            }

            const container = tableContainerRef.current;
            if (!container) {
                setTableBookmarkTop(null);
                return;
            }

            const activeNode = container.querySelector(`#question-${activeTableSubQ.number}`);
            if (!activeNode) {
                setTableBookmarkTop(null);
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const activeRect = activeNode.getBoundingClientRect();
            const top = activeRect.top - containerRect.top;
            setTableBookmarkTop(top);
        }, [activeTableSubQ, isReview]);

        React.useLayoutEffect(() => {
            syncTableBookmarkPosition();
        }, [syncTableBookmarkPosition, answers]);

        React.useEffect(() => {
            if (typeof window === 'undefined') return undefined;
            const handleResize = () => syncTableBookmarkPosition();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, [syncTableBookmarkPosition]);

        const normalizeBlankTokens = (text) => {
            let s = String(text || '');
            // Legacy HTML from editor chips
            s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
            // Flexible token form: [blank], [ BLANK ], [blank ]...
            s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
            return s;
        };

        const renderFormattedText = (text) => (
            <span dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(text || '') }} />
        );

        const blankMap = [];
        for (const row of tableRows) {
            for (const col of columns) {
                const n = (normalizeBlankTokens(row?.cells?.[col.id] || '').match(/\[blank\]/g) || []).length;
                for (let i = 0; i < n; i++) {
                    const idx = blankMap.length;
                    blankMap.push({
                        rowId: row.id,
                        colId: col.id,
                        subQ: subQuestions[idx] || null,
                    });
                }
            }
        }

        const getBlankOffset = (rowId, colId) => {
            const rowOrder = tableRows.map((r) => r.id);
            const colOrder = columns.map((c) => c.id);
            const curRow = rowOrder.indexOf(rowId);
            const curCol = colOrder.indexOf(colId);
            let count = 0;

            for (const b of blankMap) {
                const bRow = rowOrder.indexOf(b.rowId);
                const bCol = colOrder.indexOf(b.colId);
                if (bRow < curRow || (bRow === curRow && bCol < curCol)) count++;
            }
            return count;
        };

        const checkAnswer = (userAnswer, correctAnswer) => {
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
            const normalized = normalizeAnswer(userAnswer);
            const acceptedAnswers = String(correctAnswer || '').split('|').map(a => normalizeAnswer(a));
            return acceptedAnswers.includes(normalized);
        };

        const renderBlankInput = (info) => {
            if (!info?.subQ) return null;
            const subQ = info.subQ;
            const isActive = activeQuestion === subQ.number;
            const currentValue = answerMap[subQ.id] || '';
            const isCorrect = checkAnswer(currentValue, subQ.correctAnswer);
            const displayValue = (isReview && !isCorrect)
                ? String(subQ.correctAnswer || '').split('|')[0]
                : String(currentValue || '');

            return (
                <span
                    id={`question-${subQ.number}`}
                    className={`table-inline-wrap inline-question ${isActive ? 'active-question-input' : ''} ${Boolean(bookmarks?.[subQ.number]) ? 'bookmarked-question-input' : ''} relative-pos`}
                    key={`tc-${subQ.id}`}
                >
                    <input
                        ref={(el) => { if (inputRefs?.current) inputRefs.current[subQ.id] = el; }}
                        type="text"
                        className={`inline-input tc-inline-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                        placeholder={String(subQ.number || '')}
                        value={displayValue}
                        onClick={() => setActiveQuestion?.(subQ.number)}
                        onFocus={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                        onChange={(e) => { if (!isReview) handleAnswerChange?.(subQ.id, e.target.value); }}
                        readOnly={isReview}
                    />
                </span>
            );
        };

        const renderCell = (cellText, rowId, colId) => {
            const parts = normalizeBlankTokens(cellText).split('[blank]');
            const offset = getBlankOffset(rowId, colId);

            return parts.map((part, i) => {
                const info = blankMap[offset + i];
                return (
                    <React.Fragment key={`${rowId}-${colId}-${i}`}>
                        {renderFormattedText(part)}
                        {i < parts.length - 1 && renderBlankInput(info)}
                    </React.Fragment>
                );
            });
        };

        // Fallback nếu dữ liệu bảng chưa có cấu trúc
        if (!columns.length || !tableRows.length) {
            return (
                <div className="table-completion-container" ref={tableContainerRef}>
                    <div className="table-completion-grid">
                        {subQuestions.map((subQ) => (
                            <div key={subQ.id} id={`question-${subQ.number}`} className={`table-cell-input ${Boolean(bookmarks?.[subQ.number]) ? 'bookmarked-question-input' : ''} relative-pos`}>
                                <label>Q{subQ.number}</label>
                                {(() => {
                                    const isActive = activeQuestion === subQ.number;
                                    const rawValue = answerMap[subQ.id] || '';
                                    const isCorrect = checkAnswer(rawValue, subQ.correctAnswer);
                                    const displayValue = (isReview && !isCorrect)
                                        ? String(subQ.correctAnswer || '').split('|')[0]
                                        : String(rawValue || '');
                                    return (
                                        <input
                                            ref={(el) => { if (inputRefs?.current) inputRefs.current[subQ.id] = el; }}
                                            type="text"
                                            className={`inline-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                            placeholder={`Q${subQ.number}`}
                                            value={displayValue}
                                            onClick={() => setActiveQuestion?.(subQ.number)}
                                            onFocus={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                                            onChange={(e) => { if (!isReview) handleAnswerChange?.(subQ.id, e.target.value); }}
                                            readOnly={isReview}
                                        />
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                    {!isReview && activeTableSubQ && tableBookmarkTop !== null && (
                        <BookmarkToggle
                            className="question-bookmark table-floating-bookmark"
                            style={{ top: `${tableBookmarkTop}px` }}
                            active={Boolean(bookmarks?.[activeTableSubQ.number])}
                            onToggle={() => toggleBookmark?.(activeTableSubQ.number)}
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="table-completion-container" ref={tableContainerRef}>
                <div className="tc-table-wrap">
                    <table className="tc-table">
                        {(q.tableTitle || columns.some((c) => c.header)) && (
                            <thead>
                                {q.tableTitle && (
                                    <tr>
                                        <th className="tc-title-cell" colSpan={columns.length}>{q.tableTitle}</th>
                                    </tr>
                                )}
                                <tr>
                                    {columns.map((col) => (
                                        <th key={col.id} className="tc-header-cell">{col.header || ''}</th>
                                    ))}
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {tableRows.map((row) => (
                                <tr key={row.id}>
                                    {columns.map((col, ci) => (
                                        <td key={col.id} className={`tc-cell${ci === 0 ? ' tc-row-label' : ''}`}>
                                            {renderCell(row?.cells?.[col.id] || '', row.id, col.id)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!isReview && activeTableSubQ && tableBookmarkTop !== null && (
                    <BookmarkToggle
                        className="question-bookmark table-floating-bookmark"
                        style={{ top: `${tableBookmarkTop}px` }}
                        active={Boolean(bookmarks?.[activeTableSubQ.number])}
                        onToggle={() => toggleBookmark?.(activeTableSubQ.number)}
                    />
                )}
            </div>
        );
    }

    return <div>Unsupported question type: {q.type}</div>;
};

export default QuestionRenderer;
