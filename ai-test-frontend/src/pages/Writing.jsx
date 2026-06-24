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

const CRITERIA = [
  { key: 'taskResponse', label: 'Task Response', color: '#4F46E5', icon: Target },
  { key: 'coherenceCohesion', label: 'Coherence & Cohesion', color: '#06B6D4', icon: Layers },
  { key: 'lexicalResource', label: 'Lexical Resource', color: '#F59E0B', icon: BookOpen },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy', color: '#EC4899', icon: Languages },
];

export default function Writing() {
  const { setTabs } = useHeader();
  useEffect(() => { setTabs([]); }, []);

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
  
  const [expandedSections, setExpandedSections] = useState({ overall: true });
  const [tokenLimits, setTokenLimits] = useState({ maxTotal: 12000, minCompletion: 500, sysOverhead: 4200, buffer: 1000 });
  const scanTimer = useRef(null);
  const resultRef = useRef(null);

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
    <div className="animate-fade">
      <div className="grid-2">
        {/* INPUT CARD */}
        <div className={`card ${loading ? 'ai-glow' : ''}`}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--primary)" />
            Phân tích IELTS Writing
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Loại bài (Task Type)</label>
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
                    transition: 'var(--transition)',
                    boxShadow: taskType === o.value ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Đề bài (Optional)</label>
            <textarea 
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--bg-main)',
                fontSize: '0.9375rem', minHeight: '80px', resize: 'vertical'
              }}
              value={promptText} onChange={e => setPromptText(e.target.value)}
              placeholder="Dán đề bài tại đây để AI chấm chính xác hơn..."
            />
          </div>

          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nội dung bài viết</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wordCount} từ</span>
            </div>
            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <textarea 
                style={{
                  width: '100%', padding: '16px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${loading ? 'var(--primary)' : 'var(--border)'}`, 
                  fontSize: '1rem', minHeight: '400px', resize: 'vertical', lineHeight: '1.6',
                  transition: 'border-color 0.3s ease'
                }}
                value={essayText} onChange={e => setEssayText(e.target.value)}
                placeholder="Dán bài viết của bạn vào đây..."
                disabled={loading}
              />
              {loading && (
                <div className="scan-overlay">
                  <div className="scan-line" />
                </div>
              )}
            </div>
          </div>

          {/* TOKEN USAGE BAR */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ height: '12px', borderRadius: '6px', background: 'var(--border-light)', overflow: 'hidden', display: 'flex' }}>
              <div style={{
                width: `${Math.min(100, Math.round(tokenRatio * (maxTotal / (maxTotal + 1)) * 100))}%`,
                height: '100%',
                background: isOverLimit ? 'var(--danger)' : 'var(--secondary)',
                transition: 'width 0.3s',
                minWidth: essayText ? '4px' : '0',
              }} />
              {!isOverLimit && available > 0 && (
                <div style={{
                  flex: 1,
                  height: '100%',
                  background: '#60A5FA',
                  borderRadius: '0 6px 6px 0',
                }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>{promptTokens.toLocaleString()} tokens</span>
              <span style={{ color: isOverLimit ? 'var(--danger)' : '#2563EB', fontWeight: 600 }}>
                {isOverLimit ? '⚠️ Quá tải' : `${available.toLocaleString()} tokens khả dụng`}
              </span>
              <span>MAX {maxTotal.toLocaleString()}</span>
            </div>
          </div>

          {isOverLimit && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Bài essay quá dài. Vui lòng rút gọn để AI có thể xử lý tốt nhất.</span>
            </div>
          )}

          <button 
            className={`btn btn-primary ${loading ? 'ai-pulse' : ''}`} 
            style={{ 
              width: '100%', justifyContent: 'center', padding: '16px',
              fontSize: '1rem', borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
              position: 'relative', overflow: 'hidden'
            }}
            onClick={handleGrade}
            disabled={loading || !essayText.trim() || isOverLimit}
          >
            {loading ? <RotateCw className="spin" size={20} /> : <Sparkles className="ai-float" size={20} />}
            <span style={{ marginLeft: '8px' }}>
              {loading ? 'Đang chấm bài...' : 'Bắt đầu chấm bài với AI'}
            </span>
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
            <div className="card animate-fade glass ai-glow" style={{ border: '1px solid var(--primary-light)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={20} className="ai-pulse" style={{ color: 'var(--primary)' }} />
                Hệ thống AI đang phân tích...
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {SCAN_STAGES.map((s, i) => (
                  <div key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    opacity: i > scanStage ? 0.4 : 1, 
                    transform: i === scanStage ? 'translateX(10px)' : 'none',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '10px', 
                      background: i < scanStage ? 'var(--secondary)' : i === scanStage ? 'var(--primary)' : 'var(--border-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      boxShadow: i === scanStage ? '0 0 15px var(--primary)' : 'none'
                    }}>
                      {i < scanStage ? <CheckCircle2 size={18} /> : i === scanStage ? <RotateCw className="spin" size={18} /> : <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{i+1}</span>}
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: i === scanStage ? 600 : 400, color: i === scanStage ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="card" style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
              <div className="ai-float" style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Sparkles size={40} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Sẵn sàng chấm điểm</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '360px', lineHeight: 1.6 }}>
                Gửi bài viết của bạn để nhận phân tích chi tiết theo tiêu chuẩn IELTS và các lời khuyên cải thiện từ AI.
              </p>
            </div>
          )}

          {result && !loading && result.status === 'FAILED' && (
            <div className="card" style={{ marginTop: '16px', padding: '24px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-lg)', color: 'var(--danger)' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <AlertCircle size={28} style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Không thể chấm bài</h4>
                  <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{result.errorMessage || result.overallFeedback}</p>
                </div>
              </div>
            </div>
          )}

          {result && !loading && result.status !== 'FAILED' && (
            <div className="animate-fade">
              <div className="card ai-glow" style={{ 
                display: 'flex', alignItems: 'center', gap: '32px', 
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
                color: 'white', border: 'none', padding: '32px',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
                  <Brain size={150} />
                </div>
                <BandScore band={result.overallBand} size={150} />
                <div style={{ zIndex: 1 }}>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>Kết quả đánh giá</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>
                      <Target size={14} style={{ marginRight: '4px' }} /> Độ tin cậy: {Math.round((result.confidenceScore || 0) * 100)}%
                    </span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>
                      <Clock size={14} style={{ marginRight: '4px' }} /> Thời gian: {result.latencyMs ? `${(result.latencyMs / 1000).toFixed(1)}s` : '-'}
                    </span>
                  </div>
                  <p style={{ fontSize: '1rem', opacity: 0.95, lineHeight: 1.6, fontWeight: 500 }}>
                    {result.strengthSummary || 'Bài viết của bạn đã thể hiện tốt các yêu cầu trong barem điểm IELTS.'}
                  </p>
                </div>
              </div>

              <div className="grid-2">
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

              <div className="card">
                <div 
                  onClick={() => setExpandedSections(p => ({ ...p, overall: !p.overall }))}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Quote size={20} color="var(--primary)" />
                    Nhận xét tổng quát
                  </h3>
                  {expandedSections.overall ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
                {expandedSections.overall && (
                  <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', borderLeft: '5px solid var(--primary)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {result.overallFeedback}
                    </p>
                  </div>
                )}
              </div>

              {result.improvementPriority?.length > 0 && (
                <div className="card" style={{ background: '#FFFDF2', borderColor: '#FEF3C7', borderLeft: '5px solid #F59E0B' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Zap size={20} className="ai-pulse" />
                    Ưu tiên cải thiện
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {result.improvementPriority.map((item, i) => (
                      <div key={i} style={{ 
                        display: 'flex', gap: '12px', alignItems: 'center',
                        padding: '12px 16px', background: 'white', borderRadius: 'var(--radius-md)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                        <span style={{ fontSize: '1rem', color: '#78350F', fontWeight: 500 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
