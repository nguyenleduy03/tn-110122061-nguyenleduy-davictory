import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { resolveDrivePreviewUrl } from "../utils/mediaUrl";
import { ArrowLeftRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import { useDividerResize } from "../hooks/useDividerResize";
import TextHighlighter from "../components/common/TextHighlighter";
import NotesPanel from "../components/common/NotesPanel";
import { ieltsApi } from "../services/ieltsApi";
import { assignmentApi } from "../services/assignmentApi";
import { formatTextWithWhitespace, normalizeRichHtml, stripInlineStyles } from "../utils/textFormatters";
import { computeFullTestProgressPercent, getFullTestSessionState, parseJsonSafe } from "../utils/fullTestProgress";
import { buildDraftStorageKey, buildTimerPersistKey, clearDraftByTest, parseJsonSafe as parseRuntimeJsonSafe, markTestSubmitted, getSubmittedRedirect } from "../utils/testRuntimeState";
import { useNotes } from "../hooks/useNotes";

const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
};

const toHtmlContent = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!/<[^>]+>/.test(raw)) {
        return formatTextWithWhitespace(raw);
    }

    const normalized = normalizeRichHtml(raw);
    return stripInlineStyles(normalized);
};

const toComparableText = (value) => String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const WritingTaskPane = ({ part, style }) => {
    if (!part) return null;
    const firstQuestionText = part?.questions?.find((q) => q?.text || q?.questionText || q?.blankContext);
    const taskBodyRaw = part.taskInstruction
        || part.prompt
        || part.description
        || firstQuestionText?.text
        || firstQuestionText?.questionText
        || firstQuestionText?.blankContext
        || part.instruction
        || '';
    const taskBodyHtml = toHtmlContent(taskBodyRaw);
    const showTaskBody = Boolean(taskBodyHtml);

    return (
        <div className="writing-task-pane" style={style}>
            <div className="writing-task-inner">
                {showTaskBody && (
                    <div
                        className="writing-task-instruction"
                        dangerouslySetInnerHTML={{ __html: taskBodyHtml }}
                    />
                )}
                {part.taskImageSvg && (
                    <div
                        className="writing-task-image"
                        dangerouslySetInnerHTML={{ __html: part.taskImageSvg }}
                    />
                )}
                {!part.taskImageSvg && part.imageUrl && (
                    <div className="writing-task-image">
                        <img src={resolveDrivePreviewUrl(part.imageUrl)} alt="task diagram"
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
    const [error, setError] = useState(null);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [writingAnswers, setWritingAnswers] = useState({});
    const [startTime] = useState(() => Date.now()); // theo dõi thời gian làm bài
    const { leftWidth, containerRef, handleDragStart } = useDividerResize(50);
    const { id: testId } = useParams();
    const { notes, addNote, deleteNote } = useNotes('writing', testId);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isFullTest = searchParams.get('fullTest') === 'true';
    const mode = searchParams.get('mode') || 'practice';
    const assignmentId = searchParams.get('assignment');
    const selectedPartsParam = searchParams.get('parts') || '';
    const startPartNumber = Number.parseInt(searchParams.get('startPart') || '', 10);
    const durationOverrideMinutes = Number.parseInt(searchParams.get('duration') || '', 10);
    const noTimeLimit = searchParams.get('noTimeLimit') === 'true' || searchParams.get('duration') === '0';
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
    const draftStorageKey = useMemo(() => buildDraftStorageKey('writing', draftMode, testId), [draftMode, testId]);
    const timerPersistKey = useMemo(() => buildTimerPersistKey({
        skill: 'writing',
        testId,
        mode,
        isFullTest,
        queryString,
    }), [testId, mode, isFullTest, queryString]);

    useEffect(() => {
        const submittedRedirect = getSubmittedRedirect(timerPersistKey);
        if (!submittedRedirect) return;
        navigate(submittedRedirect, { replace: true });
    }, [timerPersistKey, navigate]);
    const autosaveStateRef = useRef({
        writingAnswers: {},
        currentPartIndex: 0,
        testData: null,
    });
    const previousWritingAnswersRef = useRef(writingAnswers);

    useEffect(() => {
        if (!testId) { setError('Không tìm thấy ID bài thi.'); setLoading(false); return; }
        
        const fallbackParam = searchParams.get('fallback');
        const fallbackSkills = fallbackParam ? fallbackParam.split(',') : [];
        
        ieltsApi.getTestSession(testId, 'WRITING', fallbackSkills).then((data) => {
            const shouldApplyPracticeConfig = mode === 'practice' && !isFullTest;
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
            }

            // Apply duration override for ALL modes (practice & exam)
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

            const resolvedStartPartIndex = Number.isFinite(startPartNumber) && startPartNumber > 0
                ? configuredData.parts.findIndex((p, idx) => {
                    const parsedPartNo = Number.parseInt(String(p?.partNumber ?? ''), 10);
                    const partNo = Number.isFinite(parsedPartNo) && parsedPartNo > 0 ? parsedPartNo : (idx + 1);
                    return partNo === startPartNumber;
                })
                : -1;

            setTestData(configuredData);
            setCurrentPartIndex(resolvedStartPartIndex >= 0 ? resolvedStartPartIndex : 0);
            setLoading(false);
        }).catch((err) => {
            console.error('[Writing] Lỗi tải bài thi:', err);
            setError(err.message === 'AUTH_REQUIRED'
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : `Không thể tải bài thi: ${err.message}`);
            setLoading(false);
        });
    }, [testId, mode, isFullTest, selectedPracticeParts, startPartNumber, durationOverrideMinutes, noTimeLimit]);

    useEffect(() => {
        if (!isFullTest || !testData || !testId) return undefined;
        let canceled = false;

        const restoreSnapshot = async () => {
            let snapshot = parseJsonSafe(sessionStorage.getItem(`ieltsFullTestSnapshot_writing_${testId}`), null);

            try {
                const remote = await ieltsApi.getFullTestProgress(testId);
                if (!canceled && remote && String(remote.currentSkill || '').toLowerCase() === 'writing') {
                    const remoteSnapshot = parseJsonSafe(remote.snapshotJson, null);
                    if (remoteSnapshot) snapshot = remoteSnapshot;

                    const remoteSession = parseJsonSafe(remote.sessionStateJson, null);
                    if (remoteSession?.sections?.length) {
                        sessionStorage.setItem('ieltsFullTest', JSON.stringify(remoteSession));
                    }
                }
            } catch {
                // Ignore restore failure and continue with local state
            }

            if (!snapshot || canceled) return;

            if (snapshot.writingAnswers && typeof snapshot.writingAnswers === 'object') {
                setWritingAnswers(snapshot.writingAnswers);
            }
            if (Number.isFinite(snapshot.currentPartIndex)) {
                const maxIndex = Math.max(0, (testData.parts?.length || 1) - 1);
                setCurrentPartIndex(Math.max(0, Math.min(maxIndex, snapshot.currentPartIndex)));
            }
        };

        restoreSnapshot();
        return () => {
            canceled = true;
        };
    }, [isFullTest, testData, testId]);

    useEffect(() => {
        if (isFullTest || !testData || !testId) return;
        const savedDraft = parseRuntimeJsonSafe(localStorage.getItem(draftStorageKey), null);
        if (!savedDraft || typeof savedDraft !== 'object') return;

        if (savedDraft.writingAnswers && typeof savedDraft.writingAnswers === 'object') {
            setWritingAnswers(savedDraft.writingAnswers);
        }
        if (Number.isFinite(savedDraft.currentPartIndex)) {
            const maxIndex = Math.max(0, (testData.parts?.length || 1) - 1);
            setCurrentPartIndex(Math.max(0, Math.min(maxIndex, savedDraft.currentPartIndex)));
        }
    }, [isFullTest, testData, testId, draftStorageKey]);

    useEffect(() => {
        autosaveStateRef.current = {
            writingAnswers,
            currentPartIndex,
            testData,
        };
    }, [writingAnswers, currentPartIndex, testData]);

    useEffect(() => {
        if (!isFullTest || !testData || !testId) return undefined;
        const answersChanged = previousWritingAnswersRef.current !== writingAnswers;
        let debounceTimer = null;

        const persistProgress = async () => {
            const state = autosaveStateRef.current;
            const parts = state.testData?.parts || [];
            const completedParts = parts.reduce((count, p) => {
                const text = (state.writingAnswers?.[p.id] || '').trim();
                return text ? count + 1 : count;
            }, 0);

            const sectionProgress = parts.length > 0 ? (completedParts / parts.length) : 0;
            const session = getFullTestSessionState();
            const totalSections = session?.sections?.length || 4;
            const currentSection = Number.isFinite(session?.currentSection) ? session.currentSection : 0;
            const progressPercent = computeFullTestProgressPercent({
                currentSection,
                totalSections,
                sectionProgress,
            });

            const snapshot = {
                writingAnswers: state.writingAnswers || {},
                currentPartIndex: state.currentPartIndex || 0,
                savedAt: Date.now(),
            };

            sessionStorage.setItem(`ieltsFullTestSnapshot_writing_${testId}`, JSON.stringify(snapshot));

            try {
                await ieltsApi.saveFullTestProgress(testId, {
                    status: 'IN_PROGRESS',
                    mode: session?.mode || mode,
                    currentSection,
                    currentSkill: 'writing',
                    currentPartIndex: state.currentPartIndex || 0,
                    progressPercent,
                    routePath: `/test/writing/${testId}`,
                    queryString,
                    sessionStateJson: JSON.stringify(session || {}),
                    snapshotJson: JSON.stringify(snapshot),
                });
            } catch {
                // Keep local backup even when remote save fails
            }
        };

        if (answersChanged) {
            debounceTimer = setTimeout(() => {
                persistProgress();
            }, 450);
        } else {
            persistProgress();
        }

        previousWritingAnswersRef.current = writingAnswers;

        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [
        isFullTest,
        testData,
        testId,
        mode,
        queryString,
        writingAnswers,
        currentPartIndex,
    ]);

    useEffect(() => {
        if (isFullTest || !testData || !testId) return;

        const snapshot = {
            mode: draftMode,
            queryString,
            writingAnswers,
            currentPartIndex,
            savedAt: Date.now(),
        };

        localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
    }, [
        isFullTest,
        testData,
        testId,
        draftStorageKey,
        draftMode,
        queryString,
        writingAnswers,
        currentPartIndex,
    ]);

    const handleAnswerChange = useCallback((partId, value) => {
        setWritingAnswers((prev) => ({ ...prev, [partId]: value }));
    }, []);

    useEffect(() => {
        if (!testData?.parts?.length) return;
        if (currentPartIndex > testData.parts.length - 1) {
            setCurrentPartIndex(0);
        }
    }, [testData, currentPartIndex]);

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
                sessionStorage.removeItem(`ieltsFullTestSnapshot_writing_${testId}`);
                ieltsApi.clearFullTestProgress(testId).catch(() => { });
                const completeParams = new URLSearchParams({
                    mode: session.mode || mode,
                    skill: 'writing',
                    fullTest: 'true',
                    testId: String(testId),
                });
                if ((session.mode || mode) === 'exam') {
                    completeParams.set('allowReview', 'true');
                }
                const completeUrl = `/test/complete?${completeParams.toString()}`;
                markTestSubmitted(timerPersistKey, completeUrl);
                navigate(completeUrl);
            }
        } catch { navigate('/exam-library'); }
    };

    const submitTest = () => {
        const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);
        const parts = testData?.parts || [];

        // Submit bài thi bình thường
        const writingPayload = {};
        parts.forEach((partItem) => {
            const partAnswer = String(writingAnswers?.[partItem.id] || '').trim();
            if (!partAnswer) return;

            const firstQuestionId = partItem?.questions?.[0]?.id;
            if (firstQuestionId) {
                writingPayload[firstQuestionId] = partAnswer;
            }
        });

        ieltsApi.submitAnswers(testId, 'WRITING', writingPayload, timeTakenSeconds)
            .then((resp) => {
                clearDraftByTest('writing', testId);
                localStorage.removeItem(`ieltsTimerDeadline_${timerPersistKey}`);
                
                // Nếu là bài tập, submit vào assignment API
                if (assignmentId && resp?.attemptId) {
                    import('../utils/assignmentHelper').then(({ submitTestToAssignment }) => {
                        submitTestToAssignment(
                            parseInt(assignmentId),
                            resp.attemptId,
                            navigate,
                            null,
                            (err) => alert(`Nộp bài tập thất bại: ${err.message}`)
                        );
                    });
                    return;
                }
                
                if (isFullTest) { handleFullTestNext(); return; }
                const completeParams = new URLSearchParams({
                    mode,
                    skill: 'writing',
                    testId: String(testId),
                });
                if (mode === 'exam') {
                    completeParams.set('allowReview', 'true');
                }
                const completeUrl = `/test/complete?${completeParams.toString()}`;
                markTestSubmitted(timerPersistKey, completeUrl);
                navigate(completeUrl);
            })
            .catch((err) => {
                console.error('[Writing] Lỗi nộp bài:', err);
                const completeParams = new URLSearchParams({
                    mode,
                    skill: 'writing',
                    testId: String(testId),
                });
                if (mode === 'exam') {
                    completeParams.set('allowReview', 'true');
                }
                const completeUrl = `/test/complete?${completeParams.toString()}`;
                markTestSubmitted(timerPersistKey, completeUrl);
                navigate(completeUrl);
            });
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
    if (!testData) return <div style={{ padding: "50px" }}>No test data available</div>;

    const parts = testData.parts || [];
    const part = parts[currentPartIndex];
    const isFirstPart = currentPartIndex === 0;
    const isLastPart = currentPartIndex === parts.length - 1;
    const defaultGuidance = `You should spend about ${part?.recommendedMinutes || 20} minutes on this task. Write at least ${part?.minWords || 150} words.`;
    const topInstructionHtml = toHtmlContent(part?.instruction || defaultGuidance);

    return (
        <div className="ielts-container">
            <TestHeader
                candidateName={testData.candidateName}
                candidateId={testData.candidateId}
                submitTest={submitTest}
                duration={testData.totalMinutes}
                noTimeLimit={noTimeLimit}
                onTimeUp={submitTest}
                isFullTest={isFullTest}
                skill="writing"
                navigate={navigate}
                timerPersistKey={timerPersistKey}
                isNotesOpen={isNotesOpen}
                onToggleNotes={() => setIsNotesOpen((v) => !v)}
                mode={assignmentId ? 'practice' : mode}
            />

            <div className="instruction-bar">
                <h3 dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part.title || '') }} />
                <p dangerouslySetInnerHTML={{ __html: topInstructionHtml }} />
            </div>

            <main className="ielts-main" ref={containerRef}>
                {/* Left pane: task prompt + image */}
                <WritingTaskPane
                    part={part}
                    style={{ width: `${leftWidth}%` }}
                />

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
                        <span className="nav-arrow-fallback" aria-hidden="true">&#8592;</span>
                    </button>
                    <button className="black-nav-btn" onClick={() => setCurrentPartIndex((i) => Math.min(parts.length - 1, i + 1))} disabled={isLastPart} style={{ opacity: isLastPart ? 0.5 : 1 }}>
                        <span className="nav-arrow-fallback" aria-hidden="true">&#8594;</span>
                    </button>
                </div>
                <TextHighlighter
                    containerRef={containerRef}
                    onAddNote={addNote}
                    currentPartIndex={currentPartIndex}
                />
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
                                    <h4 className="part-title hover-pointer">Part {p.partNumber || (index + 1)}</h4>
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

export default IeltsWritingTest;
