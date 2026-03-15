import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Check, ArrowLeft, ArrowRight, ArrowLeftRight, Bookmark } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useDividerResize } from "../hooks/useDividerResize";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";
import TextHighlighter from "../components/common/TextHighlighter";
import { createPortal } from "react-dom";

const HeadingGap = ({ qId, number, answer, correctAnswer, handleAnswerChange, isActive, setActiveQuestion, bookmarks, toggleBookmark, isReview }) => {
    const handleDragOver = (e) => { if (isReview) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e) => {
        if (isReview) return;
        e.preventDefault();
        e.stopPropagation();
        const option = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');

        // Defensive check for qId
        const activeQId = qId || (number ? `q${number}` : null);

        console.log(`[HeadingGap] Attempting drop. TargetQId: ${activeQId}, Option: ${option}, Source: ${sourceQId}`);

        if (option && activeQId) {
            handleAnswerChange(activeQId, option);
            if (sourceQId && String(sourceQId) !== String(activeQId)) {
                handleAnswerChange(sourceQId, '');
            }
        } else {
            console.warn('[HeadingGap] Drop rejected: missing option or target ID');
        }
    };

    const handleDragStart = (e) => {
        if (!answer || isReview) return;
        e.dataTransfer.setData('text/plain', answer);
        e.dataTransfer.setData('sourceQId', String(qId));
        e.dataTransfer.effectAllowed = 'move';
    };

    const isFilled = !!answer;

    return (
        <div id={`question-${number}`}
            onClick={(e) => { e.stopPropagation(); if (!isReview) setActiveQuestion(Number(number)); }}
            className={`heading-gap-zone ${isFilled ? 'heading-gap-filled' : ''} ${isActive && !isFilled ? 'heading-gap-active' : ''} ${isReview ? (answer?.trim() === correctAnswer?.trim() ? 'review-correct' : 'review-wrong') : ''}`}
            onDragOver={handleDragOver}
            onDrop={isReview ? undefined : handleDrop}
            draggable={!isReview && isFilled}
            onDragStart={handleDragStart}
        >
            {!isFilled ? (
                <div className="heading-gap-placeholder">
                    <span className="heading-gap-number">{number}</span>
                </div>
            ) : (
                <div className="heading-gap-answer">
                    <span>{answer}</span>
                </div>
            )}
            {isReview && answer?.trim() !== correctAnswer?.trim() && (
                <div className="review-correct-label">
                    <span dangerouslySetInnerHTML={{ __html: correctAnswer }} />
                </div>
            )}
        </div>
    );
};

const PassageContentStatic = React.memo(({ content }) => {
    return (
        <div className="passage-content" dangerouslySetInnerHTML={{ __html: content }}></div>
    );
});

const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion, bookmarks, toggleBookmark, isReview, testData }) => {
    const [gaps, setGaps] = React.useState([]);
    const [bookmarkNodes, setBookmarkNodes] = React.useState([]);
    const startQuestionNumber = part.fromQuestion || 1;
    const containerRef = React.useRef(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return undefined;

        const processGaps = (nodes) => {
            const bNodes = [];
            nodes.forEach(node => {
                let p = node.nextElementSibling || node.parentElement;
                if (p && p.tagName !== 'P') {
                    const parentP = node.closest('p');
                    if (parentP) p = parentP;
                }

                if (p && p.tagName === 'P') {
                    let bContainer = p.querySelector('.bookmark-portal-target');
                    if (!bContainer) {
                        bContainer = document.createElement('span');
                        bContainer.className = 'bookmark-portal-target';
                        if (p.firstChild) p.insertBefore(bContainer, p.firstChild);
                        else p.appendChild(bContainer);
                    }
                    bNodes.push({ container: bContainer, num: node.getAttribute('data-number') });
                }
            });
            setBookmarkNodes(bNodes);
        };

        const mountGaps = () => {
            if (!containerRef.current) return false;
            const nodes = Array.from(containerRef.current.querySelectorAll('.heading-gap'));
            if (nodes.length === 0) {
                setGaps([]);
                setBookmarkNodes([]);
                return false;
            }

            setGaps(nodes);
            processGaps(nodes);
            return true;
        };

        // Try immediately so portals are ready in the same paint.
        if (mountGaps()) return undefined;

        // Fallback for async HTML updates from external effects.
        if (typeof MutationObserver === 'undefined') return undefined;
        const observer = new MutationObserver(() => {
            if (mountGaps()) observer.disconnect();
        });

        observer.observe(containerRef.current, { childList: true, subtree: true });
        const timeoutId = window.setTimeout(() => observer.disconnect(), 2000);

        return () => {
            observer.disconnect();
            window.clearTimeout(timeoutId);
        };
    }, [part?.id, part?.passageTitle, part?.passageContent]);

    return (
        <div className="passage-renderer-wrapper" ref={containerRef}>
            <PassageContentStatic content={part.passageContent} />
            {gaps.map((node, i) => {
                const qId = node.getAttribute('data-id');
                const numAttr = node.getAttribute('data-number');
                const number = numAttr ? parseInt(numAttr, 10) : (startQuestionNumber + i);

                let correctAnswer = null;
                if (isReview && testData?.parts) {
                    testData.parts.forEach(p => {
                        p.questions?.forEach(q => {
                            if (q.subQuestions) {
                                const subQ = q.subQuestions.find(sq => String(sq.id) === String(qId));
                                if (subQ && subQ.correctAnswer) correctAnswer = subQ.correctAnswer;
                            } else if (String(q.id) === String(qId)) {
                                if (q.correctAnswer) correctAnswer = q.correctAnswer;
                            }
                        });
                    });
                }

                return createPortal(
                    <HeadingGap
                        key={qId || i}
                        qId={qId}
                        number={number}
                        answer={answers[qId]}
                        correctAnswer={correctAnswer}
                        handleAnswerChange={handleAnswerChange}
                        isActive={activeQuestion == number}
                        setActiveQuestion={setActiveQuestion}
                        isReview={isReview}
                    />,
                    node
                );
            })}
            {bookmarkNodes.map((bNode, i) => (
                createPortal(
                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(bNode.num); }} className="bookmark-portal-container">
                        <Bookmark size={16} fill={bookmarks?.[bNode.num] ? "#1a73e8" : "none"} color={bookmarks?.[bNode.num] ? "#1a73e8" : "#ccc"} />
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
    const [error, setError] = useState(null);
    const [bookmarks, setBookmarks] = useState({});

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
        if (!testId) { setError('Không tìm thấy ID bài thi.'); setLoading(false); return; }
        ieltsApi.getTestSession(testId, "READING").then((data) => {
            setTestData(data);
            setLoading(false);

            if (isReview) {
                const savedAnswers = sessionStorage.getItem('lastAnswers_reading');
                if (savedAnswers) {
                    setAnswers(JSON.parse(savedAnswers));
                }
            }
        }).catch((err) => {
            console.error('[Reading] Lỗi tải bài thi:', err);
            setError(err.message === 'AUTH_REQUIRED'
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : `Không thể tải bài thi: ${err.message}`);
            setLoading(false);
        });
    }, [testId, isReview]);

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
                navigate(`/test/complete?mode=${session.mode || mode}&skill=reading&fullTest=true&testId=${testId}`);
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = () => {
        // Lưu lại đáp án để lát review
        sessionStorage.setItem('lastAnswers_reading', JSON.stringify(answers));

        if (isFullTest) { handleFullTestNext(); return; }

        ieltsApi.submitAnswers(testId || "mock-session-id", answers).then(() => {
            navigate(`/test/complete?mode=${mode}&skill=reading&testId=${testId}`);
        });
    };

    const getAnsweredCount = (partIndex) => {
        if (!testData) return 0;
        const p = testData.parts[partIndex];
        const flatQs = p.questions.flatMap(q => q.subQuestions ? q.subQuestions : q);
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
        const flatQs = p.questions.flatMap(q => q.subQuestions ? q.subQuestions : q);
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
    if (!testData || !part) return null;

    const fillInBlankQuestions = part.questions.filter(q => q.type === 'fill-in-the-blank');
    const multiChoiceQuestions = part.questions.filter(q => q.type === 'multiple-choice');
    const dragDropQuestions = part.questions.filter(q => q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info');
    const summaryCompletionQuestions = part.questions.filter(q => q.type === 'summary-completion');
    const imageDragDropQuestions = part.questions.filter(q => q.type === 'image-drag-drop');

    const matchingHeadingOptions = part.questions
        .filter(q => q.type === 'matching_heading')
        .flatMap(q => q.bankOptions || [])
        .map(opt => String(opt || '').trim())
        .filter(Boolean);

    const matchingHeadingZoneWidth = (() => {
        if (matchingHeadingOptions.length === 0) return 220;
        let longestWidth = 0;

        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.font = '700 15px Arial';
                longestWidth = matchingHeadingOptions.reduce(
                    (max, option) => Math.max(max, ctx.measureText(option).width),
                    0
                );
            }
        }

        if (longestWidth === 0) {
            longestWidth = matchingHeadingOptions.reduce((max, option) => Math.max(max, option.length * 8.5), 0);
        }

        const paddedWidth = Math.ceil(longestWidth + 28);
        return Math.max(220, Math.min(720, paddedWidth));
    })();

    // Group consecutive questions of the same type for sequential rendering
    const questionGroups = [];
    let currentGroup = null;
    for (const q of part.questions) {
        const groupType = (q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info')
            ? 'drag-drop' : q.type;
        if (!currentGroup || currentGroup.type !== groupType) {
            currentGroup = { type: groupType, questions: [] };
            questionGroups.push(currentGroup);
        }
        currentGroup.questions.push(q);
    }

    return (
        <div className="ielts-container">
            <TestHeader
                candidateName={testData?.candidateName}
                candidateId={testData?.candidateId}
                submitTest={submitTest}
                isReview={isReview}
                isFullTest={isFullTest}
                skill="reading"
                navigate={navigate}
                duration={testData?.totalMinutes}
                onTimeUp={submitTest}
            />

            <div className="instruction-bar">
                <h3 dangerouslySetInnerHTML={{ __html: part.title }} />
                {part.instruction && <p dangerouslySetInnerHTML={{ __html: part.instruction }} />}
            </div>

            <main className="ielts-main" ref={containerRef} style={{
                display: 'grid',
                gridTemplateColumns: `${leftWidth}% 14px 1fr`,
                padding: 0,
                gap: 0,
                width: '100%',
                flex: '1',
                minHeight: 0,
                overflow: 'hidden',
                '--mh-dropzone-width': `${matchingHeadingZoneWidth}px`
            }}>
                <div className="passage-section" style={{ minWidth: 0, width: '100%' }}>
                    {part.passageTitle && !part.passageTitle.toLowerCase().startsWith('nhóm') && (
                        <h2 className="passage-title" dangerouslySetInnerHTML={{ __html: part.passageTitle }} />
                    )}
                    <PassageRenderer part={part} answers={answers} handleAnswerChange={handleAnswerChange}
                        bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark} activeQuestion={activeQuestion} setActiveQuestion={setActiveQuestion} isReview={isReview} testData={testData} />
                </div>

                <div className="divider" onMouseDown={handleDragStart}>
                    <div className="divider-icon">
                        <ArrowLeftRight size={14} color="#333" />
                    </div>
                </div>

                <div className="questions-section" id="questions-area" style={{ minWidth: 0, width: '100%' }}>
                    <div className="questions-content" style={{ paddingBottom: '80px' }}>
                        {questionGroups.map((group, gi) => (
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

                                {/* Chú thích cho Fill Blank questions */}
                                {group.type === 'fill-in-the-blank' && group.questions.length > 0 && (
                                    <div style={{
                                        marginTop: '10px',
                                        fontSize: '12px',
                                        color: '#666',
                                        fontStyle: 'italic',
                                        borderTop: '1px solid #eee',
                                        paddingTop: '8px'
                                    }}>
                                        <strong>Chú thích vị trí trong đoạn văn:</strong> {
                                            group.questions.map((q, idx) =>
                                                `Câu ${q.number}(${idx + 1})`
                                            ).join(', ')
                                        }
                                    </div>
                                )}
                            </div>
                        ))}
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
                <TextHighlighter containerRef={containerRef} onHighlightChange={handleHighlightChange} />
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

export default IeltsReadingTest;
