import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, ArrowLeft, ArrowRight, ArrowLeftRight } from "lucide-react";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useDividerResize } from "../hooks/useDividerResize";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";


const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e) => {
        e.preventDefault();
        const option = e.dataTransfer.getData('text/plain');
        if (option) handleAnswerChange(qId, option);
    };
    return (
        <div onClick={(e) => { e.stopPropagation(); setActiveQuestion(Number(number)); }}
           style={{ 
             border: isActive ? '2px dashed #333' : '2px dashed #3498db', 
             padding: '10px 15px', 
             margin: '0 0 10px 0', display: 'flex', 
             backgroundColor: isActive ? '#f9f9f9' : '#fff',
             minHeight: '44px',
             position: 'relative',
             borderRadius: '6px',
             alignItems: 'center',
             justifyContent: 'center', width: '100%', boxSizing: 'border-box'
           }}
           onDragOver={handleDragOver} onDrop={handleDrop}
        >
           
           <span style={{ 
               padding: '0 10px', fontWeight: 'bold', color: '#333', fontSize: '15px'
           }}>{number}</span>

           {answer ? (
               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '10px' }}>
                   <span style={{ fontWeight: '500', color: '#333' }}>{answer}</span>
                   <button onClick={(e) => { e.stopPropagation(); handleAnswerChange(qId, ''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa' }}
                   >×</button>
               </div>
           ) : <span style={{ color: '#bbb', fontSize: '14px' }}>Drop heading here</span>}
        </div>
    );
};

const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion }) => {
    const pRef = React.useRef(null);
    const [gaps, setGaps] = React.useState([]);

    React.useEffect(() => {
        if (pRef.current) {
            const nodes = Array.from(pRef.current.querySelectorAll('.heading-gap'));
            setGaps(nodes);
        }
    }, [part.passageContent]);

    return (
        <div style={{ position: 'relative' }}>
            <div ref={pRef} className="passage-content" dangerouslySetInnerHTML={{ __html: part.passageContent }}></div>
            {gaps.map((node, i) => {
                const qId = node.getAttribute('data-id');
                const num = node.getAttribute('data-number');
                return createPortal(
                    <HeadingGap 
                        key={i}
                        qId={qId} number={num} answer={answers[qId]} 
                        handleAnswerChange={handleAnswerChange}
                        isActive={activeQuestion == num}
                        setActiveQuestion={setActiveQuestion}
                    />,
                    node
                );
            })}
        </div>
    );
};

const IeltsReadingTest = () => {
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);

    const inputRefs = useRef({});
    const { leftWidth, containerRef, handleDragStart } = useDividerResize(50);
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
        const flatQs = p.questions.flatMap(q => q.subQuestions ? q.subQuestions : q);
        return flatQs.filter(q => {
            const ans = answers[q.id];
            return typeof ans === 'string' ? ans.trim() !== '' : Array.isArray(ans) ? ans.length > 0 : !!ans;
        }).length;
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Test...</div>;

    const fillInBlankQuestions = part.questions.filter(q => q.type === 'fill-in-the-blank');
    const multiChoiceQuestions = part.questions.filter(q => q.type === 'multiple-choice');
    const dragDropQuestions = part.questions.filter(q => q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info');

    return (
        <div className="ielts-container">
            <TestHeader candidateName={testData?.candidateName} candidateId={testData?.candidateId} />

            <div className="instruction-bar">
                <h3>{part.title}</h3>
                <p>{part.instruction}</p>
            </div>

            <main className="ielts-main" ref={containerRef}>
                <div className="passage-section" style={{ width: `${leftWidth}%`, flex: 'none' }}>
                    <h2 className="passage-title">{part.passageTitle}</h2>
                    <PassageRenderer part={part} answers={answers} handleAnswerChange={handleAnswerChange} activeQuestion={activeQuestion} setActiveQuestion={setActiveQuestion} />
                </div>

                <div className="divider" onMouseDown={handleDragStart}>
                    <div className="divider-icon">
                        <ArrowLeftRight size={14} color="#333" />
                    </div>
                </div>

                <div className="questions-section" id="questions-area" style={{ width: `calc(${100 - leftWidth}% - 14px)`, flex: 'none' }}>
                    <div className="questions-content" style={{ paddingBottom: '80px' }}>
                        {multiChoiceQuestions.length > 0 && (
                            <div style={{ marginBottom: '40px' }}>
                                <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>
                                    Choose TRUE if the statement agrees with the information given in the text, choose FALSE if the statement contradicts the information, or choose NOT GIVEN if there is no information on this.
                                </p>
                                {multiChoiceQuestions.map(q => (
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

                        {dragDropQuestions.length > 0 && (
                            <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ marginTop: '0', marginBottom: '20px' }}>Drag and Drop</h3>
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
                    </div>

                    <div className="pane-nav-buttons">
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
                                <h4 className="part-title" onClick={() => setCurrentPartIndex(index)} style={{ cursor: 'pointer' }}>
                                    {p.title}
                                </h4>
                                {isActivePart ? (
                                    <div className="question-numbers">
                                        {p.questions.flatMap(q => q.subQuestions ? q.subQuestions : q).map(q => {
                                            const num = q.number;
                                            const ans = answers[q.id];
                                            const isAnswered = typeof ans === 'string' ? ans.trim() !== '' : Array.isArray(ans) ? ans.length > 0 : !!ans;
                                            const isActive = activeQuestion === num;
                                            return (
                                                <div className="q-wrapper" key={num}>
                                                    <div className={`status-dash ${isAnswered ? 'answered' : ''} ${isActive ? 'active-dash' : ''}`} />
                                                    <span
                                                        className={`q-num ${isActive ? 'active' : ''}`}
                                                        onClick={() => setActiveQuestion(num)}
                                                    >
                                                        {num}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ cursor: 'pointer' }} onClick={() => setCurrentPartIndex(index)}>
                                        <span className="part-status">{answeredCount} of {p.questions.flatMap(q => q.subQuestions ? q.subQuestions : q).length}</span>
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

export default IeltsReadingTest;
