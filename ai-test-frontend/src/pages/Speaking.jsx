import { useState, useEffect, useRef } from 'react';
import {
  Mic, MessageSquare, Volume2, Play, Send, CheckCircle,
  ChevronRight, StopCircle, BarChart3, RefreshCw, Plus,
  RotateCw, AlertCircle, PlayCircle, Settings, Database,
  Cpu, Clock, User, ShieldCheck, GraduationCap
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
