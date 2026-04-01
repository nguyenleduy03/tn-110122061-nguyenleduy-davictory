import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { ieltsApi } from '../services/ieltsApi';
import { calculateExamBand, formatBand } from '../utils/ieltsScoring';
import { clearSubmittedLockByTest } from '../utils/testRuntimeState';
import '../styles/ieltsTest.css';

const TestComplete = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'practice';
    const skill = searchParams.get('skill') || '';
    const isExam = mode === 'exam';
    const allowReview = searchParams.get('allowReview') === 'true';
    const isFullTest = searchParams.get('fullTest') === 'true';
    const testId = searchParams.get('testId');
    const normalizedSkill = String(skill || '').toLowerCase();
    const isObjectiveSkill = normalizedSkill === 'listening' || normalizedSkill === 'reading';
    const libraryReturnUrl = React.useMemo(() => {
        if (!testId) return '/exam-library';
        return `/exam-library?seriesId=${encodeURIComponent(String(testId))}`;
    }, [testId]);

    const [resultRows, setResultRows] = React.useState([]);
    const [resultParts, setResultParts] = React.useState([]);
    const [summary, setSummary] = React.useState({
        total: 0,
        correct: 0,
        wrong: 0,
        scoreText: '--',
        bandScore: null,
        timeSpentSeconds: null,
        totalTimeSeconds: null,
    });
    const [loadingResult, setLoadingResult] = React.useState(false);

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        }
    }, []);

    // Clear submitted lock and mark as viewed so "Xem kết quả" won't appear in ExamLibrary
    // after user has already viewed the results page
    React.useEffect(() => {
        if (testId && isObjectiveSkill) {
            clearSubmittedLockByTest(testId, skill);
            // Mark as viewed for Reading/Listening only
            const viewedKey = `ieltsResultViewed_${normalizedSkill}_${testId}`;
            localStorage.setItem(viewedKey, Date.now().toString());
        }
    }, [testId, skill, isObjectiveSkill, normalizedSkill]);

    React.useEffect(() => {
        const handlePopState = () => {
            navigate(libraryReturnUrl, { replace: true });
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navigate, libraryReturnUrl]);

    const skillLabel = {
        listening: 'Listening',
        reading: 'Reading',
        writing: 'Writing',
        speaking: 'Speaking',
    }[skill?.toLowerCase()] || 'Test';

    const normalizeValue = React.useCallback((val) => String(val ?? '').trim().toLowerCase(), []);

    const formatDuration = React.useCallback((seconds) => {
        const numeric = Number(seconds);
        if (!Number.isFinite(numeric) || numeric < 0) return '--:--';
        const mins = Math.floor(numeric / 60);
        const secs = Math.floor(numeric % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, []);

    React.useEffect(() => {
        if (!testId || !isObjectiveSkill) return;

        let cancelled = false;
        const run = async () => {
            setLoadingResult(true);
            try {
                const session = await ieltsApi.getTestSession(testId, normalizedSkill.toUpperCase());
                if (cancelled) return;

                const savedAnswersRaw = sessionStorage.getItem(`lastAnswers_${normalizedSkill}`);
                const savedAnswers = savedAnswersRaw ? JSON.parse(savedAnswersRaw) : {};

                const savedScoreRaw = sessionStorage.getItem(`lastScore_${normalizedSkill}`);
                const savedScore = savedScoreRaw ? JSON.parse(savedScoreRaw) : null;

                const rows = [];
                const partMap = new Map();

                (session.parts || []).forEach((part, partIdx) => {
                    const partLabel = `Part ${part.partNumber || (partIdx + 1)}`;
                    const questions = part.questions || [];

                    questions.forEach((q) => {
                        if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                            q.subQuestions.forEach((sq) => {
                                const userAns = savedAnswers?.[sq.id] ?? '';
                                const correctAns = sq.correctAnswer ?? '';
                                const isCorrect = normalizeValue(userAns) === normalizeValue(correctAns);

                                rows.push({
                                    id: sq.id,
                                    partLabel,
                                    number: sq.number,
                                    userAns,
                                    correctAns,
                                    isCorrect,
                                });
                            });
                            return;
                        }

                        const rawUser = savedAnswers?.[q.id];
                        const userAns = Array.isArray(rawUser) ? rawUser : (rawUser ?? '');
                        const correctAns = Array.isArray(q.correctAnswer) ? q.correctAnswer : (q.correctAnswer ?? '');

                        if (q.numberRange && Array.isArray(q.numberRange) && q.numberRange.length > 0) {
                            q.numberRange.forEach((num, idx) => {
                                const u = Array.isArray(userAns) ? (userAns[idx] ?? '') : userAns;
                                const c = Array.isArray(correctAns) ? (correctAns[idx] ?? '') : correctAns;
                                const isCorrect = normalizeValue(u) === normalizeValue(c);
                                rows.push({
                                    id: `${q.id}-${num}`,
                                    partLabel,
                                    number: num,
                                    userAns: u,
                                    correctAns: c,
                                    isCorrect,
                                });
                            });
                            return;
                        }

                        if (Array.isArray(userAns) || Array.isArray(correctAns)) {
                            const userSet = (Array.isArray(userAns) ? userAns : [userAns]).map(normalizeValue).filter(Boolean).sort();
                            const correctSet = (Array.isArray(correctAns) ? correctAns : [correctAns]).map(normalizeValue).filter(Boolean).sort();
                            const isCorrect = userSet.length === correctSet.length && userSet.every((v, i) => v === correctSet[i]);
                            rows.push({
                                id: q.id,
                                partLabel,
                                number: q.number,
                                userAns: Array.isArray(userAns) ? userAns.join(', ') : userAns,
                                correctAns: Array.isArray(correctAns) ? correctAns.join(', ') : correctAns,
                                isCorrect,
                            });
                            return;
                        }

                        const isCorrect = normalizeValue(userAns) === normalizeValue(correctAns);
                        rows.push({
                            id: q.id,
                            partLabel,
                            number: q.number,
                            userAns,
                            correctAns,
                            isCorrect,
                        });
                    });
                });

                rows.forEach((row) => {
                    if (!partMap.has(row.partLabel)) partMap.set(row.partLabel, []);
                    partMap.get(row.partLabel).push(row);
                });

                const correct = rows.filter((r) => r.isCorrect).length;
                const total = rows.length;
                const wrong = Math.max(0, total - correct);

                const scoreText = Number.isFinite(savedScore?.score)
                    ? `${savedScore.score}`
                    : Number.isFinite(savedScore?.correctAnswers) && Number.isFinite(savedScore?.totalQuestions)
                        ? `${savedScore.correctAnswers}/${savedScore.totalQuestions}`
                        : `${correct}/${total}`;

                const normalizedSkillType = normalizedSkill.toUpperCase();
                const calculatedBandScore = calculateExamBand({
                    skillType: normalizedSkillType,
                    totalCorrect: correct,
                });
                const apiBandScore = Number.isFinite(savedScore?.bandScore)
                    ? savedScore.bandScore
                    : null;
                const apiTotalCorrect = Number.isFinite(savedScore?.totalCorrect)
                    ? savedScore.totalCorrect
                    : null;
                const shouldUseCalculatedBand = correct > 0 && (
                    apiBandScore === null
                    || apiBandScore === 0
                    || (apiTotalCorrect !== null && apiTotalCorrect !== correct)
                );
                const bandScore = shouldUseCalculatedBand
                    ? calculatedBandScore
                    : (apiBandScore ?? calculatedBandScore);

                const timeSpentSeconds = Number.isFinite(savedScore?.timeSpentSeconds)
                    ? savedScore.timeSpentSeconds
                    : null;

                const totalTimeSeconds = Number.isFinite(session?.totalMinutes)
                    ? session.totalMinutes * 60
                    : null;

                setResultRows(rows);
                setResultParts(Array.from(partMap.entries()));
                setSummary({ total, correct, wrong, scoreText, bandScore, timeSpentSeconds, totalTimeSeconds });
            } catch {
                if (!cancelled) {
                    setResultRows([]);
                    setResultParts([]);
                    setSummary({ total: 0, correct: 0, wrong: 0, scoreText: '--', bandScore: null, timeSpentSeconds: null, totalTimeSeconds: null });
                }
            } finally {
                if (!cancelled) setLoadingResult(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [testId, normalizedSkill, isObjectiveSkill, isExam, allowReview, normalizeValue]);

    return (
        <div className="test-complete-screen">
            <div className={`test-complete-card${isObjectiveSkill ? ' test-complete-card-wide' : ''}`}>
                <div className="test-complete-header">
                    <div className="test-complete-icon">
                        <CheckCircle size={52} color="#fff" strokeWidth={1.5} />
                    </div>
                    <h1 className="test-complete-title">Section Submitted</h1>
                    {skill && <p className="test-complete-skill">{skillLabel} section</p>}
                </div>

                <div className="test-complete-body">
                    {isObjectiveSkill ? (
                        <div className="result-review-block">
                            {loadingResult ? (
                                <p className="test-complete-sub">Loading score and answers...</p>
                            ) : (
                                <>
                                    <div className="result-summary-grid">
                                        <div className="result-summary-card circle">
                                            <div className="result-summary-label">Đáp án đúng</div>
                                            <div className="result-summary-value correct">{summary.correct}/{summary.total}</div>
                                        </div>
                                        <div className="result-summary-card circle highlight">
                                            <div className="result-summary-label">Band</div>
                                            <div className="result-summary-value">{formatBand(summary.bandScore)}</div>
                                        </div>
                                        <div className="result-summary-card circle">
                                            <div className="result-summary-label">Thời gian làm bài</div>
                                            <div className="result-summary-value">{formatDuration(summary.timeSpentSeconds)}</div>
                                            <div className="result-summary-sub">({formatDuration(summary.totalTimeSeconds)})</div>
                                        </div>
                                    </div>

                                    {resultRows.length === 0 ? (
                                        <p className="test-complete-sub">No answer data found for this attempt.</p>
                                    ) : (
                                        resultParts.map(([partLabel, items]) => {
                                            const wrongItems = items.filter((it) => !it.isCorrect);
                                            return (
                                                <div className="result-part-block" key={partLabel}>
                                                    <h3>{partLabel}</h3>
                                                    {wrongItems.length === 0 ? (
                                                        <p className="result-all-correct">All answers in this part are correct.</p>
                                                    ) : (
                                                        <div className="result-wrong-grid">
                                                            {wrongItems.map((row) => (
                                                                <div className="result-wrong-item compact" key={row.id}>
                                                                    <div className="result-qno-badge">{row.number}</div>
                                                                    <div className="result-compact-answer">
                                                                        <span className="result-correct-label">{String(row.correctAns || '')}</span>
                                                                        {String(row.userAns || '').trim() ? (
                                                                            <>
                                                                                <span className="result-colon">:</span>
                                                                                <span className="result-wrong-label">{String(row.userAns)}</span>
                                                                                <span className="result-cross">✕</span>
                                                                            </>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        isExam && !allowReview ? (
                            <>
                                <p className="test-complete-msg">
                                    Your answers have been submitted successfully.
                                </p>
                                <p className="test-complete-sub">
                                    In exam mode, answers are not shown after submission. Your results will be available after review.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="test-complete-msg">
                                    {isExam ? 'Simulation submitted successfully.' : 'Your answers have been saved successfully.'}
                                </p>
                                <p className="test-complete-sub">
                                    {isExam
                                        ? 'You can now review your answers and compare with correct answers.'
                                        : 'In practice mode you can review your answers and see the correct answers at any time.'}
                                </p>
                            </>
                        )
                    )}
                </div>

                <div className="test-complete-actions">
                    <button
                        className="test-complete-btn"
                        onClick={() => navigate(libraryReturnUrl, { replace: true })}
                        style={{ backgroundColor: '#f1f1f1', color: '#333', border: '1px solid #ccc' }}
                    >
                        Return to Exam Library
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestComplete;
