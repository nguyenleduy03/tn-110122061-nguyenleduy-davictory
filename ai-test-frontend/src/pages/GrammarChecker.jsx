import { useState } from 'react';
import {
  Languages, CheckCircle, AlertCircle, RefreshCw, Download,
  ArrowRight, Globe, Sparkles, Copy, Zap,
} from 'lucide-react';

const languages = [
  { code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
  { code: 'en-gb', flag: '🇬🇧', name: 'English (UK)' },
  { code: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'it', flag: '🇮🇹', name: 'Italian' },
  { code: 'pt', flag: '🇵🇹', name: 'Portuguese' },
  { code: 'th', flag: '🇹🇭', name: 'Thai' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi' },
];

const sampleText = `LexiBot is an AI-powered platform offering a suite of online tools designed to support language teaching and learning for students and educators worldwide. The platform includes an IELTS writing checker, speaking practice, and a multilingual grammar checker that supports over 120 languages.

Recently, I have been using this tool to improve my English writing skills. The feedback is very detailed and help me understand my mistakes. I think this is a great tool for anyone who want to practice English.`;

export default function GrammarChecker() {
  const [text, setText] = useState(sampleText);
  const [language, setLanguage] = useState('en-us');
  const [result, setResult] = useState(null);

  const errors = [
    { text: 'help', correct: 'helps', type: 'grammar', desc: 'Subject-verb agreement: "feedback" is uncountable' },
    { text: 'want', correct: 'wants', type: 'grammar', desc: 'Subject-verb agreement: "anyone" is singular' },
  ];

  return (
    <div className="main">
      <div className="page-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 32px' }}>
        <h1 style={{ justifyContent: 'center', fontSize: 32 }}>
          <Languages size={32} /> Multilingual Grammar Checker
        </h1>
        <p>Automatically detect and fix spelling and grammar errors with AI. Supports 120+ languages.</p>
      </div>

      {/* Language Selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Globe size={16} color="var(--primary)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Select Language:</span>
        </div>
        <div className="lang-grid">
          {languages.map(l => (
            <button
              key={l.code}
              className={`lang-chip ${language === l.code ? 'active' : ''}`}
              onClick={() => setLanguage(l.code)}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Input */}
        <div>
          <div className="card" style={{ marginBottom: 0 }}>
            <h3><Sparkles size={18} /> Enter your text</h3>
            <div className="grammar-editor">
              <div className="grammar-editor-toolbar">
                <button className="btn btn-sm btn-secondary" onClick={() => setText('')}>
                  <RefreshCw size={12} /> Clear
                </button>
                <button className="btn btn-sm btn-secondary">
                  <Copy size={12} /> Paste
                </button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                  {text.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your text here..."
                style={{ border: 'none', borderRadius: 0, minHeight: 300, padding: 20, fontSize: 15, lineHeight: 1.8, background: '#fff' }}
              />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setResult({})}>
                <CheckCircle size={18} /> Check Grammar
              </button>
            </div>
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="card" style={{ marginBottom: 0 }}>
            <h3>
              <AlertCircle size={18} /> Results
              {result && (
                <span className="badge badge-info" style={{ marginLeft: 8 }}>
                  {errors.length} issues found
                </span>
              )}
            </h3>

            {!result ? (
              <div className="empty-state">
                <Languages size={48} />
                <p>Click "Check Grammar" to analyze your text</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>92%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Accuracy Score</div>
                  </div>
                  <div style={{ background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#B7950B' }}>{errors.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Errors Found</div>
                  </div>
                  <div style={{ background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>98%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Detection Rate</div>
                  </div>
                </div>

                {/* Errors List */}
                {errors.map((err, i) => (
                  <div key={i} style={{
                    padding: 12, marginBottom: 8,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '4px solid var(--danger)',
                    transition: 'all var(--transition)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-danger">{err.type}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>"{err.text}"</span>
                      <ArrowRight size={14} color="var(--success)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>"{err.correct}"</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{err.desc}</div>
                  </div>
                ))}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary">
                    <RefreshCw size={14} /> Re-check
                  </button>
                  <button className="btn btn-secondary">
                    <Download size={14} /> Export DOCX
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="card-grid">
        <div className="card">
          <h3><CheckCircle size={18} /> Up to 90% Detection Accuracy</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Reliable results you can count on with industry-leading error detection.
          </p>
        </div>
        <div className="card">
          <h3><Zap size={18} /> Fast, Automatic Error Correction</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Fixes errors instantly with AI-powered suggestions.
          </p>
        </div>
        <div className="card">
          <h3><Languages size={18} /> Supports 120+ Languages</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Including English, Vietnamese, Chinese, Japanese, Korean, Spanish, French, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
