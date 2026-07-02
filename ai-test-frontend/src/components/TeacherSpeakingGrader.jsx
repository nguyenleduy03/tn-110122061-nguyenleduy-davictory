import { useState, useEffect, useRef } from 'react';
import {
  Mic, MessageSquare, Volume2, Play, Square, RotateCw, ChevronDown, ChevronUp,
  AlertCircle, Search, GraduationCap, Loader2, Filter, X, ChevronLeft,
  FileText, BookOpen, ShieldCheck, Zap, Sparkles, Brain, Quote, Target,
  BarChart3, Layers, Languages, Activity, Clock, Hash, CheckCircle2,
  Eye, Image, Code,
} from 'lucide-react';
import axios from 'axios';
import { speakingApi } from '../api/speakingApi';
import { BandScore, CriterionMeter } from './ScoreDisplay';
import AudioVisualizer from './AudioVisualizer';

const SPEAKING_GRADER_STAGE_LOGS = {
  0: [
    { type: 'sys', text: 'Connecting to database storage...' },
    { type: 'sys', text: 'Speech files fetched successfully.' }
  ],
  1: [
    { type: 'sys', text: 'Decoding audio stream vectors...' },
    { type: 'nlp', text: 'Assessing acoustic feature maps...' },
    { type: 'nlp', text: 'Evaluating duration structure & word rate...' }
  ],
  2: [
    { type: 'nlp', text: 'Executing Speech-to-Text alignment...' },
    { type: 'ai', text: 'Initiating neural scoring transformer...' }
  ],
  3: [
    { type: 'ielts', text: 'Benchmarking pronunciation against native corpus...' },
    { type: 'ielts', text: 'Matching grammatical patterns against CEFR/IELTS standards...' }
  ],
  4: [
    { type: 'sys', text: 'Generating final band descriptors and priority tips...' }
  ]
};

const PART_LABELS = {
  WARMUP: 'Warm-up', PART0: 'Warm-up', PART1: 'Part 1',
  PART2: 'Part 2', PART2_FOLLOWUP: 'Part 2 - Follow-up', PART3: 'Part 3',
};

const CRITERIA_KEYS = ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'];
const CRITERIA_META = {
  fluencyCoherence: { label: 'Fluency & Coherence', icon: MessageSquare, color: '#4F46E5' },
  lexicalResource: { label: 'Lexical Resource', icon: BookOpen, color: '#F59E0B' },
  grammaticalRangeAccuracy: { label: 'Grammar', icon: ShieldCheck, color: '#EC4899' },
  pronunciation: { label: 'Pronunciation', icon: Mic, color: '#10B981' },
};

const SCAN_STAGES = [
  { label: 'Đang tải file ghi âm...', icon: Volume2 },
  { label: 'Đang phân tích giọng nói...', icon: Activity },
  { label: 'Đang gửi lên AI chấm điểm...', icon: Brain },
  { label: 'Đang phân tích kết quả...', icon: BarChart3 },
  { label: 'Hoàn tất', icon: CheckCircle2 },
];

function normalizeId(v) { return String(v || '').replace(/^q/i, '').trim(); }
function isLikelyAudioUrl(v) { return /^(https?:\/\/|blob:|data:audio\/|\/)/i.test(String(v || '').trim()); }
function playableUrl(url) {
  if (!url) return '';
  if (url.includes('uc?export=download')) return url;
  const m = url.match(/\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return url;
}

export default function TeacherSpeakingGrader() {
  const [classes, setClasses] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [filterClassId, setFilterClassId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({ prompt: false, response: false });
  const [nlpFeatures, setNlpFeatures] = useState(null);
  const scanTimer = useRef(null);

  const [liveLogs, setLiveLogs] = useState([]);
  const logStreamEndRef = useRef(null);

  useEffect(() => {
    loadClasses();
    loadAllAttempts();
    return () => { if (scanTimer.current) clearInterval(scanTimer.current); };
  }, []);

  useEffect(() => {
    if (grading) {
      const logs = SPEAKING_GRADER_STAGE_LOGS[scanStage] || [];
      if (scanStage === 0) setLiveLogs([]);
      logs.forEach((log, index) => {
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
    } catch {}
  }

  async function loadAllAttempts(cid, fd, td) {
    setLoading(true);
    setError(null);
    clearDetail();
    try {
      const body = { skillType: 'SPEAKING', size: 200, sortBy: 'submittedAt', sortDirection: 'DESC' };
      if (cid) body.classId = cid;
      if (fd) body.startDate = fd + 'T00:00:00';
      if (td) body.endDate = td + 'T23:59:59';
      const res = await speakingApi.filterAttempts(body);
      setAllAttempts(res.data || []);
    } catch (err) {
      setError('Không thể tải danh sách: ' + (err.response?.data?.message || err.message));
    } finally { setLoading(false); }
  }

  function clearDetail() {
    setSelectedAttempt(null);
    setRecordings([]);
    setQuestions([]);
    setResult(null);
    setError(null);
    setScanStage(0);
    setNlpFeatures(null);
  }

  async function loadAttemptDetail(attempt) {
    if (scanTimer.current) clearInterval(scanTimer.current);
    setSelectedAttempt(attempt);
    setResult(null);
    setError(null);
    setDetailLoading(true);
    setRecordings([]);
    setQuestions([]);
    setNlpFeatures(null);

    const attemptId = attempt.id || attempt.attemptId;
    const qIdToPart = {};
    const qList = [];
    const allRecs = [];
    const seen = new Set();

    try {
      // Build questionId → part map from test structure
      if (attempt.testId) {
        try {
          const testRes = await speakingApi.getTestFull(attempt.testId);
          const data = testRes.data;
          if (data?.sessions) for (const sess of data.sessions) {
            const parts = sess.parts || [];
            parts.forEach((p, pi) => {
              const partKey = `PART${Number(p.orderIndex) || pi + 1}`;
              (p.questionGroups || []).forEach(g => (g.questions || []).forEach(q => {
                const key = normalizeId(q.id);
                if (key) qIdToPart[key] = partKey;
              }));
            });
          }
        } catch {}
      }

      // Questions from snapshot
      try {
        const snapshotRes = await speakingApi.getSpeakingSnapshot(attemptId);
        const snapshots = snapshotRes.data || [];
        const qs = Array.isArray(snapshots) ? snapshots
          .map(s => ({ id: s.generatedQuestionId || s.id, text: s.questionText || s.question, part: s.part }))
          .filter(s => s.text) : [];
        qList.push(...qs);
      } catch {}

      // Primary: audio from attempt answers
      try {
        const detailRes = await speakingApi.getExamAttemptDetail(attemptId);
        const answerList = detailRes.data?.answers || [];
        for (const a of answerList) {
          for (const c of [a.audioUrl, a.textAnswer, a.selectedOptionLabel]) {
            const raw = String(c || '').trim();
            if (!raw || seen.has(raw) || !isLikelyAudioUrl(raw)) continue;
            seen.add(raw);
            const part = a.speakingPart || qIdToPart[normalizeId(a.questionId)] || '';
            allRecs.push({ audioUrl: raw, recordingPart: part, transcript: '' });
          }
        }
      } catch {}

      // Supplement: recordings from speaking attempt
      try {
        const speakingRes = await speakingApi.getSpeakingAttempt(attemptId);
        const extras = speakingRes.data?.recordings || [];
        for (const r of extras) {
          const raw = String(r.audioUrl || '').trim();
          if (!raw || seen.has(raw)) continue;
          seen.add(raw);
          const part = r.recordingPart ? `PART${r.recordingPart.replace(/PART/i, '').trim()}` : '';
          allRecs.push({ audioUrl: raw, recordingPart: part, transcript: r.transcript || '' });
        }
      } catch {}

      // Fallback: questions from test
      if (!qList.length && attempt.testId) {
        try {
          const testRes = await speakingApi.getTestFull(attempt.testId);
          const data = testRes.data;
          if (data?.sessions) for (const sess of data.sessions) {
            const parts = sess.parts || [];
            parts.forEach((p, pi) => {
              const partKey = `PART${Number(p.orderIndex) || pi + 1}`;
              (p.questionGroups || []).forEach(g => (g.questions || []).forEach(q => {
                qList.push({ id: q.id, text: q.questionText || q.content || `Question ${q.id}`, part: partKey });
              }));
            });
          }
        } catch {}
      }

      // Compute NLP features from transcript
      const allTranscript = allRecs.map(r => r.transcript).filter(Boolean).join(' ');
      if (allTranscript) {
        const words = allTranscript.split(/\s+/).filter(Boolean);
        const sentences = allTranscript.split(/[.!?]+/).filter(s => s.trim());
        const unique = new Set(words.map(w => w.toLowerCase()));
        const hesitation = words.filter(w => /^(um|uh|er|ah|like|hmm)$/i.test(w)).length;
        const discourse = words.filter(w => /^(however|therefore|moreover|furthermore|nevertheless|consequently|in addition|on the other hand|for example|in conclusion|firstly|secondly|finally)$/i.test(w)).length;
        setNlpFeatures({
          wordCount: words.length,
          sentenceCount: sentences.length,
          lexicalDiversity: words.length ? unique.size / words.length : 0,
          avgSentenceLength: sentences.length ? words.length / sentences.length : 0,
          hesitationCount: hesitation,
          discourseCount: discourse,
        });
      }

      // Sort recordings by part
      const partPriority = { PART1: 0, PART2: 1, PART2_FOLLOWUP: 2, PART3: 3, WARMUP: 4 };
      allRecs.sort((a, b) => (partPriority[a.recordingPart] ?? 99) - (partPriority[b.recordingPart] ?? 99));

      setRecordings(allRecs);
      setQuestions(qList);
    } catch (e) {
      setError('Không thể tải dữ liệu bài nộp.');
    } finally { setDetailLoading(false); }
  }

  async function fetchAudioBlob(url) {
    try {
      const res = await axios.get(url, { responseType: 'blob' });
      return res.data;
    } catch { return null; }
  }

  async function handleGrade() {
    if (!recordings.length) { setError('Không có file audio để chấm.'); return; }
    setGrading(true);
    setScanStage(0);
    setLiveLogs([]);
    setError(null);
    setResult(null);

    scanTimer.current = setInterval(() => {
      setScanStage(p => p < SCAN_STAGES.length - 1 ? p + 1 : p);
    }, 2000);

    try {
      // Step 1-2: Process audio
      setScanStage(0);
      const audioFiles = [];
      for (const rec of recordings) {
        const url = playableUrl(rec?.audioUrl || '');
        if (!url) continue;
        const blob = await fetchAudioBlob(url);
        if (!blob) continue;
        const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        audioFiles.push(new File([blob], `audio_${Date.now()}.${ext}`, { type: blob.type }));
      }
      if (!audioFiles.length) throw new Error('Không có file audio nào để chấm');
      setScanStage(2);

      // Build question texts per recording
      const qTexts = recordings.map(rec => {
        const partQs = questions.filter(q => q.part === rec.recordingPart);
        if (partQs.length > 0) return partQs.map(q => q.text).join('\n');
        return `Câu hỏi phần ${rec.recordingPart}`;
      });

      setScanStage(3);
      const res = await speakingApi.gradeExam(qTexts, audioFiles);
      setResult(res.data);
      setScanStage(SCAN_STAGES.length);
    } catch (err) {
      setError('Chấm bài thất bại: ' + (err.response?.data?.detail || err.message));
    } finally {
      if (scanTimer.current) clearInterval(scanTimer.current);
      setGrading(false);
    }
  }

  // ─── RENDER ───────────────────────────────────────────

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
              {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.className || `Lớp ${c.id}`}</option>)}
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
          <button className="btn btn-primary-grad" onClick={() => loadAllAttempts(filterClassId, filterFromDate, filterToDate)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} /> Lọc
          </button>
          {(filterClassId || filterFromDate || filterToDate) && (
            <button className="btn btn-outline" onClick={() => { setFilterClassId(''); setFilterFromDate(''); setFilterToDate(''); loadAllAttempts(); }} style={{ fontSize: '0.85rem' }}>
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
              <FileText size={18} color="var(--primary)" /> Bài nộp
              {!loading && <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>({allAttempts.length})</span>}
            </h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px' }}><Loader2 className="spin" size={24} style={{ color: 'var(--primary)' }} /></div>
            ) : allAttempts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Không có bài nộp nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                {allAttempts.map(a => {
                  const active = selectedAttempt && (selectedAttempt.id || selectedAttempt.attemptId) === (a.id || a.attemptId);
                  return (
                    <div key={a.id || a.attemptId} onClick={() => loadAttemptDetail(a)}
                      className={`list-card-item ${active ? 'active' : ''}`}
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
            <button className="btn btn-outline" onClick={() => loadAllAttempts()} style={{ marginTop: '12px', fontSize: '0.875rem', width: '100%', justifyContent: 'center' }}>
              <RotateCw size={14} /> Làm mới
            </button>
          </div>
        </div>

        {/* ─── Right: Detail panel ─── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedAttempt ? (
            <div className="card glass-premium" style={{ textAlign: 'center', padding: '80px 24px', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Mic size={48} color="var(--text-muted)" opacity={0.4} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-muted)' }}>Chọn một bài nộp để chấm</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', opacity: 0.7 }}>Click vào tên học sinh ở cột bên trái</p>
            </div>
          ) : (
            <div className="animate-fade">
              {/* Header */}
              <div className="card glass-premium" style={{ marginBottom: '16px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={clearDetail}
                    style={{ background: 'var(--bg-main)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <ChevronLeft size={16} /> Quay lại
                  </button>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    <GraduationCap size={18} color="var(--primary)" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    {selectedAttempt.studentName || selectedAttempt.userName || selectedAttempt.username}
                  </h2>
                </div>
              </div>

              {detailLoading ? (
                <div className="card glass-premium" style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <Loader2 className="spin" size={40} style={{ color: 'var(--primary)' }} />
                  <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Đang tải dữ liệu bài nộp...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                  {/* Scanning progress */}
                  {grading && (
                    <div className="card glass-premium neon-glow-primary animate-fade" style={{ marginBottom: '16px', border: '1px solid rgba(79, 70, 229, 0.3)', padding: '28px' }}>
                      <div className="radar-scanner">
                        <Mic size={36} className="ai-pulse" style={{ color: 'var(--primary)', zIndex: 3 }} />
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

                  {error && (
                    <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', gap: '8px' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* ─── Main content grid ─── */}
                  {!grading && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '16px' }}>
                      {/* LEFT COLUMN: Audio + Transcript + Prompt */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Audio recordings */}
                        {recordings.length > 0 && (
                          <div className="card glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Mic size={16} /> File ghi âm ({recordings.length})
                            </div>
                            <div style={{ padding: '12px 16px', background: 'white' }}>
                              {recordings.map((r, i) => (
                                <div key={i} style={{
                                  padding: '10px 0',
                                  borderBottom: i < recordings.length - 1 ? '1px solid var(--border-light)' : 'none',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#be185d' }}>
                                      {PART_LABELS[r.recordingPart] || r.recordingPart || 'Unknown'}
                                    </span>
                                  </div>
                                  <audio controls style={{ width: '100%', height: '40px' }}>
                                    <source src={playableUrl(r.audioUrl)} />
                                  </audio>
                                  <div style={{ marginTop: '4px' }}>
                                    <canvas style={{ width: '100%', height: '30px', borderRadius: '4px', background: '#F1F5F9' }} />
                                  </div>
                                  {/* Transcript */}
                                  {r.transcript && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, padding: '8px', marginTop: '6px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                                      <MessageSquare size={12} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--text-muted)' }} />
                                      {r.transcript}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Questions */}
                        {questions.length > 0 && (
                          <div className="card glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA', fontWeight: 700, fontSize: '0.875rem', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MessageSquare size={16} /> Câu hỏi
                            </div>
                            <div style={{ padding: '12px 16px', background: 'white' }}>
                              {['PART1', 'PART2', 'PART2_FOLLOWUP', 'PART3'].map(part => {
                                const qs = questions.filter(q => q.part === part);
                                if (!qs.length) return null;
                                return (
                                  <div key={part} style={{ marginBottom: qs.length ? '12px' : 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#be185d', marginBottom: '4px' }}>{PART_LABELS[part] || part}</div>
                                    {qs.map((q, i) => <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '12px', marginBottom: '2px' }}>• {q.text}</div>)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Grade button */}
                        {recordings.length > 0 && (
                          <button className="btn btn-primary-grad" onClick={handleGrade} disabled={grading}
                            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                            {grading ? <RotateCw className="spin" size={18} /> : <Sparkles size={18} />}
                            <span style={{ marginLeft: '8px' }}>{grading ? 'Đang chấm...' : 'Chấm bằng AI'}</span>
                          </button>
                        )}

                        {/* Raw prompt viewer */}
                        {result && (
                          <div className="card glass-premium">
                            <div onClick={() => setExpanded(p => ({ ...p, prompt: !p.prompt }))}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                <Code size={16} color="var(--primary)" /> Raw prompt gửi AI
                              </h4>
                              {expanded.prompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expanded.prompt && (
                              <pre style={{ marginTop: '12px', fontSize: '0.75rem', background: '#1E293B', color: '#E2E8F0', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '300px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify({ questions: recordings.map(r => ({ part: r.recordingPart, transcript: r.transcript })), audioFiles: recordings.length }, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>

                      {/* RIGHT COLUMN: Metrics + Results */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* NLP Features */}
                        {nlpFeatures && (
                          <div className="card glass-premium">
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                              <Activity size={18} color="var(--primary)" /> Phân tích ngôn ngữ
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                { label: 'Số từ', value: nlpFeatures.wordCount, icon: Hash },
                                { label: 'Số câu', value: nlpFeatures.sentenceCount, icon: FileText },
                                { label: 'Đa dạng từ', value: nlpFeatures.lexicalDiversity.toFixed(3), icon: BookOpen },
                                { label: 'Câu TB', value: nlpFeatures.avgSentenceLength.toFixed(1), icon: BarChart3 },
                                { label: 'Từ đệm', value: nlpFeatures.hesitationCount, icon: AlertCircle },
                                { label: 'Discourse', value: nlpFeatures.discourseCount, icon: Layers },
                              ].map((m, i) => (
                                <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <m.icon size={12} /> {m.label}
                                  </div>
                                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{m.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Band Scores */}
                        {result && (
                          <div className="card glass-premium neon-glow-primary" style={{
                            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', color: 'white',
                            border: '1px solid rgba(99, 102, 241, 0.2)', padding: '24px'
                          }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                              <BandScore band={result.overall?.overallBand || 0} size={130} />
                              <h3 style={{ marginTop: '14px', fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff 0%, #e0e7ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Overall Band</h3>
                              {result.overall?.confidenceScore != null && (
                                <p style={{ fontSize: '0.8rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '6px' }}>
                                  <Sparkles size={12} /> Độ tin cậy: {Math.round(result.overall.confidenceScore * 100)}%
                                </p>
                              )}
                            </div>
                            {result.overall?.criteria && CRITERIA_KEYS.map(key => {
                              const c = result.overall.criteria[key];
                              if (!c) return null;
                              const meta = CRITERIA_META[key];
                              return (
                                <CriterionMeter key={key} label={meta.label} band={c.band || 0} color={meta.color} icon={meta.icon} />
                              );
                            })}
                          </div>
                        )}

                        {/* Strengths/Weaknesses */}
                        {result?.overall?.overallFeedback && (
                          <div className="card glass-premium">
                            <div onClick={() => setExpanded(p => ({ ...p, response: !p.response }))}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                                <Quote size={18} color="var(--primary)" /> Nhận xét
                              </h4>
                              {expanded.response ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                            {expanded.response && (
                              <div style={{ marginTop: '12px' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>{result.overall.overallFeedback}</p>
                                {result.overall?.strengths?.length > 0 && (
                                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(240, 253, 244, 0.45)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(187, 247, 208, 0.3)' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} /> Điểm mạnh</span>
                                    {result.overall.strengths.map((s, i) => <p key={i} style={{ fontSize: '0.85rem', color: '#166534', marginTop: '6px', fontWeight: 500 }}>• {s}</p>)}
                                  </div>
                                )}
                                {result.overall?.weaknesses?.length > 0 && (
                                  <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(254, 242, 242, 0.45)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(254, 202, 202, 0.3)' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={14} /> Điểm yếu</span>
                                    {result.overall.weaknesses.map((w, i) => <p key={i} style={{ fontSize: '0.85rem', color: '#991B1B', marginTop: '6px', fontWeight: 500 }}>• {w}</p>)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Per-question scores */}
                        {result?.per_question?.length > 0 && (
                          <div className="card glass-premium">
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                              <BarChart3 size={18} color="var(--primary)" /> Điểm từng câu
                            </h4>
                            {result.per_question.map((pq, i) => (
                              <div key={i} style={{ padding: '10px 14px', marginBottom: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Q{pq.question_index + 1}</span>
                                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4F46E5' }}>{pq.band?.toFixed(1) || '-'}</span>
                                </div>
                                {pq.feedback && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4, fontWeight: 500 }}>{pq.feedback}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
