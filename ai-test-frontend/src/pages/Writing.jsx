import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, FileText, BarChart3, Layers, Brain, Target, BookOpen,
  Languages, Quote, TrendingUp, Zap, Database, Code, Clock, Cpu,
  RotateCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Scan, FileSearch, Star, Info, GraduationCap,
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { useHeader } from '../context/HeaderContext';
import { BandScore, CriterionMeter } from '../components/ScoreDisplay';
import TeacherWritingGrader from '../components/TeacherWritingGrader';

const TASK_OPTIONS = [
  { value: 'AUTO', label: 'Tự động nhận diện' },
  { value: 'TASK1_ACADEMIC', label: 'Task 1 Academic' },
  { value: 'TASK1_GENERAL', label: 'Task 1 General' },
  { value: 'TASK2_ACADEMIC', label: 'Task 2 Essay' },
];

const SCAN_STAGES = [
  { label: 'Đang đọc đề bài và nội dung...' },
  { label: 'Đang phân loại Task...' },
  { label: 'Đang phân tích 4 tiêu chí IELTS...' },
  { label: 'Đang so sánh với barem điểm...' },
  { label: 'Đang hoàn tất nhận xét...' },
];

const STAGE_LOGS = {
  0: [
    { type: 'sys', text: 'Initializing IELTS Analysis Engine v2.4...' },
    { type: 'sys', text: 'Scanning text payload for structure...' },
    { type: 'sys', text: 'Normalizing vocabulary markers...' }
  ],
  1: [
    { type: 'ai', text: 'Running task classification model...' },
    { type: 'ai', text: 'Analyzing writing style & prompt matching...' },
    { type: 'ai', text: 'Identifying academic descriptors...' }
  ],
  2: [
    { type: 'nlp', text: 'Evaluating Grammatical Range & Accuracy...' },
    { type: 'nlp', text: 'Calculating Cohesion density and discourse markers...' },
    { type: 'nlp', text: 'Measuring Lexical Resource diversity index...' }
  ],
  3: [
    { type: 'ielts', text: 'Cross-referencing against Band Descriptors...' },
    { type: 'ielts', text: 'Performing confidence score verification...' },
    { type: 'ielts', text: 'Applying off-topic penalty filters...' }
  ],
  4: [
    { type: 'sys', text: 'Compiling feedback details...' },
    { type: 'sys', text: 'Formulating action plan for improvement...' },
    { type: 'sys', text: 'Finalizing JSON response payload...' }
  ]
};

const CRITERIA = [
  { key: 'taskResponse', label: 'Task Response', color: '#6366f1', icon: Target },
  { key: 'coherenceCohesion', label: 'Coherence & Cohesion', color: '#06b6d4', icon: Layers },
  { key: 'lexicalResource', label: 'Lexical Resource', color: '#f59e0b', icon: BookOpen },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy', color: '#ec4899', icon: Languages },
];

const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', justifyContent: 'center' };
const btnOutline = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#fff', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' };
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const inputStyle = { width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#fff', transition: 'border-color 0.2s', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };

export default function Writing() {
  const [tab, setTab] = useState('grade');
  const { setTabs } = useHeader();

  const tabDefs = [
    { key: 'grade', label: 'Chấm điểm', icon: Sparkles, onClick: () => setTab('grade') },
    { key: 'grader', label: 'Chấm Writing', icon: GraduationCap, onClick: () => setTab('grader') },
  ];

  useEffect(() => {
    setTabs(tabDefs);
    return () => setTabs([]);
  }, []);

  const [essayText, setEssayText] = useState(() => sessionStorage.getItem('writing_essay') || '');
  const [taskType, setTaskType] = useState('AUTO');
  const [promptText, setPromptText] = useState(() => sessionStorage.getItem('writing_prompt') || '');

  useEffect(() => { sessionStorage.setItem('writing_essay', essayText); }, [essayText]);
  useEffect(() => { sessionStorage.setItem('writing_prompt', promptText); }, [promptText]);

  const [result, setResult] = useState(null);
  const [classifyResult, setClassifyResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [liveLogs, setLiveLogs] = useState([]);

  const [expandedSections, setExpandedSections] = useState({ overall: true });
  const [tokenLimits, setTokenLimits] = useState({ maxTotal: 12000, minCompletion: 500, sysOverhead: 4200, buffer: 1000 });
  const scanTimer = useRef(null);
  const resultRef = useRef(null);
  const logStreamEndRef = useRef(null);

  const fetchTokenLimits = (tt) => {
    writingApi.getConfig(tt || taskType).then(r => {
      if (r.data?.tokenLimits) setTokenLimits(r.data.tokenLimits);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchTokenLimits();
    const interval = setInterval(() => fetchTokenLimits(), 30000);
    const onFocus = () => fetchTokenLimits();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [taskType]);

  useEffect(() => {
    if (loading) {
      const currentStageLogs = STAGE_LOGS[scanStage] || [];
      if (scanStage === 0) setLiveLogs([]);
      currentStageLogs.forEach((log, index) => {
        const timer = setTimeout(() => {
          setLiveLogs(prev => [...prev, { ...log, id: `${scanStage}-${index}` }]);
        }, index * 250);
        return () => clearTimeout(timer);
      });
    } else {
      setLiveLogs([]);
    }
  }, [scanStage, loading]);

  useEffect(() => {
    logStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs]);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const { maxTotal, sysOverhead, minCompletion } = tokenLimits;
  const essayTokens = Math.ceil(essayText.length / 3.5);
  const promptTokens = sysOverhead + essayTokens;
  const available = Math.max(0, maxTotal - promptTokens);
  const isOverLimit = available < minCompletion;
  const tokenRatio = Math.min(1, promptTokens / maxTotal);

  const startScan = () => {
    if (scanTimer.current) clearInterval(scanTimer.current);
    scanTimer.current = setInterval(() => {
      setScanStage(p => p < SCAN_STAGES.length - 1 ? p + 1 : p);
    }, 1500);
  };

  async function handleGrade() {
    if (!essayText.trim()) { setError('Please paste your essay first.'); return; }
    setLoading(true);
    setScanStage(0);
    setLiveLogs([]);
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
      fetchTokenLimits(rt);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : e.message);
    } finally {
      if (scanTimer.current) clearInterval(scanTimer.current);
      setLoading(false);
    }
  }

  return (
    <div>
      {tab === 'grade' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* INPUT CARD */}
        <div style={{ ...cardStyle }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} />
            </div>
            Phân tích IELTS Writing
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Loại bài (Task Type)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TASK_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setTaskType(o.value)}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                    border: taskType === o.value ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                    background: taskType === o.value ? '#eef2ff' : '#fff',
                    color: taskType === o.value ? '#6366f1' : '#475569',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Đề bài (Optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 70 }}
              value={promptText} onChange={e => setPromptText(e.target.value)}
              placeholder="Dán đề bài tại đây để AI chấm chính xác hơn..." />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={labelStyle}>Nội dung bài viết</label>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{wordCount} từ</span>
            </div>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
              <textarea style={{
                ...inputStyle, minHeight: 360,
                border: `1.5px solid ${loading ? '#6366f1' : '#e2e8f0'}`
              }}
                value={essayText} onChange={e => setEssayText(e.target.value)}
                placeholder="Dán bài viết của bạn vào đây..."
                disabled={loading} />
              {loading && (
                <>
                  <div className="scan-overlay" />
                  <div className="scan-line" />
                  <div className="scan-line-v" />
                </>
              )}
            </div>
          </div>

          {/* TOKEN BAR */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
              <div style={{
                width: `${Math.min(100, Math.round(tokenRatio * (maxTotal / (maxTotal + 1)) * 100))}%`,
                height: '100%',
                background: isOverLimit ? '#ef4444' : '#10b981',
                transition: 'width 0.3s',
                minWidth: essayText ? '4px' : '0',
              }} />
              {!isOverLimit && available > 0 && (
                <div style={{ flex: 1, height: '100%', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>
              <span>{promptTokens.toLocaleString()} tokens</span>
              <span style={{ color: isOverLimit ? '#ef4444' : '#6366f1', fontWeight: 700 }}>
                {isOverLimit ? '⚠️ Quá tải' : `${available.toLocaleString()} tokens khả dụng`}
              </span>
              <span>MAX {maxTotal.toLocaleString()}</span>
            </div>
          </div>

          {isOverLimit && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Bài essay quá dài. Vui lòng rút gọn để AI có thể xử lý tốt nhất.</span>
            </div>
          )}

          <button style={{
            ...btnPrimary, width: '100%', padding: '14px', fontSize: 15,
            opacity: loading || !essayText.trim() || isOverLimit ? 0.6 : 1
          }}
            onClick={handleGrade}
            disabled={loading || !essayText.trim() || isOverLimit}>
            {loading ? <RotateCw size={18} className="spin" /> : <Sparkles size={18} />}
            <span style={{ marginLeft: 8 }}>
              {loading ? 'Đang phân tích bài...' : 'Bắt đầu chấm bài với AI'}
            </span>
          </button>

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* RESULT COLUMN */}
        <div ref={resultRef}>
          {loading && (
            <div style={{ ...cardStyle, padding: 28, textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)'
                }}>
                  <Brain size={32} style={{ color: '#6366f1', zIndex: 3 }} />
                </div>
                <div style={{
                  position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: '50%',
                  border: '2px solid transparent', borderTopColor: '#6366f1',
                  animation: 'spin 2s linear infinite'
                }} />
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', marginBottom: 20, color: '#0f172a' }}>
                Đang xử lý bài viết với AI...
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, textAlign: 'left' }}>
                {SCAN_STAGES.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: i > scanStage ? 0.35 : 1,
                    transform: i === scanStage ? 'translateX(8px)' : 'none',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      background: i < scanStage ? '#10b981' : i === scanStage ? '#6366f1' : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                      boxShadow: i === scanStage ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
                      transition: 'all 0.3s'
                    }}>
                      {i < scanStage ? <CheckCircle2 size={14} /> : i === scanStage ? <RotateCw size={14} className="spin" /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: i === scanStage ? 600 : 400, color: i === scanStage ? '#6366f1' : '#64748b' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="log-stream" style={{ maxHeight: 120, fontSize: 11 }}>
                {liveLogs.map((log, index) => (
                  <div key={log.id || index} className={`log-item ${log.type}`}>&gt; {log.text}</div>
                ))}
                <div ref={logStreamEndRef} />
              </div>
            </div>
          )}

          {!loading && !result && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Sẵn sàng chấm điểm</h3>
              <p style={{ color: '#64748b', fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>
                Gửi bài viết của bạn để nhận phân tích chi tiết theo tiêu chuẩn IELTS và các lời khuyên cải thiện từ AI.
              </p>
            </div>
          )}

          {result && !loading && result.status === 'FAILED' && (
            <div style={{ ...cardStyle, padding: 24, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <AlertCircle size={24} style={{ flexShrink: 0, color: '#dc2626' }} />
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Không thể chấm bài</h4>
                  <p style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.6 }}>{result.errorMessage || result.overallFeedback}</p>
                </div>
              </div>
            </div>
          )}

          {result && !loading && result.status !== 'FAILED' && (
            <div>
              <div style={{
                ...cardStyle, padding: 28,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', gap: 28, position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.06 }}>
                  <Brain size={140} />
                </div>
                <BandScore band={result.overallBand} size={110} />
                <div style={{ zIndex: 1 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#fff' }}>Kết quả đánh giá</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Target size={13} /> Độ tin cậy: {Math.round((result.confidenceScore || 0) * 100)}%
                    </span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> Thời gian: {result.latencyMs ? `${(result.latencyMs / 1000).toFixed(1)}s` : '-'}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                    {result.strengthSummary || 'Bài viết của bạn đã thể hiện tốt các yêu cầu trong barem điểm IELTS.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                {CRITERIA.map(c => (
                  <CriterionMeter
                    key={c.key}
                    label={c.key === 'taskResponse' ? 'Đáp ứng yêu cầu' :
                      c.key === 'coherenceCohesion' ? 'Mạch lạc & Liên kết' :
                        c.key === 'lexicalResource' ? 'Vốn từ vựng' : 'Ngữ pháp & Độ chính xác'}
                    band={result[c.key]?.band || 0}
                    color={c.color}
                    icon={c.icon}
                  />
                ))}
              </div>

              <div style={{ ...cardStyle, marginTop: 14 }}>
                <div onClick={() => setExpandedSections(p => ({ ...p, overall: !p.overall }))}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', margin: 0 }}>
                    <Quote size={18} color="#6366f1" /> Nhận xét tổng quát
                  </h3>
                  {expandedSections.overall ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.overall && (
                  <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 10, borderLeft: '4px solid #6366f1', fontSize: 14, color: '#0f172a', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {result.overallFeedback}
                  </div>
                )}
              </div>

              {result.improvementPriority?.length > 0 && (
                <div style={{ ...cardStyle, marginTop: 14, background: '#fff7ed', borderColor: 'rgba(245,158,11,0.3)', borderLeft: '4px solid #f59e0b' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={18} /> Ưu tiên cải thiện
                  </h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {result.improvementPriority.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#78350f', fontWeight: 500 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {tab === 'grader' && <TeacherWritingGrader />}
    </div>
  );
}
