import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Volume2, ArrowLeftRight, Check } from "lucide-react";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";

const IeltsListeningTest = () => {
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);

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
        ieltsApi.getTestSession("mock-session-id").then((data) => {
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
            inputRefs.current[activeQuestion].focus();
        }
    }, [activeQuestion]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const submitTest = () => {
        ieltsApi.submitAnswers("mock-session-id", answers).then(() => {
            alert("Test submitted!\nAnswers: " + JSON.stringify(answers, null, 2));
        });
    };

    const getAnsweredCount = (partIndex) => {
        if (!testData) return 0;
        const p = testData.parts[partIndex];
        const flatQs = p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q) || [];
        return flatQs.filter(q => {
            const ans = answers[q.id];
            return typeof ans === 'string' ? ans.trim() !== '' : Array.isArray(ans) ? ans.length > 0 : !!ans;
        }).length;
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
    if (!testData) return <div style={{ padding: '20px' }}>No test data available</div>;
    if (!part) return <div style={{ padding: '20px' }}>Part not found</div>;

    const fillInBlankQuestions = part.questions?.filter(q => q.type === 'fill-in-the-blank') || [];
    const multiChoiceQuestions = part.questions?.filter(q => q.type === 'multiple-choice') || [];
    const dragDropQuestions = part.questions?.filter(q => q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info') || [];

    return (
        <div className="ielts-container">
            <TestHeader
                candidateName={testData.candidateName}
                candidateId={testData.candidateId}
                extraInfo={<><Volume2 size={16} /> Audio is playing</>}
            />

            <div className="listen-instruction-bar" style={{ backgroundColor: '#f5f5f5', padding: '15px 30px', borderBottom: '1px solid #ddd', flexShrink: 0 }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{part.title}</h3>
                <p style={{ margin: 0, color: '#555' }}>{part.instruction || "Listen and answer questions."}</p>
            </div>

            <main className="ielts-main" style={{ display: 'block', flex: 1, overflowY: 'auto' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '20px 30px', position: 'relative' }}>
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
                                        inputRefs={inputRefs}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="pane-nav-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
                        <button className="black-nav-btn" onClick={goPrev} disabled={isFirstQuestion} style={{ opacity: isFirstQuestion ? 0.5 : 1 }}>
                            <ArrowLeft size={24} color="white" />
                        </button>
                        <button className="black-nav-btn" onClick={goNext} disabled={isLastQuestion} style={{ opacity: isLastQuestion ? 0.5 : 1 }}>
                            <ArrowRight size={24} color="white" />
                        </button>
                    </div>
                </div>
            </main>

            <footer className="ielts-footer">
                <div className="footer-content">
                    {testData && testData.parts.map((p, index) => {
                        const isActivePart = currentPartIndex === index;
                        const answeredCount = getAnsweredCount(index);
                        const positionClass = index === 0 ? "left" : index === testData.parts.length - 1 ? "right" : "center";

                        return (
                            <div key={p.id} className={"part-group " + positionClass}>
                                <h4 className="part-title" onClick={() => setCurrentPartIndex(index)} style={{ cursor: "pointer" }}>
                                    {p.title}
                                </h4>
                                {isActivePart ? (
                                    <div className="question-numbers">
                                        {(p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q) || []).map((q) => {
                                            const num = q.number;
                                            const ans = answers[q.id];
                                            const isAnswered = typeof ans === 'string' ? ans.trim() !== '' : Array.isArray(ans) ? ans.length > 0 : !!ans;
                                            const isActive = activeQuestion === num;
                                            return (
                                                <div className="q-wrapper" key={num}>
                                                    <div className={`status-dash ${isAnswered ? "answered" : ""} ${isActive ? "active-dash" : ""}`} />
                                                    <span className={`q-num ${isActive ? "active" : ""}`} onClick={() => setActiveQuestion(num)}>
                                                        {num}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ cursor: "pointer" }} onClick={() => setCurrentPartIndex(index)}>
                                        <span className="part-status">
                                            {answeredCount} of {p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q)?.length || 0}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button className="submit-check-btn" onClick={submitTest} title="Submit Test">
                    <Check size={28} strokeWidth={2.5} />
                </button>
            </footer>
        </div>
    );
};

export default IeltsListeningTest;
