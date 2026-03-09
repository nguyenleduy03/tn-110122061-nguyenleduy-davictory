import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Check } from "lucide-react";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import { useDividerResize } from "../hooks/useDividerResize";
import { ieltsApi } from "../services/ieltsApi";

const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
};

const WritingTaskPane = ({ part, style }) => {
    if (!part) return null;
    return (
        <div className="writing-task-pane" style={style}>
            <div className="writing-task-inner">
                <h2 className="writing-task-title">{part.taskLabel || part.title}</h2>
                <div className="writing-task-instruction">
                    {part.instruction.split("\n").map((line, i) =>
                        line.trim() === "" ? (
                            <br key={i} />
                        ) : (
                            <p key={i}>{line}</p>
                        )
                    )}
                </div>
                {part.taskImageSvg && (
                    <div
                        className="writing-task-image"
                        dangerouslySetInnerHTML={{ __html: part.taskImageSvg }}
                    />
                )}
            </div>
        </div>
    );
};

const WritingAnswerPane = ({ partId, minWords, value, onChange, style }) => {
    const wordCount = countWords(value);
    const isUnderMin = wordCount < minWords;

    return (
        <div className="writing-answer-pane" style={style}>
            <div className="writing-answer-inner">
                <textarea
                    className="writing-textarea"
                    placeholder="Type your answer here..."
                    value={value}
                    onChange={(e) => onChange(partId, e.target.value)}
                    spellCheck
                />
                <div className="writing-word-count">
                    <span className={isUnderMin ? "wc-under" : "wc-ok"}>
                        Words: {wordCount}
                    </span>
                    <span className="wc-min"> (minimum: {minWords})</span>
                </div>
            </div>
        </div>
    );
};

const IeltsWritingTest = () => {
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [writingAnswers, setWritingAnswers] = useState({});

    const { leftWidth, containerRef, handleDragStart } = useDividerResize(50);

    useEffect(() => {
        ieltsApi.getTestSession("mock-session-id", "WRITING").then((data) => {
            data.testType = "Academic Writing";
            setTestData(data);
            setLoading(false);
        });
    }, []);

    const handleAnswerChange = useCallback((partId, value) => {
        setWritingAnswers((prev) => ({ ...prev, [partId]: value }));
    }, []);

    const submitTest = () => {
        ieltsApi.submitAnswers("mock-session-id", writingAnswers).then(() => {
            alert(
                "Test submitted!\n\n" +
                    Object.entries(writingAnswers)
                        .map(([k, v]) => `${k}: ${countWords(v)} words`)
                        .join("\n")
            );
        });
    };

    if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Loading Test...</div>;
    if (!testData) return <div style={{ padding: "50px" }}>No test data available</div>;

    const parts = testData.parts || [];
    const part = parts[currentPartIndex];
    const isFirstPart = currentPartIndex === 0;
    const isLastPart = currentPartIndex === parts.length - 1;

    return (
        <div className="ielts-container">
            <TestHeader
                candidateName={testData.candidateName}
                candidateId={testData.candidateId}
            />

            <div className="instruction-bar">
                <h3>{part.title}</h3>
                <p>
                    {`Recommended time: ${part.recommendedMinutes} minutes — Write at least ${part.minWords} words.`}
                </p>
            </div>

            <main className="ielts-main" ref={containerRef}>
                {/* Left pane: task prompt + image */}
                <WritingTaskPane part={part} style={{ width: `${leftWidth}%` }} />

                {/* Draggable divider */}
                <div className="divider" onMouseDown={handleDragStart} style={{ width: "14px", flexShrink: 0 }}>
                    <div className="divider-icon">
                        <ArrowLeftRight size={14} color="#333" />
                    </div>
                </div>

                {/* Right pane: textarea + word count */}
                <WritingAnswerPane
                    partId={part.id}
                    minWords={part.minWords}
                    value={writingAnswers[part.id] || ""}
                    onChange={handleAnswerChange}
                    style={{ width: `calc(${100 - leftWidth}% - 14px)` }}
                />
            </main>

            {/* Footer: part navigation + submit */}
            <footer className="ielts-footer">
                <div className="footer-content">
                    {parts.map((p, index) => {
                        const isActive = currentPartIndex === index;
                        const wc = countWords(writingAnswers[p.id] || "");
                        const done = wc >= p.minWords;
                        return (
                            <div
                                key={p.id}
                                className={`part-group ${isActive ? "active-part" : ""}`}
                                onClick={() => setCurrentPartIndex(index)}
                            >
                                <div className="part-status-container">
                                    <h4 className="part-title hover-pointer">{p.title}</h4>
                                    {!isActive && (
                                        <span className="part-status" style={{ marginLeft: "10px" }}>
                                            {wc} / {p.minWords} words
                                        </span>
                                    )}
                                </div>
                                {isActive && (
                                    <div className="question-numbers">
                                        <div className="q-wrapper">
                                            <div className={`status-dash ${done ? "answered-dash" : ""}`} />
                                            <span className="q-num active">{wc}w</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Part navigation arrows */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
                    <button
                        className="black-nav-btn"
                        onClick={() => setCurrentPartIndex((i) => Math.max(0, i - 1))}
                        disabled={isFirstPart}
                        style={{ opacity: isFirstPart ? 0.5 : 1 }}
                    >
                        <ArrowLeft size={24} color="white" />
                    </button>
                    <button
                        className="black-nav-btn"
                        onClick={() => setCurrentPartIndex((i) => Math.min(parts.length - 1, i + 1))}
                        disabled={isLastPart}
                        style={{ opacity: isLastPart ? 0.5 : 1 }}
                    >
                        <ArrowRight size={24} color="white" />
                    </button>
                </div>

                <button className="submit-check-btn" onClick={submitTest} title="Submit Test">
                    <Check size={28} strokeWidth={2.5} />
                </button>
            </footer>
        </div>
    );
};

export default IeltsWritingTest;
