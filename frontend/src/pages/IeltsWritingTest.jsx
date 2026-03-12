import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, ArrowLeftRight } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
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
                <div
                    className="writing-task-instruction"
                    dangerouslySetInnerHTML={{ __html: part.instruction }}
                />
                {part.taskImageSvg && (
                    <div
                        className="writing-task-image"
                        dangerouslySetInnerHTML={{ __html: part.taskImageSvg }}
                    />
                )}
                {!part.taskImageSvg && part.imageUrl && (
                    <div className="writing-task-image">
                        <img src={part.imageUrl} alt="task diagram"
                            style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }} />
                    </div>
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
    const { id: testId } = useParams();

    useEffect(() => {
        ieltsApi.getWritingTestSession(testId || 'mock-session-id').then((data) => {
            setTestData(data);
            setLoading(false);
        });
    }, [testId]);

    const handleAnswerChange = useCallback((partId, value) => {
        setWritingAnswers((prev) => ({ ...prev, [partId]: value }));
    }, []);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isFullTest = searchParams.get('fullTest') === 'true';
    const mode = searchParams.get('mode') || 'practice';

    const handleFullTestNext = () => {
        try {
            const session = JSON.parse(sessionStorage.getItem('ieltsFullTest') || 'null');
            if (!session) return;
            const nextIdx = session.currentSection + 1;
            if (nextIdx < session.sections.length) {
                const updated = { ...session, currentSection: nextIdx };
                sessionStorage.setItem('ieltsFullTest', JSON.stringify(updated));
                const next = updated.sections[nextIdx];
                navigate(`/test/${next.skill}/${next.testId}?fullTest=true&mode=${session.mode || mode}`);
            } else {
                sessionStorage.removeItem('ieltsFullTest');
                navigate(`/test/complete?mode=${session.mode || mode}&skill=writing&fullTest=true`);
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = () => {
        if (isFullTest) { handleFullTestNext(); return; }
        ieltsApi.submitAnswers("mock-session-id", writingAnswers).then(() => {
            navigate(`/test/complete?mode=${mode}&skill=writing`);
        });
    };

    if (loading) return (
        <div className="test-loading-screen">
            <div className="test-loading-spinner"></div>
            <p className="test-loading-title">Your test will begin shortly</p>
            <p className="test-loading-sub">Please wait</p>
        </div>
    );
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
                submitTest={submitTest}
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

                <div className="divider" onMouseDown={handleDragStart}>
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

                <div className="pane-nav-buttons">
                    <button className="black-nav-btn" onClick={() => setCurrentPartIndex((i) => Math.max(0, i - 1))} disabled={isFirstPart} style={{ opacity: isFirstPart ? 0.5 : 1 }}>
                        <ArrowLeft size={24} color="white" />
                    </button>
                    <button className="black-nav-btn" onClick={() => setCurrentPartIndex((i) => Math.min(parts.length - 1, i + 1))} disabled={isLastPart} style={{ opacity: isLastPart ? 0.5 : 1 }}>
                        <ArrowRight size={24} color="white" />
                    </button>
                </div>
            </main>

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
                                    <h4 className="part-title hover-pointer">Part {index + 1}</h4>
                                    {!isActive && (
                                        <span className="part-status" style={{ marginLeft: "10px" }}>
                                            {done ? 1 : 0} of 1
                                        </span>
                                    )}
                                </div>
                                {isActive && (
                                    <div className="question-numbers">
                                        <div className="q-wrapper">
                                            <div className={`status-dash ${done ? "answered-dash" : ""}`} />
                                            <span className="q-num active">1</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </footer>
        </div>
    );
};

export default IeltsWritingTest;
