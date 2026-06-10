import { useState, useEffect } from 'react';
import {
  Mic, MessageSquare, Volume2, Play, Send, CheckCircle,
  ChevronRight, StopCircle, BarChart3, RefreshCw, Plus,
} from 'lucide-react';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';
import { useHeader } from '../context/HeaderContext';

export default function Speaking() {
  const [tab, setTab] = useState('chat');
  const { setTabs } = useHeader();

  const tabDefs = [
    { key: 'chat', label: 'Chat Practice', icon: MessageSquare, onClick: () => setTab('chat') },
    { key: 'session', label: 'Session Controls', icon: Play, onClick: () => setTab('session') },
    { key: 'tts', label: 'TTS Player', icon: Volume2, onClick: () => setTab('tts') },
    { key: 'admin', label: 'Admin', icon: Plus, onClick: () => setTab('admin') },
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

  async function callApi(fn, lbl) {
    setLoading(true);
    setError(null);
    setResponse(null);
    setLabel(lbl);
    try {
      const res = await fn();
      setResponse(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession() {
    const data = await callApi(() => speakingApi.createSession(), 'Create Session');
    if (data?.sessionId) {
      setSessionId(data.sessionId);
      setChatMessages([]);
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
    const data = await callApi(() => speakingApi.submitAnswer(sessionId, answerText.trim()), 'Submit Answer');
    setChatMessages((prev) => [...prev, { type: 'user', text: answerText.trim() }]);
    setAnswerText('');
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
    setChatMessages((prev) => [...prev, { type: 'system', text: 'Session ended. Ready for evaluation.' }]);
  }

  async function handleEvaluate() {
    if (!sessionId) return;
    const data = await callApi(() => speakingApi.evaluateSession(sessionId, 1), 'Evaluate Session');
    if (data) setScoringResult(data);
  }

  async function handleTTS() {
    if (!ttsText.trim()) return;
    try {
      setLoading(true);
      const res = await speakingApi.tts(ttsText.trim(), ttsVoice);
      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setResponse({ status: 'AUDIO_READY', text: ttsText, voice: ttsVoice });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main">
      <div className="page-header">
        <h1><Mic size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />IELTS Speaking AI Test</h1>
        <p>Test all AI Speaking service endpoints — sessions, chat, TTS, scoring</p>
      </div>


      <div className="model-selector" style={{ flexWrap: 'wrap' }}>
        <div className="service-indicator" style={{ margin: 0 }}>
          <span className={`dot ${sessionId ? 'dot-online' : 'dot-offline'}`} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            Session: {sessionId ? <strong style={{ color: 'var(--text)' }}>{sessionId}</strong> : 'Not created'}
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleCreateSession} disabled={loading}>
          <Plus size={14} /> New Session
        </button>
        {sessionId && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={handleGenerateQuestion} disabled={loading}>
              <MessageSquare size={14} /> Generate Question
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleNextPhase} disabled={loading}>
              <ChevronRight size={14} /> Next Phase
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleEndSession} disabled={loading}>
              <StopCircle size={14} /> End Session
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleEvaluate} disabled={loading}>
              <BarChart3 size={14} /> Evaluate
            </button>
          </>
        )}
      </div>

      {tab === 'chat' && (
        <div className="card">
          <h3><MessageSquare size={18} /> Speaking Practice Chat</h3>
          {sessionId ? (
            <>
              <div className="chat-container">
                {chatMessages.length === 0 && (
                  <div className="empty-state">
                    <MessageSquare size={40} />
                    <p>Generate a question to start practicing</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.type}`}>
                    <div className="chat-label">
                      {msg.type === 'examiner' ? 'Examiner' : msg.type === 'system' ? 'System' : 'You'}
                    </div>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                  placeholder="Type your answer here..."
                />
                <button className="btn btn-primary" onClick={handleSubmitAnswer} disabled={loading || !answerText.trim()}>
                  <Send size={16} /> Send
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Mic size={48} />
              <p>Create a new session to start the speaking practice</p>
            </div>
          )}

          {scoringResult && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 16 }}><BarChart3 size={18} /> Scoring Result</h3>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div className="band-score">
                  {scoringResult.overallBand?.toFixed(1) || '?'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Overall Band Score</div>
              </div>
              <div className="criteria-grid">
                {['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'].map((key) => {
                  const c = scoringResult[key];
                  if (!c) return null;
                  return (
                    <div className="criteria-item" key={key}>
                      <h4>{c.displayName || key}</h4>
                      <div className="criteria-band">{c.band?.toFixed(1) || '?'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {c.detailedFeedback?.slice(0, 100)}...
                      </div>
                    </div>
                  );
                })}
              </div>
              {scoringResult.overallFeedback && (
                <div style={{ marginTop: 12, background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <strong>Feedback:</strong> {scoringResult.overallFeedback}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'session' && (
        <div className="card">
          <h3><Play size={18} /> Manual Session Operations</h3>
          <div className="form-group">
            <label>Session ID</label>
            <input
              value={sessionId || ''}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Session ID (auto-filled when you create one)"
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getSession(sessionId), `Session ${sessionId}`)} disabled={!sessionId}>
              Get Session Info
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.generateQuestion(sessionId), 'Question')} disabled={!sessionId}>
              Generate Question
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.nextPhase(sessionId), 'Next Phase')} disabled={!sessionId}>
              Next Phase
            </button>
            <button className="btn btn-danger" onClick={() => callApi(() => speakingApi.endSession(sessionId), 'End Session')} disabled={!sessionId}>
              End Session
            </button>
            <button className="btn btn-primary" onClick={() => callApi(() => speakingApi.scoreEvaluate(sessionId), 'Score')} disabled={!sessionId}>
              Evaluate (Score)
            </button>
          </div>
          <ResponseViewer response={response} error={error} loading={loading} label={label} />
        </div>
      )}

      {tab === 'tts' && (
        <div className="card">
          <h3><Volume2 size={18} /> Text-to-Speech (TTS) Player</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Text to Speak</label>
              <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label>Voice</label>
              <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleTTS} disabled={loading}>
            <Volume2 size={16} /> Generate Speech
          </button>
          {audioUrl && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
              <audio controls autoPlay style={{ width: '100%' }}>
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}
          <ResponseViewer response={response} error={error} loading={loading} label="TTS Response" />
        </div>
      )}

      {tab === 'admin' && (
        <>
          <div className="card-grid">
            <div className="card">
              <h3>Speaking Admin Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getConfig(), 'Speaking Config')}>
                  Get Configuration
                </button>
                <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getRubric(), 'Rubric')}>
                  IELTS Rubric
                </button>
                <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getCacheStats(), 'Cache Stats')}>
                  Cache Statistics
                </button>
                <button className="btn btn-danger" onClick={() => callApi(() => speakingApi.clearCache(), 'Clear Cache')}>
                  Clear Cache
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Scoring Endpoints</h3>
              <div className="form-group">
                <label>Session ID</label>
                <input
                  value={sessionId || ''}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => callApi(() => speakingApi.scoreEvaluate(sessionId), 'Score Evaluate')}
                  disabled={loading || !sessionId}
                >
                  <BarChart3 size={16} /> Evaluate
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => callApi(() => speakingApi.scoreResult(sessionId), 'Score Result')}
                  disabled={loading || !sessionId}
                >
                  <RefreshCw size={16} /> Get Result
                </button>
              </div>
            </div>
          </div>
          <ResponseViewer response={response} error={error} loading={loading} label={label} />
        </>
      )}
    </div>
  );
}
