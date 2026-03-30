import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Mic,
  MicOff,
  RotateCcw,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import { ieltsApi } from "../services/ieltsApi";
import { normalizeRichHtml, stripInlineStyles, formatTextWithWhitespace } from "../utils/textFormatters";
import { computeFullTestProgressPercent, getFullTestSessionState, parseJsonSafe } from "../utils/fullTestProgress";
import { buildTimerPersistKey, markTestSubmitted, getSubmittedRedirect } from "../utils/testRuntimeState";

const formatSpeakingHtml = (value) => stripInlineStyles(normalizeRichHtml(value || ''));

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (sec) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const PREP_SECONDS = 60;
const PART_DURATION_SECONDS = { 1: 5 * 60, 2: 2 * 60, 3: 5 * 60 };

// ── Waveform visualiser (canvas) ──────────────────────────────────────────────
const Waveform = ({ analyser }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = Math.max(2, canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barH = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(220,38,38,${0.5 + dataArray[i] / 510})`;
        ctx.fillRect(x, canvas.height - barH, barW - 1, barH);
        x += barW;
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={48}
      className="spk-waveform"
    />
  );
};

// ── CueCard (Part 2 only) ─────────────────────────────────────────────────────
const CueCard = ({ question }) => (
  <div className="spk-cuecard">
    {question.topic
      ? <div className="spk-cuecard-topic" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(question.topic) }} />
      : <div className="spk-cuecard-topic" />}
    {question.instruction && (
      <div className="spk-cuecard-desc" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(question.instruction) }} />
    )}
    {question.bulletPoints?.length > 0 && (
      <ul className="spk-cuecard-bullets">
        {question.bulletPoints.map((bp, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(bp) }} />
        ))}
      </ul>
    )}
    {question.closingSentence && (
      <div className="spk-cuecard-closing" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(question.closingSentence) }} />
    )}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const IeltsSpeakingTest = () => {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id: testId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFullTest = searchParams.get('fullTest') === 'true';
  const mode = searchParams.get('mode') || 'practice';
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
    skill: 'speaking',
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

  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);

  // phase: idle | preparing | recording | done
  const [phase, setPhase] = useState("idle");
  const [prepSeconds, setPrepSeconds] = useState(PREP_SECONDS);
  const [recSeconds, setRecSeconds] = useState(0);
  const [partSecondsLeft, setPartSecondsLeft] = useState(0);
  const [startTime] = useState(() => Date.now());

  // stage: mic-test | part | part-review
  const [stage, setStage] = useState('mic-test');
  const [micTested, setMicTested] = useState(false);

  const [audioUrls, setAudioUrls] = useState({}); // { questionId: objectURL }
  const [micAllowed, setMicAllowed] = useState(null); // null | true | false
  const [submitted, setSubmitted] = useState(false);
  const autosaveStateRef = useRef({
    currentPartIdx: 0,
    currentQIdx: 0,
    stage: 'mic-test',
    phase: 'idle',
    partSecondsLeft: 0,
    audioUrls: {},
    testData: null,
    micTested: false,
  });

  // recording internals
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const partTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const [analyser, setAnalyser] = useState(null);

  // ── Load test data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) { setError('Không tìm thấy ID bài thi.'); setLoading(false); return; }
    ieltsApi.getTestSession(testId, "SPEAKING").then((data) => {
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

      setTestData(configuredData);
      setLoading(false);
    }).catch((err) => {
      console.error('[Speaking] Lỗi tải bài thi:', err);
      setError(err.message === 'AUTH_REQUIRED'
        ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
        : `Không thể tải bài thi: ${err.message}`);
      setLoading(false);
    });
  }, [testId, mode, isFullTest, selectedPracticeParts, durationOverrideMinutes, noTimeLimit]);

  useEffect(() => {
    if (!isFullTest || !testData || !testId) return undefined;
    let canceled = false;

    const restoreSnapshot = async () => {
      let snapshot = parseJsonSafe(sessionStorage.getItem(`ieltsFullTestSnapshot_speaking_${testId}`), null);

      try {
        const remote = await ieltsApi.getFullTestProgress(testId);
        if (!canceled && remote && String(remote.currentSkill || '').toLowerCase() === 'speaking') {
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

      if (Number.isFinite(snapshot.currentPartIdx)) {
        const maxPart = Math.max(0, (testData.parts?.length || 1) - 1);
        setCurrentPartIdx(Math.max(0, Math.min(maxPart, snapshot.currentPartIdx)));
      }
      if (Number.isFinite(snapshot.currentQIdx)) {
        setCurrentQIdx(Math.max(0, snapshot.currentQIdx));
      }
      if (Number.isFinite(snapshot.partSecondsLeft)) {
        setPartSecondsLeft(Math.max(0, snapshot.partSecondsLeft));
      }

      if (snapshot.stage === 'part' || snapshot.stage === 'part-review') {
        setStage(snapshot.stage);
        setMicTested(true);
      }

      if (snapshot.phase && snapshot.phase !== 'recording') {
        setPhase(snapshot.phase);
      }
    };

    restoreSnapshot();
    return () => {
      canceled = true;
    };
  }, [isFullTest, testData, testId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(partTimerRef.current);
      clearInterval(micTestTimerRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
      Object.values(audioUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentPart = testData?.parts?.[currentPartIdx];
  const currentQ = currentPart?.questions?.[currentQIdx];
  const isPartTwo = currentPart?.partNumber === 2;
  const totalParts = testData?.parts?.length ?? 0;
  const initialPartIndex = useMemo(() => {
    if (!Number.isFinite(startPartNumber) || startPartNumber <= 0 || !testData?.parts?.length) {
      return 0;
    }
    const idx = testData.parts.findIndex((p, i) => {
      const parsedPartNo = Number.parseInt(String(p?.partNumber ?? ''), 10);
      const partNo = Number.isFinite(parsedPartNo) && parsedPartNo > 0 ? parsedPartNo : (i + 1);
      return partNo === startPartNumber;
    });
    return idx >= 0 ? idx : 0;
  }, [startPartNumber, testData]);
  const initialPartLabel = testData?.parts?.[initialPartIndex]?.partNumber || (initialPartIndex + 1);
  const questionId = currentQ?.id;
  const hasRecording = !!audioUrls[questionId];
  const isCueCard = isPartTwo && currentQ?.bulletPoints;
  const isLastQ =
    currentPartIdx === totalParts - 1 &&
    currentQIdx === (currentPart?.questions?.length ?? 1) - 1;

  useEffect(() => {
    autosaveStateRef.current = {
      currentPartIdx,
      currentQIdx,
      stage,
      phase,
      partSecondsLeft,
      audioUrls,
      testData,
      micTested,
    };
  }, [currentPartIdx, currentQIdx, stage, phase, partSecondsLeft, audioUrls, testData, micTested]);

  useEffect(() => {
    if (!isFullTest || !testData || !testId) return undefined;

    const persistProgress = async () => {
      const state = autosaveStateRef.current;
      const totalQuestions = (state.testData?.parts || []).reduce(
        (sum, p) => sum + (p.questions?.length || 0),
        0,
      );
      const recordedCount = Object.keys(state.audioUrls || {}).length;
      const sectionProgress = totalQuestions > 0 ? (recordedCount / totalQuestions) : 0;

      const session = getFullTestSessionState();
      const totalSections = session?.sections?.length || 4;
      const currentSection = Number.isFinite(session?.currentSection) ? session.currentSection : 0;
      const progressPercent = computeFullTestProgressPercent({
        currentSection,
        totalSections,
        sectionProgress,
      });

      const snapshot = {
        currentPartIdx: state.currentPartIdx || 0,
        currentQIdx: state.currentQIdx || 0,
        stage: state.stage || 'mic-test',
        phase: state.phase === 'recording' ? 'idle' : (state.phase || 'idle'),
        partSecondsLeft: state.partSecondsLeft || 0,
        micTested: Boolean(state.micTested),
        recordedQuestionCount: recordedCount,
        savedAt: Date.now(),
      };

      sessionStorage.setItem(`ieltsFullTestSnapshot_speaking_${testId}`, JSON.stringify(snapshot));

      try {
        await ieltsApi.saveFullTestProgress(testId, {
          status: 'IN_PROGRESS',
          mode: session?.mode || mode,
          currentSection,
          currentSkill: 'speaking',
          currentPartIndex: state.currentPartIdx || 0,
          progressPercent,
          routePath: `/test/speaking/${testId}`,
          queryString,
          sessionStateJson: JSON.stringify(session || {}),
          snapshotJson: JSON.stringify(snapshot),
        });
      } catch {
        // Keep local snapshot when remote save fails
      }
    };

    persistProgress();
  }, [
    isFullTest,
    testData,
    testId,
    mode,
    queryString,
    currentPartIdx,
    currentQIdx,
    stage,
    phase,
    audioUrls,
    micTested,
  ]);

  const getPartDurationSec = useCallback((part) => {
    if (!part) return 0;
    if (noTimeLimit) return 0;
    if (part.durationMinutes && part.durationMinutes > 0) return part.durationMinutes * 60;
    return PART_DURATION_SECONDS[part.partNumber] ?? 0;
  }, [noTimeLimit]);

  // ── Mic setup ──────────────────────────────────────────────────────────────
  const ensureMic = async () => {
    if (streamRef.current) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // setup analyser for waveform
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      src.connect(an);
      analyserRef.current = an;
      setMicAllowed(true);
      return stream;
    } catch {
      setMicAllowed(false);
      return null;
    }
  };

  const [micTestCountdown, setMicTestCountdown] = useState(0);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const micTestTimerRef = useRef(null);

  const runMicTest = useCallback(async () => {
    const stream = await ensureMic();
    if (!stream) return;
    
    setIsMicTesting(true);
    setMicTestCountdown(20);
    setAnalyser(analyserRef.current);
    
    micTestTimerRef.current = setInterval(() => {
      setMicTestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(micTestTimerRef.current);
          setIsMicTesting(false);
          setMicTested(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skipMicTest = useCallback(() => {
    clearInterval(micTestTimerRef.current);
    setIsMicTesting(false);
    setMicTested(true);
    setMicTestCountdown(0);
  }, []);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    const stream = await ensureMic();
    if (!stream) return;
    clearInterval(timerRef.current);
    chunksRef.current = [];
    const qId = questionId; // capture current question id at this moment
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrls((prev) => {
        if (prev[qId]) URL.revokeObjectURL(prev[qId]);
        return { ...prev, [qId]: url };
      });
      setPhase("done");
      setAnalyser(null);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setPhase("recording");
    setRecSeconds(0);
    setAnalyser(analyserRef.current);
    timerRef.current = setInterval(
      () => setRecSeconds((s) => s + 1),
      1000
    );
  }, [questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  // ── Start preparation (Part 2) ─────────────────────────────────────────────
  const startPrep = useCallback(async () => {
    await ensureMic(); // request early so user sees prompt once
    setPhase("preparing");
    setPrepSeconds(PREP_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPrepSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          startRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [startRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipPrep = useCallback(() => {
    clearInterval(timerRef.current);
    startRecording();
  }, [startRecording]);

  // ── Mic button handler ─────────────────────────────────────────────────────
  const handleMicBtn = useCallback(() => {
    if (phase === "idle") {
      if (isCueCard) startPrep();
      else startRecording();
    } else if (phase === "preparing") {
      skipPrep();
    } else if (phase === "recording") {
      stopRecording();
    }
  }, [phase, isCueCard, startPrep, startRecording, skipPrep, stopRecording]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigateTo = useCallback(
    (partIdx, qIdx) => {
      clearInterval(timerRef.current);
      if (phase === "recording") mediaRecorderRef.current?.stop();
      setCurrentPartIdx(partIdx);
      setCurrentQIdx(qIdx);
      setPhase("idle");
      setRecSeconds(0);
      setPrepSeconds(PREP_SECONDS);
      setAnalyser(null);
    },
    [phase]
  );

  const goPartReview = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(partTimerRef.current);
    if (phase === 'recording') mediaRecorderRef.current?.stop();
    setPhase('idle');
    setAnalyser(null);
    setStage('part-review');
  }, [phase]);

  const startPartWithIndex = useCallback((partIdx) => {
    const part = testData?.parts?.[partIdx];
    if (!part) return;
    clearInterval(partTimerRef.current);
    const durationSec = getPartDurationSec(part);
    setPartSecondsLeft(durationSec);
    setStage('part');
    setPhase('idle');
    setRecSeconds(0);
    setPrepSeconds(PREP_SECONDS);
    setAnalyser(null);
    setCurrentPartIdx(partIdx);
    setCurrentQIdx(0);
    if (durationSec <= 0) return;
    partTimerRef.current = setInterval(() => {
      setPartSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(partTimerRef.current);
          goPartReview();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [getPartDurationSec, goPartReview, testData]);

  const goNext = useCallback(() => {
    if (!currentPart) return;
    if (currentQIdx < currentPart.questions.length - 1) {
      navigateTo(currentPartIdx, currentQIdx + 1);
    } else {
      goPartReview();
    }
  }, [currentPart, currentQIdx, currentPartIdx, navigateTo, goPartReview]);



  const reRecord = useCallback(() => {
    setPhase("idle");
    setRecSeconds(0);
    setAnalyser(null);
  }, []);

  const submitTest = useCallback(() => {
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    const recordedAnswers = Object.keys(audioUrls).reduce((acc, qid) => {
      acc[qid] = 'RECORDED';
      return acc;
    }, {});
    const submitPromise = ieltsApi.submitAnswers(testId, 'SPEAKING', recordedAnswers, timeSpentSeconds);
    localStorage.removeItem(`ieltsTimerDeadline_${timerPersistKey}`);

    if (isFullTest) {
      try {
        const session = JSON.parse(sessionStorage.getItem('ieltsFullTest') || 'null');
        if (session) {
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
            submitPromise.finally(() => {
              const nextUrl = `/test/${next.skill}/${next.testId}?fullTest=true&mode=${session.mode || mode}`;
              markTestSubmitted(timerPersistKey, nextUrl);
              navigate(nextUrl);
            });
            return;
          } else {
            sessionStorage.removeItem('ieltsFullTest');
            sessionStorage.removeItem(`ieltsFullTestSnapshot_speaking_${testId}`);
            ieltsApi.clearFullTestProgress(testId).catch(() => { });
            submitPromise.finally(() => {
              const completeParams = new URLSearchParams({
                mode: session.mode || mode,
                skill: 'speaking',
                fullTest: 'true',
                testId: String(testId),
              });
              if ((session.mode || mode) === 'exam') {
                completeParams.set('allowReview', 'true');
              }
              const completeUrl = `/test/complete?${completeParams.toString()}`;
              markTestSubmitted(timerPersistKey, completeUrl);
              navigate(completeUrl);
            });
            return;
          }
        }
      } catch { navigate('/exam-library'); return; }
    }
    submitPromise.finally(() => {
      setSubmitted(true);
      setTimeout(() => {
        const completeParams = new URLSearchParams({
          mode,
          skill: 'speaking',
          testId: String(testId),
        });
        if (mode === 'exam' && allowReviewInExam) {
          completeParams.set('allowReview', 'true');
        }
        const completeUrl = `/test/complete?${completeParams.toString()}`;
        markTestSubmitted(timerPersistKey, completeUrl);
        navigate(completeUrl);
      }, 2000);
    });
  }, [audioUrls, startTime, testId, isFullTest, navigate, mode, allowReviewInExam, timerPersistKey]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="test-loading-screen">
        <div className="test-loading-spinner"></div>
        <p className="test-loading-title">Your test will begin shortly</p>
        <p className="test-loading-sub">Please wait</p>
      </div>
    );
  if (error)
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        <p style={{ fontSize: '18px', fontWeight: 600 }}>⚠️ {error}</p>
        <button onClick={() => navigate('/exam-library')} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1e3a8a', color: '#fff', cursor: 'pointer' }}>← Quay lại thư viện</button>
      </div>
    );
  if (!testData)
    return <div style={{ padding: "50px" }}>No test data available</div>;

  if (submitted)
    return (
      <div className="spk-submitted">
        <div className="spk-submitted-inner">
          <div className="spk-submitted-icon">✅</div>
          <h2>Test Submitted!</h2>
          <p>
            {Object.keys(audioUrls).length} /{" "}
            {testData.parts.reduce((a, p) => a + p.questions.length, 0)}{" "}
            answer(s) recorded.
          </p>
        </div>
      </div>
    );

  const micBtnClass = [
    "spk-mic-btn",
    phase === "recording" ? "recording" : "",
    phase === "done" ? "done" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
        skill="speaking"
        navigate={navigate}
        timerPersistKey={timerPersistKey}
      />

      <div className="instruction-bar">
        <h3 dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(currentPart?.title || '') }} />
        {currentPart?.instruction && <p dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(currentPart.instruction) }} />}
      </div>

      {/* Main card ──────────────────────────────────────────────────────── */}
      <main className="spk-main">
        {stage === 'mic-test' && (
          <div className="spk-card spk-mic-check">
            <div className="spk-mic-title">TEST YOUR MICROPHONE</div>
            {isMicTesting && (
              <div className="spk-mic-countdown">
                <div className="spk-countdown-timer">{fmtTime(micTestCountdown)}</div>
                <p className="spk-countdown-text">You have {micTestCountdown} seconds to speak…</p>
              </div>
            )}
            <div className="spk-mic-sub">
              To complete this activity, you must allow access to your system's microphone. Click the button below to Start.
            </div>
            <div className="spk-mic-actions">
              {!isMicTesting ? (
                <button className="spk-mic-test-btn" onClick={runMicTest} disabled={micTested}>
                  Test Microphone
                </button>
              ) : (
                <button className="spk-skip-btn" onClick={skipMicTest}>
                  Skip
                </button>
              )}
              {micTested && !isMicTesting && (
                <button
                  className="spk-start-btn"
                  onClick={() => startPartWithIndex(initialPartIndex)}
                >
                  Start Part {initialPartLabel}
                </button>
              )}
            </div>
            {(micTested || isMicTesting) && analyser && (
              <div className="spk-mic-wave">
                <Waveform analyser={analyser} />
              </div>
            )}
            {micAllowed === false && (
              <p className="spk-mic-error">
                ⚠ Microphone access denied. Please allow microphone in your
                browser settings and reload.
              </p>
            )}
          </div>
        )}

        {stage === 'part-review' && (
          <div className="spk-card spk-review">
            <div className="spk-review-title">
              Hoàn thành Part {currentPart.partNumber} · Nghe lại câu trả lời
            </div>
            <div className="spk-review-list">
              {(currentPart.questions ?? []).map((q, idx) => {
                const qId = q.id;
                const text = q.text || q.topic || `Question ${idx + 1}`;
                return (
                  <div key={qId ?? idx} className="spk-review-item">
                    <div className="spk-review-q">
                      <span className="spk-review-qnum">Q{idx + 1}.</span>
                      <span dangerouslySetInnerHTML={{ __html: text }} />
                    </div>
                    {audioUrls[qId]
                      ? <audio controls src={audioUrls[qId]} className="spk-audio" />
                      : <span className="spk-review-missing">Chưa ghi âm</span>}
                  </div>
                );
              })}
            </div>
            <div className="spk-review-actions">
              {currentPartIdx < totalParts - 1 ? (
                <button className="spk-next-btn" onClick={() => startPartWithIndex(currentPartIdx + 1)}>
                  Tiếp tục Part {currentPartIdx + 2} <ChevronRight size={18} />
                </button>
              ) : (
                <button className="spk-next-btn" onClick={submitTest}>
                  Nộp bài
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'part' && (
          <div className="spk-card">
            {/* Part label */}
            <div className="spk-part-label">
              Part {currentPart.partNumber} · <span dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(currentPart.title || '') }} />
              <span className="spk-part-meta">
                ({currentPart.questions.length} questions) · {noTimeLimit ? 'No time limit' : fmtTime(partSecondsLeft)}
              </span>
              <span className="spk-q-counter">
                Q{currentQIdx + 1} / {currentPart.questions.length}
              </span>
            </div>

            {/* Cue card or question text */}
            {isCueCard ? (
              <CueCard question={currentQ} />
            ) : (
              <div className="spk-question-text">
                <span className="spk-q-number">Q{currentQIdx + 1}.</span>{" "}
                <div className="spk-question-rich" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(currentQ.text || '') }} />
              </div>
            )}

            {/* Preparation countdown (Part 2) */}
            {phase === "preparing" && (
              <div className="spk-prep-timer">
                <span className="spk-prep-label">⏳ Preparation time remaining</span>
                <span className="spk-prep-countdown">{fmtTime(prepSeconds)}</span>
                <button className="spk-skip-prep-btn" onClick={skipPrep}>
                  Start speaking now →
                </button>
              </div>
            )}

            {/* Mic button + status ────────────────────────────────────────── */}
            <div className="spk-mic-area">
              {phase === "idle" && (
                <p className="spk-idle-hint">
                  {isCueCard
                    ? "Press the microphone to begin 1-minute preparation"
                    : "Press the microphone to start recording your answer"}
                </p>
              )}
              {phase === "recording" && (
                <div className="spk-rec-status">
                  <span className="spk-rec-dot" />
                  <span>Recording · {fmtTime(recSeconds)}</span>
                </div>
              )}
              {phase === "done" && (
                <p className="spk-done-hint">✓ Answer recorded</p>
              )}

              <button
                className={micBtnClass}
                onClick={handleMicBtn}
                title={
                  phase === "recording" ? "Stop recording" : "Start recording"
                }
                aria-label={
                  phase === "recording" ? "Stop recording" : "Start recording"
                }
              >
                {phase === "recording" ? <MicOff size={38} /> : <Mic size={38} />}
              </button>

              {/* Waveform */}
              {phase === "recording" && analyser && (
                <Waveform analyser={analyser} />
              )}

              {micAllowed === false && (
                <p className="spk-mic-error">
                  ⚠ Microphone access denied. Please allow microphone in your
                  browser settings and reload.
                </p>
              )}
            </div>

            {/* Playback ─────────────────────────────────────────────────── */}
            {hasRecording && phase !== "recording" && (
              <div className="spk-playback-row">
                <Volume2 size={16} color="#6b7280" />
                <audio controls src={audioUrls[questionId]} className="spk-audio" />
                <button className="spk-rerecord-btn" onClick={reRecord}>
                  <RotateCcw size={13} />
                  Re-record
                </button>
              </div>
            )}

            {/* Next after recording */}
            {phase === "done" && (
              <div className="spk-next-row">
                <button className="spk-next-btn" onClick={goNext}>
                  {isLastQ ? 'Hoàn thành Part' : 'Next question'} <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default IeltsSpeakingTest;
