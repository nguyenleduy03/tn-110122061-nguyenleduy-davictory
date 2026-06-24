import { useState, useEffect, useRef } from 'react';
import {
  Mic, MessageSquare, Volume2, Play, Send, CheckCircle,
  ChevronRight, StopCircle, BarChart3, RefreshCw, Plus,
  RotateCw, AlertCircle, PlayCircle, Settings, Database,
  Cpu, Clock, User, ShieldCheck, GraduationCap,
  BookOpen, Zap, Square, Upload, Target, Sparkles, Brain,
  FileText, Quote, ChevronDown, ChevronUp
} from 'lucide-react';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';
import { useHeader } from '../context/HeaderContext';
import { BandScore, CriterionMeter } from '../components/ScoreDisplay';
import TeacherSpeakingGrader from '../components/TeacherSpeakingGrader';

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
  const [practiceStep, setPracticeStep] = useState('setup'); // setup | recording | evaluating | results
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
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const scanTimerRef = useRef(null);

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
      await speakingApi.submitAudio(practiceSessionId, audioBlob);
      if (currentPartIdx < selectedParts.length - 1) {
        setCurrentPartIdx(prev => prev + 1);
        await speakingApi.nextPhase(practiceSessionId);
        const qRes = await speakingApi.generateQuestion(practiceSessionId);
        setCurrentQuestion(qRes.data);
        setAudioBlob(null); setAudioUrl2(null);
      } else {
        setPracticeStep('evaluating');
        setPracticeScanStage(0);
        scanTimerRef.current = setInterval(() => {
          setPracticeScanStage(prev => prev < 3 ? prev + 1 : prev);
        }, 1000);
        const evalRes = await speakingApi.evaluateSession(practiceSessionId, 1);
        setPracticeResult(evalRes.data || evalRes);
        setPracticeScanStage(4);
        setTimeout(() => setPracticeStep('results'), 600);
      }
    } catch (err) {
      setPracticeError(err.response?.data?.error || err.message);
    } finally {
      setPracticeLoading(false);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
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
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        <div>
          {criteriaList.map(c => (
            <CriterionMeter key={c.key} label={c.label} band={c.band} color={c.color} icon={Brain} />
          ))}
        </div>
        <div>
          <div className="card" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <BandScore band={overall} size={120} />
            <h3 style={{ marginTop: '16px', fontSize: '1.25rem', fontWeight: 800 }}>Speaking Performance</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '8px' }}>Overall IELTS Band Score</p>
          </div>
          {practiceResult.overall_feedback && (
            <div className="card" style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{practiceResult.overall_feedback}</p>
            </div>
          )}
          {practiceResult.improvement_priority?.length > 0 && (
            <div className="card" style={{ marginTop: '12px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>Ưu tiên cải thiện:</h4>
              <ol style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: 1.8 }}>
                {practiceResult.improvement_priority.map((item, i) => <li key={i}>{item}</li>)}
              </ol>
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={resetPractice}>
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
            <div className="card" style={{ marginBottom: '16px', padding: '16px', borderLeft: '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
                <AlertCircle size={18} /> {practiceError}
              </div>
            </div>
          )}

          {/* Setup */}
          {practiceStep === 'setup' && (
            <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: '12px' }}>
                  <Mic size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Luyện nói IELTS Speaking</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chọn part, ghi âm câu trả lời và nhận điểm ngay</p>
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>Chọn Part muốn luyện tập</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {PARTS.map(p => (
                    <label key={p.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px',
                      borderRadius: '10px', border: selectedParts.includes(p.value) ? '2px solid var(--primary)' : '2px solid var(--border)',
                      background: selectedParts.includes(p.value) ? 'var(--primary-light)' : '#fff', cursor: 'pointer',
                    }}>
                      <input type="checkbox" checked={selectedParts.includes(p.value)} onChange={() => togglePart(p.value)}
                        style={{ marginTop: 3, accentColor: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>
                  Câu hỏi tự nhập <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(giống chấm Writing — bỏ qua AI generate)</span>
                </label>
                <textarea style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: '80px', marginBottom: '12px', resize: 'vertical', fontSize: '0.875rem' }}
                  placeholder="Nhập câu hỏi của bạn vào đây... VD: Describe a memorable holiday you have had."
                  value={customQuestion} onChange={e => setCustomQuestion(e.target.value)} />
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Chủ đề (tùy chọn)</label>
                <input style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '20px' }}
                  placeholder="VD: Environment, Technology, Education..." value={practiceTopic} onChange={e => setPracticeTopic(e.target.value)} />
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handlePracticeStart} disabled={practiceLoading || (!customQuestion.trim() && selectedParts.length === 0)}>
                  {practiceLoading ? <><RotateCw className="spin" size={18} /> Đang tạo phiên...</> : <><Mic size={18} /> Bắt đầu luyện nói</>}
                </button>
              </div>
            </div>
          )}

          {/* Recording */}
          {practiceStep === 'recording' && (
            <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '50%' }}>
                    <Mic size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>Part {currentPartIdx + 1}: {selectedParts[currentPartIdx]}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(currentPartIdx + 1)} / {selectedParts.length}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                {currentQuestion && (
                  <div style={{ background: '#F0F9FF', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #BAE6FD' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0369A1', marginBottom: '8px', textTransform: 'uppercase' }}>Câu hỏi</div>
                    <div style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: '#0C4A6E', whiteSpace: 'pre-wrap' }}>
                      {currentQuestion.question || currentQuestion.text || JSON.stringify(currentQuestion)}
                    </div>
                  </div>
                )}
                {audioUrl2 && (
                  <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803D', marginBottom: '8px' }}>Đã ghi âm ({formatTime(recSeconds)})</div>
                    <audio src={audioUrl2} controls style={{ width: '100%' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                  {!isRecording ? (
                    <button className="btn btn-primary" onClick={startRecording}>
                      <Mic size={18} /> Ghi âm
                    </button>
                  ) : (
                    <button className="btn btn-danger" onClick={stopRecording}
                      style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <Square size={18} /> Dừng ({formatTime(recSeconds)})
                    </button>
                  )}
                  <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} /> Tải file
                    <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
                  </label>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handlePracticeSubmit} disabled={practiceLoading || !audioBlob}>
                  {practiceLoading ? <><RotateCw className="spin" size={18} /> Đang xử lý...</> : <><Send size={18} /> {currentPartIdx < selectedParts.length - 1 ? 'Nộp & Part tiếp theo' : 'Nộp & Đánh giá'}</>}
                </button>
              </div>
            </div>
          )}

          {/* Evaluating */}
          {practiceStep === 'evaluating' && (
            <div className="card" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center', padding: '40px' }}>
              <div style={{ marginBottom: '20px' }}>
                <Sparkles size={48} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>AI đang đánh giá bài nói...</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {['Nhận diện giọng nói...', 'Phân tích ngôn ngữ...', 'Chấm điểm 4 tiêu chí...', 'Tạo nhận xét...'][practiceScanStage] || 'Đang xử lý...'}
              </p>
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
