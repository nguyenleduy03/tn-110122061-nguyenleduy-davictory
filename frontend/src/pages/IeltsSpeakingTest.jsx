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
import { ieltsApi } from "../services/ieltsApi";
import { authApi } from "../services/authApi";
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
const toPlainSpeakingText = (value) => {
  const html = formatSpeakingHtml(value);
  if (!html) return '';

  if (typeof window === 'undefined' || !window.document) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const container = window.document.createElement('div');
  container.innerHTML = html;
  return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim();
};

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

const mergeRecordingBlobsToUrl = async (blobs) => {
  if (!blobs?.length) return '';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return URL.createObjectURL(blobs[0]);
  }

  const context = new AudioContextClass();
  try {
    const decoded = [];
    for (const blob of blobs) {
      const buf = await blob.arrayBuffer();
      const audio = await context.decodeAudioData(buf.slice(0));
      decoded.push(audio);
    }

    if (!decoded.length) return '';

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

    return URL.createObjectURL(audioBufferToWavBlob(merged));
  } catch {
    return URL.createObjectURL(blobs[0]);
  } finally {
    await context.close().catch(() => { });
  }
};

// ── Waveform visualiser (canvas) ──────────────────────────────────────────────
const Waveform = ({ analyser, width = 280, height = 48, className = "spk-waveform" }) => {
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
  const [analyser, setAnalyser] = useState(null);

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
  const currentPartHeading = toPlainSpeakingText(currentPartTitle) || `Part ${currentPartDisplayNumber}`;

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
      an.fftSize = 128;
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
      const url = URL.createObjectURL(blob);
      if (pendingAudioUrlsRef.current[qId]) {
        URL.revokeObjectURL(pendingAudioUrlsRef.current[qId]);
      }
      pendingAudioUrlsRef.current[qId] = url;
      pendingAudioBlobsRef.current[qId] = blob;
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
        orderedBlobs.push(pendingAudioBlobsRef.current[q.id]);
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
    if (!orderedBlobs?.length) return;

    const mergedUrl = await mergeRecordingBlobsToUrl(orderedBlobs);
    if (!mergedUrl) return;

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

  const submitTest = useCallback(() => {
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    const recordedAnswers = Object.keys(audioUrls).reduce((acc, qid) => {
      acc[qid] = 'RECORDED';
      return acc;
    }, {});

    // Submit bài thi bình thường
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
            ieltsApi.clearFullTestProgress(testId).catch(() => { });
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

    submitPromise.then((resp) => {
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
    });
  }, [audioUrls, startTime, testId, isFullTest, navigate, mode, allowReviewInExam, timerPersistKey, assignmentId]);

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
      <main className={`spk-main ${stage === 'part-intro' ? 'spk-main-intro' : ''} ${stage === 'part' ? 'spk-main-part' : ''} ${stage === 'part-review' ? 'spk-main-review' : ''}`}>
        {stage === 'mic-test' && (
          <div className="spk-card spk-check-stage spk-check-mic-only">
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
          <div className="spk-card spk-part-intro">
            <div className="spk-intro-topbar">
              <div className="spk-intro-topbar-spacer" aria-hidden="true" />
              <h2 className="spk-intro-title">{currentPartHeading}</h2>
              <button className="spk-start-btn spk-intro-start-btn" onClick={startPartQuestions}>
                {STAGE_UI_TEXT.intro.startButton}
              </button>
            </div>

            <div className="spk-intro-content">
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
          <div className="spk-card spk-review">
            <div className="spk-intro-topbar spk-review-topbar">
              <button className="spk-next-btn spk-review-reset-btn" onClick={resetCurrentPart}>
                {STAGE_UI_TEXT.review.resetPart} <RotateCcw size={16} />
              </button>
              <h2 className="spk-intro-title">{currentPartHeading}</h2>
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

            <div className="spk-review-full-body">
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
          <div className="spk-card spk-part-live">
            <div className="spk-intro-topbar spk-part-topbar">
              <div className="spk-intro-topbar-spacer" aria-hidden="true" />
              <h2 className="spk-intro-title">{currentPartHeading}</h2>
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
      </main>
    </div>
  );
};

export default IeltsSpeakingTest;
