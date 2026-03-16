import React from 'react';
import FillInBlankQuestion from './FillInBlankQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TFNGQuestion from './TFNGQuestion';
import DragDropGroupQuestion from './DragDropGroupQuestion';
import FlowChartQuestion from './FlowChartQuestion';
import SummaryCompletionQuestion from './SummaryCompletionQuestion';
import ImageDragDropQuestion from './ImageDragDropQuestion';
import { formatTextWithWhitespace } from '../../utils/textFormatters';

const QuestionRenderer = ({ q, activeQuestion, setActiveQuestion, answers, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    if (!q) return null;

    if (q.type === 'fill-in-the-blank') {
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

    if (q.type === 'multiple-choice') {
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

    if (q.type === 'tfng') {
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

    if (q.type === 'ynng') {
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

    if (q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info') {
        return (
            <DragDropGroupQuestion
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

    if (q.type === 'flow_chart') {
        return (
            <FlowChartQuestion
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

    if (q.type === 'summary-completion' || q.type === 'note-completion') {
        return (
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
        );
    }

    if (q.type === 'image-drag-drop') {
        return (
            <ImageDragDropQuestion
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

    if (q.type === 'table-completion') {
        const columns = q.columns || [];
        const tableRows = q.tableRows || [];
        const subQuestions = q.subQuestions || [];
        const answerMap = answers || answer || {};

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

        const renderBlankInput = (info) => {
            if (!info?.subQ) return null;
            const subQ = info.subQ;
            const currentValue = answerMap[subQ.id] || '';
            const isCorrect = String(currentValue).trim().toLowerCase() === String(subQ.correctAnswer || '').trim().toLowerCase();
            const displayValue = (isReview && !isCorrect)
                ? String(subQ.correctAnswer || '')
                : String(currentValue || '');

            return (
                <span className="table-inline-wrap relative-pos" key={`tc-${subQ.id}`}>
                    <input
                        ref={(el) => { if (inputRefs?.current) inputRefs.current[subQ.id] = el; }}
                        type="text"
                        className={`inline-input tc-inline-input ${activeQuestion === subQ.number ? 'active-question-input' : ''} ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                        placeholder={String(subQ.number || '')}
                        value={displayValue}
                        onClick={() => setActiveQuestion?.(subQ.number)}
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

        const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
        const minNum = numbers.length ? Math.min(...numbers) : null;
        const maxNum = numbers.length ? Math.max(...numbers) : null;
        const heading = q.heading || (minNum !== null && maxNum !== null ? `Questions ${minNum}-${maxNum}` : 'Questions');
        const instruction = q.instruction || 'Complete the table. Write ONE WORD ONLY for each answer.';

        // Fallback nếu dữ liệu bảng chưa có cấu trúc
        if (!columns.length || !tableRows.length) {
            return (
                <div className="table-completion-container">
                    <div className="question-header-container">
                        <p className="question-heading">{heading}</p>
                        <p className="question-instruction" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instruction) }} />
                    </div>
                    <div className="table-completion-grid">
                        {subQuestions.map((subQ) => (
                            <div key={subQ.id} className="table-cell-input relative-pos">
                                <label>Q{subQ.number}</label>
                                {(() => {
                                    const rawValue = answerMap[subQ.id] || '';
                                    const isCorrect = String(rawValue).trim().toLowerCase() === String(subQ.correctAnswer || '').trim().toLowerCase();
                                    const displayValue = (isReview && !isCorrect)
                                        ? String(subQ.correctAnswer || '')
                                        : String(rawValue || '');
                                    return (
                                        <input
                                            ref={(el) => { if (inputRefs?.current) inputRefs.current[subQ.id] = el; }}
                                            type="text"
                                            className={`inline-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                            placeholder={`Q${subQ.number}`}
                                            value={displayValue}
                                            onClick={() => setActiveQuestion?.(subQ.number)}
                                            onChange={(e) => { if (!isReview) handleAnswerChange?.(subQ.id, e.target.value); }}
                                            readOnly={isReview}
                                        />
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="table-completion-container">
                <div className="question-header-container">
                    <p className="question-heading">{heading}</p>
                    <p className="question-instruction" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(instruction) }} />
                </div>
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
            </div>
        );
    }

    return <div>Unsupported question type: {q.type}</div>;
};

export default QuestionRenderer;
