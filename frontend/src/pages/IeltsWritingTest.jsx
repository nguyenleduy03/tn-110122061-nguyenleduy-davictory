import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { resolveDrivePreviewUrl } from "../utils/mediaUrl";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import GuestInfoForm from "../components/common/GuestInfoForm";
import { useDividerResize } from "../hooks/useDividerResize";
import { useScrollbarActivity } from "../hooks/useScrollbarActivity";
import TextHighlighter from "../components/common/TextHighlighter";
import NotesPanel from "../components/common/NotesPanel";
import { ieltsApi } from "../services/ieltsApi";

import { fileApi } from "../services/fileApi";
import { authApi } from "../services/authApi";
import { formatTextWithWhitespace, normalizeRichHtml, preserveBlockLineBreaks, stripInlineStyles } from "../utils/textFormatters";
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
    return stripInlineStyles(preserveBlockLineBreaks(normalized));
};



const toSafeFileSegment = (value) => String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const isUntitledLike = (value) => {
    const normalized = toSafeFileSegment(value).toLowerCase();
    if (!normalized) return true;
    return normalized === 'untitled'
        || normalized.startsWith('untitled_')
        || normalized === 'untiltle'
        || normalized.startsWith('untiltle_');
};

const toDisplayValue = (value) => (value == null ? '' : String(value).trim());

const isPlaceholderCandidateCode = (value) => {
    const normalized = toSafeFileSegment(value).toUpperCase().replace(/[_\s]+/g, '-');
    return !normalized || [
        'DEFAULT-ID',
        'DEFAULT',
        'N/A',
        'NA',
        'UNKNOWN',
        'NULL',
        'UNDEFINED',
    ].includes(normalized);
};

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
    useScrollbarActivity();

    const [testData, setTestData] = useState(null);
    const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestInfo, setGuestInfo] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [attemptId, setAttemptId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatusText, setSubmitStatusText] = useState('');
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
    const examId = searchParams.get('examId') || null;
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

    useEffect(() => {
        const savedGuestInfo = sessionStorage.getItem('guestExamInfo');
        if (savedGuestInfo) {
            try {
                const info = JSON.parse(savedGuestInfo);
                setGuestInfo(info);
                setIsGuest(true);
                return;
            } catch {
                sessionStorage.removeItem('guestExamInfo');
            }
        }

        if (!ieltsApi.isAuthenticated()) {
            setShowGuestForm(true);
        }
    }, []);
    const autosaveStateRef = useRef({
        writingAnswers: {},
        currentPartIndex: 0,
        testData: null,
    });
    const previousWritingAnswersRef = useRef(writingAnswers);
    const submitInFlightRef = useRef(false);

    useEffect(() => {
        const handlePreviewRefresh = (event) => {
            if (event.origin !== window.location.origin) return;
            const payload = event.data;
            if (!payload || payload.type !== 'DAVICTORY_PREVIEW_REFRESH') return;
            if (String(payload.testId) !== String(testId)) return;
            const skill = String(payload.skillType || '').toUpperCase();
            if (skill && skill !== 'WRITING') return;
            setPreviewRefreshTick((prev) => prev + 1);
        };

        window.addEventListener('message', handlePreviewRefresh);
        return () => window.removeEventListener('message', handlePreviewRefresh);
    }, [testId]);

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

            if (isGuest && guestInfo && !attemptId) {
                ieltsApi.startGuestAttempt(guestInfo, testId, 'WRITING')
                    .then((attempt) => {
                        setAttemptId(attempt.id);
                    })
                    .catch((startError) => {
                        console.error('[Writing] Failed to start guest attempt:', startError);
                    });
            }
        }).catch((err) => {
            console.error('[Writing] Lỗi tải bài thi:', err);
            setError(err.message === 'AUTH_REQUIRED'
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : `Không thể tải bài thi: ${err.message}`);
            setLoading(false);
        });
    }, [testId, mode, isFullTest, selectedPracticeParts, startPartNumber, durationOverrideMinutes, noTimeLimit, previewRefreshTick, isGuest, guestInfo, attemptId, searchParams]);

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

    const uploadWritingDraftsToDrive = useCallback(async (onStatusChange) => {
        const parts = testData?.parts || [];
        if (!parts.length) return {};
        const driveUrlByQuestionId = {};

        const storedUser = authApi.getStoredUser();

        const rawTestTitle = testData?.testTitle
            || testData?.title
            || testData?.sessionName
            || `Writing_Test_${testId}`;
        const fallbackTestCode = `Writing_Test_${testId || 'UNKNOWN'}`;
        const normalizedTitle = toSafeFileSegment(rawTestTitle);
        const resolvedTestCode = (!normalizedTitle || isUntitledLike(normalizedTitle))
            ? fallbackTestCode
            : normalizedTitle;
        const resolvedTestTitle = isUntitledLike(rawTestTitle)
            ? resolvedTestCode
            : rawTestTitle;
        const resolvedCandidateCode = [
            storedUser?.studentCode,
            storedUser?.candidateCode,
            storedUser?.code,
            storedUser?.id,
            storedUser?.username,
            testData?.candidateId,
        ]
            .map(toDisplayValue)
            .find((value) => !isPlaceholderCandidateCode(value))
            || 'UNKNOWN_CANDIDATE';

        for (let idx = 0; idx < parts.length; idx += 1) {
            const partItem = parts[idx];
            const partAnswer = String(writingAnswers?.[partItem.id] || '').trim();
            if (!partAnswer) continue;
            const firstQuestionId = partItem?.questions?.[0]?.id;

            const partDisplayNumber = Number.isFinite(Number(partItem?.partNumber))
                ? Number(partItem.partNumber)
                : (idx + 1);
            const safePartNumber = toSafeFileSegment(partDisplayNumber) || String(idx + 1);
            const fileName = `part_${safePartNumber}.txt`;

            const taskLabel = String(
                partItem?.taskLabel
                || partItem?.title
                || partItem?.name
                || `Part_${idx + 1}`
            ).trim().replace(/Task\s*(\d+)/i, 'Part $1');
            const fileContent = [
                `Test: ${resolvedTestTitle}`,
                `MaThiSinh: ${resolvedCandidateCode}`,
                `MaDe: ${resolvedTestCode}`,
                `Part: ${partDisplayNumber}`,
                `Task: ${taskLabel}`,
                `SubmittedAt: ${new Date().toISOString()}`,
                '',
                partAnswer,
            ].join('\n');

            const writingFile = new File([fileContent], fileName, {
                type: 'text/plain;charset=utf-8',
            });

            try {
                onStatusChange?.(`Đang upload part_${safePartNumber}.txt lên Drive...`);
                const uploaded = await fileApi.uploadWritingDocument(writingFile, resolvedTestTitle, testId, {
                    skillName: 'WRITING',
                    testCode: resolvedTestCode,
                    onProgress: (percent, message) => {
                        const normalizedPercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : null;
                        const progressText = normalizedPercent == null ? '' : ` (${normalizedPercent}%)`;
                        onStatusChange?.(`${message || `Đang upload part_${safePartNumber}.txt`}${progressText}`);
                    },
                });
                const driveUrl = String(uploaded?.url || '').trim();
                if (firstQuestionId && driveUrl) {
                    driveUrlByQuestionId[firstQuestionId] = driveUrl;
                }
            } catch (error) {
                const reason = error?.message || 'Unknown error';
                throw new Error(`Không thể upload bài Writing part_${safePartNumber}.txt lên Drive: ${reason}`);
            }
        }

        return driveUrlByQuestionId;
    }, [testData, testId, writingAnswers]);

    const submitTest = () => {
        if (submitInFlightRef.current) return;
        if (isGuest && !attemptId) {
            alert('Vui lòng chờ hệ thống khởi tạo lượt làm bài khách trước khi nộp.');
            return;
        }
        submitInFlightRef.current = true;
        setIsSubmitting(true);
        setSubmitStatusText('Đang chuẩn bị nộp bài...');

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

        let driveUploadWarning = null;

        uploadWritingDraftsToDrive(setSubmitStatusText)
            .catch((uploadError) => {
                driveUploadWarning = uploadError;
                console.warn('[Writing] Upload Drive thất bại, chuyển sang submit trực tiếp:', uploadError);
                setSubmitStatusText('Upload Drive lỗi, đang nộp bài trực tiếp...');
                return {};
            })
            .then((driveUrlByQuestionId) => {
                setSubmitStatusText('Đang nộp bài...');

                const writingPayloadWithDrive = Object.entries(writingPayload).reduce((acc, [questionId, textValue]) => {
                    const driveUrl = String(driveUrlByQuestionId?.[questionId] || '').trim();
                    if (driveUrl) {
                        acc[questionId] = {
                            textAnswer: textValue,
                            selectedOptionLabel: driveUrl,
                        };
                    } else {
                        acc[questionId] = textValue;
                    }
                    return acc;
                }, {});

                if (isGuest && attemptId) {
                    const guestAnswers = Object.entries(writingPayloadWithDrive).map(([questionId, answerValue]) => {
                        const parsedQuestionId = Number.parseInt(questionId, 10);
                        if (!Number.isFinite(parsedQuestionId)) return null;

                        if (typeof answerValue === 'string') {
                            return {
                                questionId: parsedQuestionId,
                                textAnswer: answerValue,
                            };
                        }

                        return {
                            questionId: parsedQuestionId,
                            textAnswer: answerValue?.textAnswer || null,
                            selectedOptionLabel: answerValue?.selectedOptionLabel || null,
                        };
                    }).filter(Boolean);

                    return ieltsApi.submitGuestAttempt(attemptId, timeTakenSeconds, guestAnswers);
                }

                return ieltsApi.submitAnswers(testId, 'WRITING', writingPayloadWithDrive, timeTakenSeconds, null, examId);
            })
            .then((resp) => {
                clearDraftByTest('writing', testId);
                localStorage.removeItem(`ieltsTimerDeadline_${timerPersistKey}`);

                if (driveUploadWarning) {
                    alert(`Đã nộp bài thành công nhưng chưa lưu được bản sao lên Drive. Chi tiết: ${driveUploadWarning.message || 'Unknown error'}`);
                }

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
                const message = err?.message
                    || err?.response?.data?.error
                    || 'Không thể nộp bài Writing. Vui lòng thử lại.';
                alert(message);
            })
            .finally(() => {
                submitInFlightRef.current = false;
                setIsSubmitting(false);
                setSubmitStatusText('');
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
                hideSubmitButton={isSubmitting}
            />

            {isSubmitting && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.42)',
                        zIndex: 2500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                >
                    <div
                        style={{
                            minWidth: '280px',
                            maxWidth: '92vw',
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '18px 20px',
                            boxShadow: '0 20px 45px rgba(2, 6, 23, 0.28)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <div className="test-loading-spinner" style={{ width: '24px', height: '24px', margin: 0 }}></div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                            {submitStatusText || 'Đang nộp bài...'}
                        </p>
                    </div>
                </div>
            )}

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
                    <button className="black-nav-btn" onClick={() => setCurrentPartIndex((i) => Math.max(0, i - 1))} disabled={isFirstPart} style={{ opacity: isFirstPart ? 0.5 : 1 }} title="Previous part" aria-label="Previous part">
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <button className="black-nav-btn" onClick={() => setCurrentPartIndex((i) => Math.min(parts.length - 1, i + 1))} disabled={isLastPart} style={{ opacity: isLastPart ? 0.5 : 1 }} title="Next part" aria-label="Next part">
                        <ChevronRight size={20} strokeWidth={2.5} />
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
