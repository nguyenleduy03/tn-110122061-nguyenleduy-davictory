import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Mic,
  MicOff,
  RotateCcw,
  ChevronRight,
  Volume2,
  Headphones,
  Pause,
  Circle,
} from "lucide-react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "../styles/ieltsTest.css";
import TestHeader from "../components/common/TestHeader";
import GuestInfoForm from "../components/common/GuestInfoForm";
import { ieltsApi } from "../services/ieltsApi";
import { authApi } from "../services/authApi";
import { fileApi } from "../services/fileApi";
import { normalizeRichHtml } from "../utils/textFormatters";
import { buildTimerPersistKey, markTestSubmitted, getSubmittedRedirect } from "../utils/testRuntimeState";

const sanitizeSpeakingHtml = (html) => {
  if (typeof html !== 'string') return html || '';

  // SSR-safe fallback keeps formatting while dropping obvious script payloads.
  if (typeof window === 'undefined' || !window.document) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');
  }

  try {
    const container = window.document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((node) => {
      node.remove();
    });

    container.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || '').trim();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && /^javascript:/i.test(value)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return container.innerHTML.trim();
  } catch {
    return html;
  }
};

const formatSpeakingHtml = (value) => sanitizeSpeakingHtml(normalizeRichHtml(value || ''));

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (sec) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const createToneSampleUrl = (durationSec = 8, frequency = 440, sampleRate = 44100) => {
  const samples = Math.max(1, Math.floor(durationSec * sampleRate));
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);

  const amplitude = 0.3;
  for (let i = 0; i < samples; i += 1) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    const value = Math.max(-1, Math.min(1, sample * amplitude));
    view.setInt16(44 + i * 2, value * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
};

const PREP_SECONDS = 60;
const THINK_SECONDS = 5;
const STANDARD_PART_DURATION_SECONDS = 5 * 60;
const CUE_CARD_PART_DURATION_SECONDS = 2 * 60;

const isCueCardQuestion = (question) =>
  Array.isArray(question?.bulletPoints) && question.bulletPoints.length > 0;

const toDisplayValue = (value) => (value == null ? '' : String(value).trim());

const isPlaceholderCandidateId = (value) => {
  const normalized = toDisplayValue(value).toUpperCase().replace(/[_\s]+/g, '-');
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

const getTokenIdentity = () => {
  if (typeof window === 'undefined') return '';
  const token = window.localStorage.getItem('authToken');
  if (!token) return '';

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart || !window.atob) return '';
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const payload = JSON.parse(window.atob(padded));

    return [
      payload?.candidateId,
      payload?.studentId,
      payload?.userId,
      payload?.id,
      payload?.username,
      payload?.email,
      payload?.sub,
    ]
      .map(toDisplayValue)
      .find((value) => !isPlaceholderCandidateId(value)) || '';
  } catch {
    return '';
  }
};

const resolveDefaultPartDurationSec = (part) => {
  const hasCueCardQuestion = (part?.questions ?? []).some(
    (q) => Array.isArray(q?.bulletPoints) && q.bulletPoints.length > 0,
  );
  return hasCueCardQuestion
    ? CUE_CARD_PART_DURATION_SECONDS
    : STANDARD_PART_DURATION_SECONDS;
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

const STAGE_UI_TEXT = {
  intro: {
    startButton: 'Start now',
    instructionTitle: 'Instruction',
    noInstruction: 'No instruction provided.',
  },
  part: {
    thinkPrefix: 'Time to Think',
    nextQuestion: 'Next Question',
    completePart: 'Hoàn thành Part',
    idleHintCueCard: 'Press the microphone to begin 1-minute preparation',
    idleHintAnswer: 'Press the microphone to start recording your answer',
    recordingPrefix: 'Recording',
    doneHint: '✓ Answer recorded',
    stopRecording: 'Stop recording',
    autoRecording: 'Recording starts automatically',
  },
  review: {
    resetPart: 'Reset This Part',
    nextPart: 'Phần tiếp theo',
    submit: 'Nộp bài',
    endTitlePrefix: "IT'S THE END OF PART",
    subtitle: 'You can review your part recording by clicking the Play button below',
    missingRecording: 'Chưa có bản ghi cho part này',
    continuePrefix: 'YOU CAN CLICK',
    continueAction: 'NEXT PART',
    continueSuffix: 'TO CONTINUE',
    resetPrefix: 'OR',
    resetAction: 'RESET THIS PART',
    resetSuffix: 'TO RECORD AGAIN',
  },
};

const audioBufferToWavBlob = (audioBuffer) => {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = samples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = [];
  for (let c = 0; c < channels; c += 1) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < samples; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
};

const mergeRecordingBlobs = async (blobs) => {
  const usableBlobs = (blobs || []).filter((blob) => blob && blob.size > 0);
  if (!usableBlobs.length) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || usableBlobs.length === 1) {
    return usableBlobs[0];
  }

  const context = new AudioContextClass();
  try {
    const decoded = [];
    for (const blob of usableBlobs) {
      const buf = await blob.arrayBuffer();
      const audio = await context.decodeAudioData(buf.slice(0));
      decoded.push(audio);
    }

    if (!decoded.length) return usableBlobs[0];

    const sampleRate = decoded[0].sampleRate;
    const numberOfChannels = Math.max(...decoded.map((b) => b.numberOfChannels));
    const totalLength = decoded.reduce((sum, b) => sum + b.length, 0);
    const merged = context.createBuffer(numberOfChannels, totalLength, sampleRate);

    let writeOffset = 0;
    decoded.forEach((buffer) => {
      for (let c = 0; c < numberOfChannels; c += 1) {
        const target = merged.getChannelData(c);
        const source = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
        target.set(source, writeOffset);
      }
      writeOffset += buffer.length;
    });

    return audioBufferToWavBlob(merged);
  } catch {
    return usableBlobs[0];
  } finally {
    await context.close().catch(() => { });
  }
};

// ── Waveform visualiser (canvas) ──────────────────────────────────────────────
const Waveform = ({ analyser, width = 280, height = 48, className = "spk-waveform" }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const peaksRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const columnCount = Math.max(40, Math.floor(canvas.width / 2));
    const peaks = peaksRef.current?.length === columnCount
      ? peaksRef.current
      : new Float32Array(columnCount);
    peaksRef.current = peaks;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const midY = canvas.height / 2;

      // Sample across the full canvas width so the waveform always fills the bar,
      // even when analyser buffer size is smaller than visual columns.
      const samplesPerColumn = Math.max(1, Math.floor(bufferLength / columnCount));
      const sampleWindow = Math.max(1, Math.ceil(samplesPerColumn / 2));
      const amplitudeCap = Math.max(2, canvas.height * 0.48);
      const stepX = canvas.width / Math.max(1, columnCount);
      const barWidth = Math.max(1, stepX * 0.82);

      for (let x = 0; x < columnCount; x += 1) {
        const center = Math.round((x / Math.max(1, columnCount - 1)) * Math.max(0, bufferLength - 1));
        const start = Math.max(0, center - sampleWindow);
        const end = Math.min(bufferLength - 1, center + sampleWindow);

        let peak = 0;
        for (let i = start; i <= end; i += 1) {
          const sample = Math.abs((dataArray[i] - 128) / 128);
          if (sample > peak) peak = sample;
        }

        const boosted = Math.min(1, Math.pow(peak, 0.66) * 1.85);
        const target = Math.max(0.55, boosted * amplitudeCap);
        const prev = peaks[x] || 0;
        const smooth = target > prev ? 0.58 : 0.2;
        peaks[x] = prev + (target - prev) * smooth;
      }

      ctx.fillStyle = "rgba(192, 0, 28, 0.96)";
      for (let x = 0; x < columnCount; x += 1) {
        const half = peaks[x];
        const left = x * stepX;
        const top = Math.max(0, midY - half);
        const barHeight = Math.min(canvas.height, half * 2);
        ctx.fillRect(left, top, barWidth, barHeight);
      }
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};

// ── Cue card prompt renderer ─────────────────────────────────────────────────
const CueCard = ({ question }) => (
  <div className="spk-cuecard">
    {question.topic && (
      <div className="spk-cuecard-topic" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(question.topic) }} />
    )}
    {question.shouldSayLabel && (
      <div className="spk-cuecard-label" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(question.shouldSayLabel) }} />
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
  const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id: testId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFullTest = searchParams.get('fullTest') === 'true';
  const mode = searchParams.get('mode') || 'practice';
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

  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);

  // phase: idle | preparing | recording | done
  const [phase, setPhase] = useState("idle");
  const [prepSeconds, setPrepSeconds] = useState(PREP_SECONDS);
  const [recSeconds, setRecSeconds] = useState(0);
  const [thinkSecondsLeft, setThinkSecondsLeft] = useState(THINK_SECONDS);
  const [partSecondsLeft, setPartSecondsLeft] = useState(0);
  const [recordingStopSeq, setRecordingStopSeq] = useState(0);
  const [startTime] = useState(() => Date.now());

  // stage: mic-test | part-intro | part | part-review
  const [stage, setStage] = useState('mic-test');

  const [requiresClassification, setRequiresClassification] = useState(false);
  const [userClassification, setUserClassification] = useState(null);

  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');

  const [headphoneChecked, setHeadphoneChecked] = useState(false);
  const [headphoneCurrentTime, setHeadphoneCurrentTime] = useState(0);
  const [headphoneDuration, setHeadphoneDuration] = useState(8);
  const [isHeadphonePlaying, setIsHeadphonePlaying] = useState(false);
  const [headphoneSampleUrl, setHeadphoneSampleUrl] = useState('');

  const [micCheckStatus, setMicCheckStatus] = useState('idle'); // idle | recording | recorded
  const [micCheckSeconds, setMicCheckSeconds] = useState(0);
  const [micCheckUrl, setMicCheckUrl] = useState('');
  const [micCheckCurrentTime, setMicCheckCurrentTime] = useState(0);
  const [micCheckDuration, setMicCheckDuration] = useState(0);
  const [isMicCheckPlaying, setIsMicCheckPlaying] = useState(false);

  const [audioUrls, setAudioUrls] = useState({}); // { questionId: objectURL }
  const [partReviewAudioUrls, setPartReviewAudioUrls] = useState({}); // { partIdx: objectURL }
  const [micAllowed, setMicAllowed] = useState(null); // null | true | false

  // recording internals
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const activeInputDeviceIdRef = useRef('');
  const timerRef = useRef(null);
  const partTimerRef = useRef(null);
  const micCheckRecorderRef = useRef(null);
  const micCheckChunksRef = useRef([]);
  const micCheckTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const headphoneAudioRef = useRef(null);
  const micCheckAudioRef = useRef(null);
  const autoStartTriggeredRef = useRef(false);
  const pendingTransitionRef = useRef(null);
  const pendingAudioUrlsRef = useRef({});
  const pendingAudioBlobsRef = useRef({});
  const partReviewAudioBlobsRef = useRef({});
  const submitInFlightRef = useRef(false);
  const [analyser, setAnalyser] = useState(null);

  useEffect(() => {
    const handlePreviewRefresh = (event) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || payload.type !== 'DAVICTORY_PREVIEW_REFRESH') return;
      if (String(payload.testId) !== String(testId)) return;
      const skill = String(payload.skillType || '').toUpperCase();
      if (skill && skill !== 'SPEAKING') return;
      setPreviewRefreshTick((prev) => prev + 1);
    };

    window.addEventListener('message', handlePreviewRefresh);
    return () => window.removeEventListener('message', handlePreviewRefresh);
  }, [testId]);

  // ── Load test data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) { setError('Không tìm thấy ID bài thi.'); setLoading(false); return; }

    const fallbackParam = searchParams.get('fallback');
    const fallbackSkills = fallbackParam ? fallbackParam.split(',') : [];

    ieltsApi.getTestSession(testId, "SPEAKING", fallbackSkills).then((data) => {
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

      if (isGuest && guestInfo && !attemptId) {
        ieltsApi.startGuestAttempt(guestInfo, testId, 'SPEAKING')
          .then((attempt) => {
            setAttemptId(attempt.id);
          })
          .catch((startError) => {
            console.error('[Speaking] Failed to start guest attempt:', startError);
          });
      }

      // Kiểm tra xem có cần phân loại Work/Study không
      const hasClassification = configuredData.parts?.[0]?.questionGroups?.some(
        g => g.classification === 'WORK' || g.classification === 'STUDY'
      );
      
      if (hasClassification) {
        setRequiresClassification(true);
        // Lưu tạm vào testData, sẽ filter sau khi người dùng chọn
        setTestData(configuredData);
      } else {
        setTestData(configuredData);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('[Speaking] Lỗi tải bài thi:', err);
      setError(err.message === 'AUTH_REQUIRED'
        ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
        : `Không thể tải bài thi: ${err.message}`);
      setLoading(false);
    });
  }, [testId, mode, isFullTest, selectedPracticeParts, durationOverrideMinutes, noTimeLimit, previewRefreshTick, isGuest, guestInfo, attemptId]);

  useEffect(() => {
    if (!micCheckUrl) return undefined;
    return () => {
      URL.revokeObjectURL(micCheckUrl);
    };
  }, [micCheckUrl]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return undefined;

    const refreshMediaDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');

        setAudioInputDevices(inputs);

        if (!selectedInputId && inputs.length > 0) {
          setSelectedInputId(inputs[0].deviceId);
        }
      } catch {
        // Ignore device enumeration errors on restricted browsers.
      }
    };

    refreshMediaDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshMediaDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshMediaDevices);
    };
  }, [selectedInputId]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(partTimerRef.current);
      clearInterval(micCheckTimerRef.current);
      if (micCheckRecorderRef.current?.state === 'recording') {
        micCheckRecorderRef.current.stop();
      }
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
      Object.values(audioUrls).forEach((url) => URL.revokeObjectURL(url));
      Object.values(pendingAudioUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      Object.values(partReviewAudioUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentPart = testData?.parts?.[currentPartIdx];
  const currentQ = currentPart?.questions?.[currentQIdx];
  const totalParts = testData?.parts?.length ?? 0;
  const currentPartDisplayNumber = currentPart?.partNumber ?? (currentPartIdx + 1);
  const currentPartTitle = currentPart?.title || `Part ${currentPartDisplayNumber}`;
  const currentPartTitleHtml = formatSpeakingHtml(currentPartTitle) || `Part ${currentPartDisplayNumber}`;

  const partInstructions = useMemo(() => {
    const list = [];

    if (currentPart?.instruction) {
      list.push(currentPart.instruction);
    }

    const firstGroup = currentPart?.questionGroups?.[0];
    if (firstGroup?.passageText) {
      try {
        const parsed = JSON.parse(firstGroup.passageText);
        if (parsed?.partInstruction) {
          list.push(parsed.partInstruction);
        }
      } catch {
        // Ignore malformed group instruction payload.
      }
    }

    return list;
  }, [currentPart]);

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
  const questionId = currentQ?.id;
  const isCueCard = isCueCardQuestion(currentQ);
  const isLastQ =
    currentPartIdx === totalParts - 1 &&
    currentQIdx === (currentPart?.questions?.length ?? 1) - 1;

  const renderPartQuestionPrompt = (question, questionIndex) => {
    if (!question) return null;
    if (isCueCardQuestion(question)) {
      return <CueCard question={question} />;
    }

    return (
      <div className="spk-question-text spk-part-question-text-wrap">
        <div className="spk-part-question-label">Question {questionIndex + 1}</div>
        <div className="spk-part-question-text" dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(question.text || '') }} />
      </div>
    );
  };

  const getPartDurationSec = useCallback((part) => {
    if (!part) return 0;
    if (noTimeLimit) return 0;
    if (part.durationMinutes && part.durationMinutes > 0) return part.durationMinutes * 60;
    return resolveDefaultPartDurationSec(part);
  }, [noTimeLimit]);

  // ── Mic setup ──────────────────────────────────────────────────────────────
  const ensureMic = useCallback(async () => {
    const needNewStream =
      !streamRef.current ||
      (selectedInputId && activeInputDeviceIdRef.current !== selectedInputId);

    if (!needNewStream) return streamRef.current;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      await audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }

    try {
      const constraints = selectedInputId
        ? { audio: { deviceId: { exact: selectedInputId } } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      activeInputDeviceIdRef.current = selectedInputId || '';

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      analyserRef.current = an;
      setMicAllowed(true);
      return stream;
    } catch {
      setMicAllowed(false);
      return null;
    }
  }, [selectedInputId]);

  const toggleHeadphonePlayback = useCallback(async () => {
    const audio = headphoneAudioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        if (audio.currentTime >= (audio.duration || headphoneDuration)) {
          audio.currentTime = 0;
        }
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      // Ignore autoplay or device routing errors.
    }
  }, [headphoneDuration]);

  const stopMicCheckRecording = useCallback(() => {
    clearInterval(micCheckTimerRef.current);
    const rec = micCheckRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  }, []);

  const startMicCheckRecording = useCallback(async () => {
    const stream = await ensureMic();
    if (!stream) return;

    clearInterval(micCheckTimerRef.current);
    if (micCheckRecorderRef.current?.state === 'recording') {
      micCheckRecorderRef.current.stop();
    }

    if (micCheckUrl) {
      URL.revokeObjectURL(micCheckUrl);
      setMicCheckUrl('');
    }

    const micAudio = micCheckAudioRef.current;
    if (micAudio) {
      micAudio.pause();
      micAudio.currentTime = 0;
    }
    setIsMicCheckPlaying(false);
    setMicCheckCurrentTime(0);
    setMicCheckDuration(0);

    micCheckChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) micCheckChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(micCheckChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setMicCheckUrl(url);
      setMicCheckStatus('recorded');
      setMicCheckCurrentTime(0);
      setAnalyser(null);
    };

    recorder.start();
    micCheckRecorderRef.current = recorder;
    setMicCheckStatus('recording');
    setMicCheckSeconds(0);
    setAnalyser(analyserRef.current);

    micCheckTimerRef.current = setInterval(() => {
      setMicCheckSeconds((prev) => {
        if (prev >= 19) {
          stopMicCheckRecording();
          return 20;
        }
        return prev + 1;
      });
    }, 1000);
  }, [ensureMic, micCheckUrl, stopMicCheckRecording]);

  const toggleMicCheckPlayback = useCallback(async () => {
    const audio = micCheckAudioRef.current;
    if (!audio || !micCheckUrl) return;

    try {
      if (audio.paused) {
        if (audio.currentTime >= (audio.duration || micCheckDuration || 0)) {
          audio.currentTime = 0;
        }
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      // Ignore playback errors.
    }
  }, [micCheckUrl, micCheckDuration]);

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
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        if (pendingAudioUrlsRef.current[qId]) {
          URL.revokeObjectURL(pendingAudioUrlsRef.current[qId]);
        }
        pendingAudioUrlsRef.current[qId] = url;
        pendingAudioBlobsRef.current[qId] = blob;
      }
      setPhase("done");
      setAnalyser(null);
      setRecordingStopSeq((s) => s + 1);
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
  }, [ensureMic, questionId]);

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  // ── Start preparation (Part 2) ─────────────────────────────────────────────
  const startPrep = useCallback(async () => {
    await ensureMic(); // request early so user sees prompt once
    setPhase("preparing");
    const prepTime = currentQ?.prepSeconds ?? PREP_SECONDS;
    setPrepSeconds(prepTime);
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
  }, [startRecording, currentQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipPrep = useCallback(() => {
    clearInterval(timerRef.current);
    startRecording();
  }, [startRecording]);

  // ── Mic button handler ─────────────────────────────────────────────────────
  const handleMicBtn = useCallback(() => {
    if (phase === "preparing") {
      skipPrep();
    } else if (phase === "recording") {
      stopRecording();
    }
  }, [phase, skipPrep, stopRecording]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const commitCurrentPartRecordings = useCallback(() => {
    const questions = currentPart?.questions ?? [];
    if (!questions.length) return [];

    const updates = {};
    const orderedBlobs = [];
    questions.forEach((q) => {
      if (pendingAudioUrlsRef.current[q.id]) {
        updates[q.id] = pendingAudioUrlsRef.current[q.id];
        delete pendingAudioUrlsRef.current[q.id];
      }
      if (pendingAudioBlobsRef.current[q.id]) {
        const candidateBlob = pendingAudioBlobsRef.current[q.id];
        if (candidateBlob.size > 0) {
          orderedBlobs.push(candidateBlob);
        }
        delete pendingAudioBlobsRef.current[q.id];
      }
    });

    const ids = Object.keys(updates);
    if (!ids.length) return orderedBlobs;

    setAudioUrls((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        if (next[id] && next[id] !== updates[id]) {
          URL.revokeObjectURL(next[id]);
        }
        next[id] = updates[id];
      });
      return next;
    });

    return orderedBlobs;
  }, [currentPart]);

  const buildPartReviewAudio = useCallback(async (partIdx, orderedBlobs) => {
    const mergedBlob = await mergeRecordingBlobs(orderedBlobs);
    if (!mergedBlob || mergedBlob.size <= 0) return;

    const mergedUrl = URL.createObjectURL(mergedBlob);
    if (!mergedUrl) return;

    partReviewAudioBlobsRef.current[partIdx] = mergedBlob;

    setPartReviewAudioUrls((prev) => {
      if (prev[partIdx] && prev[partIdx] !== mergedUrl) {
        URL.revokeObjectURL(prev[partIdx]);
      }
      return { ...prev, [partIdx]: mergedUrl };
    });
  }, []);

  const navigateTo = useCallback(
    (partIdx, qIdx) => {
      clearInterval(timerRef.current);
      setCurrentPartIdx(partIdx);
      setCurrentQIdx(qIdx);
      pendingTransitionRef.current = null;
      autoStartTriggeredRef.current = false;
      setPhase("idle");
      setThinkSecondsLeft(THINK_SECONDS);
      setRecSeconds(0);
      setPrepSeconds(PREP_SECONDS);
      setAnalyser(null);
    },
    []
  );

  const goPartReview = useCallback(() => {
    if (phase === 'recording') {
      pendingTransitionRef.current = { type: 'review' };
      stopRecording();
      return;
    }

    clearInterval(timerRef.current);
    clearInterval(partTimerRef.current);
    pendingTransitionRef.current = null;
    autoStartTriggeredRef.current = false;
    const partIdx = currentPartIdx;
    const orderedBlobs = commitCurrentPartRecordings();
    void buildPartReviewAudio(partIdx, orderedBlobs);
    setPhase('idle');
    setAnalyser(null);
    setStage('part-review');
  }, [phase, stopRecording, currentPartIdx, commitCurrentPartRecordings, buildPartReviewAudio]);

  const resetCurrentPart = useCallback(() => {
    const questions = currentPart?.questions ?? [];

    setAudioUrls((prev) => {
      const next = { ...prev };
      questions.forEach((q) => {
        const qId = q.id;
        if (next[qId]) {
          URL.revokeObjectURL(next[qId]);
          delete next[qId];
        }
        if (pendingAudioUrlsRef.current[qId]) {
          URL.revokeObjectURL(pendingAudioUrlsRef.current[qId]);
          delete pendingAudioUrlsRef.current[qId];
        }
        if (pendingAudioBlobsRef.current[qId]) {
          delete pendingAudioBlobsRef.current[qId];
        }
      });
      return next;
    });

    setPartReviewAudioUrls((prev) => {
      if (!prev[currentPartIdx]) return prev;
      URL.revokeObjectURL(prev[currentPartIdx]);
      const next = { ...prev };
      delete next[currentPartIdx];
      return next;
    });
    if (partReviewAudioBlobsRef.current[currentPartIdx]) {
      delete partReviewAudioBlobsRef.current[currentPartIdx];
    }

    pendingTransitionRef.current = null;
    autoStartTriggeredRef.current = false;
    clearInterval(partTimerRef.current);
    const durationSec = getPartDurationSec(testData?.parts?.[currentPartIdx]);
    setPartSecondsLeft(durationSec);
    if (durationSec > 0) {
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
    }
    setStage('part');
    setCurrentQIdx(0);
    setPhase('idle');
    setRecSeconds(0);
    setPrepSeconds(PREP_SECONDS);
    setThinkSecondsLeft(THINK_SECONDS);
    setAnalyser(null);
  }, [currentPart, currentPartIdx, getPartDurationSec, testData, goPartReview]);

  const startPartWithIndex = useCallback((partIdx) => {
    const part = testData?.parts?.[partIdx];
    if (!part) return;

    // Show part intro first
    setCurrentPartIdx(partIdx);
    pendingTransitionRef.current = null;
    autoStartTriggeredRef.current = false;
    setStage('part-intro');
    setPhase('idle');
    setRecSeconds(0);
    setPrepSeconds(PREP_SECONDS);
    setThinkSecondsLeft(THINK_SECONDS);
    setAnalyser(null);
  }, [testData]);

  const startPartQuestions = useCallback(() => {
    const part = testData?.parts?.[currentPartIdx];
    if (!part) return;

    clearInterval(partTimerRef.current);
    const durationSec = getPartDurationSec(part);
    setPartSecondsLeft(durationSec);
    setStage('part');
    setCurrentQIdx(0);
    autoStartTriggeredRef.current = false;
    setThinkSecondsLeft(THINK_SECONDS);
    setPhase('idle');
    setRecSeconds(0);
    setAnalyser(null);

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

    if (pendingTransitionRef.current) return;

    if (phase === 'idle' && thinkSecondsLeft > 0) {
      clearInterval(timerRef.current);
      autoStartTriggeredRef.current = true;
      setThinkSecondsLeft(0);
      setPrepSeconds(0);
      void startRecording();
      return;
    }

    if (phase === 'preparing') {
      skipPrep();
      return;
    }

    const nextTransition = currentQIdx < currentPart.questions.length - 1
      ? { type: 'next', partIdx: currentPartIdx, qIdx: currentQIdx + 1 }
      : { type: 'review' };

    if (phase === 'recording') {
      pendingTransitionRef.current = nextTransition;
      stopRecording();
      return;
    }

    if (phase !== 'done') {
      return;
    }

    if (nextTransition.type === 'next') {
      navigateTo(nextTransition.partIdx, nextTransition.qIdx);
    } else {
      goPartReview();
    }
  }, [currentPart, currentQIdx, currentPartIdx, phase, thinkSecondsLeft, startRecording, skipPrep, stopRecording, navigateTo, goPartReview]);

  useEffect(() => {
    if (!recordingStopSeq) return;
    const pending = pendingTransitionRef.current;
    if (!pending) return;

    pendingTransitionRef.current = null;
    if (pending.type === 'next') {
      navigateTo(pending.partIdx, pending.qIdx);
      return;
    }

    goPartReview();
  }, [recordingStopSeq, navigateTo, goPartReview]);

  useEffect(() => {
    if (stage !== 'part' || !currentQ) return;
    autoStartTriggeredRef.current = false;
    setThinkSecondsLeft(THINK_SECONDS);
  }, [stage, currentPartIdx, currentQIdx, currentQ]);

  useEffect(() => {
    if (stage !== 'part') return;
    if (phase !== 'idle') return;

    if (thinkSecondsLeft <= 0) {
      if (autoStartTriggeredRef.current) return;
      autoStartTriggeredRef.current = true;
      if (isCueCard) {
        startPrep();
      } else {
        startRecording();
      }
      return;
    }

    const thinkTimer = setInterval(() => {
      setThinkSecondsLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(thinkTimer);
  }, [stage, phase, thinkSecondsLeft, isCueCard, startPrep, startRecording]);

  const buildDriveSubmissionAnswers = useCallback(async () => {
    const parts = testData?.parts || [];
    if (!parts.length) return {};

    const rawTestTitle =
      testData?.testTitle
      || testData?.title
      || testData?.sessionName
      || `Speaking_Test_${testId}`;
    const fallbackTestCode = `Speaking_Test_${testId || 'UNKNOWN'}`;
    const normalizedTitle = toSafeFileSegment(rawTestTitle);
    const resolvedTestCode = (!normalizedTitle || isUntitledLike(normalizedTitle))
      ? fallbackTestCode
      : normalizedTitle;
    const resolvedTestTitle = isUntitledLike(rawTestTitle)
      ? resolvedTestCode
      : rawTestTitle;
    const driveAnswers = {};

    const blobFromObjectUrl = async (objectUrl) => {
      if (!objectUrl) return null;
      const response = await fetch(objectUrl);
      if (!response.ok) {
        throw new Error(`Cannot read local recording (${response.status})`);
      }
      const blob = await response.blob();
      return blob && blob.size > 0 ? blob : null;
    };

    const resolvePartUploadBlob = async (part, partIdx) => {
      const reviewBlob = partReviewAudioBlobsRef.current?.[partIdx];
      if (reviewBlob && reviewBlob.size > 0) {
        return reviewBlob;
      }

      const reviewUrl = partReviewAudioUrls?.[partIdx];
      if (reviewUrl) {
        const blob = await blobFromObjectUrl(reviewUrl);
        if (blob) return blob;
      }

      const questionBlobs = [];
      for (const question of (part?.questions || [])) {
        const qId = question?.id;
        if (!qId) continue;

        const pendingBlob = pendingAudioBlobsRef.current[qId];
        if (pendingBlob && pendingBlob.size > 0) {
          questionBlobs.push(pendingBlob);
          continue;
        }

        const sourceUrl = pendingAudioUrlsRef.current[qId] || audioUrls[qId];
        if (!sourceUrl) continue;
        const sourceBlob = await blobFromObjectUrl(sourceUrl);
        if (sourceBlob) {
          questionBlobs.push(sourceBlob);
        }
      }

      if (!questionBlobs.length) return null;

      const mergedBlob = await mergeRecordingBlobs(questionBlobs);
      return mergedBlob && mergedBlob.size > 0 ? mergedBlob : null;
    };

    for (let partIdx = 0; partIdx < parts.length; partIdx += 1) {
      const part = parts[partIdx];
      const partDisplayNumber = part?.partNumber || (partIdx + 1);
      const partQuestions = (part?.questions || []).filter((q) => Boolean(q?.id));
      if (!partQuestions.length) continue;

      try {
        const uploadBlob = await resolvePartUploadBlob(part, partIdx);
        if (!uploadBlob) {
          continue;
        }

        const mimeType = uploadBlob.type && uploadBlob.type.startsWith('audio/') ? uploadBlob.type : 'audio/wav';
        const extension = mimeType.includes('wav')
          ? 'wav'
          : (mimeType.includes('ogg') ? 'ogg' : 'webm');
        const safePartNumber = toSafeFileSegment(partDisplayNumber) || String(partIdx + 1);
        const fileName = `part_${safePartNumber}.${extension}`;
        const uploadFile = new File([uploadBlob], fileName, { type: mimeType });

        const uploaded = await fileApi.uploadSpeakingAudio(uploadFile, resolvedTestTitle, testId, {
          skillName: 'SPEAKING',
          testCode: resolvedTestCode,
        });
        const driveUrl = String(uploaded?.url || '').trim();
        if (!driveUrl) {
          throw new Error('Drive upload succeeded but returned empty URL');
        }

        partQuestions.forEach((question) => {
          driveAnswers[question.id] = driveUrl;
        });
      } catch (error) {
        const reason = error?.message || 'Unknown error';
        throw new Error(`Không thể upload ghi âm Part ${partDisplayNumber}: ${reason}`);
      }
    }

    return driveAnswers;
  }, [audioUrls, partReviewAudioUrls, testData, testId]);

  const submitTest = useCallback(() => {
    if (submitInFlightRef.current) return;
    if (isGuest && !attemptId) {
      alert('Vui lòng chờ hệ thống khởi tạo lượt làm bài khách trước khi nộp.');
      return;
    }
    submitInFlightRef.current = true;

    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    const handleSubmitError = (err) => {
      console.error('[Speaking] Lỗi nộp bài:', err);
      const message = err?.message || err?.response?.data?.error || 'Không thể nộp bài lên Google Drive. Vui lòng thử lại.';
      alert(message);
    };

    // Upload audio recordings to Drive first, then submit with Drive URLs.
    const submitPromise = buildDriveSubmissionAnswers()
      .then((driveAnswers) => {
        if (isGuest && attemptId) {
          const guestAnswers = Object.entries(driveAnswers).map(([questionId, selectedOptionLabel]) => {
            const parsedQuestionId = Number.parseInt(questionId, 10);
            if (!Number.isFinite(parsedQuestionId)) return null;

            return {
              questionId: parsedQuestionId,
              selectedOptionLabel: String(selectedOptionLabel || ''),
            };
          }).filter(Boolean);

          return ieltsApi.submitGuestAttempt(attemptId, timeSpentSeconds, guestAnswers);
        }

        return ieltsApi.submitAnswers(testId, 'SPEAKING', driveAnswers, timeSpentSeconds, testData);
      });

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
            ieltsApi.clearFullTestProgress(testId).catch(() => { });
            submitPromise
              .then(() => {
                const nextUrl = `/test/${next.skill}/${next.testId}?fullTest=true&mode=${session.mode || mode}`;
                markTestSubmitted(timerPersistKey, nextUrl);
                navigate(nextUrl);
              })
              .catch(handleSubmitError)
              .finally(() => {
                submitInFlightRef.current = false;
              });
            return;
          }

          sessionStorage.removeItem('ieltsFullTest');
          sessionStorage.removeItem(`ieltsFullTestSnapshot_speaking_${testId}`);
          ieltsApi.clearFullTestProgress(testId).catch(() => { });
          submitPromise
            .then(() => {
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
            })
            .catch(handleSubmitError)
            .finally(() => {
              submitInFlightRef.current = false;
            });
          return;
        }
      } catch {
        submitInFlightRef.current = false;
        navigate('/exam-library');
        return;
      }
    }

    submitPromise
      .then((resp) => {
        // Nếu là bài tập, submit vào assignment API
        if (assignmentId && resp?.attemptId) {
          return import('../utils/assignmentHelper').then(({ submitTestToAssignment }) => {
            submitTestToAssignment(
              parseInt(assignmentId),
              resp.attemptId,
              navigate,
              null,
              (err) => alert(`Nộp bài tập thất bại: ${err.message}`)
            );
          });
        }

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
        return null;
      })
      .catch(handleSubmitError)
      .finally(() => {
        submitInFlightRef.current = false;
      });
  }, [
    startTime,
    testId,
    testData,
    isFullTest,
    navigate,
    mode,
    allowReviewInExam,
    timerPersistKey,
    assignmentId,
    buildDriveSubmissionAnswers,
  ]);

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

  const micBtnClass = [
    "spk-mic-btn",
    phase === "recording" ? "recording" : "",
    phase === "done" ? "done" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isThinking = stage === 'part' && phase === 'idle' && thinkSecondsLeft > 0;
  const canAdvanceQuestion = phase === "recording" || phase === "done" || phase === 'preparing' || isThinking;
  const micButtonDisabled = stage === 'part';
  const micCheckHeaderSeconds = stage === 'mic-test'
    ? Math.max(0, 20 - micCheckSeconds)
    : null;
  const partTopActionLabel = (isThinking || phase === 'preparing')
    ? `${STAGE_UI_TEXT.part.thinkPrefix} ${fmtTime(phase === 'preparing' ? prepSeconds : thinkSecondsLeft)}`
    : (isLastQ ? STAGE_UI_TEXT.part.completePart : STAGE_UI_TEXT.part.nextQuestion);
  const micIdleHint = isCueCard
    ? STAGE_UI_TEXT.part.idleHintCueCard
    : STAGE_UI_TEXT.part.idleHintAnswer;
  const micButtonAriaLabel = phase === 'recording'
    ? STAGE_UI_TEXT.part.stopRecording
    : STAGE_UI_TEXT.part.autoRecording;
  const reviewContinuePartSuffix = currentPartIdx < totalParts - 1 ? ` PART ${currentPartIdx + 2}` : '';
  const storedUser = authApi.getStoredUser();
  const tokenIdentity = getTokenIdentity();
  const resolvedCandidateId = [
    testData?.candidateId,
    testData?.studentId,
    testData?.candidateCode,
    storedUser?.candidateId,
    storedUser?.userId,
    storedUser?.studentId,
    storedUser?.studentCode,
    storedUser?.candidateCode,
    storedUser?.code,
    storedUser?.id,
    storedUser?.username,
    storedUser?.email,
    tokenIdentity,
  ]
    .map(toDisplayValue)
    .find((value) => !isPlaceholderCandidateId(value)) || 'N/A';
  const resolvedCandidateName = [
    testData?.candidateName,
    storedUser?.fullName,
    storedUser?.name,
    storedUser?.username,
  ]
    .map((value) => (value == null ? '' : String(value).trim()))
    .find(Boolean) || 'Candidate';

  return (
    <div className="ielts-container">
      <TestHeader
        candidateName={resolvedCandidateName}
        candidateId={resolvedCandidateId}
        submitTest={submitTest}
        hideSubmitButton={true}
        hideTimer={false}
        timerPaused={stage !== 'part'}
        duration={testData.totalMinutes}
        noTimeLimit={noTimeLimit}
        onTimeUp={submitTest}
        isFullTest={isFullTest}
        skill="speaking"
        navigate={navigate}
        timerPersistKey={timerPersistKey}
        timerOverrideSeconds={micCheckHeaderSeconds}
        mode={assignmentId ? 'practice' : mode}
      />

      {/* Main card ──────────────────────────────────────────────────────── */}
      <main className="spk-main">
        {requiresClassification ? (
          <div className="spk-card spk-unified-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>Phân loại đối tượng thi</h2>
            <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '32px' }}>
              Are you currently working or studying? (Bạn đang đi làm hay đi học?)
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '600', color: 'white', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => {
                  setUserClassification('WORK');
                  const filteredData = {
                    ...testData,
                    parts: testData.parts.map((p, idx) => {
                      if (idx !== 0) return p;
                      return {
                        ...p,
                        questionGroups: p.questionGroups.filter(g => g.classification === 'WORK' || !g.classification || g.classification === 'GENERAL')
                      };
                    })
                  };
                  setTestData(filteredData);
                  setRequiresClassification(false);
                }}
              >
                Working (Đi làm)
              </button>
              <button 
                style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '600', color: 'white', backgroundColor: '#10b981', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => {
                  setUserClassification('STUDY');
                  const filteredData = {
                    ...testData,
                    parts: testData.parts.map((p, idx) => {
                      if (idx !== 0) return p;
                      return {
                        ...p,
                        questionGroups: p.questionGroups.filter(g => g.classification === 'STUDY' || !g.classification || g.classification === 'GENERAL')
                      };
                    })
                  };
                  setTestData(filteredData);
                  setRequiresClassification(false);
                }}
              >
                Studying (Đi học)
              </button>
            </div>
          </div>
        ) : (
        <div className="spk-card spk-unified-card">
          {stage === 'mic-test' && (
            <div className="spk-stage-screen spk-check-stage spk-check-mic-only">
              <h2 className="spk-check-mic-title">TEST YOUR MICROPHONE</h2>

              {micCheckStatus === 'recorded' && micCheckUrl ? (
                <>
                  <div className="spk-check-mic-review-player">
                    <audio controls src={micCheckUrl} className="spk-check-mic-review-audio" />
                  </div>

                  <p className="spk-check-mic-review-text">Click the Play button to listen to your microphone test recording.</p>
                  <p className="spk-check-mic-review-text">If your microphone works properly, click <strong>Start Exam</strong>.</p>

                  <div className="spk-check-mic-actions spk-check-mic-review-actions">
                    <button
                      type="button"
                      className="spk-next-btn spk-check-mic-again-btn"
                      onClick={startMicCheckRecording}
                    >
                      Test Mic Again <RotateCcw size={16} />
                    </button>

                    <button
                      className="spk-next-btn spk-check-mic-start-btn"
                      onClick={() => startPartWithIndex(initialPartIndex)}
                      type="button"
                    >
                      Start Exam <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="spk-check-mic-center">
                    <div className={`spk-check-mic-icon ${micCheckStatus === 'recording' ? 'is-recording' : ''}`} aria-hidden="true">
                      <Mic size={40} />
                    </div>
                  </div>

                  {micCheckStatus === 'recording' && analyser && (
                    <div className="spk-check-mic-wave">
                      <Waveform analyser={analyser} width={560} height={36} className="spk-check-mic-waveform" />
                    </div>
                  )}

                  <p className="spk-check-mic-desc">
                    To complete this activity, you must allow access to your system's microphone.
                  </p>

                  <div className="spk-check-mic-actions">
                    <button
                      type="button"
                      className="spk-start-btn spk-check-mic-test-btn"
                      onClick={() => {
                        if (micCheckStatus === 'recording') {
                          stopMicCheckRecording();
                        } else {
                          startMicCheckRecording();
                        }
                      }}
                    >
                      {micCheckStatus === 'recording' ? 'Stop' : 'Test Microphone'}
                    </button>

                    <button
                      className="spk-next-btn spk-check-mic-skip-btn"
                      onClick={() => startPartWithIndex(initialPartIndex)}
                      type="button"
                    >
                      Skip
                    </button>
                  </div>
                </>
              )}

              {micAllowed === false && (
                <p className="spk-mic-error">
                  ⚠ Microphone access denied. Please allow microphone in your
                  browser settings and reload.
                </p>
              )}
            </div>
          )}

          {stage === 'part-intro' && (
            <div className="spk-stage-screen spk-part-intro">
              <div className="spk-intro-topbar">
                <div className="spk-intro-topbar-spacer" aria-hidden="true" />
                <div
                  className="spk-intro-title spk-intro-title-rich"
                  role="heading"
                  aria-level={2}
                  dangerouslySetInnerHTML={{ __html: currentPartTitleHtml }}
                />
                <button className="spk-next-btn spk-intro-start-btn" onClick={startPartQuestions}>
                  {STAGE_UI_TEXT.intro.startButton}
                </button>
              </div>

              <div className="spk-intro-content spk-stage-body">
                <h3 className="spk-intro-section-title">{STAGE_UI_TEXT.intro.instructionTitle}</h3>
                {partInstructions.length > 0 ? (
                  <div className="spk-intro-instructions">
                    {partInstructions.map((inst, idx) => (
                      <div
                        key={idx}
                        className="spk-intro-instruction"
                        dangerouslySetInnerHTML={{ __html: formatSpeakingHtml(inst) }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="spk-intro-instruction">{STAGE_UI_TEXT.intro.noInstruction}</div>
                )}
              </div>
            </div>
          )}

          {stage === 'part-review' && (
            <div className="spk-stage-screen spk-review">
              <div className="spk-intro-topbar spk-review-topbar">
                <button className="spk-next-btn spk-review-reset-btn" onClick={resetCurrentPart}>
                  {STAGE_UI_TEXT.review.resetPart} <RotateCcw size={16} />
                </button>
                <div
                  className="spk-intro-title spk-intro-title-rich"
                  role="heading"
                  aria-level={2}
                  dangerouslySetInnerHTML={{ __html: currentPartTitleHtml }}
                />
                {currentPartIdx < totalParts - 1 ? (
                  <button className="spk-next-btn spk-review-next-btn" onClick={() => startPartWithIndex(currentPartIdx + 1)}>
                    {STAGE_UI_TEXT.review.nextPart} <ChevronRight size={18} />
                  </button>
                ) : (
                  <button className="spk-next-btn spk-review-next-btn" onClick={submitTest}>
                    {STAGE_UI_TEXT.review.submit}
                  </button>
                )}
              </div>

              <div className="spk-review-full-body spk-stage-body">
                <div className="spk-review-full-title">{STAGE_UI_TEXT.review.endTitlePrefix} {currentPartDisplayNumber}</div>
                <div className="spk-review-full-sub">{STAGE_UI_TEXT.review.subtitle}</div>

                {partReviewAudioUrls[currentPartIdx] ? (
                  <audio controls src={partReviewAudioUrls[currentPartIdx]} className="spk-review-full-audio" />
                ) : (
                  <div className="spk-review-missing">{STAGE_UI_TEXT.review.missingRecording}</div>
                )}

                <div className="spk-review-full-note">
                  {STAGE_UI_TEXT.review.continuePrefix} <strong>{STAGE_UI_TEXT.review.continueAction}</strong> {STAGE_UI_TEXT.review.continueSuffix}{reviewContinuePartSuffix}
                </div>
                <div className="spk-review-full-note">{STAGE_UI_TEXT.review.resetPrefix} <strong>{STAGE_UI_TEXT.review.resetAction}</strong> {STAGE_UI_TEXT.review.resetSuffix}</div>
              </div>
            </div>
          )}

          {stage === 'part' && (
            <div className="spk-stage-screen spk-part-live">
              <div className="spk-intro-topbar spk-part-topbar">
                <div className="spk-intro-topbar-spacer" aria-hidden="true" />
                <div
                  className="spk-intro-title spk-intro-title-rich"
                  role="heading"
                  aria-level={2}
                  dangerouslySetInnerHTML={{ __html: currentPartTitleHtml }}
                />
                <button
                  className="spk-next-btn spk-part-next-top"
                  onClick={goNext}
                  disabled={!canAdvanceQuestion}
                >
                  {partTopActionLabel}
                  {canAdvanceQuestion && <ChevronRight size={18} />}
                </button>
              </div>

              <div className="spk-part-question-stage">
                {renderPartQuestionPrompt(currentQ, currentQIdx)}
              </div>

              {/* Mic button + status ────────────────────────────────────────── */}
              <div className="spk-mic-area">
                {phase === "idle" && (
                  <p className="spk-idle-hint">
                    {micIdleHint}
                  </p>
                )}
                {phase === "recording" && (
                  <div className="spk-rec-status">
                    <span className="spk-rec-dot" />
                    <span>{STAGE_UI_TEXT.part.recordingPrefix} · {fmtTime(recSeconds)}</span>
                  </div>
                )}
                {phase === "done" && (
                  <p className="spk-done-hint">{STAGE_UI_TEXT.part.doneHint}</p>
                )}

                <button
                  className={micBtnClass}
                  onClick={handleMicBtn}
                  disabled={micButtonDisabled}
                  title={micButtonAriaLabel}
                  aria-label={micButtonAriaLabel}
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

            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
};

export default IeltsSpeakingTest;
