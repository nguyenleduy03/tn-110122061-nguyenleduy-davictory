import React, { useState, useRef, useEffect } from 'react';
import agentApi from '../services/agentApi';
import './AgentChat.css';
import { Send, Sparkles, Bot, Sun, Moon, Mic, Copy, Check, Square, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SUGGESTIONS = [
  'Viết bài blog về cách đạt band 7.0 IELTS Writing',
  'Tạo báo cáo performance tháng này',
  'Xem thống kê trung tâm',
  'Danh sách đề thi IELTS',
];

export default function AgentChat({ isEmbedded = false }) {
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Xin chào! Tôi là trợ lý AI DAVictory.\n\nChọn một gợi ý bên dưới hoặc nhập yêu cầu của bạn!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('agent-theme') || 'dark');
  const [agentMode, setAgentMode] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const msgsEnd = useRef(null);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
      setInput(prev => prev + ' ' + e.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
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
    const message = msg || input;
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
      if (data.session_id) setSessionId(data.session_id);

      if (data.pending_action) {
        setMessages(prev => [...prev, {
          role: 'agent',
          text: data.response || 'Cần xác nhận thêm thông tin để tiếp tục.',
          pendingAction: data.pending_action,
          chartGroups: data.data?.chart_groups || null,
        }]);
      } else if (data.response) {
        setMessages(prev => [...prev, {
          role: 'agent',
          text: data.response,
          chartGroups: data.data?.chart_groups || null,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', text: data.error || 'Không thể xử lý yêu cầu' }]);
      }
    } catch (e) {
      if (e.code !== 'ERR_CANCELED' && e.name !== 'CanceledError') {
        setMessages(prev => [...prev, { role: 'agent', text: `Lỗi: ${e.message}` }]);
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
    <div className="agent-chat" data-theme={theme} style={{ height: isEmbedded ? '100%' : '100vh' }}>
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-header-icon"><Bot size={20} /></div>
          <div className="chat-header-info">
            <h1 className="chat-header-title">Trợ lý AI</h1>
            <p className="chat-header-sub">
              <span className="status-dot" />
              {agentMode ? 'Agent mode' : 'Chat mode'}
            </p>
          </div>
          <button
            className={`chat-header-btn ${agentMode ? 'active' : ''}`}
            onClick={() => setAgentMode(!agentMode)}
            title={agentMode ? 'Chuyển sang Chat' : 'Chuyển sang Agent'}
          >
            {agentMode ? 'Agent' : 'Chat'}
          </button>
          <button
            className="chat-header-btn icon-only"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Sáng' : 'Tối'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-area">
        <div className="messages-inner">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
              {msg.role === 'user' ? (
                <div className="user-bubble">
                  {msg.text}
                  <div className="user-bubble-meta">
                    <span>Bạn</span>
                    <button onClick={() => handleCopy(msg.text, `user-${i}`)}>
                      {copiedId === `user-${i}` ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ai-bubble">
                  <div className="agent-chat-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                  {msg.pendingAction && (
                    <div className="pending-action-banner">
                      <AlertCircle size={14} />
                      <span>{msg.pendingAction.message || 'Vui lòng cung cấp thêm thông tin để tiếp tục.'}</span>
                    </div>
                  )}
                  {msg.chartGroups && msg.chartGroups.length > 0 && (
                    <div className="chat-chart-summary">
                      {msg.chartGroups.map((cg, ci) => (
                        <div key={ci} className="chat-chart-item">
                          <strong>{cg.title}</strong>
                          <div className="chat-chart-rows">
                            {cg.data?.map((d, di) => (
                              <div key={di} className="chat-chart-row">
                                <span>{d.label}</span>
                                <span>{d.value}{d.extra ? ` (${d.extra})` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="ai-bubble-actions">
                    <button onClick={() => handleCopy(msg.text, `ai-${i}`)}>
                      {copiedId === `ai-${i}` ? <Check size={12} /> : <Copy size={12} />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message ai">
              <div className="loading-indicator">
                <div className="loading-dots"><span /><span /><span /></div>
                <span>Đang xử lý...</span>
                <button className="stop-btn" onClick={handleStop}>
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
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={listening ? 'Đang nghe...' : 'Nhập yêu cầu...'}
            disabled={loading || listening}
          />
          <button
            className={`input-btn ${listening ? 'recording' : ''}`}
            onClick={handleVoice}
            title="Nhập giọng nói"
          >
            <Mic size={18} />
          </button>
          {loading ? (
            <button className="send-btn stop" onClick={handleStop}>
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim()}>
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
