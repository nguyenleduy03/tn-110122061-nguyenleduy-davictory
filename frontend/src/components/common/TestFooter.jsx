import React from 'react';
import { Check } from 'lucide-react';

const TestFooter = ({
    testData,
    currentPartIndex,
    setCurrentPartIndex,
    activeQuestion,
    setActiveQuestion,
    getAnsweredCount,
    submitTest,
}) => {
    if (!testData || !testData.parts) return null;

    return (
        <footer className="ielts-footer">
            <div className="footer-content">
                {testData.parts.map((p, index) => {
                    const isActivePart = currentPartIndex === index;
                    const answeredCount = getAnsweredCount ? getAnsweredCount(index) : 0;
                    const positionClass =
                        index === 0
                            ? 'left'
                            : index === testData.parts.length - 1
                            ? 'right'
                            : 'center';

                    return (
                        <div key={p.id} className={`part-group ${positionClass}`}>
                            <h4
                                className="part-title hover-pointer"
                                onClick={() => setCurrentPartIndex(index)}
                                style={{ cursor: 'pointer' }}
                            >
                                {p.title}
                            </h4>
                            {isActivePart ? (
                                <div className="question-numbers">
                                    {p.questions.map((q) => {
                                        const num = q.number;
                                        const isAnswered = answers =>
                                            answers && answers[q.id] && answers[q.id].trim() !== '';
                                        const isActive = activeQuestion === num;
                                        return (
                                            <div className="q-wrapper" key={num}>
                                                <div className={`status-dash ${isActive ? 'active-dash' : ''}`} />
                                                <span
                                                    className={`q-num ${isActive ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setCurrentPartIndex(index);
                                                        setActiveQuestion(num);
                                                    }}
                                                >
                                                    {num}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    onClick={() => setCurrentPartIndex(index)}
                                >
                                    <span className="part-status">
                                        {answeredCount} of {p.questions.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {submitTest && (
                <button className="submit-check-btn" onClick={submitTest} title="Submit Test">
                    <Check size={28} strokeWidth={2.5} />
                </button>
            )}
        </footer>
    );
};

export default TestFooter;
