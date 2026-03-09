import React from 'react';
import FillInBlankQuestion from './FillInBlankQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import DragDropGroupQuestion from './DragDropGroupQuestion';
import FlowChartQuestion from './FlowChartQuestion';

const QuestionRenderer = ({ q, activeQuestion, setActiveQuestion, answers, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark }) => {
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
            />
        );
    }

    return <div>Unsupported question type: {q.type}</div>;
};

export default QuestionRenderer;
