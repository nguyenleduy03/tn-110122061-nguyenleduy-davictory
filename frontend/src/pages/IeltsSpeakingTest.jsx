import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  RotateCcw,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { useParams } from "react-router-dom";
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
  const [partSecondsLeft, setPartSecondsLeft] = useState(0);

  // stage: mic-test | part | part-review
  const [stage, setStage] = useState('mic-test');
  const [micTested, setMicTested] = useState(false);

  const [audioUrls, setAudioUrls] = useState({}); // { questionId: objectURL }
  const [micAllowed, setMicAllowed] = useState(null); // null | true | false
  const [submitted, setSubmitted] = useState(false);

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
      clearInterval(partTimerRef.current);
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

  const getPartDurationSec = useCallback((part) => {
    if (!part) return 0;
    if (part.durationMinutes && part.durationMinutes > 0) return part.durationMinutes * 60;
    return PART_DURATION_SECONDS[part.partNumber] ?? 0;
  }, []);

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

  const runMicTest = useCallback(async () => {
    const stream = await ensureMic();
    if (!stream) return;
    setMicTested(true);
    setAnalyser(analyserRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            window.location.href = `/test/complete?mode=${session.mode || 'practice'}&skill=speaking&fullTest=true&testId=${testId}`;
            return;
          }
        }
      } catch { window.location.href = '/exam-library'; return; }
    }
    const count = Object.keys(audioUrls).length;
    setSubmitted(true);
    // After setSubmitted(true), we don't automatically navigate, but if the user finishes, they might need a way to go to complete page.
    // However, looking at the UI, the submit 버튼 calls this. Let's redirect to complete page after submitted.
    setTimeout(() => {
        window.location.href = `/test/complete?mode=practice&skill=speaking&testId=${testId}`;
    }, 2000);
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
        duration={testData.totalMinutes}
        onTimeUp={submitTest}
      />

      <div className="instruction-bar">
          <h3 dangerouslySetInnerHTML={{ __html: currentPart?.title }} />
          {currentPart?.instruction && <p dangerouslySetInnerHTML={{ __html: currentPart.instruction }} />}
      </div>

      {/* Main card ──────────────────────────────────────────────────────── */}
      <main className="spk-main">
        {stage === 'mic-test' && (
          <div className="spk-card spk-mic-check">
            <div className="spk-mic-title">Kiểm tra micro trước khi bắt đầu</div>
            <div className="spk-mic-sub">
              Cho phép quyền micro để bạn có thể ghi âm câu trả lời trong bài Speaking.
            </div>
            <div className="spk-mic-actions">
              <button className="spk-mic-test-btn" onClick={runMicTest}>
                Bắt đầu test mic
              </button>
              <button
                className="spk-start-btn"
                disabled={!micTested}
                onClick={() => startPartWithIndex(0)}
              >
                Bắt đầu Part 1
              </button>
            </div>
            {micTested && analyser && (
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
              Part {currentPart.partNumber} · <span dangerouslySetInnerHTML={{ __html: currentPart.title }} />
              <span className="spk-part-meta">
                ({currentPart.questions.length} questions) · {fmtTime(partSecondsLeft)}
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
