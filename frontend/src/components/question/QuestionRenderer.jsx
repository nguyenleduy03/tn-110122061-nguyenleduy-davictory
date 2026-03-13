import React from 'react';
import FillInBlankQuestion from './FillInBlankQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TFNGQuestion from './TFNGQuestion';
import DragDropGroupQuestion from './DragDropGroupQuestion';
import FlowChartQuestion from './FlowChartQuestion';
import SummaryCompletionQuestion from './SummaryCompletionQuestion';
import ImageDragDropQuestion from './ImageDragDropQuestion';

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
        // Table completion: render as fill-in-the-blank style inputs for each table cell
        return (
            <div className="table-completion-container">
                <h4>{q.title}</h4>
                <div className="table-completion-grid">
                    {q.subQuestions?.map((subQ) => (
                        <div key={subQ.id} className="table-cell-input">
                            <label>Q{subQ.number}</label>
                            <input
                                ref={(el) => { if (inputRefs?.current) inputRefs.current[subQ.id] = el; }}
                                type="text"
                                className={`inline-input ${isReview ? (answer?.[subQ.id]?.trim().toLowerCase() === subQ.correctAnswer?.toLowerCase() ? 'review-correct' : 'review-wrong') : ''}`}
                                placeholder={`Q${subQ.number}`}
                                value={answer?.[subQ.id] || ''}
                                onChange={(e) => { if (!isReview) handleAnswerChange?.(subQ.id, e.target.value); }}
                                readOnly={isReview}
                            />
                            {isReview && answer?.[subQ.id]?.trim().toLowerCase() !== subQ.correctAnswer?.toLowerCase() && (
                                <span className="review-correct-label">({subQ.correctAnswer})</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return <div>Unsupported question type: {q.type}</div>;
};

export default QuestionRenderer;
