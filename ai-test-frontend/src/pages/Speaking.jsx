import { useState, useEffect, useRef } from 'react';
import {
  Mic, MessageSquare, Volume2, Play, Send, CheckCircle,
  ChevronRight, StopCircle, BarChart3, RefreshCw, Plus,
  RotateCw, AlertCircle, PlayCircle, Settings, Database,
  Cpu, Clock, User, ShieldCheck, GraduationCap,
  BookOpen, Zap, Square, Upload, Target, Sparkles, Brain,
  FileText, Quote, ChevronDown, ChevronUp, Activity, Hash,
  Layers, Code, CheckCircle2,
} from 'lucide-react';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';
import { useHeader } from '../context/HeaderContext';
import { BandScore, CriterionMeter } from '../components/ScoreDisplay';
import TeacherSpeakingGrader from '../components/TeacherSpeakingGrader';
import AudioVisualizer from '../components/AudioVisualizer';

const SPEAKING_STAGE_LOGS = {
  0: [
    { type: 'sys', text: 'Processing speech stream input...' },
    { type: 'nlp', text: 'Running STT transcribe (Whisper Model)...' },
    { type: 'nlp', text: 'Speech transcript extracted.' }
  ],
  1: [
    { type: 'nlp', text: 'Computing speech rate (words per minute)...' },
    { type: 'nlp', text: 'Scanning for hesitations & discourse markers...' },
    { type: 'nlp', text: 'Analyzing grammatical diversity index...' }
  ],
  2: [
    { type: 'ai', text: 'Assessing Fluency & Pronunciation criteria...' },
    { type: 'ai', text: 'Evaluating vocabulary richness (lexical variety)...' }
  ],
  3: [
    { type: 'ielts', text: 'Mapping performance against IELTS Speaking descriptors...' },
    { type: 'sys', text: 'Synthesizing overall feedback and recommendations...' }
  ]
};

export default function Speaking() {
  const [tab, setTab] = useState('chat');
  const { setTabs } = useHeader();

  const tabDefs = [
    { key: 'chat', label: 'Practice Session', icon: MessageSquare, onClick: () => setTab('chat') },
    { key: 'practice', label: 'Luyện nói', icon: Mic, onClick: () => setTab('practice') },
    { key: 'tts', label: 'Voice Test', icon: Volume2, onClick: () => setTab('tts') },
    { key: 'grader', label: 'Chấm Speaking', icon: GraduationCap, onClick: () => setTab('grader') },
    { key: 'admin', label: 'Advanced', icon: Settings, onClick: () => setTab('admin') },
  ];

  useEffect(() => {
    setTabs(tabDefs);
    return () => setTabs([]);
  }, []);

  const [sessionId, setSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [ttsText, setTtsText] = useState('Hello, welcome to your IELTS speaking practice session.');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [audioUrl, setAudioUrl] = useState(null);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [scoringResult, setScoringResult] = useState(null);
  
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function callApi(fn, lbl) {
    setLoading(true);
    setError(null);
    setLabel(lbl);
    try {
      const res = await fn();
      setResponse(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession() {
    const data = await callApi(() => speakingApi.createSession(), 'Create Session');
    if (data?.sessionId) {
      setSessionId(data.sessionId);
      setChatMessages([{ type: 'system', text: 'Session created successfully.' }]);
      setScoringResult(null);
    }
  }

  async function handleGenerateQuestion() {
    if (!sessionId) return;
    const data = await callApi(() => speakingApi.generateQuestion(sessionId), 'Generate Question');
    if (data?.question) {
      setChatMessages((prev) => [...prev, { type: 'examiner', text: data.question }]);
    }
  }

  async function handleSubmitAnswer() {
    if (!sessionId || !answerText.trim()) return;
    const text = answerText.trim();
    setAnswerText('');
    setChatMessages((prev) => [...prev, { type: 'user', text }]);
    await callApi(() => speakingApi.submitAnswer(sessionId, text), 'Submit Answer');
  }

  async function handleNextPhase() {
    if (!sessionId) return;
    await callApi(() => speakingApi.nextPhase(sessionId), 'Next Phase');
    const sessionData = await callApi(() => speakingApi.getSession(sessionId), 'Get Session');
    if (sessionData?.currentPhase) {
      setChatMessages((prev) => [
        ...prev,
        { type: 'system', text: `Advanced to phase: ${sessionData.currentPhase}` },
      ]);
    }
  }

  async function handleEndSession() {
    if (!sessionId) return;
    await callApi(() => speakingApi.endSession(sessionId), 'End Session');
    setChatMessages((prev) => [...prev, { type: 'system', text: 'Session ended. You can now evaluate your performance.' }]);
  }

  async function handleEvaluate() {
    if (!sessionId) return;
    const data = await callApi(() => speakingApi.evaluateSession(sessionId, 1), 'Evaluate Session');
    if (data) setScoringResult(data);
  }

  async function handleTTS() {
    setLoading(true);
    try {
      const res = await speakingApi.tts(ttsText, ttsVoice);
      const url = URL.createObjectURL(res.data);
      setAudioUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Practice tab state ───────────────────────────────────
  const PARTS = [
    { value: 'PART1', label: 'Part 1 — Introduction & Interview', desc: 'Câu hỏi cá nhân về chủ đề quen thuộc' },
    { value: 'PART2', label: 'Part 2 — Cue Card', desc: 'Nói về chủ đề trong 1-2 phút' },
    { value: 'PART3', label: 'Part 3 — Discussion', desc: 'Câu hỏi thảo luận trừu tượng' },
  ];
  const [practiceStep, setPracticeStep] = useState('setup'); // setup | recording | submitting | analyzing | scoring | results
  const [selectedParts, setSelectedParts] = useState(['PART1', 'PART2', 'PART3']);
  const [practiceTopic, setPracticeTopic] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [practiceSessionId, setPracticeSessionId] = useState(null);
  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl2, setAudioUrl2] = useState(null);
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState(null);
  const [practiceScanStage, setPracticeScanStage] = useState(0);
  const [showRawData, setShowRawData] = useState(false);
  const [practiceTranscript, setPracticeTranscript] = useState('');
  const [practiceMetrics, setPracticeMetrics] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const scanTimerRef = useRef(null);
  const practiceAudioRef = useRef(null);
  const [practicePlaying, setPracticePlaying] = useState(false);

  const [liveLogs, setLiveLogs] = useState([]);
  const logStreamEndRef = useRef(null);

  useEffect(() => {
    if (practiceStep === 'analyzing' || practiceStep === 'scoring') {
      const logs = SPEAKING_STAGE_LOGS[practiceScanStage] || [];
      if (practiceScanStage === 0) setLiveLogs([]);
      logs.forEach((log, index) => {
        const timer = setTimeout(() => {
          setLiveLogs(prev => [...prev, { ...log, id: `${practiceScanStage}-${index}` }]);
        }, index * 250);
        return () => clearTimeout(timer);
      });
    } else {
      setLiveLogs([]);
    }
  }, [practiceScanStage, practiceStep]);

  useEffect(() => {
    logStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs]);

  const togglePart = (value) => {
    setSelectedParts(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const resetPractice = () => {
    setPracticeStep('setup');
    setPracticeSessionId(null);
    setCurrentPartIdx(0);
    setCurrentQuestion(null);
    setAudioBlob(null);
    setAudioUrl2(null);
    setPracticeError(null);
    setPracticeResult(null);
    setCustomQuestion('');
    setPracticeTranscript('');
    setPracticeMetrics(null);
  };

  const handlePracticeStart = async () => {
    if (selectedParts.length === 0) {
      setPracticeError('Vui lòng chọn ít nhất 1 part.');
      return;
    }
    if (!customQuestion.trim() && selectedParts.length === 0) {
      setPracticeError('Vui lòng nhập câu hỏi hoặc chọn part.');
      return;
    }
    setPracticeLoading(true);
    setPracticeError(null);
    try {
      const config = { topic: customQuestion || practiceTopic, focusArea: selectedParts.join(','), practiceMode: 'practice' };
      const res = await speakingApi.createSession(config);
      const sid = res.data?.sessionId || res.data?.id;
      if (!sid) throw new Error('Không thể tạo session');
      setPracticeSessionId(sid);
      setPracticeStep('recording');
      const qRes = await speakingApi.generateQuestion(sid);
      if (customQuestion.trim()) {
        setCurrentQuestion({ question: customQuestion.trim(), text: customQuestion.trim() });
      } else {
        setCurrentQuestion(qRes.data);
      }
    } catch (err) {
      setPracticeError(err.response?.data?.error || err.response?.data?.detail || err.message);
    } finally {
      setPracticeLoading(false);
    }
  };

  const ensureMic = async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      return streamRef.current;
    } catch {
      setPracticeError('Vui lòng cấp quyền microphone để ghi âm.');
      return null;
    }
  };

  const startRecording = () => {
    ensureMic().then(stream => {
      if (!stream) return;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) { setAudioBlob(blob); setAudioUrl2(URL.createObjectURL(blob)); }
        setIsRecording(false);
        setRecSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl2(URL.createObjectURL(file));
  };

  const handlePracticeSubmit = async () => {
    if (!audioBlob) { setPracticeError('Vui lòng ghi âm hoặc tải lên file audio.'); return; }
    setPracticeLoading(true);
    setPracticeError(null);
    try {
      // Step 1: Submit audio → get transcript
      const subRes = await speakingApi.submitAudio(practiceSessionId, audioBlob);
      const transcript = subRes.data?.text || '';
      setPracticeTranscript(transcript);

      if (currentPartIdx < selectedParts.length - 1) {
        setCurrentPartIdx(prev => prev + 1);
        await speakingApi.nextPhase(practiceSessionId);
        const qRes = await speakingApi.generateQuestion(practiceSessionId);
        setCurrentQuestion(qRes.data);
        setAudioBlob(null); setAudioUrl2(null);
      } else {
        setPracticeScanStage(0);
        setLiveLogs([]);
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        scanTimerRef.current = setInterval(() => {
          setPracticeScanStage(s => (s < 3 ? s + 1 : s));
        }, 2000);

        // Step 2: Analyze pronunciation
        setPracticeStep('analyzing');
        const pronRes = await speakingApi.analyzePronunciation(practiceSessionId);
        setPracticeMetrics(pronRes.data);

        // Step 3: Score
        setPracticeStep('scoring');
        const evalRes = await speakingApi.scoreSession(practiceSessionId, 1);
        setPracticeResult(evalRes.data || evalRes);
        setPracticeStep('results');
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      }
    } catch (err) {
      setPracticeError(err.response?.data?.error || err.message);
    } finally {
      setPracticeLoading(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getCriteriaList = () => {
    const r = practiceResult;
    if (!r) return [];
    const src = r.criteria || r;
    const keys = ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'];
    const labels = {
      fluencyCoherence: { label: 'Fluency & Coherence', color: '#4F46E5' },
      lexicalResource: { label: 'Lexical Resource', color: '#F59E0B' },
      grammaticalRangeAccuracy: { label: 'Grammatical Range & Accuracy', color: '#EF4444' },
      pronunciation: { label: 'Pronunciation', color: '#10B981' },
    };
    return keys.map(k => {
      const c = src[k] || {};
      return { key: k, ...(labels[k] || { label: k, color: '#64748b' }), band: c.band || 0, strengths: c.strengths || [], weaknesses: c.weaknesses || [], detailedFeedback: c.detailedFeedback || c.detailed_feedback || '' };
    });
  };

  const renderPracticeResults = () => {
    if (!practiceResult) return null;
    const overall = practiceResult.overall_band || practiceResult.overallBand || 0;
    const criteriaList = getCriteriaList();
    const hasAudio = !!audioUrl2;

    // Compute NLP metrics from answer text
    const answerText = practiceTranscript;
    const words = answerText ? answerText.split(/\s+/).filter(Boolean) : [];
    const sentences = answerText ? answerText.split(/[.!?]+/).filter(s => s.trim()) : [];
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const hesitationCount = words.filter(w => /^(um|uh|er|ah|like|hmm)$/i.test(w)).length;
    const discourseCount = words.filter(w => /^(however|therefore|moreover|furthermore|nevertheless|consequently|in addition|on the other hand|for example|in conclusion|firstly|secondly|finally)$/i.test(w)).length;

    return (
      <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Audio player */}
          {hasAudio && (
            <div className="card glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic size={16} /> File ghi âm
              </div>
              <div style={{ padding: '16px', background: 'white' }}>
                <audio ref={practiceAudioRef} controls src={audioUrl2} style={{ width: '100%' }}
                  onPlay={() => setPracticePlaying(true)}
                  onPause={() => setPracticePlaying(false)}
                  onEnded={() => setPracticePlaying(false)} />
                <div style={{ marginTop: '8px' }}>
                  <AudioVisualizer audioRef={practiceAudioRef} isPlaying={practicePlaying} height={36} barCount={40} />
                </div>
              </div>
            </div>
          )}

          {/* Question */}
          {customQuestion && (
            <div className="card glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA', fontWeight: 800, fontSize: '0.875rem', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} /> Câu hỏi
              </div>
              <div style={{ padding: '16px', background: 'white', fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {customQuestion}
              </div>
            </div>
          )}

          {/* Transcript */}
          {practiceTranscript && (
            <div className="card glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#E0F2FE', borderBottom: '1px solid #BAE6FD', fontWeight: 800, fontSize: '0.875rem', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} /> Chuyển văn bản (STT)
              </div>
              <div style={{ padding: '16px', background: 'white', fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                {practiceTranscript}
              </div>
            </div>
          )}

          {/* Criteria bars */}
          <div className="card glass-premium">
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <BarChart3 size={18} color="var(--primary)" /> Điểm tiêu chí
            </h4>
            {criteriaList.map(c => (
              <CriterionMeter key={c.key} label={c.label} band={c.band} color={c.color} icon={Brain} />
            ))}
          </div>

          {/* Raw data viewer */}
          <div className="card glass-premium" style={{ padding: '12px 16px' }}>
            <div onClick={() => setShowRawData(!showRawData)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Code size={16} color="var(--primary)" /> Raw response từ AI
              </span>
              {showRawData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {showRawData && (
              <pre style={{ marginTop: '12px', fontSize: '0.75rem', background: '#1E293B', color: '#E2E8F0', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '300px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(practiceResult, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Overall band */}
          <div className="card glass-premium neon-glow-primary" style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', color: 'white',
            border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            padding: '32px'
          }}>
            <BandScore band={overall} size={130} />
            <h3 style={{ marginTop: '14px', fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff 0%, #e0e7ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Speaking Performance</h3>
            {practiceResult.confidenceScore != null && (
              <p style={{ fontSize: '0.8rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <Sparkles size={12} /> Độ tin cậy: {Math.round(practiceResult.confidenceScore * 100)}%
              </p>
            )}
          </div>

          {/* NLP Metrics */}
          {words.length > 0 && (
            <div className="card glass-premium">
              <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <Activity size={18} color="var(--primary)" /> Phân tích ngôn ngữ
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Số từ', value: words.length, icon: Hash },
                  { label: 'Số câu', value: sentences.length, icon: FileText },
                  { label: 'Đa dạng từ', value: words.length ? (uniqueWords.size / words.length).toFixed(3) : '0', icon: BookOpen },
                  { label: 'Câu TB', value: sentences.length ? (words.length / sentences.length).toFixed(1) : '0', icon: BarChart3 },
                  { label: 'Từ đệm', value: hesitationCount, icon: AlertCircle },
                  { label: 'Discourse', value: discourseCount, icon: Layers },
                ].map((m, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <m.icon size={12} /> {m.label}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {criteriaList.some(c => c.strengths.length > 0) && (
            <div className="card glass-premium" style={{ background: 'rgba(240, 253, 244, 0.45)', borderColor: 'rgba(187, 247, 208, 0.3)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Điểm mạnh
              </h4>
              {criteriaList.filter(c => c.strengths.length > 0).map((c, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803D' }}>{c.label}:</span>
                  {c.strengths.map((s, j) => <p key={j} style={{ fontSize: '0.85rem', color: '#166534', margin: '2px 0 2px 8px', fontWeight: 500 }}>• {s}</p>)}
                </div>
              ))}
            </div>
          )}

          {/* Weaknesses */}
          {criteriaList.some(c => c.weaknesses.length > 0) && (
            <div className="card glass-premium" style={{ background: 'rgba(254, 242, 242, 0.45)', borderColor: 'rgba(254, 202, 202, 0.3)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991B1B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> Điểm yếu
              </h4>
              {criteriaList.filter(c => c.weaknesses.length > 0).map((c, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991B1B' }}>{c.label}:</span>
                  {c.weaknesses.map((w, j) => <p key={j} style={{ fontSize: '0.85rem', color: '#991B1B', margin: '2px 0 2px 8px', fontWeight: 500 }}>• {w}</p>)}
                </div>
              ))}
            </div>
          )}

          {/* Overall feedback */}
          {practiceResult.overall_feedback && (
            <div className="card glass-premium">
              <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                <Quote size={16} color="var(--primary)" /> Nhận xét tổng quát
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>{practiceResult.overall_feedback}</p>
            </div>
          )}

          {/* Improvement priority */}
          {practiceResult.improvement_priority?.length > 0 && (
            <div className="card glass-premium" style={{ background: 'rgba(254, 252, 232, 0.45)', borderColor: 'rgba(245, 158, 11, 0.3)', borderLeft: '5px solid #F59E0B' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#92400E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} className="ai-pulse" /> Ưu tiên cải thiện
              </h4>
              <ol style={{ fontSize: '0.9rem', color: '#78350F', paddingLeft: '20px', lineHeight: 1.8, fontWeight: 500 }}>
                {practiceResult.improvement_priority.map((item, i) => <li key={i}>{item}</li>)}
              </ol>
            </div>
          )}

          {/* Reset button */}
          <button className="btn btn-primary-grad" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={resetPractice}>
            <RefreshCw size={16} /> Làm bài khác
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade">
      {tab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: scoringResult ? '1fr 400px' : '1fr', gap: '24px' }}>
          {/* CHAT INTERFACE */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '50%' }}>
                  <Mic size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Speaking Practice</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sessionId ? `Session ID: ${sessionId}` : 'Ready to start'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!sessionId ? (
                  <button className="btn btn-primary" onClick={handleCreateSession} disabled={loading}>
                    <Plus size={18} /> New Session
                  </button>
                ) : (
                  <>
                    <button className="btn btn-outline" onClick={handleGenerateQuestion} disabled={loading}>
                      <RotateCw size={16} /> Get Question
                    </button>
                    <button className="btn btn-outline" onClick={handleNextPhase} disabled={loading}>
                      <ChevronRight size={16} /> Next Phase
                    </button>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={handleEndSession} disabled={loading}>
                      <StopCircle size={16} /> End
                    </button>
                    <button className="btn btn-primary" onClick={handleEvaluate} disabled={loading}>
                      <BarChart3 size={16} /> Evaluate
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: '16px' }}><MessageSquare size={48} opacity={0.2} /></div>
                  <p>Create a session to start your IELTS Speaking practice.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: msg.type === 'user' ? 'flex-end' : msg.type === 'system' ? 'center' : 'flex-start'
                }}>
                  {msg.type !== 'system' && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', marginHorizontal: '8px' }}>
                      {msg.type === 'examiner' ? 'IELTS EXAMINER' : 'YOU'}
                    </div>
                  )}
                  <div style={{
                    maxWidth: msg.type === 'system' ? '80%' : '70%',
                    padding: msg.type === 'system' ? '4px 12px' : '12px 16px',
                    borderRadius: '16px',
                    fontSize: msg.type === 'system' ? '0.75rem' : '0.9375rem',
                    background: msg.type === 'user' ? 'var(--primary)' : msg.type === 'system' ? 'var(--border-light)' : 'white',
                    color: msg.type === 'user' ? 'white' : 'var(--text-main)',
                    boxShadow: msg.type === 'system' ? 'none' : 'var(--shadow-sm)',
                    border: msg.type === 'examiner' ? '1px solid var(--border)' : 'none',
                    lineHeight: 1.5,
                    borderBottomLeftRadius: msg.type === 'examiner' ? '4px' : '16px',
                    borderBottomRightRadius: msg.type === 'user' ? '4px' : '16px',
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
              <input 
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '999px', border: '1px solid var(--border)',
                  background: 'var(--bg-main)', fontSize: '0.9375rem', outline: 'none'
                }}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                placeholder={sessionId ? "Type your response here..." : "Start a session first"}
                disabled={!sessionId || loading}
              />
              <button 
                className="btn btn-primary" 
                style={{ borderRadius: '50%', width: '44px', height: '44px', padding: 0, justifyContent: 'center' }}
                onClick={handleSubmitAnswer}
                disabled={!sessionId || loading || !answerText.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* SCORING RESULTS */}
          {scoringResult && (
            <div className="animate-fade">
              <div className="card" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <BandScore band={scoringResult.overallBand || 0} size={120} />
                <h3 style={{ marginTop: '16px', fontSize: '1.25rem', fontWeight: 800 }}>Speaking Performance</h3>
                <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '8px' }}>Based on your conversation in this session.</p>
              </div>

              {['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'].map((key) => {
                const c = scoringResult[key];
                if (!c) return null;
                const labels = {
                  fluencyCoherence: 'Fluency & Coherence',
                  lexicalResource: 'Lexical Resource',
                  grammaticalRangeAccuracy: 'Grammar Accuracy',
                  pronunciation: 'Pronunciation'
                };
                const icons = {
                  fluencyCoherence: MessageSquare,
                  lexicalResource: BookOpen,
                  grammaticalRangeAccuracy: ShieldCheck,
                  pronunciation: Mic
                };
                return (
                  <CriterionMeter 
                    key={key}
                    label={labels[key]}
                    band={c.band || 0}
                    color="var(--primary)"
                    icon={icons[key]}
                  />
                );
              })}

              <div className="card">
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="var(--accent)" />
                  Overall Feedback
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {scoringResult.overallFeedback}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'practice' && (
        <div className="animate-fade">
          {practiceError && (
            <div className="card glass-premium" style={{ marginBottom: '16px', padding: '16px', borderLeft: '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
                <AlertCircle size={18} /> {practiceError}
              </div>
            </div>
          )}

          {/* Setup */}
          {practiceStep === 'setup' && (
            <div className="card glass-premium" style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.1)' }}>
                  <Mic size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Luyện nói IELTS Speaking</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Chọn part, ghi âm câu trả lời và nhận điểm ngay</p>
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>Chọn Part muốn luyện tập</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {PARTS.map(p => (
                    <label key={p.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px',
                      borderRadius: '10px', border: selectedParts.includes(p.value) ? '2px solid var(--primary)' : '2px solid var(--border)',
                      background: selectedParts.includes(p.value) ? 'var(--primary-light)' : '#fff', cursor: 'pointer',
                      boxShadow: selectedParts.includes(p.value) ? '0 4px 12px rgba(79, 70, 229, 0.08)' : 'none',
                      transition: 'all 0.2s'
                    }}>
                      <input type="checkbox" checked={selectedParts.includes(p.value)} onChange={() => togglePart(p.value)}
                        style={{ marginTop: 3, accentColor: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{p.label}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>{p.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Câu hỏi tự nhập <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(giống chấm Writing — bỏ qua AI generate)</span>
                </label>
                <textarea style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '80px', marginBottom: '16px', resize: 'vertical', fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s' }}
                  placeholder="Nhập câu hỏi của bạn vào đây... VD: Describe a memorable holiday you have had."
                  value={customQuestion} onChange={e => setCustomQuestion(e.target.value)} />
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Chủ đề (tùy chọn)</label>
                <input style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '24px', outline: 'none', transition: 'border-color 0.2s' }}
                  placeholder="VD: Environment, Technology, Education..." value={practiceTopic} onChange={e => setPracticeTopic(e.target.value)} />
                <button className="btn btn-primary-grad" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  onClick={handlePracticeStart} disabled={practiceLoading || (!customQuestion.trim() && selectedParts.length === 0)}>
                  {practiceLoading ? <><RotateCw className="spin" size={18} /> Đang tạo phiên...</> : <><Mic size={18} /> Bắt đầu luyện nói</>}
                </button>
              </div>
            </div>
          )}

          {/* Recording */}
          {practiceStep === 'recording' && (
            <div className="card glass-premium" style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '50%' }}>
                    <Mic size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>Part {currentPartIdx + 1}: {selectedParts[currentPartIdx]}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{(currentPartIdx + 1)} / {selectedParts.length}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                {currentQuestion && (
                  <div style={{ background: '#F0F9FF', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #BAE6FD' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369A1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Câu hỏi</div>
                    <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#0C4A6E', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      {currentQuestion.question || currentQuestion.text || JSON.stringify(currentQuestion)}
                    </div>
                  </div>
                )}
                {audioUrl2 && (
                  <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', marginBottom: '8px' }}>Đã ghi âm ({formatTime(recSeconds)})</div>
                    <audio src={audioUrl2} controls style={{ width: '100%' }} />
                  </div>
                )}

                {/* Animated sound wave co-operating visualizer when recording */}
                {isRecording && (
                  <div className="sound-wave-container active" style={{ marginBottom: '20px' }}>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
                  {!isRecording ? (
                    <button className="btn btn-primary-grad" onClick={startRecording} style={{ padding: '10px 24px' }}>
                      <Mic size={18} /> Ghi âm
                    </button>
                  ) : (
                    <button className="btn btn-danger" onClick={stopRecording}
                      style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>
                      <Square size={16} /> Dừng ({formatTime(recSeconds)})
                    </button>
                  )}
                  <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <Upload size={18} /> Tải file
                    <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
                  </label>
                </div>
                <button className="btn btn-primary-grad" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  onClick={handlePracticeSubmit} disabled={practiceLoading || !audioBlob}>
                  {practiceLoading ? <><RotateCw className="spin" size={18} /> Đang xử lý...</> : <><Send size={18} /> {currentPartIdx < selectedParts.length - 1 ? 'Nộp & Part tiếp theo' : 'Nộp & Đánh giá'}</>}
                </button>
              </div>
            </div>
          )}

          {/* Evaluating loader and logs chamber */}
          {(practiceStep === 'analyzing' || practiceStep === 'scoring') && (
            <div className="card glass-premium neon-glow-primary animate-fade" style={{ maxWidth: '550px', margin: '40px auto', padding: '28px', border: '1px solid rgba(79, 70, 229, 0.3)' }}>
              <div className="radar-scanner">
                <Mic size={36} className="ai-pulse" style={{ color: 'var(--primary)', zIndex: 3 }} />
                <div className="radar-pulse-ring" style={{ width: '120px', height: '120px', top: '-10px', left: '-10px' }} />
              </div>
              
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)' }}>
                {practiceStep === 'analyzing' ? 'Đang phân tích phát âm với AI...' : 'Đang tiến hành chấm điểm nói...'}
              </h3>
              
              {/* Audio visualizer wave */}
              <div className="sound-wave-container active" style={{ marginBottom: '24px' }}>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
                <div className="wave-bar active"></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'Nhận dạng giọng nói (STT)...' },
                  { label: 'Phân tích chỉ số ngôn ngữ & Tốc độ nói...' },
                  { label: 'Đánh giá 4 tiêu chí chuẩn IELTS...' },
                  { label: 'Tổng hợp nhận xét chi tiết...' }
                ].map((s, i) => (
                  <div key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    opacity: i > practiceScanStage ? 0.35 : 1, 
                    transform: i === practiceScanStage ? 'translateX(8px)' : 'none',
                    transition: 'all 0.4s'
                  }}>
                    <div style={{ 
                      width: '28px', height: '28px', borderRadius: '8px', 
                      background: i < practiceScanStage ? 'var(--secondary)' : i === practiceScanStage ? 'var(--primary)' : 'var(--border-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      boxShadow: i === practiceScanStage ? '0 0 10px var(--primary)' : 'none',
                      transition: 'all 0.3s'
                    }}>
                      {i < practiceScanStage ? <CheckCircle2 size={16} /> : i === practiceScanStage ? <RotateCw className="spin" size={16} /> : <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{i+1}</span>}
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: i === practiceScanStage ? 600 : 400, color: i === practiceScanStage ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Log stream console */}
              <div className="log-stream">
                {liveLogs.map((log, index) => (
                  <div key={log.id || index} className={`log-item ${log.type}`}>
                    &gt; {log.text}
                  </div>
                ))}
                <div ref={logStreamEndRef} />
              </div>
            </div>
          )}

          {/* Results */}
          {practiceStep === 'results' && renderPracticeResults()}
        </div>
      )}

      {tab === 'grader' && (
        <TeacherSpeakingGrader />
      )}

      {tab === 'tts' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Volume2 size={24} color="var(--primary)" />
            Voice Configuration Test
          </h3>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Sample Text</label>
            <textarea 
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '100px' }}
              value={ttsText} onChange={(e) => setTtsText(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Examiner Voice</label>
            <select 
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white' }}
              value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}
            >
              {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTTS} disabled={loading}>
            {loading ? <RotateCw className="spin" size={18} /> : <Volume2 size={18} />}
            Generate & Play Preview
          </button>
          
          {audioUrl && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <audio controls autoPlay style={{ width: '100%' }}>
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}
        </div>
      )}

      {tab === 'admin' && (
        <div className="grid-2">
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Speaking System Admin</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => callApi(() => speakingApi.getConfig(), 'Speaking Config')}>
                <Settings size={16} /> Get Configuration
              </button>
              <button className="btn btn-outline" onClick={() => callApi(() => speakingApi.getRubric(), 'Rubric')}>
                <Database size={16} /> IELTS Rubric
              </button>
              <button className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={() => callApi(() => speakingApi.clearCache(), 'Clear Cache')}>
                <RotateCw size={16} /> Clear System Cache
              </button>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Debug Response</h3>
            <ResponseViewer response={response} error={error} loading={loading} label={label} />
          </div>
        </div>
      )}
    </div>
  );
}
