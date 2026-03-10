import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, ArrowLeft, ArrowRight, ArrowLeftRight, Bookmark } from "lucide-react";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useDividerResize } from "../hooks/useDividerResize";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";
import TextHighlighter from "../components/common/TextHighlighter";


const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion, bookmarks, toggleBookmark }) => {
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e) => {
        e.preventDefault();
        const option = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (option) {
            handleAnswerChange(qId, option);
            if (sourceQId && sourceQId !== String(qId)) {
                handleAnswerChange(sourceQId, '');
            }
        }
    };

    const handleDragStart = (e) => {
        if (!answer) return;
        e.dataTransfer.setData('text/plain', answer);
        e.dataTransfer.setData('sourceQId', String(qId));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div id={`question-${number}`} onClick={(e) => { e.stopPropagation(); setActiveQuestion(Number(number)); }}
            className={`heading-gap-zone ${answer ? 'heading-gap-filled' : ''} ${isActive && !answer ? 'heading-gap-active' : ''}`}
            onDragOver={handleDragOver} onDrop={handleDrop} draggable={!!answer} onDragStart={handleDragStart}
        >
            {!answer ? (
                <div className="heading-gap-placeholder">
                    <span className="heading-gap-number">{number}</span>
                </div>
            ) : (
                <div className="heading-gap-answer">
                    <span>{answer}</span>
                </div>
            )}
        </div>
    );
};

const PassageContentStatic = React.memo(({ content, title }) => (
    <div className="passage-content" dangerouslySetInnerHTML={{ __html: content }}></div>
), (prev, next) => prev.title === next.title);

const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion, bookmarks, toggleBookmark }) => {
    const [gaps, setGaps] = React.useState([]);
    const [bookmarkNodes, setBookmarkNodes] = React.useState([]);

    React.useEffect(() => {
        // Query the DOM after static content paints
        const timer = setTimeout(() => {
            const nodes = Array.from(document.querySelectorAll('.passage-content .heading-gap'));
            console.log("Found gaps static:", nodes.length);
            setGaps(nodes);

            // Create target nodes for bookmarks right after the gaps (which are right before the text)
            const bNodes = [];
            nodes.forEach(node => {
                let p = node.nextElementSibling;
                while (p && p.tagName !== 'P') {
                    p = p.nextElementSibling;
                }

                if (p) {
                    // check if already injected
                    let bContainer = p.querySelector('.bookmark-portal-target');
                    if (!bContainer) {
                        bContainer = document.createElement('span');
                        bContainer.className = 'bookmark-portal-target';
                        bContainer.style.display = 'inline-flex';
                        bContainer.style.marginRight = '8px';
                        bContainer.style.verticalAlign = 'top';
                        // Insert at the beginning of the P tag
                        if (p.firstChild) {
                            p.insertBefore(bContainer, p.firstChild);
                        } else {
                            p.appendChild(bContainer);
                        }
                    }
                    bNodes.push({ container: bContainer, num: node.getAttribute('data-number') });
                }
            });
            setBookmarkNodes(bNodes);
        }, 100);
        return () => clearTimeout(timer);
    }, [part.passageTitle]); // Prevent re-running when content changes due to highlight, only run when switching parts

    return (
        <div style={{ position: 'relative' }}>
            <PassageContentStatic content={part.passageContent} title={part.passageTitle} />
            {gaps.map((node, i) => {
                const qId = node.getAttribute('data-id');
                const num = node.getAttribute('data-number');
                return createPortal(
                    <HeadingGap
                        key={qId || i}
                        qId={qId} number={num} answer={answers[qId]}
                        handleAnswerChange={handleAnswerChange}
                        isActive={activeQuestion == num}
                        setActiveQuestion={setActiveQuestion}
                    />,
                    node
                );
            })}
            {bookmarkNodes.map((bNode, i) => (
                createPortal(
                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(bNode.num); }} style={{ cursor: "pointer", display: "flex", marginTop: "2px" }}>
                        <Bookmark size={18} fill={bookmarks?.[bNode.num] ? "#1a73e8" : "none"} color={bookmarks?.[bNode.num] ? "#1a73e8" : "#ccc"} />
                    </span>,
                    bNode.container
                )
            ))}
        </div>
    );
};

const IeltsReadingTest = () => {
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [bookmarks, setBookmarks] = useState({});

    const toggleBookmark = (num) => {
        setBookmarks(prev => ({ ...prev, [num]: !prev[num] }));
    };

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
            setLoading(false);
        });
    }, []);

    const handleHighlightChange = () => {
        // Find the passage portion to avoid capturing the entire layout including portals
        const passageElem = containerRef.current.querySelector('.passage-content');
        if (passageElem && testData) {
            // Clone the element to not disrupt the current DOM
            const clone = passageElem.cloneNode(true);

            // Clean up dynamically injected React portal targets and their contents
            const gapPortals = clone.querySelectorAll('.heading-gap');
            gapPortals.forEach(gap => {
                gap.innerHTML = ''; // Clear the portal content added by React
            });

            const bookmarkTargets = clone.querySelectorAll('.bookmark-portal-target');
            bookmarkTargets.forEach(bm => {
                bm.remove(); // Completely remove the dynamically added bookmark wrappers
            });

            setTestData(prev => {
                const newData = { ...prev };
                newData.parts[currentPartIndex].passageContent = clone.innerHTML;
                return newData;
            });
        }
    };

    useEffect(() => {
        if (inputRefs.current && inputRefs.current[activeQuestion] && typeof inputRefs.current[activeQuestion].focus === 'function') {
            inputRefs.current[activeQuestion].focus({ preventScroll: true });
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
    const summaryCompletionQuestions = part.questions.filter(q => q.type === 'summary-completion');
    const imageDragDropQuestions = part.questions.filter(q => q.type === 'image-drag-drop');

    return (
        <div className="ielts-container">
            <TestHeader candidateName={testData?.candidateName} candidateId={testData?.candidateId} submitTest={submitTest} />

            <div className="instruction-bar">
                <h3>{part.title}</h3>
                <p>{part.instruction}</p>
            </div>

            <main className="ielts-main" ref={containerRef}>
                <TextHighlighter containerRef={containerRef} onHighlightChange={handleHighlightChange} />
                <div className="passage-section" style={{ width: `${leftWidth}%`, flex: 'none' }}>
                    <h2 className="passage-title">{part.passageTitle}</h2>
                    <PassageRenderer part={part} answers={answers} handleAnswerChange={handleAnswerChange}
                        bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark} activeQuestion={activeQuestion} setActiveQuestion={setActiveQuestion} />
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
                                        bookmarks={bookmarks}
                                        toggleBookmark={toggleBookmark}
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

                        {summaryCompletionQuestions.length > 0 && (
                            <div style={{ marginBottom: '40px' }}>
                                {summaryCompletionQuestions.map(q => (
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

                        {imageDragDropQuestions.length > 0 && (
                            <div style={{ marginBottom: '40px' }}>
                                {imageDragDropQuestions.map(q => (
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
                                            {answeredCount} of {flatQuestions.length}
                                        </span>
                                    )}
                                </div>

                                {isActivePart && (
                                    <div className="question-numbers">
                                        {flatQuestions.map((q) => {
                                            const num = q.number;
                                            const ans = answers[q.id];
                                            const isAnswered = typeof ans === "string" ? ans.trim() !== "" : Array.isArray(ans) ? ans.length > 0 : !!ans;
                                            const isActive = activeQuestion === num;

                                            return (
                                                <div
                                                    className="q-wrapper"
                                                    style={{ position: "relative" }}
                                                    key={num}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentPartIndex(index);
                                                        setActiveQuestion(num);
                                                        setTimeout(() => {
                                                            const el = document.getElementById(`question-${num}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }
                                                        }, 50);
                                                    }}
                                                >
                                                    {bookmarks[num] && (
                                                        <div style={{ position: 'absolute', top: '-18px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                                            <Bookmark size={14} fill="#1a73e8" color="#1a73e8" />
                                                        </div>
                                                    )}
                                                    <div className={`status-dash ${isAnswered ? "answered-dash" : ""}`} />
                                                    <span className={`q-num ${isActive ? "active" : ""}`}>
                                                        {num}
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
                <button className="submit-check-btn" onClick={submitTest} title="Submit Test">
                    <Check size={28} strokeWidth={2.5} />
                </button>
            </footer>
        </div>
    );
};

export default IeltsReadingTest;
