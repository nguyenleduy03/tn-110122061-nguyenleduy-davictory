import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, FileText, BarChart3, Layers, Brain, Target, BookOpen,
  Languages, Quote, TrendingUp, Zap, Database, Code, Clock, Cpu,
  RotateCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Scan, FileSearch, Star, Info,
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { useHeader } from '../context/HeaderContext';
import { BandScore, CriterionMeter } from '../components/ScoreDisplay';

const TASK_OPTIONS = [
  { value: 'AUTO', label: 'Auto Detect' },
  { value: 'TASK1_ACADEMIC', label: 'Task 1 Academic' },
  { value: 'TASK1_GENERAL', label: 'Task 1 General' },
  { value: 'TASK2_ACADEMIC', label: 'Task 2 Academic' },
  { value: 'TASK2_GENERAL', label: 'Task 2 General' },
];

const SCAN_STAGES = [
  { label: 'Reading prompt & essay' },
  { label: 'Classifying task type' },
  { label: 'Analyzing 4 IELTS criteria' },
  { label: 'Comparing with rubric' },
  { label: 'Generating feedback' },
];

const CRITERIA = [
  { key: 'taskResponse', label: 'Task Response', color: '#4F46E5', icon: Target },
  { key: 'coherenceCohesion', label: 'Coherence & Cohesion', color: '#06B6D4', icon: Layers },
  { key: 'lexicalResource', label: 'Lexical Resource', color: '#F59E0B', icon: BookOpen },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy', color: '#EC4899', icon: Languages },
];

export default function Writing() {
  const { setTabs } = useHeader();
  useEffect(() => { setTabs([]); }, []);

  const [essayText, setEssayText] = useState('');
  const [taskType, setTaskType] = useState('AUTO');
  const [promptText, setPromptText] = useState('');
  
  const [result, setResult] = useState(null);
  const [classifyResult, setClassifyResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  
  const [expandedSections, setExpandedSections] = useState({ overall: true });
  const scanTimer = useRef(null);
  const resultRef = useRef(null);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const startScan = () => {
    if (scanTimer.current) clearInterval(scanTimer.current);
    scanTimer.current = setInterval(() => {
      setScanStage(p => p < SCAN_STAGES.length - 1 ? p + 1 : p);
    }, 800);
  };

  async function handleGrade() {
    if (!essayText.trim()) { setError('Please paste your essay first.'); return; }
    setLoading(true);
    setScanStage(0);
    setError(null);
    setResult(null);
    startScan();

    try {
      let rt = taskType;
      if (taskType === 'AUTO') {
        const cls = await writingApi.classify(essayText, promptText);
        setClassifyResult(cls.data);
        rt = cls.data.taskType || 'TASK2_ACADEMIC';
      }
      const res = await writingApi.testGrade(essayText, rt, '', promptText, '', '', '');
      setResult(res.data);
      setScanStage(SCAN_STAGES.length);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : e.message);
    } finally {
      if (scanTimer.current) clearInterval(scanTimer.current);
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade">
      <div className="grid-2">
        {/* INPUT CARD */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--primary)" />
            Writing Test Input
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Task Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TASK_OPTIONS.map(o => (
                <button 
                  key={o.value}
                  onClick={() => setTaskType(o.value)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: taskType === o.value ? 'var(--primary)' : 'white',
                    color: taskType === o.value ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Writing Prompt (Optional)</label>
            <textarea 
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--bg-main)',
                fontSize: '0.9375rem', minHeight: '80px', resize: 'vertical'
              }}
              value={promptText} onChange={e => setPromptText(e.target.value)}
              placeholder="Paste the essay question here for more accurate grading..."
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Your Essay</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wordCount} words</span>
            </div>
            <textarea 
              style={{
                width: '100%', padding: '16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', fontSize: '1rem',
                minHeight: '400px', resize: 'vertical', lineHeight: '1.6'
              }}
              value={essayText} onChange={e => setEssayText(e.target.value)}
              placeholder="Paste your essay here..."
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            onClick={handleGrade}
            disabled={loading || !essayText.trim()}
          >
            {loading ? <RotateCw className="spin" size={20} /> : <Sparkles size={20} />}
            {loading ? 'Analyzing Essay...' : 'Start AI Evaluation'}
          </button>

          {error && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* RESULT COLUMN */}
        <div ref={resultRef}>
          {loading && (
            <div className="card animate-fade">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scan size={20} className="scan-icon-pulse" style={{ color: 'var(--info)' }} />
                AI Analysis in Progress
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {SCAN_STAGES.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: i > scanStage ? 0.4 : 1, transition: 'opacity 0.3s' }}>
                    <div style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', background: i < scanStage ? 'var(--secondary)' : i === scanStage ? 'var(--info)' : 'var(--border-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                      {i < scanStage ? <CheckCircle2 size={16} /> : <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{i+1}</span>}
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: i === scanStage ? 600 : 400 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Ready for Evaluation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '320px' }}>
                Submit your essay to receive a detailed IELTS band score analysis and improvement tips.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="animate-fade">
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '32px', background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', color: 'white', border: 'none' }}>
                <BandScore band={result.overallBand} size={140} />
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Evaluation Complete</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                      <Target size={14} style={{ marginRight: '4px' }} /> {Math.round((result.confidenceScore || 0) * 100)}% Confidence
                    </span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                      <Clock size={14} style={{ marginRight: '4px' }} /> {result.latencyMs ? `${(result.latencyMs / 1000).toFixed(1)}s` : '-'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9375rem', opacity: 0.9, lineHeight: 1.5 }}>
                    {result.strengthSummary || 'Your essay demonstrates competence in several areas of the IELTS rubric.'}
                  </p>
                </div>
              </div>

              <div className="grid-2">
                {CRITERIA.map(c => (
                  <CriterionMeter 
                    key={c.key}
                    label={c.label}
                    band={result[c.key]?.band || 0}
                    color={c.color}
                    icon={c.icon}
                  />
                ))}
              </div>

              <div className="card">
                <div 
                  onClick={() => setExpandedSections(p => ({ ...p, overall: !p.overall }))}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Quote size={18} color="var(--primary)" />
                    Overall Feedback
                  </h3>
                  {expandedSections.overall ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.overall && (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {result.overallFeedback}
                    </p>
                  </div>
                )}
              </div>

              {result.improvementPriority?.length > 0 && (
                <div className="card" style={{ background: '#FFFBEB', borderColor: '#FEF3C7' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} />
                    Improvement Priorities
                  </h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.improvementPriority.map((item, i) => (
                      <li key={i} style={{ fontSize: '0.9375rem', color: '#78350F' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
