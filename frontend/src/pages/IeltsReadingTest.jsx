import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { Check, ArrowLeft, ArrowRight, ArrowLeftRight } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useDividerResize } from "../hooks/useDividerResize";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";
import TextHighlighter from "../components/common/TextHighlighter";
import NotesPanel from "../components/common/NotesPanel";
import BookmarkToggle from "../components/common/BookmarkToggle";
import { createPortal } from "react-dom";
import { formatTextWithWhitespace } from "../utils/textFormatters";
import { computeFullTestProgressPercent, getFullTestSessionState, parseJsonSafe } from "../utils/fullTestProgress";
import { buildTimerPersistKey, clearDraftByTest, markTestSubmitted, getSubmittedRedirect } from "../utils/testRuntimeState";
import { useNotes } from "../hooks/useNotes";
import { assignmentApi } from "../services/assignmentApi";

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

    const normalizedAnswer = String(answer || '').trim().toLowerCase();
    const normalizedCorrect = String(correctAnswer || '').trim().toLowerCase();
    const isCorrect = normalizedAnswer === normalizedCorrect;
    const displayAnswer = (isReview && !isCorrect)
        ? String(correctAnswer || '')
        : String(answer || '');
    const isFilled = displayAnswer.trim() !== '';

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
                    <span>{displayAnswer}</span>
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

        if (isReview) {
            const existingTargets = containerRef.current.querySelectorAll('.bookmark-portal-target');
            existingTargets.forEach((target) => target.remove());
            setBookmarkNodes([]);
        }

        const processGaps = (nodes) => {
            if (isReview) {
                setBookmarkNodes([]);
                return;
            }
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
    }, [part?.id, part?.passageTitle, part?.passageContent, isReview]);

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
            {!isReview && bookmarkNodes.map((bNode, i) => (
                createPortal(
                    <BookmarkToggle
                        className="bookmark-portal-container"
                        size={16}
                        active={Boolean(bookmarks?.[bNode.num])}
                        onToggle={() => toggleBookmark?.(bNode.num)}
                    />,
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
    const [scoreInfo, setScoreInfo] = useState(null);
    const [startTime] = useState(() => Date.now());

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { id: testId } = useParams();
    const { notes, addNote, deleteNote } = useNotes('reading', testId);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const isFullTest = searchParams.get('fullTest') === 'true';
    const mode = searchParams.get('mode') || 'practice';
    const assignmentId = searchParams.get('assignmentId');
    const isAssignmentMode = mode === 'assignment' && assignmentId;
    const isReview = searchParams.get('review') === 'true';
    const selectedPartsParam = searchParams.get('parts') || '';
    const startPartNumber = Number.parseInt(searchParams.get('startPart') || '', 10);
    const durationOverrideMinutes = Number.parseInt(searchParams.get('duration') || '', 10);
    const noTimeLimit = searchParams.get('noTimeLimit') === 'true' || searchParams.get('duration') === '0';
    const allowReviewInExam = mode === 'exam' ? searchParams.get('allowReview') !== 'false' : false;
    const selectedPracticeParts = useMemo(() => {
        return Array.from(new Set(
            selectedPartsParam
                .split(',')
                .map((v) => Number.parseInt(v.trim(), 10))
                .filter((v) => Number.isFinite(v) && v > 0)
        )).sort((a, b) => a - b);
    }, [selectedPartsParam]);
    const queryString = searchParams.toString();
    const timerPersistKey = useMemo(() => buildTimerPersistKey({
        skill: 'reading',
        testId,
        mode,
        isFullTest,
        queryString,
    }), [testId, mode, isFullTest, queryString]);
    const highlightStorageKey = useMemo(() => {
        if (!testId) return null;
        return `ieltsHighlights_reading_${testId}`;
    }, [testId]);
    const autosaveStateRef = useRef({
        answers: {},
        bookmarks: {},
        currentPartIndex: 0,
        activeQuestion: 1,
        testData: null,
    });

    useEffect(() => {
        const submittedRedirect = getSubmittedRedirect(timerPersistKey);
        if (!submittedRedirect) return;
        navigate(submittedRedirect, { replace: true });
    }, [timerPersistKey, navigate]);

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
            const shouldApplyPracticeConfig = mode === 'practice' && !isFullTest && !isReview;
            let configuredData = data;

            if (shouldApplyPracticeConfig) {
                let configuredParts = data.parts;

                if (selectedPracticeParts.length > 0) {
                    const filteredParts = data.parts.filter((p, idx) => {
                        const parsedPartNo = Number.parseInt(String(p?.partNumber ?? ''), 10);
                        const partNo = Number.isFinite(parsedPartNo) && parsedPartNo > 0 ? parsedPartNo : (idx + 1);
                        return selectedPracticeParts.includes(partNo);
                    });
                    configuredParts = filteredParts.length ? filteredParts : data.parts;
                }

                configuredData = {
                    ...data,
                    parts: configuredParts,
                };

                if (Number.isFinite(durationOverrideMinutes) && durationOverrideMinutes > 0) {
                    configuredData = {
                        ...configuredData,
                        totalMinutes: durationOverrideMinutes,
                    };
                } else if (noTimeLimit) {
                    configuredData = {
                        ...configuredData,
                        totalMinutes: 0,
                    };
                }
            }

            const resolvedStartPartIndex = Number.isFinite(startPartNumber) && startPartNumber > 0
                ? configuredData.parts.findIndex((p, idx) => {
                    const parsedPartNo = Number.parseInt(String(p?.partNumber ?? ''), 10);
                    const partNo = Number.isFinite(parsedPartNo) && parsedPartNo > 0 ? parsedPartNo : (idx + 1);
                    return partNo === startPartNumber;
                })
                : -1;

            if (highlightStorageKey && configuredData?.parts?.length) {
                try {
                    const savedMap = JSON.parse(sessionStorage.getItem(highlightStorageKey) || '{}');
                    configuredData = {
                        ...configuredData,
                        parts: configuredData.parts.map((p) => {
                            const savedHtml = savedMap?.[String(p?.id)];
                            if (!savedHtml || typeof savedHtml !== 'string') return p;
                            return { ...p, passageContent: savedHtml };
                        }),
                    };
                } catch {
                    // Ignore malformed highlight cache and continue with server payload.
                }
            }

            if (resolvedStartPartIndex >= 0) {
                setCurrentPartIndex(resolvedStartPartIndex);
            } else {
                setCurrentPartIndex(0);
            }

            setTestData(configuredData);
            setLoading(false);

            if (isReview) {
                const savedAnswers = sessionStorage.getItem('lastAnswers_reading');
                if (savedAnswers) {
                    setAnswers(JSON.parse(savedAnswers));
                }
                const savedScore = sessionStorage.getItem('lastScore_reading');
                if (savedScore) {
                    setScoreInfo(JSON.parse(savedScore));
                }
            }
        }).catch((err) => {
            console.error('[Reading] Lỗi tải bài thi:', err);
            setError(err.message === 'AUTH_REQUIRED'
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : `Không thể tải bài thi: ${err.message}`);
            setLoading(false);
        });
    }, [testId, isReview, mode, isFullTest, selectedPracticeParts, startPartNumber, durationOverrideMinutes, noTimeLimit, setCurrentPartIndex, highlightStorageKey]);

    useEffect(() => {
        if (!isFullTest || isReview || !testData || !testId) return undefined;
        let canceled = false;

        const restoreSnapshot = async () => {
            let snapshot = parseJsonSafe(sessionStorage.getItem(`ieltsFullTestSnapshot_reading_${testId}`), null);

            try {
                const remote = await ieltsApi.getFullTestProgress(testId);
                if (!canceled && remote && String(remote.currentSkill || '').toLowerCase() === 'reading') {
                    const remoteSnapshot = parseJsonSafe(remote.snapshotJson, null);
                    if (remoteSnapshot) snapshot = remoteSnapshot;

                    const remoteSession = parseJsonSafe(remote.sessionStateJson, null);
                    if (remoteSession?.sections?.length) {
                        sessionStorage.setItem('ieltsFullTest', JSON.stringify(remoteSession));
                    }
                }
            } catch {
                // Ignore restore failure, local state continues to work
            }

            if (!snapshot || canceled) return;

            if (snapshot.answers && typeof snapshot.answers === 'object') {
                setAnswers(snapshot.answers);
            }
            if (snapshot.bookmarks && typeof snapshot.bookmarks === 'object') {
                setBookmarks(snapshot.bookmarks);
            }

            if (Number.isFinite(snapshot.currentPartIndex)) {
                const maxIndex = Math.max(0, (testData.parts?.length || 1) - 1);
                setCurrentPartIndex(Math.max(0, Math.min(maxIndex, snapshot.currentPartIndex)));
            }

            if (Number.isFinite(snapshot.activeQuestion)) {
                setActiveQuestion(snapshot.activeQuestion);
            }
        };

        restoreSnapshot();
        return () => {
            canceled = true;
        };
    }, [isFullTest, isReview, testData, testId, setCurrentPartIndex, setActiveQuestion]);

    useEffect(() => {
        autosaveStateRef.current = {
            answers,
            bookmarks,
            currentPartIndex,
            activeQuestion,
            testData,
        };
    }, [answers, bookmarks, currentPartIndex, activeQuestion, testData]);

    useEffect(() => {
        if (!isFullTest || isReview || !testData || !testId) return undefined;

        const persistProgress = async () => {
            const state = autosaveStateRef.current;
            const parts = state.testData?.parts || [];

            let totalQuestions = 0;
            let answeredQuestions = 0;

            parts.forEach((partItem) => {
                const flatQuestions = partItem.questions?.flatMap((q) => (q.subQuestions ? q.subQuestions : q)) || [];
                flatQuestions.forEach((q) => {
                    const weight = q.numberRange ? q.numberRange.length : 1;
                    totalQuestions += weight;
                    const ans = state.answers?.[q.id];
                    const isAnswered = q.selectCount
                        ? (Array.isArray(ans) && ans.length >= q.selectCount)
                        : (typeof ans === 'string' ? ans.trim() !== '' : Array.isArray(ans) ? ans.length > 0 : !!ans);
                    if (isAnswered) answeredQuestions += weight;
                });
            });

            const sectionProgress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) : 0;
            const session = getFullTestSessionState();
            const totalSections = session?.sections?.length || 4;
            const currentSection = Number.isFinite(session?.currentSection) ? session.currentSection : 0;
            const progressPercent = computeFullTestProgressPercent({
                currentSection,
                totalSections,
                sectionProgress,
            });

            const snapshot = {
                answers: state.answers || {},
                bookmarks: state.bookmarks || {},
                currentPartIndex: state.currentPartIndex || 0,
                activeQuestion: state.activeQuestion || 1,
                savedAt: Date.now(),
            };

            sessionStorage.setItem(`ieltsFullTestSnapshot_reading_${testId}`, JSON.stringify(snapshot));

            try {
                await ieltsApi.saveFullTestProgress(testId, {
                    status: 'IN_PROGRESS',
                    mode: session?.mode || mode,
                    currentSection,
                    currentSkill: 'reading',
                    currentPartIndex: state.currentPartIndex || 0,
                    progressPercent,
                    routePath: `/test/reading/${testId}`,
                    queryString,
                    sessionStateJson: JSON.stringify(session || {}),
                    snapshotJson: JSON.stringify(snapshot),
                });
            } catch {
                // Keep local backup even when remote save fails
            }
        };

        persistProgress();
    }, [
        isFullTest,
        isReview,
        testData,
        testId,
        mode,
        queryString,
        answers,
        bookmarks,
        currentPartIndex,
        activeQuestion,
    ]);

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

            const nextHtml = clone.innerHTML;

            setTestData((prev) => {
                if (!prev?.parts?.length) return prev;

                const nextParts = prev.parts.map((p, idx) => {
                    if (idx !== currentPartIndex) return p;
                    return {
                        ...p,
                        passageContent: nextHtml,
                    };
                });

                if (highlightStorageKey) {
                    try {
                        const currentMap = JSON.parse(sessionStorage.getItem(highlightStorageKey) || '{}');
                        const partId = nextParts[currentPartIndex]?.id;
                        if (partId !== undefined && partId !== null) {
                            currentMap[String(partId)] = nextHtml;
                            sessionStorage.setItem(highlightStorageKey, JSON.stringify(currentMap));
                        }
                    } catch {
                        // Ignore storage errors and keep in-memory update.
                    }
                }

                return {
                    ...prev,
                    parts: nextParts,
                };
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
                const progressPercent = computeFullTestProgressPercent({
                    currentSection: nextIdx,
                    totalSections: updated.sections.length,
                    sectionProgress: 0,
                });
                ieltsApi.saveFullTestProgress(testId, {
                    status: 'IN_PROGRESS',
                    mode: updated.mode || mode,
                    currentSection: nextIdx,
                    currentSkill: next.skill,
                    currentPartIndex: 0,
                    progressPercent,
                    routePath: `/test/${next.skill}/${next.testId}`,
                    queryString: `fullTest=true&mode=${updated.mode || mode}`,
                    sessionStateJson: JSON.stringify(updated),
                    snapshotJson: '{}',
                }).catch(() => { });
                const nextUrl = `/test/${next.skill}/${next.testId}?fullTest=true&mode=${session.mode || mode}`;
                markTestSubmitted(timerPersistKey, nextUrl);
                navigate(nextUrl);
            } else {
                sessionStorage.removeItem('ieltsFullTest');
                sessionStorage.removeItem(`ieltsFullTestSnapshot_reading_${testId}`);
                ieltsApi.clearFullTestProgress(testId).catch(() => { });
                const completeUrl = `/test/complete?mode=${session.mode || mode}&skill=reading&fullTest=true&testId=${testId}`;
                markTestSubmitted(timerPersistKey, completeUrl);
                navigate(completeUrl);
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = async () => {
        const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
        // Lưu lại đáp án để lát review
        sessionStorage.setItem('lastAnswers_reading', JSON.stringify(answers));

        console.log('🎯 Submitting answers:', answers);
        console.log('📚 Test data:', testData);

        const resp = await ieltsApi.submitAnswers(testId, 'READING', answers, timeSpentSeconds, testData);
        
        // Check if this is from an assignment
        const assignmentId = searchParams.get('assignmentId');
        if (assignmentId && resp?.attemptId) {
            try {
                await assignmentApi.submitAssignment({
                    assignmentId: parseInt(assignmentId),
                    examAttemptId: resp.attemptId,
                    submissionText: `Completed test ${testId} with score: ${resp.bandScore || resp.score || 'N/A'}`
                });
                console.log('✅ Assignment submitted automatically');
            } catch (error) {
                console.error('Failed to submit assignment:', error);
            }
        }
        
        if (resp) {
            sessionStorage.setItem('lastScore_reading', JSON.stringify(resp));
        }
        clearDraftByTest('reading', testId);
        localStorage.removeItem(`ieltsTimerDeadline_${timerPersistKey}`);
        if (isFullTest) { handleFullTestNext(); return; }
        
        // Redirect khác nhau cho assignment mode
        if (isAssignmentMode) {
            navigate(`/student/assignments/${assignmentId}/result`);
            return;
        }
        
        const completeParams = new URLSearchParams({
            mode,
            skill: 'reading',
            testId: String(testId),
        });
        if (mode === 'exam' && allowReviewInExam) {
            completeParams.set('allowReview', 'true');
        }
        const completeUrl = `/test/complete?${completeParams.toString()}`;
        markTestSubmitted(timerPersistKey, completeUrl);
        navigate(completeUrl);
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

    // Group consecutive questions by type, allowMultipleAnswers AND groupInstruction
    const questionGroups = [];
    let currentGroup = null;
    for (const q of part.questions) {
        const groupType = (q.type === 'drag-and-drop' || q.type === 'matching_heading' || q.type === 'matching_info')
            ? 'drag-drop' : q.type;
        const groupInstr = q.groupInstruction || '';
        const isMulti = q.allowMultipleAnswers ? '1' : '0';
        const groupKey = `${groupType}|${isMulti}|${groupInstr}`;

        if (!currentGroup || currentGroup.key !== groupKey) {
            currentGroup = {
                key: groupKey,
                type: groupType,
                instructions: groupInstr,
                questions: []
            };
            questionGroups.push(currentGroup);
        }
        currentGroup.questions.push(q);
    }

    return (
        <div className="ielts-container">
            <TestHeader
                candidateName={testData?.candidateName}
                candidateId={testData?.candidateId}
                extraInfo={isAssignmentMode ? "📝 Bài tập" : undefined}
                submitTest={submitTest}
                isReview={isReview}
                noTimeLimit={noTimeLimit && !isReview}
                isFullTest={isFullTest}
                skill="reading"
                navigate={navigate}
                duration={testData?.totalMinutes}
                onTimeUp={submitTest}
                timerPersistKey={timerPersistKey}
                isNotesOpen={isNotesOpen}
                onToggleNotes={() => setIsNotesOpen(v => !v)}
            />

            <div className="instruction-bar">
                <h3 dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part.title || '') }} />
                {(part.instructions || part.instruction) && (
                    <p dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part.instructions || part.instruction) }} />
                )}
                {isReview && scoreInfo && (
                    <div className="review-score-banner">
                        <div className="review-score-main">
                            Score: {Number.isFinite(scoreInfo.totalCorrect) ? scoreInfo.totalCorrect : 0}
                            {' / '}
                            {testData ? testData.parts.reduce((sum, _, idx) => sum + getTotalCount(idx), 0) : (scoreInfo.totalAnswered || 0)}
                        </div>
                        {Number.isFinite(scoreInfo.rawScore) && (
                            <div className="review-score-sub">Raw score: {scoreInfo.rawScore % 1 === 0 ? scoreInfo.rawScore : scoreInfo.rawScore.toFixed(2)}</div>
                        )}
                    </div>
                )}
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
                        {questionGroups.map((group, gi) => {
                            // Get instruction from group
                            const groupInstruction = group.instructions;

                            return (
                                <div key={gi} style={{ marginBottom: '40px' }}>
                                    {/* Questions range header */}
                                    {(() => {
                                        const allNums = group.questions.flatMap(q => {
                                            // For drag-drop groups, get numbers from subQuestions
                                            if (q?.subQuestions?.length) {
                                                return q.subQuestions.map(sq => sq.number).filter(n => n != null);
                                            }
                                            return q?.numberRange || (q?.number ? [q.number] : []);
                                        }).filter(n => n != null);
                                        if (allNums.length > 0) {
                                            const first = Math.min(...allNums);
                                            const last = Math.max(...allNums);
                                            return (
                                                <div className="question-range-header">
                                                    Questions {first}{last !== first ? `–${last}` : ''}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Group instruction - show once at top */}
                                    {groupInstruction && (
                                        <div className="mcq-group-instruction" dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(groupInstruction) }} />
                                    )}

                                    {group.questions.map(q => {
                                        const questionNumbers = q?.numberRange?.length
                                            ? q.numberRange
                                            : q?.subQuestions?.length
                                                ? q.subQuestions.map((sq) => sq.number).filter((n) => n != null)
                                                : (q?.number != null ? [q.number] : []);

                                        return (
                                            <div
                                                key={q.id}
                                                data-question-numbers={questionNumbers.length ? questionNumbers.join(' ') : undefined}
                                            >
                                                <QuestionRenderer
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
                                            </div>
                                        );
                                    })}

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
                            );
                        })}
                    </div>

                    <div className="pane-nav-buttons">
                        <button className="black-nav-btn" onClick={goPrev} disabled={isFirstQuestion} style={{ opacity: isFirstQuestion ? 0.5 : 1 }}>
                            <span className="nav-arrow-fallback" aria-hidden="true">&#8592;</span>
                        </button>
                        <button className="black-nav-btn" onClick={goNext} disabled={isLastQuestion} style={{ opacity: isLastQuestion ? 0.5 : 1 }}>
                            <span className="nav-arrow-fallback" aria-hidden="true">&#8594;</span>
                        </button>
                    </div>
                </div>
                <TextHighlighter containerRef={containerRef} onHighlightChange={handleHighlightChange} onAddNote={addNote} currentPartIndex={currentPartIndex} />
            </main>

            <footer className="ielts-footer">

                <div className="footer-content">
                    {testData && testData.parts.map((p, index) => {
                        const isActivePart = currentPartIndex === index;
                        const answeredCount = getAnsweredCount(index);
                        const totalCount = getTotalCount(index);
                        const flatQuestions = p.questions?.flatMap(q => q.subQuestions ? q.subQuestions : q) || [];
                        const partHasBookmarked = !isReview && flatQuestions.some((q) => {
                            const nums = q.numberRange || [q.number];
                            return nums.some((n) => bookmarks[n]);
                        });

                        return (
                            <div
                                key={p.id}
                                className={`part-group ${isActivePart ? "active-part" : ""}`}
                                onClick={() => setCurrentPartIndex(index)}
                            >
                                <div className="part-status-container">
                                    {partHasBookmarked && !isActivePart && (
                                        <span className="part-title-bookmark" aria-hidden="true">
                                            <BookmarkToggle size={16} active activeColor="currentColor" inactiveColor="currentColor" strokeWidth={2.25} />
                                        </span>
                                    )}
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
                                            const hasBookmarked = !isReview && nums.some(n => bookmarks[n]);

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
                                                    {hasBookmarked && (
                                                        <div className="q-bookmark-flag">
                                                            <BookmarkToggle size={16} active activeColor="#1a73e8" inactiveColor="#1a73e8" />
                                                        </div>
                                                    )}
                                                    <div className={`status-dash${isAnswered ? " answered-dash" : ""}${hasBookmarked ? " bookmarked-dash" : ""}`} />
                                                    <span className={`q-num${isActive ? " active" : ""}${isRange ? " q-num-range" : ""}${hasBookmarked ? " bookmarked" : ""}`}>
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

            {/* Notes Panel — rendered directly to avoid prop-drilling through TestHeader */}
            <NotesPanel
                isOpen={isNotesOpen}
                notes={notes}
                onDelete={deleteNote}
                onClose={() => setIsNotesOpen(false)}
                onNoteClick={(note, scrollFn) => {
                    // Navigate to the part the note was created in, then scroll to text
                    if (Number.isFinite(note.partIndex) && note.partIndex !== currentPartIndex) {
                        setCurrentPartIndex(note.partIndex);
                        setTimeout(scrollFn, 300);
                    } else {
                        scrollFn();
                    }
                }}
            />
        </div>
    );
};

export default IeltsReadingTest;
