import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Clock, Copy, Check } from 'lucide-react';

const AGENT_CONFIG = {
  content: { label: 'Content Agent', color: '#a78bfa', icon: '✍️' },
  info: { label: 'Info Agent', color: '#818cf8', icon: 'ℹ️' },
  report: { label: 'Report Agent', color: '#34d399', icon: '📊' },
  email: { label: 'Email Agent', color: '#fbbf24', icon: '📧' },
};

function useTypewriter(text, speed = 20) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(true); return; }
    setDisplayed(''); setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return { displayed, done };
}

function FormattedText({ text }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: '#f1f5f9' }}>{part.slice(2, -2)}</strong>;
    return <span key={i}>{part}</span>;
  });
}

export default function AgentResponseCard({ message, onComplete }) {
  const agentType = message?.agent || 'info';
  const config = AGENT_CONFIG[agentType] || AGENT_CONFIG.info;
  const text = message?.text || '';
  const { displayed, done } = useTypewriter(text, 15);
  const [copied, setCopied] = useState(false);
  const prevDone = useRef(false);

  useEffect(() => {
    if (done && !prevDone.current) { prevDone.current = true; onComplete?.(); }
  }, [done, onComplete]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '14px 18px',
      maxWidth: '85%', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{config.icon}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: config.color }}>{config.label}</span>
        {done && <CheckCircle2 size={14} color={config.color} />}
        {!done && <Clock size={14} color="#64748b" />}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
        <FormattedText text={displayed} />
        {!done && <span style={{ animation: 'blink 1s infinite', color: config.color }}>▌</span>}
      </div>
      {done && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', fontSize: 11, cursor: 'pointer',
            color: '#94a3b8', marginLeft: 'auto', transition: 'all 0.2s',
          }}>
            {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
            {copied ? 'Đã copy' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
