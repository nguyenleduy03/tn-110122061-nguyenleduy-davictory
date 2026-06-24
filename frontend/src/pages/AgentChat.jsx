import React, { useState, useRef, useEffect, useCallback } from 'react';
import agentApi from '../services/agentApi';
import './AgentChat.css';
import { Send, Sparkles, Loader2, Bot, Sun, Moon, Mic, Paperclip, X, Cpu, MessageCircle, Copy, Check, Square } from 'lucide-react';

const SUGGESTIONS = [
  'Viết bài blog về cách đạt band 7.0 IELTS Writing',
  'Tạo báo cáo performance tháng này',
  'Xem thống kê trung tâm',
  'Danh sách đề thi IELTS',
];

function TypewriterText({ text, speed = 20, done: onDone }) {
  const [displayed, setDisplayed] = useState('');
  const doneRef = useRef(false);

  useEffect(() => {
    if (!text) { setDisplayed(''); doneRef.current = true; onDone?.(); return; }
    setDisplayed('');
    doneRef.current = false;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); doneRef.current = true; onDone?.(); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onDone]);

  return <>{displayed}</>;
}

export default function AgentChat({ isEmbedded = false }) {
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Xin chào! Tôi là trợ lý AI DAVictory.\n\nChọn một gợi ý bên dưới hoặc nhập yêu cầu của bạn!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('agent-theme') || 'dark');
  const [agentMode, setAgentMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [listening, setListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const msgsEnd = useRef(null);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('agent-theme', next);
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt không hỗ trợ nhập giọng nói.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + ' ' + transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn (tối đa 10MB)');
      return;
    }
    setAttachedFile(file);
    e.target.value = '';
  };

  const handleCopy = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  };

  const handleSend = async (msg) => {
    let message = msg || input;
    if (attachedFile) {
      message = (message ? message + '\n\n' : '') + `[File: ${attachedFile.name}]`;
      setAttachedFile(null);
    }
    if (!message.trim() || loading) return;
    setInput('');
    inputRef.current?.focus();
    setMessages(prev => [...prev, { role: 'user', text: message }]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await agentApi.query(message, sessionId, agentMode, agentMode ? 'auto' : 'chat', controller.signal);
      const data = res.data;
      if (data.response) {
        if (data.session_id) setSessionId(data.session_id);
        setMessages(prev => [...prev, { role: 'agent', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', text: data.error || '❌ Không thể xử lý yêu cầu' }]);
      }
    } catch (e) {
      if (e.code !== 'ERR_CANCELED' && e.name !== 'CanceledError') {
        setMessages(prev => [...prev, { role: 'agent', text: `❌ Lỗi: ${e.message}` }]);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  return (
    <div className="agent-chat" data-theme={theme} style={{ height: isEmbedded ? '100%' : '100vh' }} onMouseMove={handleMouseMove}>
      {/* Mouse glow overlay */}
      <div className="glow-overlay" style={{ '--mouse-x': `${mousePos.x}%`, '--mouse-y': `${mousePos.y}%` }} />

      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-header-icon"><Bot size={22} /></div>
          <div className="chat-header-info">
            <h1 className="chat-header-title">Trợ lý AI</h1>
            <p className="chat-header-sub">
              <span className="status-dot" />
              Sẵn sàng
            </p>
          </div>
          <button
            onClick={() => setAgentMode(!agentMode)}
            style={{
              background: agentMode ? 'var(--accent)' : 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderRadius: 10, height: 38, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              color: agentMode ? '#fff' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, padding: '0 10px',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            title={agentMode ? 'Chuyển sang Chat' : 'Chuyển sang Agent'}
          >
            {agentMode ? <Cpu size={16} /> : <MessageCircle size={16} />}
            {agentMode ? 'Agent' : 'Chat'}
          </button>
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--glass)', border: '1px solid var(--glass-border)',
              borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 16, transition: 'all 0.2s',
              flexShrink: 0,
            }}
            title={theme === 'dark' ? 'Sang chế độ sáng' : 'Sang chế độ tối'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-area">
        <div className="messages-inner">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}
               style={{ animationDelay: `${i * 0.05}s` }}>
            {msg.role === 'user' ? (
              <div className="user-bubble">
                {msg.text}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span className="msg-meta">Bạn</span>
                  <button onClick={() => handleCopy(msg.text, `user-${i}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', fontSize: 11,
                      marginLeft: 'auto', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                    {copiedId === `user-${i}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="ai-bubble">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  <TypewriterText text={msg.text} speed={15} />
                </div>
                <button onClick={() => handleCopy(msg.text, `ai-${i}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-dim)', padding: 0, display: 'flex', fontSize: 11, marginTop: 4,
                    transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                  {copiedId === `ai-${i}` ? <Check size={12} /> : <Copy size={12} />} Copy
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message ai" style={{ animationDelay: '0s' }}>
            <div className="loading-indicator">
              <div className="loading-dots"><span /><span /><span /></div>
              <span style={{ marginRight: 8 }}>Đang xử lý...</span>
              <button onClick={handleStop}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  fontSize: 11, transition: 'all 0.2s',
                }}>
                <Square size={12} fill="currentColor" /> Dừng
              </button>
            </div>
          </div>
        )}
        <div ref={msgsEnd} />
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="suggestions-area">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="suggestion-chip" onClick={() => handleSend(s)}>
              <Sparkles size={14} /> {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="input-area">
        <div className="input-inner">
          {/* Attached file preview */}
          {attachedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 8,
              background: 'var(--glass)', border: '1px solid var(--glass-border)',
              fontSize: 12, color: 'var(--text)',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {attachedFile.name}
              </span>
              <button onClick={() => setAttachedFile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={listening ? 'Đang nghe...' : 'Nhập yêu cầu...'}
            disabled={loading || listening}
          />
          {/* Hidden file input */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange}
            style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.txt,.csv" />
          {/* File upload button */}
          <button onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', padding: '4px', flexShrink: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            title="Đính kèm file">
            <Paperclip size={18} />
          </button>
          {/* Voice button */}
          <button onClick={handleVoice}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: listening ? '#ef4444' : 'var(--text-dim)', padding: '4px', flexShrink: 0,
              transition: 'color 0.2s',
              animation: listening ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
            title="Nhập giọng nói">
            <Mic size={18} />
          </button>
          {/* Send button */}
          {loading ? (
            <button onClick={handleStop}
              style={{
                width: 48, height: 48, borderRadius: 12, border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim()}>
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
