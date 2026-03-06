import React from "react";
import { Check } from "lucide-react";

const TestFooter = ({
    testData,
    currentPartIndex,
    setCurrentPartIndex,
    activeQuestion,
    setActiveQuestion,
    getAnsweredCount,
    answers,
    submitTest,
}) => {
    if (!testData || !testData.parts) return null;

    return (
        <footer className="ielts-footer">
            <div className="footer-content">
                {testData.parts.map((p, index) => {
                    const isActivePart = currentPartIndex === index;
                    const answeredCount = getAnsweredCount ? getAnsweredCount(index) : 0;

                    return (
                        <div
                            key={p.id}
                            className={`part-group ${isActivePart ? "active-part" : ""}`}
                            onClick={() => setCurrentPartIndex(index)}
                        >
                            <h4 className="part-title hover-pointer">
                                {p.title}
                            </h4>
                            {isActivePart ? (
                                <div className="question-numbers">
                                    {p.questions.map((q) => {
                                        const num = q.number;
                                        const isAnswered = answers =>
                                            answers && answers[q.id] && answers[q.id].trim() !== "";

                                        const isActive = activeQuestion === num;
                                        const answeredState = isAnswered(answers);

                                        return (
                                            <div
                                                className="q-wrapper"
                                                key={num}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentPartIndex(index);
                                                    setActiveQuestion(num);
                                                }}
                                            >
                                                {/* Vạch ngang ở trên */}
                                                <div className={`status-dash ${answeredState ? "answered-dash" : ""}`} />
                                                {/* Số thứ tự câu hỏi ở dưới */}
                                                <span className={`q-num ${isActive ? "active" : ""}`}>
                                                    {num}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="part-status-container">
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