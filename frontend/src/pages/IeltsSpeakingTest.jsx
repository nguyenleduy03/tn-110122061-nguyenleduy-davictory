import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  RotateCcw,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import { ieltsApi } from "../services/ieltsApi";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (sec) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const PREP_SECONDS = 60;

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
      ? <div className="spk-cuecard-topic" dangerouslySetInnerHTML={{ __html: question.topic }} />
      : <div className="spk-cuecard-topic" />}
    {question.instruction && (
      <div className="spk-cuecard-desc" dangerouslySetInnerHTML={{ __html: question.instruction }} />
    )}
    {question.bulletPoints?.length > 0 && (
      <ul className="spk-cuecard-bullets">
        {question.bulletPoints.map((bp, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: bp }} />
        ))}
      </ul>
    )}
    {question.closingSentence && (
      <div className="spk-cuecard-closing" dangerouslySetInnerHTML={{ __html: question.closingSentence }} />
    )}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const IeltsSpeakingTest = () => {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id: testId } = useParams();

  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);

  // phase: idle | preparing | recording | done
  const [phase, setPhase] = useState("idle");
  const [prepSeconds, setPrepSeconds] = useState(PREP_SECONDS);
  const [recSeconds, setRecSeconds] = useState(0);

  const [audioUrls, setAudioUrls] = useState({}); // { questionId: objectURL }
  const [micAllowed, setMicAllowed] = useState(null); // null | true | false
  const [submitted, setSubmitted] = useState(false);

  // recording internals
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const [analyser, setAnalyser] = useState(null);

  // ── Load test data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) { setError('Không tìm thấy ID bài thi.'); setLoading(false); return; }
    ieltsApi.getTestSession(testId, "SPEAKING").then((data) => {
      setTestData(data);
      setLoading(false);
    }).catch((err) => {
      console.error('[Speaking] Lỗi tải bài thi:', err);
      setError(err.message === 'AUTH_REQUIRED'
        ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
        : `Không thể tải bài thi: ${err.message}`);
      setLoading(false);
    });
  }, [testId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
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
  const questionId = currentQ?.id;
  const hasRecording = !!audioUrls[questionId];
  const isCueCard = isPartTwo && currentQ?.bulletPoints;
  const isLastQ =
    currentPartIdx === totalParts - 1 &&
    currentQIdx === (currentPart?.questions?.length ?? 1) - 1;

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

  const goNext = useCallback(() => {
    if (!currentPart) return;
    if (currentQIdx < currentPart.questions.length - 1) {
      navigateTo(currentPartIdx, currentQIdx + 1);
    } else if (currentPartIdx < totalParts - 1) {
      navigateTo(currentPartIdx + 1, 0);
    }
  }, [currentPart, currentQIdx, currentPartIdx, totalParts, navigateTo]);



  const reRecord = useCallback(() => {
    setPhase("idle");
    setRecSeconds(0);
    setAnalyser(null);
  }, []);

  const submitTest = useCallback(() => {
    const isFullTest = new URLSearchParams(window.location.search).get('fullTest') === 'true';
    if (isFullTest) {
      try {
        const session = JSON.parse(sessionStorage.getItem('ieltsFullTest') || 'null');
        if (session) {
          const nextIdx = session.currentSection + 1;
          if (nextIdx < session.sections.length) {
            const updated = { ...session, currentSection: nextIdx };
            sessionStorage.setItem('ieltsFullTest', JSON.stringify(updated));
            const next = updated.sections[nextIdx];
            window.location.href = `/test/${next.skill}/${next.testId}?fullTest=true&mode=${session.mode || 'practice'}`;
            return;
          } else {
            sessionStorage.removeItem('ieltsFullTest');
            window.location.href = `/test/complete?mode=${session.mode || 'practice'}&skill=speaking&fullTest=true`;
            return;
          }
        }
      } catch { window.location.href = '/exam-library'; return; }
    }
    const count = Object.keys(audioUrls).length;
    setSubmitted(true);
    setTimeout(
      () =>
        alert(
          `Speaking test submitted!\n${count} answer(s) recorded out of ${testData?.parts?.reduce((a, p) => a + p.questions.length, 0) ?? 0
          } questions.`
        ),
      50
    );
  }, [audioUrls, testData]);

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
        <button onClick={() => window.location.href = '/exam-library'} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1e3a8a', color: '#fff', cursor: 'pointer' }}>← Quay lại thư viện</button>
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
      />

      <div className="instruction-bar">
        {currentPart?.instruction && <p dangerouslySetInnerHTML={{ __html: currentPart.instruction }} />}
      </div>

      {/* Main card ──────────────────────────────────────────────────────── */}
      <main className="spk-main">
        <div className="spk-card">
          {/* Part label */}
          <div className="spk-part-label">
            Part {currentPart.partNumber} · <span dangerouslySetInnerHTML={{ __html: currentPart.title }} />
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
              <span dangerouslySetInnerHTML={{ __html: currentQ.text }} />
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

          {/* Next / Submit after recording */}
          {phase === "done" && (
            <div className="spk-next-row">
              {isLastQ ? (
                <button className="spk-next-btn" onClick={submitTest}>
                  Submit test
                </button>
              ) : (
                <button className="spk-next-btn" onClick={goNext}>
                  Next question <ChevronRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default IeltsSpeakingTest;
