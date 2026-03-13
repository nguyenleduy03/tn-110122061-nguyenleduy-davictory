import React, { useState, useEffect, useRef } from "react";
import { Bookmark, ArrowLeft, ArrowRight, Volume2, ArrowLeftRight, Headphones, Play } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";

const IeltsListeningTest = () => {
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bookmarks, setBookmarks] = useState({});
    const [audioStarted, setAudioStarted] = useState(false);
    const audioRef = useRef(null);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { id: testId } = useParams();
    const isFullTest = searchParams.get('fullTest') === 'true';
    const mode = searchParams.get('mode') || 'practice';
    const isReview = searchParams.get('review') === 'true';

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
        if (!testId) { setError('Không tìm thấy ID bài thi.'); setLoading(false); return; }
        ieltsApi.getTestSession(testId, "LISTENING").then((data) => {
            data.testType = "Academic Listening";
            setTestData(data);
            if (data.parts[0]?.questions?.length > 0) {
                setActiveQuestion(data.parts[0].questions[0].number);
            }
            setLoading(false);

            if (isReview) {
                setAudioStarted(true);
                const savedAnswers = sessionStorage.getItem('lastAnswers_listening');
                if (savedAnswers) {
                    setAnswers(JSON.parse(savedAnswers));
                }
            }
        }).catch((err) => {
            console.error('[Listening] Lỗi tải bài thi:', err);
            setError(err.message === 'AUTH_REQUIRED'
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : `Không thể tải bài thi: ${err.message}`);
            setLoading(false);
        });
    }, [testId, isReview]);

    useEffect(() => {
        if (inputRefs.current && inputRefs.current[activeQuestion] && typeof inputRefs.current[activeQuestion].focus === 'function') {
            inputRefs.current[activeQuestion].focus({ preventScroll: true });
        }
    }, [activeQuestion]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

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
                navigate(`/test/complete?mode=${session.mode || mode}&skill=listening&fullTest=true&testId=${testId}`);
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = () => {
        sessionStorage.setItem('lastAnswers_listening', JSON.stringify(answers));

        if (isFullTest) { handleFullTestNext(); return; }

        ieltsApi.submitAnswers(testId || "mock-session-id", answers).then(() => {
            navigate(`/test/complete?mode=${mode}&skill=listening&testId=${testId}`);
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
    if (error) return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
            <p style={{ fontSize: '18px', fontWeight: 600 }}>⚠️ {error}</p>
            <button onClick={() => navigate('/exam-library')} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1e3a8a', color: '#fff', cursor: 'pointer' }}>← Quay lại thư viện</button>
        </div>
    );
    if (!testData) return <div style={{ padding: '20px' }}>No test data available</div>;
    if (!part) return <div style={{ padding: '20px' }}>Part not found</div>;




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
                submitTest={submitTest}
                extraInfo={audioStarted && !isReview ? <><Volume2 size={16} /> Audio is playing</> : null}
                isReview={isReview}
                isFullTest={isFullTest}
                skill="listening"
                navigate={navigate}
                duration={testData.totalMinutes}
                onTimeUp={submitTest}
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
                <h3 dangerouslySetInnerHTML={{ __html: part.title }} />
                <p dangerouslySetInnerHTML={{ __html: part.instruction || "Listen and answer questions." }} />
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

                    {/* Render tất cả loại câu hỏi qua QuestionRenderer */}
                    {(() => {
                        // Group consecutive questions of the same type for sequential rendering
                        const questionGroups = [];
                        let currentGroup = null;
                        for (const q of (part.questions || [])) {
                            const groupType = (q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info')
                                ? 'drag-drop' : q.type;
                            if (!currentGroup || currentGroup.type !== groupType) {
                                currentGroup = { type: groupType, questions: [] };
                                questionGroups.push(currentGroup);
                            }
                            currentGroup.questions.push(q);
                        }
                        return questionGroups.map((group, gi) => (
                            <div key={gi} style={{ marginBottom: '40px' }}>
                                {group.questions.map(q => (
                                    <QuestionRenderer
                                        key={q.id}
                                        q={q}
                                        activeQuestion={activeQuestion}
                                        setActiveQuestion={setActiveQuestion}
                                        answers={answers}
                                        handleAnswerChange={isReview ? () => { } : handleAnswerChange}
                                        bookmarks={bookmarks}
                                        toggleBookmark={toggleBookmark}
                                        inputRefs={inputRefs}
                                        isReview={isReview}
                                    />
                                ))}
                            </div>
                        ));
                    })()}

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
                                    <h4 className="part-title hover-pointer"
                                        dangerouslySetInnerHTML={{ __html: p.title }}
                                    />
                                    {!isActivePart && (
                                        <span className="part-status">
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
                                                    className="q-wrapper relative-pos"
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
                                                    {nums.some(n => bookmarks[n]) && (
                                                        <div className="q-bookmark-flag">
                                                            <Bookmark size={16} fill="#1a73e8" color="#1a73e8" />
                                                        </div>
                                                    )}
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
            </footer>
        </div>
    );
};

export default IeltsListeningTest;
