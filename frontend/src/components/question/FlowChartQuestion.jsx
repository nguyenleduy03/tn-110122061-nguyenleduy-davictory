import React from 'react';

/**
 * FlowChartQuestion — renders the flow-chart completion question for test-takers.
 *
 * Expected q shape:
 * {
 *   type: "flow_chart",
 *   title: "Procedure for detecting life on another planet",
 *   instructions: "Complete the flow-chart...",  (optional — shown by QuestionRenderer/wrapper)
 *   bankOptions: ["contamination", "vehicle", "heat", ...],
 *   flowNodes: [
 *     { id: "n1", text: "A spacecraft lands on a planet and sends out a rover." },
 *     { id: "n2", text: "The rover is directed to a [blank] which has organic material." },
 *     ...
 *   ],
 *   subQuestions: [
 *     { id: "q26", number: 26 },
 *     { id: "q27", number: 27 },
 *     ...
 *   ]
 * }
 */

function parseNodeText(text) {
    const segments = (text ?? '').split(/\[blank\]/gi);
    const result = [];
    segments.forEach((seg, i) => {
        if (seg) result.push({ type: 'text', content: seg });
        if (i < segments.length - 1) result.push({ type: 'blank' });
    });
    return result;
}

const FlowChartQuestion = ({
    q,
    activeQuestion,
    setActiveQuestion,
    answers,
    handleAnswerChange,
    bookmarks,
    toggleBookmark,
    isReview
}) => {
    const flowNodes = q.flowNodes ?? [];
    const subQuestions = q.subQuestions ?? [];
    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const fallbackHeading = (minNum !== null && maxNum !== null)
        ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}-${maxNum}`)
        : '';
    const heading = q.heading || fallbackHeading;
    const instruction = q.instruction || 'Complete the flow-chart. Choose the correct answer and move it into the gap.';
    const chartTitle = /^\s*(nh[oó]m|group)\s*\d*\s*$/i.test(String(q.title || '')) ? '' : q.title;
    const bankTitle = q.bankTitle || '';

    // Map each blank in order across all nodes to a subQuestion
    let blankCounter = 0;
    const nodeRenderData = flowNodes.map((node) => {
        const parts = parseNodeText(node.text).map((part) => {
            if (part.type === 'blank') {
                return { ...part, subQ: subQuestions[blankCounter++] ?? null };
            }
            return part;
        });
        return { node, parts };
    });

    const usedAnswers = Object.values(answers).filter(Boolean);

    const handleDragStart = (e, option, sourceQId = null) => {
        e.dataTransfer.setData('text/plain', option);
        if (sourceQId) e.dataTransfer.setData('sourceQId', String(sourceQId));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, subQId) => {
        if (isReview) return;
        e.preventDefault();
        const option = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (option) {
            handleAnswerChange(subQId, option);
            if (sourceQId && sourceQId !== String(subQId)) {
                handleAnswerChange(sourceQId, '');
            }
        }
    };

    const handleBankDrop = (e) => {
        e.preventDefault();
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (sourceQId) handleAnswerChange(sourceQId, '');
    };

    return (
        <div className="fc-container">
            <div className="fc-header">
                {heading && <h4 className="fc-heading">{heading}</h4>}
                {instruction && <p className="fc-instruction">{instruction}</p>}
            </div>

            <div className="fc-layout">
                {/* Left: flow chart */}
                <div className="fc-chart">
                    {chartTitle && <div className="fc-chart-title">{chartTitle}</div>}
                    <div className="fc-flow-stack">
                        {nodeRenderData.map(({ node, parts }, idx) => (
                            <React.Fragment key={node.id ?? idx}>
                                <div className="fc-node">
                                    <p className="fc-node-text">
                                        {parts.map((part, pidx) => {
                                            if (part.type === 'text') {
                                                return <span key={pidx}>{part.content}</span>;
                                            }
                                            const subQ = part.subQ;
                                            const answer = subQ ? answers[subQ.id] : undefined;
                                            const isActive = subQ ? activeQuestion === subQ.number : false;
                                            return (
                                                <span
                                                    key={pidx}
                                                    id={subQ ? `question-${subQ.number}` : undefined}
                                                    className={`fc-blank${answer ? ' fc-blank-filled' : ''}${isActive ? ' fc-blank-active' : ''} ${isReview && subQ ? (answer?.trim() === subQ.correctAnswer?.trim() ? 'review-correct' : 'review-wrong') : ''} relative-pos`}
                                                    onClick={(e) => { e.stopPropagation(); if (subQ && !isReview) setActiveQuestion(subQ.number); }}
                                                    onDragOver={isReview ? undefined : handleDragOver}
                                                    onDrop={isReview ? undefined : (e) => subQ && handleDrop(e, subQ.id)}
                                                    draggable={!isReview && !!answer}
                                                    onDragStart={(e) => { if (!isReview && answer) handleDragStart(e, answer, subQ?.id); }}
                                                >
                                                    <strong className="fc-blank-num">{subQ?.number}</strong>
                                                    {answer && <span className="fc-blank-answer">{answer}</span>}
                                                    {isReview && subQ && answer?.trim() !== subQ.correctAnswer?.trim() && (
                                                        <div className="review-correct-label">
                                                            <span dangerouslySetInnerHTML={{ __html: subQ.correctAnswer }} />
                                                        </div>
                                                    )}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </div>
                                {idx < nodeRenderData.length - 1 && (
                                    <div className="fc-arrow">↓</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Right: word bank */}
                <div className="fc-bank" onDragOver={handleDragOver} onDrop={handleBankDrop}>
                    {bankTitle && <div className="fc-bank-title">{bankTitle}</div>}
                    {(q.bankOptions ?? []).map((opt, i) => {
                        if (usedAnswers.includes(opt)) return null;
                        return (
                            <div
                                key={i}
                                className="fc-bank-chip"
                                draggable={!isReview}
                                onDragStart={(e) => { if (!isReview) handleDragStart(e, opt); }}
                            >
                                {opt}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FlowChartQuestion;
