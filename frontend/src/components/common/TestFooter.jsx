import React from "react";
import BookmarkToggle from "./BookmarkToggle";

const TestFooter = ({
    testData,
    currentPartIndex,
    setCurrentPartIndex,
    activeQuestion,
    setActiveQuestion,
    getAnsweredCount,
    answers,
    bookmarks,
}) => {
    if (!testData || !testData.parts) return null;

    const hasMeaningfulAnswer = (value) => {
        if (Array.isArray(value)) {
            return value.some((item) => String(item || '').trim() !== '');
        }

        return typeof value === 'string'
            ? value.trim() !== ''
            : !!value;
    };

    return (
        <footer className="ielts-footer">
            <div className="footer-content">
                {testData.parts.map((p, index) => {
                    const isActivePart = currentPartIndex === index;
                    const answeredCount = getAnsweredCount ? getAnsweredCount(index) : 0;
                    const questionItems = (p.questions || []).filter((question) => !question?.isSample);

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
                                        const isAnswered = hasMeaningfulAnswer(answers?.[q.id]);

                                        const isActive = activeQuestion === num;
                                        const answeredState = isAnswered;

                                        return (
                                            <div
                                                className="q-wrapper"
                                                style={{ position: "relative" }}
                                                key={num}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentPartIndex(index);
                                                    setActiveQuestion(num);
                                                }}
                                            >
                                                {bookmarks && bookmarks[num] && (
                                                    <div className="q-bookmark-flag">
                                                        <BookmarkToggle size={13} active />
                                                    </div>
                                                )}
                                                {/* Vạch ngang ở trên */}
                                                <div className={`status-dash ${answeredState ? "answered-dash" : ""} ${bookmarks && bookmarks[num] ? "bookmarked-dash" : ""}`} />
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
                                        {answeredCount} of {questionItems.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </footer>
    );
};

export default TestFooter;