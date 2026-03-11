import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Volume2, ArrowLeftRight, Check, Headphones, Play } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";

const IeltsListeningTest = () => {
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [bookmarks, setBookmarks] = useState({});
    const [audioStarted, setAudioStarted] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const audioRef = useRef(null);

    const toggleBookmark = (num) => {
        setBookmarks(prev => ({ ...prev, [num]: !prev[num] }));
    };
    const inputRefs = useRef({});
    const {
        currentPartIndex,
        setCurrentPartIndex,
        activeQuestion,
        setActiveQuestion,
        part,
        goNext,
        goPrev,
        isFirstQuestion,
        isLastQuestion,
    } = useTestNavigation(testData);

    useEffect(() => {
        ieltsApi.getTestSession("mock-session-id", "LISTENING").then((data) => {
            data.testType = "Academic Listening";
            setTestData(data);
            if (data.parts[0]?.questions?.length > 0) {
                setActiveQuestion(data.parts[0].questions[0].number);
            }
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (inputRefs.current && inputRefs.current[activeQuestion] && typeof inputRefs.current[activeQuestion].focus === 'function') {
            inputRefs.current[activeQuestion].focus({ preventScroll: true });
        }
    }, [activeQuestion]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isFullTest = searchParams.get('fullTest') === 'true';

    const handleFullTestNext = () => {
        try {
            const session = JSON.parse(sessionStorage.getItem('ieltsFullTest') || 'null');
            if (!session) return;
            const nextIdx = session.currentSection + 1;
            if (nextIdx < session.sections.length) {
                const updated = { ...session, currentSection: nextIdx };
                sessionStorage.setItem('ieltsFullTest', JSON.stringify(updated));
                const next = updated.sections[nextIdx];
                navigate(`/test/${next.skill}/${next.testId}?fullTest=true`);
            } else {
                sessionStorage.removeItem('ieltsFullTest');
                navigate('/exam-library');
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = () => {
        if (isFullTest) { handleFullTestNext(); return; }
        ieltsApi.submitAnswers("mock-session-id", answers).then(() => {
            alert("Test submitted!\nAnswers: " + JSON.stringify(answers, null, 2));
        });
    };

    const getAnsweredCount = (partIndex) => {
        if (!testData) return 0;
        const p = testData.parts[partIndex];
        const flatQs = p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q) || [];
        let count = 0;
        flatQs.forEach(q => {
            const ans = answers[q.id];
            const isAnswered = q.selectCount
                ? (Array.isArray(ans) && ans.length >= q.selectCount)
                : (typeof ans === 'string' ? ans.trim() !== '' : Array.isArray(ans) ? ans.length > 0 : !!ans);
            if (isAnswered) count += (q.numberRange ? q.numberRange.length : 1);
        });
        return count;
    };

    const getTotalCount = (partIndex) => {
        if (!testData) return 0;
        const p = testData.parts[partIndex];
        const flatQs = p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q) || [];
        return flatQs.reduce((sum, q) => sum + (q.numberRange ? q.numberRange.length : 1), 0);
    };

    if (loading) return (
        <div className="test-loading-screen">
            <div className="test-loading-spinner"></div>
            <p className="test-loading-title">Your test will begin shortly</p>
            <p className="test-loading-sub">Please wait</p>
        </div>
    );
    if (!testData) return <div style={{ padding: '20px' }}>No test data available</div>;
    if (!part) return <div style={{ padding: '20px' }}>Part not found</div>;

    const fillInBlankQuestions = part.questions?.filter(q => q.type === 'fill-in-the-blank') || [];
    const multiChoiceQuestions = part.questions?.filter(q => q.type === 'multiple-choice') || [];
    const dragDropQuestions = part.questions?.filter(q => q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info') || [];

    const handlePlay = () => {
        setAudioStarted(true);
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
    };

    return (
        <div className="ielts-container">
            <TestHeader
                candidateName={testData.candidateName}
                candidateId={testData.candidateId}
                submitTest={() => setShowSubmitModal(true)}
                extraInfo={audioStarted ? <><Volume2 size={16} /> Audio is playing</> : null}
            />

            {/* Hidden audio element */}
            {part.audioUrl && (
                <audio ref={audioRef} src={part.audioUrl} />
            )}

            {/* Audio start overlay */}
            {!audioStarted && (
                <div className="listening-audio-overlay">
                    <Headphones size={80} strokeWidth={1.5} />
                    <p className="listening-audio-warning">
                        You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions.
                    </p>
                    <p className="listening-audio-continue">To continue, click Play.</p>
                    <button className="listening-play-btn" onClick={handlePlay}>
                        <Play size={20} fill="#fff" /> Play
                    </button>
                </div>
            )}

            <div className="instruction-bar">
                <h3>{part.title}</h3>
                <p>{part.instruction || "Listen and answer questions."}</p>
            </div>

            <main className="ielts-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div className="questions-section" id="questions-area" style={{ width: '100%', padding: '20px 40px', paddingBottom: '80px', margin: '0' }}>
                    {part.passageContent && part.passageContent !== "<p>Nội dung bài đọc chưa được thiết lập.</p>" && (
                        <div
                            className="listening-visuals passage-content"
                            style={{ marginBottom: '30px' }}
                            dangerouslySetInnerHTML={{ __html: part.passageContent }}
                        />
                    )}

                    {multiChoiceQuestions.length > 0 && (
                        <div style={{ marginBottom: '40px' }}>
                            {multiChoiceQuestions.map(q => (
                                <QuestionRenderer
                                    key={q.id}
                                    q={q}
                                    activeQuestion={activeQuestion}
                                    setActiveQuestion={setActiveQuestion}
                                    answers={answers}
                                    handleAnswerChange={handleAnswerChange}
                                    bookmarks={bookmarks}
                                    toggleBookmark={toggleBookmark}
                                    inputRefs={inputRefs}
                                />
                            ))}
                        </div>
                    )}

                    {dragDropQuestions.length > 0 && (
                        <div style={{ marginBottom: '40px' }}>
                            {dragDropQuestions.map(q => (
                                <QuestionRenderer
                                    key={q.id}
                                    q={q}
                                    activeQuestion={activeQuestion}
                                    setActiveQuestion={setActiveQuestion}
                                    answers={answers}
                                    handleAnswerChange={handleAnswerChange}
                                    bookmarks={bookmarks}
                                    toggleBookmark={toggleBookmark}

                                />
                            ))}
                        </div>
                    )}

                    {fillInBlankQuestions.length > 0 && (
                        <div>
                            <h3 style={{ marginTop: '0', marginBottom: '20px' }}>{part.questionsLabel}</h3>
                            <ul>
                                {fillInBlankQuestions.map(q => (
                                    <QuestionRenderer
                                        key={q.id}
                                        q={q}
                                        activeQuestion={activeQuestion}
                                        setActiveQuestion={setActiveQuestion}
                                        answers={answers}
                                        handleAnswerChange={handleAnswerChange}
                                        bookmarks={bookmarks}
                                        toggleBookmark={toggleBookmark}
                                        inputRefs={inputRefs}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}

                    {audioStarted && <div className="pane-nav-buttons">
                        <button className="black-nav-btn" onClick={goPrev} disabled={isFirstQuestion} style={{ opacity: isFirstQuestion ? 0.5 : 1 }}>
                            <ArrowLeft size={24} color="white" />
                        </button>
                        <button className="black-nav-btn" onClick={goNext} disabled={isLastQuestion} style={{ opacity: isLastQuestion ? 0.5 : 1 }}>
                            <ArrowRight size={24} color="white" />
                        </button>
                    </div>}
                </div>
            </main>

            <footer className="ielts-footer">

                <div className="footer-content">
                    {testData && testData.parts.map((p, index) => {
                        const isActivePart = currentPartIndex === index;
                        const answeredCount = getAnsweredCount(index);
                        const totalCount = getTotalCount(index);
                        const flatQuestions = p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q) || [];

                        return (
                            <div
                                key={p.id}
                                className={`part-group ${isActivePart ? "active-part" : ""}`}
                                onClick={() => setCurrentPartIndex(index)}
                            >
                                <div className="part-status-container">
                                    <h4 className="part-title hover-pointer">
                                        {p.title}
                                    </h4>
                                    {!isActivePart && (
                                        <span className="part-status" style={{ marginLeft: "10px" }}>
                                            {answeredCount} of {totalCount}
                                        </span>
                                    )}
                                </div>

                                {isActivePart && (
                                    <div className="question-numbers">
                                        {flatQuestions.map((q) => {
                                            const nums = q.numberRange || [q.number];
                                            const isRange = nums.length > 1;
                                            const ans = answers[q.id];
                                            const isAnswered = q.selectCount
                                                ? (Array.isArray(ans) && ans.length >= q.selectCount)
                                                : (typeof ans === "string" ? ans.trim() !== "" : Array.isArray(ans) ? ans.length > 0 : !!ans);
                                            const isActive = nums.includes(activeQuestion);

                                            return (
                                                <div
                                                    className="q-wrapper"
                                                    style={{ position: "relative" }}
                                                    key={q.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentPartIndex(index);
                                                        setActiveQuestion(q.number);
                                                        setTimeout(() => {
                                                            const el = document.getElementById(`question-${q.number}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }
                                                        }, 50);
                                                    }}
                                                >
                                                    <div className={`status-dash${isAnswered ? " answered-dash" : ""}${nums.some(n => bookmarks[n]) ? " bookmarked-dash" : ""}`} />
                                                    <span className={`q-num${isActive ? " active" : ""}${isRange ? " q-num-range" : ""}${nums.some(n => bookmarks[n]) ? " bookmarked" : ""}`}>
                                                        {isRange ? `${nums[0]}–${nums[nums.length - 1]}` : q.number}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button className="submit-check-btn" onClick={() => setShowSubmitModal(true)} title="Submit Test">
                    <Check size={28} strokeWidth={2.5} />
                </button>
            </footer>

            {showSubmitModal && (
                <div className="submit-confirm-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="submit-confirm-modal" onClick={e => e.stopPropagation()}>
                        <h3>Submit your test?</h3>
                        <p>You are about to submit your answers for this section. Once submitted, you cannot return to make changes.</p>
                        <p className="scm-warning">This action cannot be undone.</p>
                        <div className="submit-confirm-actions">
                            <button className="scm-cancel-btn" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                            <button className="scm-submit-btn" onClick={() => { setShowSubmitModal(false); submitTest(); }}>Submit Test</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IeltsListeningTest;
