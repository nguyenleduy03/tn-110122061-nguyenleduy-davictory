import React, { useState, useEffect, useRef, useMemo } from "react";
import { Volume2, ArrowLeftRight, Headphones, Play, ArrowLeft, ArrowRight } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import QuestionRenderer from "../components/question/QuestionRenderer";
import { useTestNavigation } from "../hooks/useTestNavigation";
import { ieltsApi } from "../services/ieltsApi";
import { assignmentApi } from "../services/assignmentApi";
import TextHighlighter from "../components/common/TextHighlighter";
import NotesPanel from "../components/common/NotesPanel";
import { formatTextWithWhitespace } from "../utils/textFormatters";
import { computeFullTestProgressPercent, getFullTestSessionState, parseJsonSafe } from "../utils/fullTestProgress";
import { buildDraftStorageKey, buildTimerPersistKey, clearDraftByTest, parseJsonSafe as parseRuntimeJsonSafe, markTestSubmitted, getSubmittedRedirect } from "../utils/testRuntimeState";
import { useNotes } from "../hooks/useNotes";
import GuestInfoForm from "../components/common/GuestInfoForm";
import BookmarkToggle from "../components/common/BookmarkToggle";

const resolvePlayableMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('/api/files/preview/')) return url;
    if (url.startsWith('data:')) return url;

    const driveIdMatch = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveIdMatch?.[1]) {
        return `/api/files/preview/${driveIdMatch[1]}`;
    }

    return url;
};

const IeltsListeningTest = () => {
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestInfo, setGuestInfo] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [attemptId, setAttemptId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bookmarks, setBookmarks] = useState({});
    const [scoreInfo, setScoreInfo] = useState(null);
    const [audioStarted, setAudioStarted] = useState(() => {
        // Immediately check if resuming a started session to avoid overlay flash
        if (typeof window === 'undefined') return false;
        try {
            const params = new URLSearchParams(window.location.search);
            const reviewParam = params.get('review');
            if (reviewParam === 'true') return true; // review mode: skip overlay
            const modeParam = params.get('mode') || 'practice';
            const draftModeKey = modeParam === 'exam' ? 'exam' : 'practice';
            // Extract testId from URL path /test/listening/:id
            const pathMatch = window.location.pathname.match(/\/test\/listening\/([^/?]+)/);
            const testIdFromPath = pathMatch ? pathMatch[1] : '';
            if (!testIdFromPath) return false;
            const safeId = testIdFromPath.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
            const key = `ieltsDraft_listening_${draftModeKey}_${safeId}`;
            const raw = localStorage.getItem(key);
            if (!raw) return false;
            const saved = JSON.parse(raw);
            return Boolean(saved?.audioStarted);
        } catch {
            return false;
        }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startTime] = useState(() => Date.now());
    const audioRef = useRef(null);
    const containerRef = useRef(null);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { id: testId } = useParams();
    const { notes, addNote, deleteNote } = useNotes('listening', testId);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const isFullTest = searchParams.get('fullTest') === 'true';
    const mode = searchParams.get('mode') || 'practice';
    const isReview = searchParams.get('review') === 'true';
    const assignmentId = searchParams.get('assignment');
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
    const draftMode = mode === 'exam' ? 'exam' : 'practice';
    const draftStorageKey = useMemo(() => buildDraftStorageKey('listening', draftMode, testId), [draftMode, testId]);
    const timerPersistKey = useMemo(() => buildTimerPersistKey({
        skill: 'listening',
        testId,
        mode,
        isFullTest,
        queryString,
    }), [testId, mode, isFullTest, queryString]);
    const highlightStorageKey = useMemo(() => {
        if (!testId) return null;
        return `ieltsHighlights_listening_${testId}`;
    }, [testId]);

    useEffect(() => {
        const submittedRedirect = getSubmittedRedirect(timerPersistKey);
        if (!submittedRedirect) return;
        navigate(submittedRedirect, { replace: true });
    }, [timerPersistKey, navigate]);

    // Check guest mode
    useEffect(() => {
        if (isReview) return;

        const savedGuestInfo = sessionStorage.getItem('guestExamInfo');
        if (savedGuestInfo) {
            try {
                const info = JSON.parse(savedGuestInfo);
                setGuestInfo(info);
                setIsGuest(true);
                return;
            } catch (e) {
                sessionStorage.removeItem('guestExamInfo');
            }
        }

        const isAuth = ieltsApi.isAuthenticated();
        if (!isAuth) {
            setShowGuestForm(true);
        }
    }, [isReview]);

    const autosaveStateRef = useRef({
        answers: {},
        bookmarks: {},
        currentPartIndex: 0,
        activeQuestion: 1,
        audioStarted: false,
        testData: null,
    });

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
        
        // Lấy fallback skills từ URL
        const fallbackParam = searchParams.get('fallback');
        const fallbackSkills = fallbackParam ? fallbackParam.split(',') : [];
        
        ieltsApi.getTestSession(testId, "LISTENING", fallbackSkills).then((data) => {
            // Nếu data.skillType khác LISTENING, redirect sang skill đúng
            if (data.skillType && data.skillType !== 'LISTENING') {
                const skill = data.skillType.toLowerCase();
                console.log(`[Listening] Redirecting to ${skill}`);
                navigate(`/test/${skill}/${testId}?${searchParams.toString()}`, { replace: true });
                return;
            }
            
            const shouldApplyPracticeConfig = mode === 'practice' && !isFullTest && !isReview;
            let configuredData = { ...data, testType: "Academic Listening" };

            if (shouldApplyPracticeConfig) {
                let configuredParts = configuredData.parts;

                if (selectedPracticeParts.length > 0) {
                    const filteredParts = configuredData.parts.filter((p, idx) => {
                        const parsedPartNo = Number.parseInt(String(p?.partNumber ?? ''), 10);
                        const partNo = Number.isFinite(parsedPartNo) && parsedPartNo > 0 ? parsedPartNo : (idx + 1);
                        return selectedPracticeParts.includes(partNo);
                    });
                    configuredParts = filteredParts.length ? filteredParts : configuredData.parts;
                }

                configuredData = {
                    ...configuredData,
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

            const resolvedStartPartIndex = Number.isFinite(startPartNumber) && startPartNumber > 0
                ? configuredData.parts.findIndex((p, idx) => {
                    const parsedPartNo = Number.parseInt(String(p?.partNumber ?? ''), 10);
                    const partNo = Number.isFinite(parsedPartNo) && parsedPartNo > 0 ? parsedPartNo : (idx + 1);
                    return partNo === startPartNumber;
                })
                : -1;
            const initialPartIndex = resolvedStartPartIndex >= 0 ? resolvedStartPartIndex : 0;

            setTestData(configuredData);
            setCurrentPartIndex(initialPartIndex);
            setLoading(false);

            // Start attempt for guest
            if (isGuest && guestInfo && !attemptId) {
                ieltsApi.startGuestAttempt(guestInfo, testId, 'LISTENING')
                    .then(attempt => {
                        setAttemptId(attempt.id);
                        console.log('Guest attempt started:', attempt.id);
                    })
                    .catch(err => console.error('Failed to start guest attempt:', err));
            }

            if (isReview) {
                setAudioStarted(true);
                const savedAnswers = sessionStorage.getItem('lastAnswers_listening');
                if (savedAnswers) {
                    setAnswers(JSON.parse(savedAnswers));
                }
                const savedScore = sessionStorage.getItem('lastScore_listening');
                if (savedScore) {
                    setScoreInfo(JSON.parse(savedScore));
                }
            }
        }).catch((err) => {
            console.error('[Listening] Lỗi tải bài thi:', err);
            setError(err.message === 'AUTH_REQUIRED'
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : `Không thể tải bài thi: ${err.message}`);
            setLoading(false);
        });
    }, [testId, isReview, mode, isFullTest, selectedPracticeParts, startPartNumber, durationOverrideMinutes, noTimeLimit, setCurrentPartIndex, isGuest, guestInfo, attemptId, highlightStorageKey]);

    useEffect(() => {
        if (!isFullTest || isReview || !testData || !testId) return undefined;
        let canceled = false;

        const restoreSnapshot = async () => {
            let snapshot = parseJsonSafe(sessionStorage.getItem(`ieltsFullTestSnapshot_listening_${testId}`), null);

            try {
                const remote = await ieltsApi.getFullTestProgress(testId);
                if (!canceled && remote && String(remote.currentSkill || '').toLowerCase() === 'listening') {
                    const remoteSnapshot = parseJsonSafe(remote.snapshotJson, null);
                    if (remoteSnapshot) snapshot = remoteSnapshot;

                    const remoteSession = parseJsonSafe(remote.sessionStateJson, null);
                    if (remoteSession?.sections?.length) {
                        sessionStorage.setItem('ieltsFullTest', JSON.stringify(remoteSession));
                    }
                }
            } catch {
                // Ignore restore failure, local backup still available
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
            if (snapshot.audioStarted) {
                setAudioStarted(true);
            }
        };

        restoreSnapshot();
        return () => {
            canceled = true;
        };
    }, [isFullTest, isReview, testData, testId, setCurrentPartIndex, setActiveQuestion]);

    useEffect(() => {
        if (isFullTest || isReview || !testData || !testId) return;
        const savedDraft = parseRuntimeJsonSafe(localStorage.getItem(draftStorageKey), null);
        if (!savedDraft || typeof savedDraft !== 'object') return;

        if (savedDraft.answers && typeof savedDraft.answers === 'object') {
            setAnswers(savedDraft.answers);
        }
        if (savedDraft.bookmarks && typeof savedDraft.bookmarks === 'object') {
            setBookmarks(savedDraft.bookmarks);
        }
        if (Number.isFinite(savedDraft.currentPartIndex)) {
            const maxIndex = Math.max(0, (testData.parts?.length || 1) - 1);
            setCurrentPartIndex(Math.max(0, Math.min(maxIndex, savedDraft.currentPartIndex)));
        }
        if (Number.isFinite(savedDraft.activeQuestion)) {
            setActiveQuestion(savedDraft.activeQuestion);
        }
        if (savedDraft.audioStarted) {
            setAudioStarted(true);
        }
    }, [isFullTest, isReview, testData, testId, draftStorageKey, setCurrentPartIndex, setActiveQuestion]);

    useEffect(() => {
        autosaveStateRef.current = {
            answers,
            bookmarks,
            currentPartIndex,
            activeQuestion,
            audioStarted,
            testData,
        };
    }, [answers, bookmarks, currentPartIndex, activeQuestion, audioStarted, testData]);

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
                audioStarted: Boolean(state.audioStarted),
                savedAt: Date.now(),
            };

            sessionStorage.setItem(`ieltsFullTestSnapshot_listening_${testId}`, JSON.stringify(snapshot));

            try {
                await ieltsApi.saveFullTestProgress(testId, {
                    status: 'IN_PROGRESS',
                    mode: session?.mode || mode,
                    currentSection,
                    currentSkill: 'listening',
                    currentPartIndex: state.currentPartIndex || 0,
                    progressPercent,
                    routePath: `/test/listening/${testId}`,
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
        audioStarted,
    ]);

    useEffect(() => {
        if (isFullTest || isReview || !testData || !testId) return;

        const snapshot = {
            mode: draftMode,
            queryString,
            answers,
            bookmarks,
            currentPartIndex,
            activeQuestion,
            audioStarted,
            savedAt: Date.now(),
        };

        localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
    }, [
        isFullTest,
        isReview,
        testData,
        testId,
        draftStorageKey,
        draftMode,
        queryString,
        answers,
        bookmarks,
        currentPartIndex,
        activeQuestion,
        audioStarted,
    ]);

    useEffect(() => {
        if (inputRefs.current && inputRefs.current[activeQuestion] && typeof inputRefs.current[activeQuestion].focus === 'function') {
            inputRefs.current[activeQuestion].focus({ preventScroll: true });
        }
    }, [activeQuestion]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleHighlightChange = () => {
        const passageElem = containerRef.current?.querySelector('.passage-content');
        if (!passageElem || !testData) return;

        const clone = passageElem.cloneNode(true);
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
                sessionStorage.removeItem(`ieltsFullTestSnapshot_listening_${testId}`);
                ieltsApi.clearFullTestProgress(testId).catch(() => { });
                const completeUrl = `/test/complete?mode=${session.mode || mode}&skill=listening&fullTest=true&testId=${testId}`;
                markTestSubmitted(timerPersistKey, completeUrl);
                navigate(completeUrl);
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = () => {
        if (isSubmitting) return;

        // Validate attemptId for guest
        if (isGuest && !attemptId) {
            setError('Lỗi: Không tìm thấy ID bài thi. Vui lòng làm lại.');
            return;
        }

        const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
        sessionStorage.setItem('lastAnswers_listening', JSON.stringify(answers));
        setIsSubmitting(true);

        // Submit bài thi bình thường
        const submitPromise = isGuest
            ? ieltsApi.submitGuestAttempt(attemptId, timeSpentSeconds, Object.entries(answers).map(([qId, ans]) => ({
                questionId: parseInt(qId),
                textAnswer: typeof ans === 'string' ? ans : null,
                selectedOptionLabel: typeof ans === 'string' ? ans : null,
                matchingAnswer: Array.isArray(ans) ? JSON.stringify(ans) : null,
                isFlagged: bookmarks[qId] || false
            })))
            : ieltsApi.submitAnswers(testId, 'LISTENING', answers, timeSpentSeconds, testData);

        submitPromise
            .then((resp) => {
                if (resp) {
                    sessionStorage.setItem('lastScore_listening', JSON.stringify(resp));
                }
                clearDraftByTest('listening', testId);
                localStorage.removeItem(`ieltsTimerDeadline_${timerPersistKey}`);
                
                // Nếu là bài tập, submit vào assignment API
                if (assignmentId && resp?.attemptId) {
                    return import('../utils/assignmentHelper').then(({ submitTestToAssignment }) => {
                        submitTestToAssignment(
                            parseInt(assignmentId),
                            resp.attemptId,
                            navigate,
                            null,
                            (err) => setError(`Nộp bài tập thất bại: ${err.message}`)
                        );
                    });
                }
                
                if (isFullTest) { handleFullTestNext(); return; }
                const completeParams = new URLSearchParams({
                    mode,
                    skill: 'listening',
                    testId: String(testId),
                });
                if (mode === 'exam' && allowReviewInExam) {
                    completeParams.set('allowReview', 'true');
                }
                const completeUrl = `/test/complete?${completeParams.toString()}`;
                markTestSubmitted(timerPersistKey, completeUrl);
                navigate(completeUrl);
            })
            .catch((err) => {
                console.error('[Listening] Submit failed:', err);
                setError(err.message === 'AUTH_REQUIRED'
                    ? 'Bạn cần đăng nhập để nộp bài. Vui lòng đăng nhập lại.'
                    : `Nộp bài thất bại: ${err.message}`);
            })
            .finally(() => {
                setIsSubmitting(false);
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

    if (showGuestForm) {
        return <GuestInfoForm
            onSubmit={(data) => {
                setGuestInfo(data);
                sessionStorage.setItem('guestExamInfo', JSON.stringify(data));
                setIsGuest(true);
                setShowGuestForm(false);
            }}
            onCancel={() => navigate(-1)}
        />;
    }

    const handlePlay = () => {
        setAudioStarted(true);
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
    };

    const playableAudioUrl = resolvePlayableMediaUrl(part?.audioUrl);

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
                noTimeLimit={noTimeLimit && !isReview}
                onTimeUp={submitTest}
                timerPersistKey={timerPersistKey}
                timerPaused={!audioStarted && !isReview}
                isNotesOpen={isNotesOpen}
                onToggleNotes={() => setIsNotesOpen((v) => !v)}
                mode={assignmentId ? 'practice' : mode}
            />

            {/* Hidden audio element */}
            {playableAudioUrl && (
                <audio ref={audioRef} src={playableAudioUrl} preload="auto" />
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
                <h3 dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part.title || '') }} />
                {part.instructions && (
                    <p dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part.instructions) }} />
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

            <main className="ielts-main" ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div
                    className="questions-section"
                    id="questions-area"
                    style={{
                        width: '100%',
                        minWidth: 0,
                        padding: '16px clamp(16px, 2.5vw, 40px) 80px',
                        margin: '0',
                    }}
                >
                    {part.passageContent && part.passageContent !== "<p>Nội dung bài đọc chưa được thiết lập.</p>" && (
                        <div
                            className="listening-visuals passage-content"
                            style={{ marginBottom: '30px' }}
                            dangerouslySetInnerHTML={{ __html: part.passageContent }}
                        />
                    )}

                    {/* Render tất cả loại câu hỏi qua QuestionRenderer */}
                    {(() => {
                        // Group consecutive questions by type, allowMultipleAnswers AND groupInstruction
                        const questionGroups = [];
                        let currentGroup = null;
                        for (const q of (part.questions || [])) {
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
                        return questionGroups.map((group, gi) => {
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
                                </div>
                            );
                        });
                    })()}

                    {audioStarted && <div className="pane-nav-buttons">
                        <button className="black-nav-btn" onClick={goPrev} disabled={isFirstQuestion} style={{ opacity: isFirstQuestion ? 0.5 : 1 }}>
                            <span className="nav-arrow-fallback" aria-hidden="true">&#8592;</span>
                        </button>
                        <button className="black-nav-btn" onClick={goNext} disabled={isLastQuestion} style={{ opacity: isLastQuestion ? 0.5 : 1 }}>
                            <span className="nav-arrow-fallback" aria-hidden="true">&#8594;</span>
                        </button>
                    </div>}
                </div>

                <TextHighlighter
                    containerRef={containerRef}
                    onHighlightChange={handleHighlightChange}
                    onAddNote={addNote}
                    currentPartIndex={currentPartIndex}
                />
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
                                    <span className={`part-status ${isActivePart ? 'part-status-hidden' : ''}`} aria-hidden={isActivePart}>
                                        {answeredCount} of {totalCount}
                                    </span>
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

            <NotesPanel
                isOpen={isNotesOpen}
                notes={notes}
                onDelete={deleteNote}
                onClose={() => setIsNotesOpen(false)}
                onNoteClick={(note, scrollFn) => {
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

export default IeltsListeningTest;
