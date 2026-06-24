import { useState, useEffect } from 'react';
import {
  BookOpen, Mic, MessageSquare, ShieldCheck, RotateCw, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Users, FileText, Play, Download, Sparkles,
  Zap, ChevronRight, Search, BarChart3, GraduationCap, Loader2,
} from 'lucide-react';
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

export default function TeacherSpeakingGrader() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [audioUrls, setAudioUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    setLoading(true);
    setError(null);
    try {
      const res = await speakingApi.getMyClasses();
      const data = res.data?.data || res.data?.classes || [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Không thể tải danh sách lớp: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadAttempts(classId) {
    setSelectedClassId(classId);
    setSelectedAttempt(null);
    setResult(null);
    setQuestions([]);
    setRecordings([]);
    setError(null);
    setLoading(true);
    try {
      const res = await speakingApi.getAttemptsByClass(classId);
      let list = res.data || [];
      list = list.filter(a => a.skillType === 'SPEAKING' || a.skill === 'SPEAKING');
      setAttempts(list);
    } catch (err) {
      setError('Không thể tải danh sách bài nộp: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadAttemptDetail(attempt) {
    setSelectedAttempt(attempt);
    setResult(null);
    setAudioUrls({});
    setError(null);
    setLoading(true);

    const attemptId = attempt.id || attempt.attemptId;

    let qList = [];
    let recs = [];

    try {
      const snapshotRes = await speakingApi.getSpeakingSnapshot(attemptId);
      const snapshots = snapshotRes.data || [];
      qList = Array.isArray(snapshots) ? snapshots
        .map(s => ({ id: s.generatedQuestionId || s.id, text: s.questionText || s.question }))
        .filter(s => s.text) : [];
    } catch (e) {
      // snapshot may fail, will fall back below
    }

    try {
      const speakingRes = await speakingApi.getSpeakingAttempt(attemptId);
      recs = speakingRes.data?.recordings || [];
    } catch (e) {
      // speaking attempt API may fail, will fall back to attempt.answers
    }

    if (!recs.length) {
      const answers = attempt.answers || [];
      const seen = new Set();
      for (const a of answers) {
        const url = a.selectedOptionLabel || a.textAnswer || a.audioUrl || '';
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const part = a.part || a.recordingPart || '';
        recs.push({
          audioUrl: url,
          recordingPart: part,
          transcript: a.transcript || a.answerText || '',
          generatedQuestionId: a.questionId,
        });
      }
    }

    if (!qList.length && recs.length) {
      qList = recs.map((r, i) => ({
        id: r.generatedQuestionId || i,
        text: r.questionText || r.question || `Câu hỏi ${i + 1}`,
      }));
    }

    if (!qList.length && !recs.length) {
      const answers = attempt.answers || [];
      qList = answers.map(a => ({ id: a.questionId, text: a.questionText || `Câu hỏi ${a.questionId}` }));
    }

    setRecordings(recs);
    setQuestions(qList);
    setLoading(false);
  }

  function getAudioUrl(rec) {
    const url = rec?.audioUrl || '';
    const fileMatch = url.match(/\/preview\/(.+)/);
    if (!fileMatch) return url;
    const fileId = fileMatch[1];
    if (audioUrls[fileId]) return audioUrls[fileId];
    return `/api/files/preview/${fileId}`;
  }

  async function handleGrade() {
    setGrading(true);
    setError(null);
    setResult(null);
    try {
      const audioFiles = [];
      for (const rec of recordings) {
        const url = rec?.audioUrl || '';
        const fileMatch = url.match(/\/preview\/(.+)/);
        if (!fileMatch) continue;
        const fileId = fileMatch[1];
        const blobRes = await speakingApi.downloadAudio(fileId);
        const blob = new Blob([blobRes.data]);
        const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        audioFiles.push(new File([blob], `audio_${fileId}.${ext}`, { type: blob.type }));
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

  if (loading && !classes.length && !selectedAttempt) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '80px 24px' }}>
        <Loader2 className="spin" size={40} style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1.5fr 1fr' : '1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Step 1: Select class */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem' }}>
              <Users size={18} color="var(--primary)" /> Chọn lớp
            </h3>
            {!classes.length ? (
              <button className="btn btn-outline" onClick={loadClasses} disabled={loading}>
                <RotateCw size={16} /> Tải danh sách lớp
              </button>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {classes.map(c => (
                  <button key={c.id} className={`btn ${selectedClassId === c.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => loadAttempts(c.id)} style={{ fontSize: '0.875rem' }}>
                    {c.name || c.className || `Lớp ${c.id}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Select attempt */}
          {selectedClassId && (
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem' }}>
                <FileText size={18} color="var(--primary)" /> Bài nộp Speaking
              </h3>
              {attempts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Chưa có bài nộp Speaking nào.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attempts.map(a => (
                    <div key={a.id || a.attemptId}
                      onClick={() => loadAttemptDetail(a)}
                      style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: `1px solid ${selectedAttempt?.id === a.id || selectedAttempt?.attemptId === a.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: selectedAttempt?.id === a.id || selectedAttempt?.attemptId === a.id ? 'var(--primary-light)' : 'white',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{a.studentName || a.userName || `HS #${a.userId}`}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}
                          {a.overallBandScore != null && ` • Band: ${a.overallBandScore}`}
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-outline" onClick={() => loadAttempts(selectedClassId)} style={{ marginTop: '12px', fontSize: '0.875rem' }}>
                <RotateCw size={14} /> Làm mới
              </button>
            </div>
          )}

          {/* Step 3: Attempt detail */}
          {selectedAttempt && (
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1rem' }}>
                <GraduationCap size={18} color="var(--primary)" /> Câu hỏi & Ghi âm
              </h3>

              {questions.length === 0 && recordings.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Không có dữ liệu câu hỏi hoặc ghi âm.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(questions.length >= recordings.length ? questions : recordings.map((r, i) => ({ id: i, text: `Câu hỏi ${i + 1}` }))).map((q, i) => {
                    const rec = recordings[i];
                    const url = rec ? getAudioUrl(rec) : null;
                    return (
                      <div key={q.id || i} style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', background: 'var(--bg-main)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>
                              Câu {i + 1}{rec?.recordingPart ? ` (${rec.recordingPart})` : ''}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{q.text}</div>
                          </div>
                        </div>
                        {url && (
                          <audio controls src={url} style={{ width: '100%', marginTop: '8px' }} preload="none" />
                        )}
                        {rec?.transcript && (
                          <details style={{ marginTop: '8px' }}>
                            <summary style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Transcript</summary>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{rec.transcript}</p>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {recordings.length > 0 && (
                <button className="btn btn-primary" onClick={handleGrade} disabled={grading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '14px' }}>
                  {grading ? <RotateCw className="spin" size={18} /> : <Sparkles size={18} />}
                  <span style={{ marginLeft: '8px' }}>{grading ? 'Đang chấm...' : 'Chấm bằng AI'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step 4: Results */}
        {result && (
          <div className="animate-fade">
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
        )}
      </div>
    </div>
  );
}
