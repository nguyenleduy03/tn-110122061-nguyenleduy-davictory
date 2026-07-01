import { useState, useEffect } from 'react';
import {
  BookOpen, Mic, MessageSquare, ShieldCheck, RotateCw, ChevronDown, ChevronUp,
  AlertCircle, FileText, Sparkles,
  Zap, ChevronRight, Search, BarChart3, GraduationCap, Loader2, Filter, X,
} from 'lucide-react';
import axios from 'axios';
import { speakingApi } from '../api/speakingApi';
import { BandScore, CriterionMeter } from './ScoreDisplay';

const CRITERIA_KEYS = ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'];
const CRITERIA_LABELS = {
  fluencyCoherence: 'Fluency & Coherence',
  lexicalResource: 'Lexical Resource',
  grammaticalRangeAccuracy: 'Grammar Accuracy',
  pronunciation: 'Pronunciation',
};
const CRITERIA_ICONS = {
  fluencyCoherence: MessageSquare,
  lexicalResource: BookOpen,
  grammaticalRangeAccuracy: ShieldCheck,
  pronunciation: Mic,
};

const PART_LABELS = {
  WARMUP: 'Warm-up',
  PART0: 'Warm-up',
  PART1: 'Part 1',
  PART2: 'Part 2',
  PART2_FOLLOWUP: 'Part 2 - Follow-up',
  PART3: 'Part 3',
};

export default function TeacherSpeakingGrader() {
  const [classes, setClasses] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [filterClassId, setFilterClassId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => {
    loadClasses();
    loadAllAttempts();
  }, []);

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
        skillType: 'SPEAKING',
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

  function closeModal() {
    setSelectedAttempt(null);
    setResult(null);
    setQuestions([]);
    setRecordings([]);
    setError(null);
  }

  function isLikelyAudioUrl(v) {
    return /^(https?:\/\/|blob:|data:audio\/|\/)/i.test(String(v || '').trim());
  }

  function normalizeId(v) {
    return String(v || '').replace(/^q/i, '').trim();
  }

  async function loadAttemptDetail(attempt) {
    setSelectedAttempt(attempt);
    setResult(null);
    setError(null);
    setLoading(true);

    const attemptId = attempt.id || attempt.attemptId;
    let qList = [];
    const allRecs = [];
    const seen = new Set();
    const qIdToPart = {};

    // Build questionId → part map from test structure (like LMS)
    if (attempt.testId) {
      try {
        const testRes = await speakingApi.getTestFull(attempt.testId);
        const data = testRes.data;
        if (data?.sessions) {
          for (const sess of data.sessions) {
            const parts = sess.parts || [];
            parts.forEach((p, pi) => {
              const partKey = `PART${Number(p.orderIndex) || pi + 1}`;
              (p.questionGroups || []).forEach(g => {
                (g.questions || []).forEach(q => {
                  const key = normalizeId(q.id);
                  if (key) qIdToPart[key] = partKey;
                });
              });
            });
          }
        }
      } catch (e) {}
    }

    // Get questions from speaking snapshot
    try {
      const snapshotRes = await speakingApi.getSpeakingSnapshot(attemptId);
      const snapshots = snapshotRes.data || [];
      qList = Array.isArray(snapshots) ? snapshots
        .map(s => ({ id: s.generatedQuestionId || s.id, text: s.questionText || s.question, part: s.part }))
        .filter(s => s.text) : [];
    } catch (e) {}

    // PRIMARY source: get audio from attempt answers (like LMS)
    try {
      const detailRes = await speakingApi.getExamAttemptDetail(attemptId);
      const answerList = detailRes.data?.answers || [];
      for (const a of answerList) {
        const candidates = [a.audioUrl, a.textAnswer, a.selectedOptionLabel];
        for (const c of candidates) {
          const rawUrl = String(c || '').trim();
          if (!rawUrl || seen.has(rawUrl)) continue;
          if (!isLikelyAudioUrl(rawUrl)) continue;
          seen.add(rawUrl);
          const qKey = normalizeId(a.questionId);
          const part = qIdToPart[qKey] || '';
          allRecs.push({ audioUrl: rawUrl, recordingPart: part, transcript: '' });
        }
      }
    } catch (e) {}

    // SUPPLEMENT: add recordings from speaking attempt (dedup by URL)
    try {
      const speakingRes = await speakingApi.getSpeakingAttempt(attemptId);
      const extraRecs = speakingRes.data?.recordings || [];
      for (const r of extraRecs) {
        const rawUrl = String(r.audioUrl || '').trim();
        if (!rawUrl || seen.has(rawUrl)) continue;
        seen.add(rawUrl);
        const part = r.recordingPart ? `PART${r.recordingPart.replace(/PART/i, '').trim()}` : '';
        allRecs.push({ audioUrl: rawUrl, recordingPart: part, transcript: r.transcript || '' });
      }
    } catch (e) {}

    // Last resort: get questions from test builder
    if (!qList.length && attempt.testId) {
      try {
        const testRes = await speakingApi.getTestFull(attempt.testId);
        const testData = testRes.data;
        if (testData?.sessions) {
          for (const sess of testData.sessions) {
            const parts = sess.parts || [];
            parts.forEach((p, pi) => {
              const partKey = `PART${Number(p.orderIndex) || pi + 1}`;
              (p.questionGroups || []).forEach(g => {
                (g.questions || []).forEach(q => {
                  qList.push({ id: q.id, text: q.questionText || q.content || `Question ${q.id}`, part: partKey });
                });
              });
            });
          }
        }
      } catch (e) {}
    }

    setRecordings(allRecs);
    setQuestions(qList);
    setLoading(false);
  }

  function playableUrl(url) {
    if (!url) return '';
    // Direct Drive download URL — playable as-is
    if (url.includes('uc?export=download')) return url;
    // Drive view URL — convert to download
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    return url;
  }

  async function fetchAudioBlob(url) {
    if (url.includes('drive.google.com')) {
      const idMatch = url.match(/[?&]id=([^&]+)/);
      if (!idMatch) return null;
      const proxyUrl = `/api/files/download/${idMatch[1]}`;
      try {
        const res = await axios.get(proxyUrl, { responseType: 'blob' });
        return res.data;
      } catch {
        return null;
      }
    }
    try {
      const res = await axios.get(url, { responseType: 'blob' });
      return res.data;
    } catch {
      return null;
    }
  }

  async function handleGrade() {
    setGrading(true);
    setError(null);
    setResult(null);
    try {
      const audioFiles = [];
      for (const rec of recordings) {
        const url = playableUrl(rec?.audioUrl || '');
        if (!url) continue;
        const blob = await fetchAudioBlob(url);
        if (!blob) continue;
        const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        audioFiles.push(new File([blob], `audio_${Date.now()}.${ext}`, { type: blob.type }));
      }

      if (!audioFiles.length) {
        throw new Error('Không có file audio nào để chấm');
      }

      const qTexts = questions.length >= recordings.length
        ? questions.map(q => q.text)
        : recordings.map((_, i) => `Câu hỏi ${i + 1}`);

      const res = await speakingApi.gradeExam(qTexts, audioFiles);
      setResult(res.data);
    } catch (err) {
      setError('Chấm bài thất bại: ' + (err.response?.data?.detail || err.response?.data?.message || err.message));
    } finally {
      setGrading(false);
    }
  }

  function formatBand(b) {
    return b != null && b > 0 ? b.toFixed(1) : '-';
  }

  function closeOnOverlayClick(e) {
    if (e.target === e.currentTarget) closeModal();
  }

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
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem' }}>
          <Filter size={18} color="var(--primary)" /> Bộ lọc
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Lớp</label>
            <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', minWidth: '160px' }}>
              <option value="">Tất cả lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.className || `Lớp ${c.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Từ ngày</label>
            <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Đến ngày</label>
            <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </div>
          <button className="btn btn-primary" onClick={handleFilter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} /> Lọc
          </button>
          {(filterClassId || filterFromDate || filterToDate) && (
            <button className="btn btn-outline" onClick={resetFilter} style={{ fontSize: '0.85rem' }}>
              <RotateCw size={14} /> Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Attempts list */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem' }}>
          <FileText size={18} color="var(--primary)" /> Danh sách bài nộp
          {!loading && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>({allAttempts.length})</span>}
        </h3>
        {loading && !allAttempts.length ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <Loader2 className="spin" size={24} style={{ color: 'var(--primary)' }} />
          </div>
        ) : allAttempts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Không có bài nộp Speaking nào.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allAttempts.map(a => (
              <div key={a.id || a.attemptId}
                onClick={() => loadAttemptDetail(a)}
                style={{
                  padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'white',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{a.studentName || a.userName || a.username || `HS #${a.userId}`}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}
                    {a.bandScore != null && ` • Band: ${a.bandScore}`}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-outline" onClick={handleFilter} style={{ marginTop: '12px', fontSize: '0.875rem' }}>
          <RotateCw size={14} /> Làm mới
        </button>
      </div>

      {/* Modal overlay */}
      {selectedAttempt && (
        <div onClick={closeOnOverlayClick}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: '40px 24px', overflowY: 'auto',
          }}>
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
            padding: '24px', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <button onClick={closeModal}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'var(--bg-main)', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
              }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', paddingRight: '40px' }}>
              <GraduationCap size={20} color="var(--primary)" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              Chấm Speaking — {selectedAttempt.studentName || selectedAttempt.userName || selectedAttempt.username}
            </h2>

            {error && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <Loader2 className="spin" size={40} style={{ color: 'var(--primary)' }} />
                <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Đang tải dữ liệu bài nộp...</p>
              </div>
            )}

            {!loading && (
              <>
                {questions.length === 0 && recordings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '40px' }}>
                    Bài chưa có dữ liệu speaking hoặc chưa được nộp.
                  </p>
                ) : (
                  <>
                    {/* Render by part */}
                    {renderQuestionsByPart(questions, recordings)}

                    {/* Grade button */}
                    {recordings.length > 0 && (
                      <button className="btn btn-primary" onClick={handleGrade} disabled={grading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                        {grading ? <RotateCw className="spin" size={18} /> : <Sparkles size={18} />}
                        <span style={{ marginLeft: '8px' }}>{grading ? 'Đang chấm...' : 'Chấm bằng AI'}</span>
                      </button>
                    )}

                    {/* Results */}
                    {result && renderResults()}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function renderQuestionsByPart(qList, recs) {
    // Build flat recordings list with labels (like LMS speakingRecordings)
    const partCounters = {};
    const seen = new Set();
    const flatRecs = [];
    recs.forEach(r => {
      const normalizedUrl = String(r.audioUrl || '').trim();
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      let partLabel = r.recordingPart || 'OTHER';
      partCounters[partLabel] = (partCounters[partLabel] || 0) + 1;
      flatRecs.push({
        label: `${PART_LABELS[partLabel] || partLabel} — Câu ${partCounters[partLabel]}`,
        url: normalizedUrl,
        transcript: r.transcript || '',
        partKey: partLabel,
        counter: partCounters[partLabel],
      });
    });

    // Sort by part order (Part 1, Part 2, Part 3, then others)
    const partPriority = { PART1: 0, PART2: 1, PART2_FOLLOWUP: 2, PART3: 3, WARMUP: 4, PART0: 4 };
    flatRecs.sort((a, b) => {
      const pa = partPriority[a.partKey] ?? 99;
      const pb = partPriority[b.partKey] ?? 99;
      return pa - pb || a.counter - b.counter;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        {/* Recordings section (flat list, like LMS) */}
        <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{
            background: 'var(--primary-light)', padding: '10px 16px',
            fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)',
            borderBottom: '1px solid var(--border)',
          }}>
            <Mic size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            File ghi âm
          </div>
          {flatRecs.length > 0 ? (
            <div style={{ background: 'white' }}>
              {flatRecs.map((r, i) => (
                <div key={i} style={{
                  padding: '10px 16px',
                  borderBottom: i < flatRecs.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {r.label}
                  </div>
                  <audio controls src={playableUrl(r.url)} style={{ width: '100%' }} preload="none" />
                  {r.transcript && (
                    <details style={{ marginTop: '6px' }}>
                      <summary style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                        Transcript
                      </summary>
                      <div style={{
                        marginTop: '6px', padding: '8px', background: '#f0f9ff',
                        border: '1px solid #bfdbfe', borderRadius: '6px',
                        fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1e40af',
                      }}>
                        {r.transcript}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', background: 'white' }}>
              Chưa có file thu âm để phát lại.
            </div>
          )}
        </div>

        {/* Questions section (grouped by part, like LMS) */}
        {qList.length > 0 && (
          <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{
              background: 'var(--primary-light)', padding: '10px 16px',
              fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)',
              borderBottom: '1px solid var(--border)',
            }}>
              <MessageSquare size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Câu hỏi đã hỏi
            </div>
            {['WARMUP', 'PART0', 'PART1', 'PART2', 'PART2_FOLLOWUP', 'PART3'].map(part => {
              const qs = qList.filter(q => q.part === part);
              if (!qs.length) return null;
              return (
                <div key={part} style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#be185d', marginBottom: '6px' }}>
                    {PART_LABELS[part] || part}
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {qs.map((q, i) => (
                      <li key={i} style={{ marginBottom: '3px' }}>{q.text}</li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderResults() {
    return (
      <div style={{ marginTop: '20px' }}>
        <div className="card" style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: 'white',
          border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          marginBottom: '16px',
        }}>
          <BandScore band={result.overall?.overallBand || 0} size={120} />
          <h3 style={{ marginTop: '12px', fontSize: '1.1rem', fontWeight: 800 }}>Kết quả tổng thể</h3>
          {result.overall?.confidenceScore != null && (
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Độ tin cậy: {Math.round(result.overall.confidenceScore * 100)}%</p>
          )}
        </div>

        {result.overall?.criteria && CRITERIA_KEYS.map(key => {
          const c = result.overall.criteria[key];
          if (!c) return null;
          return (
            <CriterionMeter key={key} label={CRITERIA_LABELS[key] || key}
              band={c.band || 0} color="var(--primary)" icon={CRITERIA_ICONS[key] || Mic} />
          );
        })}

        {result.overall?.overallFeedback && (
          <div className="card">
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} color="var(--primary)" /> Nhận xét tổng quát
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.overall.overallFeedback}</p>
          </div>
        )}

        {result.overall?.strengths?.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid #10B981' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#065F46' }}>Điểm mạnh</h4>
            {result.overall.strengths.map((s, i) => <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>• {s}</p>)}
          </div>
        )}

        {result.overall?.weaknesses?.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid #EF4444', marginTop: '12px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#991B1B' }}>Điểm yếu</h4>
            {result.overall.weaknesses.map((w, i) => <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>• {w}</p>)}
          </div>
        )}

        {result.per_question?.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={16} color="var(--primary)" /> Điểm từng câu
            </h4>
            {result.per_question.map((pq, i) => (
              <div key={i} style={{
                marginBottom: '12px', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }} onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Câu {pq.question_index + 1}</span>
                    <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pq.question_text?.substring(0, 60)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4F46E5' }}>{formatBand(pq.band)}</span>
                    {expandedQ === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {expandedQ === i && (
                  <div style={{ marginTop: '12px' }}>
                    {pq.transcript && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>TRANSCRIPT</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{pq.transcript}</p>
                      </div>
                    )}
                    {pq.criteria && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {CRITERIA_KEYS.map(key => (
                          <div key={key} style={{ fontSize: '0.8rem', padding: '8px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{CRITERIA_LABELS[key]}: </span>
                            <span style={{ fontWeight: 700, color: '#4F46E5' }}>{pq.criteria[key] != null && pq.criteria[key] > 0 ? pq.criteria[key].toFixed(1) : '-'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pq.feedback && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>{pq.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}
