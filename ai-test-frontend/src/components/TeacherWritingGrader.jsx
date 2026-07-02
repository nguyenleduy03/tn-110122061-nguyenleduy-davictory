import { useState, useEffect, useRef } from 'react';
import {
  FileText, Sparkles, RotateCw, ChevronDown, ChevronUp, ChevronLeft,
  AlertCircle, Search, GraduationCap, Loader2, Filter, X,
  Target, Layers, BookOpen, Languages, Brain, Quote, Zap, CheckCircle2,
  Image, Eye, Clock,
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { speakingApi } from '../api/speakingApi';
import { BandScore, CriterionMeter } from './ScoreDisplay';

const STAGE_LOGS = {
  0: [
    { type: 'sys', text: 'Retrieving writing submission context...' },
    { type: 'sys', text: 'Text answer loaded successfully.' }
  ],
  1: [
    { type: 'sys', text: 'Checking question image configuration...' },
    { type: 'ai', text: 'Scanning image pixel channels...' },
    { type: 'ai', text: 'Running RAG visual context extraction...' }
  ],
  2: [
    { type: 'nlp', text: 'Running IELTS Writing evaluation pipeline...' },
    { type: 'nlp', text: 'Assessing lexical variety and grammar syntax trees...' },
    { type: 'nlp', text: 'Computing sentence structures and punctuation...' }
  ],
  3: [
    { type: 'ielts', text: 'Matching response against IELTS standard band rubric...' },
    { type: 'ielts', text: 'Computing confidence limits and accuracy criteria...' }
  ],
  4: [
    { type: 'sys', text: 'Compiling band assessment report...' },
    { type: 'sys', text: 'Finalizing scores and saving to database...' }
  ]
};

const CRITERIA = [
  { key: 'taskResponse', label: 'Task Response', color: '#4F46E5', icon: Target },
  { key: 'coherenceCohesion', label: 'Coherence & Cohesion', color: '#06B6D4', icon: Layers },
  { key: 'lexicalResource', label: 'Lexical Resource', color: '#F59E0B', icon: BookOpen },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy', color: '#EC4899', icon: Languages },
];

const SCAN_STAGES = [
  { label: 'Đang tải nội dung bài viết...', icon: FileText },
  { label: 'Đang phân tích ảnh / biểu đồ...', icon: Image },
  { label: 'Đang chấm điểm 4 tiêu chí IELTS...', icon: Brain },
  { label: 'Đang so sánh với barem điểm...', icon: Target },
  { label: 'Đang hoàn tất nhận xét...', icon: Sparkles },
];

function stripHtml(text) {
  if (!text) return '';
  let raw = text;
  try {
    const parsed = JSON.parse(text);
    raw = parsed.taskInstruction || parsed.promptText || parsed.text || text;
  } catch {}
  return raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function renderPromptHtml(text) {
  if (!text) return null;
  let html = text;
  try {
    const parsed = JSON.parse(text);
    html = parsed.taskInstruction || parsed.promptText || parsed.text || text;
  } catch {}
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function TeacherWritingGrader() {
  const [classes, setClasses] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [filterClassId, setFilterClassId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [essayText, setEssayText] = useState('');
  const [promptText, setPromptText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [taskType, setTaskType] = useState('');
  const [chartType, setChartType] = useState('');
  const [essayType, setEssayType] = useState('');
  const [letterType, setLetterType] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({ overall: true });
  const [tasks, setTasks] = useState([]);
  const [selectedTaskIdx, setSelectedTaskIdx] = useState(0);
  const [imageDescription, setImageDescription] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [showDescriptionReview, setShowDescriptionReview] = useState(false);
  
  const [liveLogs, setLiveLogs] = useState([]);
  const logStreamEndRef = useRef(null);

  useEffect(() => {
    loadClasses();
    loadAllAttempts();
  }, []);

  useEffect(() => {
    if (grading) {
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
  }, [scanStage, grading]);

  useEffect(() => {
    logStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs]);

  async function loadClasses() {
    try {
      const res = await speakingApi.getMyClasses();
      const data = res.data?.data || res.data?.classes || [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {}
  }

  async function loadAllAttempts(classId, fromDate, toDate) {
    setLoading(true);
    setError(null);
    setSelectedAttempt(null);
    setResult(null);
    try {
      const body = {
        skillType: 'WRITING',
        size: 200,
        sortBy: 'submittedAt',
        sortDirection: 'DESC',
      };
      if (classId) body.classId = classId;
      if (fromDate) body.startDate = fromDate + 'T00:00:00';
      if (toDate) body.endDate = toDate + 'T23:59:59';
      const res = await speakingApi.filterAttempts(body);
      setAllAttempts(res.data || []);
    } catch (err) {
      setError('Không thể tải danh sách bài nộp: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  function handleFilter() {
    loadAllAttempts(filterClassId || null, filterFromDate || null, filterToDate || null);
  }

  function resetFilter() {
    setFilterClassId('');
    setFilterFromDate('');
    setFilterToDate('');
    loadAllAttempts();
  }

  function closeDetail() {
    setSelectedAttempt(null);
    setResult(null);
    setEssayText('');
    setPromptText('');
    setQuestionImageUrl('');
    setTaskType('');
    setChartType('');
    setEssayType('');
    setLetterType('');
    setError(null);
    setScanStage(0);
    setTasks([]);
    setSelectedTaskIdx(0);
    setImageDescription('');
    setEditedDescription('');
    setShowDescriptionReview(false);
  }

  function selectTask(idx) {
    const t = tasks[idx];
    if (!t) return;
    setSelectedTaskIdx(idx);
    setEssayText(t.essayText);
    setPromptText(t.promptText);
    setQuestionImageUrl(t.imageUrl);
    setTaskType(t.taskType);
    setChartType(t.chartType);
    setEssayType(t.essayType);
    setLetterType(t.letterType);
    setResult(null);
  }

  async function loadAttemptDetail(attempt) {
    setSelectedAttempt(attempt);
    setResult(null);
    setError(null);
    setDetailLoading(true);
    setTasks([]);
    setSelectedTaskIdx(0);

    const attemptId = attempt.id || attempt.attemptId;

    try {
      const detailRes = await speakingApi.getExamAttemptDetail(attemptId);
      const answers = detailRes.data?.answers || [];

      const testId = detailRes.data?.testId || attempt.testId;
      if (testId) {
        try {
          const testRes = await writingApi.getTestFull(testId);
          const data = testRes.data;
          const groups = [];

          // Collect all question groups with their questions
          if (data?.sessions) {
            for (const sess of data.sessions) {
              for (const p of sess.parts || []) {
                const pName = (p.name || '').toLowerCase();
                const pOrder = p.orderIndex ?? sess.parts.indexOf(p);
                for (const g of p.questionGroups || []) {
                  const qIds = (g.questions || []).map(q => String(q.id));
                  groups.push({
                    partName: p.name || `Task ${groups.length + 1}`,
                    pName, pOrder,
                    contentType: (g.contentType || '').toUpperCase(),
                    passageText: g.passageText || '',
                    imageUrl: g.imageUrl || '',
                    questionIds: qIds,
                  });
                }
              }
            }
          }

          // Build tasks from groups
          const taskList = groups.map((g, idx) => {
            const match = answers.find(a => g.questionIds.includes(String(a.questionId)));
            const essay = match?.textAnswer || (idx === 0 ? answers[0]?.textAnswer || '' : '');
            let tType = '', cType = '', eType = '', lType = '';
            if (g.pName.includes('1') || g.pOrder === 0 || g.contentType === 'CHART') {
              if (g.contentType === 'LETTER') {
                tType = 'TASK1_GENERAL'; lType = 'formal';
              } else {
                tType = 'TASK1_ACADEMIC';
                if (g.contentType === 'CHART') cType = 'bar';
              }
            } else if (g.pName.includes('2') || g.pOrder === 1) {
              tType = 'TASK2_ACADEMIC'; eType = 'opinion';
            }
            return {
              name: g.partName,
              essayText: essay,
              promptText: g.passageText,
              imageUrl: g.imageUrl,
              taskType: tType,
              chartType: cType,
              essayType: eType,
              letterType: lType,
            };
          });

          setTasks(taskList);
          // Load first task
          if (taskList.length > 0) {
            const first = taskList[0];
            setEssayText(first.essayText);
            setPromptText(first.promptText);
            setQuestionImageUrl(first.imageUrl);
            setTaskType(first.taskType);
            setChartType(first.chartType);
            setEssayType(first.essayType);
            setLetterType(first.letterType);
          }
        } catch (e) {}
      }
    } catch (e) {
      setError('Không thể tải nội dung bài viết.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleGrade() {
    if (!essayText.trim()) {
      setError('Không có nội dung bài viết để chấm.');
      return;
    }

    setScanStage(0);
    setLiveLogs([]);
    setError(null);
    setResult(null);

    if (questionImageUrl) {
      // Step 1: describe image, show review
      setGrading(true);
      setScanStage(1);
      try {
        const descRes = await writingApi.describeImage(questionImageUrl);
        const desc = descRes.data?.description || '';
        setImageDescription(desc);
        setEditedDescription(desc);
        setShowDescriptionReview(true);
      } catch (err) {
        setError('Không thể phân tích ảnh: ' + (err.response?.data?.detail || err.message));
      } finally {
        setGrading(false);
      }
    } else {
      // No image → grade directly
      await doGrade(stripHtml(promptText));
    }
  }

  async function doGrade(finalPrompt, skipImage = false) {
    setGrading(true);
    setScanStage(2);
    setError(null);
    setResult(null);
    setShowDescriptionReview(false);

    try {
      const timer = setInterval(() => {
        setScanStage(p => {
          if (p >= 2 && p < SCAN_STAGES.length - 1) return p + 1;
          return p;
        });
      }, 3000);

      const imgUrl = skipImage ? '' : questionImageUrl;
      const res = await writingApi.testGrade(essayText, taskType, '', finalPrompt, chartType, essayType, letterType, imgUrl);
      clearInterval(timer);
      setResult(res.data);
      setScanStage(SCAN_STAGES.length);
    } catch (err) {
      setError('Chấm bài thất bại: ' + (err.response?.data?.detail || err.response?.data?.message || err.message));
    } finally {
      setGrading(false);
    }
  }

  function formatBand(b) {
    return b != null && b > 0 ? b.toFixed(1) : '-';
  }

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────

  if (loading && !allAttempts.length && !selectedAttempt) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '80px 24px' }}>
        <Loader2 className="spin" size={40} style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {error && !selectedAttempt && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="card glass-premium" style={{ marginBottom: '16px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem', fontWeight: 800 }}>
          <Filter size={18} color="var(--primary)" /> Bộ lọc
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Lớp</label>
            <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', minWidth: '160px', outline: 'none' }}>
              <option value="">Tất cả lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.className || `Lớp ${c.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Từ ngày</label>
            <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Đến ngày</label>
            <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }} />
          </div>
          <button className="btn btn-primary-grad" onClick={handleFilter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} /> Lọc
          </button>
          {(filterClassId || filterFromDate || filterToDate) && (
            <button className="btn btn-outline" onClick={resetFilter} style={{ fontSize: '0.85rem' }}>
              <RotateCw size={14} /> Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* ─── Left: Attempts list ─── */}
        <div style={{ width: '360px', flexShrink: 0 }}>
          <div className="card glass-premium" style={{ margin: 0 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem', fontWeight: 800 }}>
              <FileText size={18} color="var(--primary)" /> Danh sách bài nộp
              {!loading && <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>({allAttempts.length})</span>}
            </h3>
            {loading && !allAttempts.length ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Loader2 className="spin" size={24} style={{ color: 'var(--primary)' }} />
              </div>
            ) : allAttempts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Không có bài nộp Writing nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                {allAttempts.map(a => {
                  const isActive = selectedAttempt && (selectedAttempt.id || selectedAttempt.attemptId) === (a.id || a.attemptId);
                  return (
                    <div key={a.id || a.attemptId}
                      onClick={() => loadAttemptDetail(a)}
                      className={`list-card-item ${isActive ? 'active' : ''}`}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{a.studentName || a.userName || a.username || `HS #${a.userId}`}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                        {a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}
                        {a.bandScore != null && ` • Band: ${a.bandScore}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn btn-outline" onClick={handleFilter} style={{ marginTop: '12px', fontSize: '0.875rem', width: '100%', justifyContent: 'center' }}>
              <RotateCw size={14} /> Làm mới
            </button>
          </div>
        </div>

        {/* ─── Right: Detail panel ─── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedAttempt ? (
            <div className="card glass-premium animate-fade" style={{
              textAlign: 'center', padding: '80px 24px', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            }}>
              <Eye size={48} color="var(--text-muted)" opacity={0.4} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-muted)' }}>Chọn một bài nộp để chấm</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', opacity: 0.7 }}>Click vào tên học sinh ở cột bên trái</p>
            </div>
          ) : (
            <div className="animate-fade">
              {/* Header */}
              <div className="card glass-premium" style={{ marginBottom: '16px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={closeDetail}
                    style={{ background: 'var(--bg-main)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <ChevronLeft size={16} /> Quay lại
                  </button>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    <GraduationCap size={18} color="var(--primary)" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    {selectedAttempt.studentName || selectedAttempt.userName || selectedAttempt.username}
                  </h2>
                </div>
                <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                  {taskType ? taskType.replace('_', ' ') : 'Tự động'}
                </span>
              </div>

              {detailLoading ? (
                <div className="card glass-premium" style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <Loader2 className="spin" size={40} style={{ color: 'var(--primary)' }} />
                  <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Đang tải nội dung bài viết...</p>
                </div>
              ) : (
                <>
                  {/* Task selector */}
                  {tasks.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {tasks.map((t, i) => (
                        <button key={i}
                          onClick={() => selectTask(i)}
                          style={{
                            padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700,
                            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                            background: i === selectedTaskIdx ? 'var(--primary)' : 'var(--bg-main)',
                            color: i === selectedTaskIdx ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                          }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Error */}
                  {error && (
                    <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Scanning progress */}
                  {grading && (
                    <div className="card glass-premium neon-glow-primary animate-fade" style={{ marginBottom: '16px', border: '1px solid rgba(79, 70, 229, 0.3)', padding: '28px' }}>
                      <div className="radar-scanner">
                        <Brain size={36} className="ai-pulse" style={{ color: 'var(--primary)', zIndex: 3 }} />
                        <div className="radar-pulse-ring" style={{ width: '120px', height: '120px', top: '-10px', left: '-10px' }} />
                      </div>
                      
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)' }}>
                        AI đang tiến hành chấm bài...
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        {SCAN_STAGES.map((s, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            opacity: i > scanStage ? 0.35 : 1,
                            transform: i === scanStage ? 'translateX(8px)' : 'none',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '8px',
                              background: i < scanStage ? 'var(--secondary)' : i === scanStage ? 'var(--primary)' : 'var(--border-light)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                              boxShadow: i === scanStage ? '0 0 10px var(--primary)' : 'none',
                              transition: 'all 0.3s',
                            }}>
                              {i < scanStage ? <CheckCircle2 size={16} /> : i === scanStage ? <RotateCw className="spin" size={16} /> : <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{i + 1}</span>}
                            </div>
                            <span style={{ fontSize: '0.95rem', fontWeight: i === scanStage ? 600 : 400, color: i === scanStage ? 'var(--primary)' : 'var(--text-secondary)' }}>
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Log stream console */}
                      <div className="log-stream">
                        {liveLogs.map((log, idx) => (
                          <div key={log.id || idx} className={`log-item ${log.type}`}>
                            &gt; {log.text}
                          </div>
                        ))}
                        <div ref={logStreamEndRef} />
                      </div>
                    </div>
                  )}

                  {/* Essay content */}
                  {!grading && essayText && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          background: 'var(--primary-light)', padding: '10px 16px',
                          fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                          Bài viết
                        </div>
                        <div style={{ padding: '16px', background: 'white', fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto' }}>
                          {essayText}
                        </div>
                      </div>

                      {promptText && (
                        <div style={{ marginTop: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            background: '#FEF3C7', padding: '10px 16px',
                            fontWeight: 700, fontSize: '0.875rem', color: '#92400E',
                            borderBottom: '1px solid #FDE68A',
                          }}>
                            <Quote size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                            Đề bài
                          </div>
                        <div style={{ padding: '16px', background: 'white', fontSize: '0.875rem', lineHeight: 1.6 }}>
                          {renderPromptHtml(promptText)}
                        </div>
                        </div>
                      )}

                      {questionImageUrl && (
                        <div style={{ marginTop: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            background: '#E0F2FE', padding: '10px 16px',
                            fontWeight: 700, fontSize: '0.875rem', color: '#0369A1',
                            borderBottom: '1px solid #BAE6FD',
                          }}>
                            <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                            Hình ảnh / Biểu đồ
                          </div>
                          <div style={{ padding: '16px', background: 'white', textAlign: 'center' }}>
                            <img src={questionImageUrl} alt="Chart/Diagram"
                              style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius-md)' }}
                              onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        </div>
                      )}

                      {/* ─── Image description review ─── */}
                      {showDescriptionReview && (
                        <div className="card glass-premium neon-glow-primary animate-fade" style={{ marginTop: '16px', border: '1px solid rgba(79, 70, 229, 0.3)' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Brain size={18} color="var(--primary)" />
                            Mô tả ảnh / biểu đồ từ AI
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                            Bạn có thể chỉnh sửa mô tả bên dưới trước khi gửi chấm bài.
                          </p>
                          <textarea
                            value={editedDescription}
                            onChange={e => setEditedDescription(e.target.value)}
                            style={{
                              width: '100%', minHeight: '150px', padding: '12px',
                              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                              fontSize: '0.875rem', lineHeight: 1.6, resize: 'vertical',
                              background: 'var(--bg-main)', outline: 'none'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button className="btn btn-primary-grad"
                              onClick={() => {
                                const fp = stripHtml(promptText);
                                const desc = editedDescription.trim();
                                const final = desc ? `${fp}\n\n=== IMAGE/CHART DESCRIPTION ===\n${desc}` : fp;
                                doGrade(final, true);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={16} /> Xác nhận & Chấm bài
                            </button>
                            <button className="btn btn-outline"
                              onClick={() => doGrade(stripHtml(promptText))}
                              style={{ fontSize: '0.85rem' }}>
                              Bỏ qua mô tả ảnh
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Grade button */}
                      {!showDescriptionReview && (
                        <button className="btn btn-primary-grad" onClick={handleGrade} disabled={grading}
                          style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '16px' }}>
                          {grading ? <RotateCw className="spin" size={18} /> : <Sparkles size={18} />}
                          <span style={{ marginLeft: '8px' }}>{grading ? 'Đang chấm...' : 'Chấm bằng AI'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Results */}
                  {result && !grading && renderResult()}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Result rendering ───────────────────────────────
  function renderResult() {
    return (
      <div className="animate-fade">
        <div className="card glass-premium neon-glow-primary" style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', color: 'white',
          border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          marginBottom: '16px', padding: '32px'
        }}>
          <BandScore band={result.overallBand || 0} size={130} />
          <h3 style={{ marginTop: '14px', fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff 0%, #e0e7ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kết quả tổng thể</h3>
          {result.confidenceScore != null && (
            <p style={{ fontSize: '0.8rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
              <Sparkles size={12} /> Độ tin cậy: {Math.round(result.confidenceScore * 100)}%
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {CRITERIA.map(c => (
            <CriterionMeter key={c.key}
              label={c.key === 'taskResponse' ? 'Đáp ứng yêu cầu' :
                     c.key === 'coherenceCohesion' ? 'Mạch lạc & Liên kết' :
                     c.key === 'lexicalResource' ? 'Vốn từ vựng' : 'Ngữ pháp & Độ chính xác'}
              band={result[c.key]?.band || 0}
              color={c.color}
              icon={c.icon}
            />
          ))}
        </div>

        {result.overallFeedback && (
          <div className="card glass-premium" style={{ marginBottom: '16px' }}>
            <div
              onClick={() => setExpanded(p => ({ ...p, overall: !p.overall }))}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <Quote size={18} color="var(--primary)" /> Nhận xét tổng quát
              </h4>
              {expanded.overall ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expanded.overall && (
              <p style={{ marginTop: '12px', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {result.overallFeedback}
              </p>
            )}
          </div>
        )}

        {result.improvementPriority?.length > 0 && (
          <div className="card glass-premium" style={{ background: 'rgba(254, 252, 232, 0.45)', borderColor: 'rgba(245, 158, 11, 0.3)', borderLeft: '5px solid #F59E0B', marginTop: '12px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={18} className="ai-pulse" /> Ưu tiên cải thiện
            </h4>
            {result.improvementPriority.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: '#78350F', alignItems: 'center', fontWeight: 500 }}>
                <span style={{ color: '#F59E0B', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}
