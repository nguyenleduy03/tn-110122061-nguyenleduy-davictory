import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic, Square, Play, RotateCw, Send, CheckCircle2, AlertCircle,
  Sparkles, Brain, Target, FileText, Clock, Quote,
  ChevronDown, ChevronUp, Code, Upload, Volume2, BookOpen,
} from 'lucide-react';
import speakingApi from '../services/speakingApi';

const PARTS = [
  { value: 'PART1', label: 'Part 1 — Introduction & Interview', desc: 'Các câu hỏi cá nhân về chủ đề quen thuộc' },
  { value: 'PART2', label: 'Part 2 — Cue Card', desc: 'Nói về chủ đề trong 1-2 phút' },
  { value: 'PART3', label: 'Part 3 — Discussion', desc: 'Câu hỏi thảo luận trừu tượng' },
];

const SCAN_STAGES_SPEAKING = [
  { icon: Volume2, label: 'Nhận diện giọng nói (STT)', key: 'stt' },
  { icon: Brain, label: 'Phân tích ngôn ngữ', key: 'analyzing' },
  { icon: Sparkles, label: 'Chấm điểm 4 tiêu chí IELTS', key: 'scoring' },
  { icon: Target, label: 'Tạo nhận xét & lời khuyên', key: 'feedback' },
];

export default function AISpeakingTest({ onBack }) {
  const [step, setStep] = useState('setup');
  const [selectedParts, setSelectedParts] = useState(['PART1', 'PART2', 'PART3']);
  const [topic, setTopic] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [partsData, setPartsData] = useState({});
  const [expandedRaw, setExpandedRaw] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('overview');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const scanTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const togglePart = (value) => {
    setSelectedParts(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const resetAll = () => {
    setStep('setup');
    setSessionId(null);
    setCurrentPartIdx(0);
    setCurrentQuestion(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    setResult(null);
    setPartsData({});
    setExpandedRaw(false);
  };

  const handleStart = async () => {
    if (selectedParts.length === 0) {
      setError('Vui lòng chọn ít nhất 1 part.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await speakingApi.createSession(topic, selectedParts.join(','), 'practice');
      setSessionId(res.data.sessionId);
      setStep('recording');
      await loadQuestion(res.data.sessionId);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestion = async (sid) => {
    setLoadingQuestion(true);
    setError(null);
    try {
      const res = await speakingApi.getQuestion(sid);
      setCurrentQuestion(res.data);
      setAudioBlob(null);
      setAudioUrl(null);
      setIsRecording(false);
      setRecSeconds(0);
    } catch (err) {
      setError('Không thể tạo câu hỏi: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingQuestion(false);
    }
  };

  const ensureMic = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return streamRef.current;
    } catch {
      setError('Vui lòng cấp quyền truy cập microphone để ghi âm.');
      return null;
    }
  };

  const startRecording = useCallback(async () => {
    const stream = await ensureMic();
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (blob.size > 0) {
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      }
      setIsRecording(false);
      setRecSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecSeconds(0);
    timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const submitAnswer = async () => {
    if (!audioBlob) {
      setError('Vui lòng ghi âm hoặc tải lên file audio.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setUploadingFile(true);
      await speakingApi.uploadAudio(sessionId, audioBlob);
      setUploadingFile(false);
      const part = selectedParts[currentPartIdx] || 'PART1';
      setPartsData(prev => ({
        ...prev,
        [part]: { question: currentQuestion, audioBlob },
      }));
      if (currentPartIdx < selectedParts.length - 1) {
        setCurrentPartIdx(prev => prev + 1);
        await speakingApi.nextPhase(sessionId);
        await loadQuestion(sessionId);
      } else {
        setStep('evaluating');
        await handleEvaluate();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    setScanStage(0);
    scanTimerRef.current = setInterval(() => {
      setScanStage(prev => {
        if (prev < SCAN_STAGES_SPEAKING.length - 1) return prev + 1;
        return prev;
      });
    }, 1000);
    try {
      const res = await speakingApi.evaluateSession(sessionId);
      setResult(res.data);
      setScanStage(SCAN_STAGES_SPEAKING.length);
      setTimeout(() => setStep('results'), 800);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStep('recording');
    } finally {
      setEvaluating(false);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
  };

  const formatTime = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getCriteriaList = () => {
    if (!result?.criteria) return [];
    return Object.entries(result.criteria).map(([key, val]) => {
      const labels = {
        fluencyCoherence: { label: 'Fluency & Coherence', color: '#1d4ed8' },
        lexicalResource: { label: 'Lexical Resource', color: '#a16207' },
        grammaticalRangeAccuracy: { label: 'Grammatical Range & Accuracy', color: '#be185d' },
        pronunciation: { label: 'Pronunciation', color: '#15803d' },
      };
      return { key, ...(labels[key] || { label: key, color: '#64748b' }), ...val };
    });
  };

  const renderResult = () => {
    if (!result) return null;
    const criteriaList = getCriteriaList();
    return (
      <>
        <div className="ai-test-task-info-card">
          <div className="ai-test-task-info-header">
            <FileText size={18} />
            <span>Thông tin bài nói</span>
          </div>
          <div className="ai-test-task-info-grid">
            <div className="ai-test-task-info-item">
              <BookOpen size={14} />
              <span className="ai-test-task-info-label">Parts đã làm</span>
              <span className="ai-test-task-info-value">{selectedParts.join(', ')}</span>
            </div>
            <div className="ai-test-task-info-item">
              <Volume2 size={14} />
              <span className="ai-test-task-info-label">Chủ đề</span>
              <span className="ai-test-task-info-value">{topic || 'Không có'}</span>
            </div>
            {result.latency_ms != null && (
              <div className="ai-test-task-info-item">
                <Clock size={14} />
                <span className="ai-test-task-info-label">Thời gian xử lý</span>
                <span className="ai-test-task-info-value">{(result.latency_ms / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>
        </div>

        <div className="ai-test-result-header">
          <div className="ai-test-result-badge">
            <CheckCircle2 size={18} />
            Kết quả chấm điểm Speaking
          </div>
          <div className="ai-test-score-big">
            <span className="ai-test-score-number">{result.overall_band?.toFixed(1)}</span>
            <span className="ai-test-score-label">/ 9.0</span>
          </div>
          {result.confidence_score != null && (
            <div className="ai-test-confidence">
              <Target size={14} />
              Độ tin cậy: {Math.round(result.confidence_score * 100)}%
            </div>
          )}
          {result.model && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Model: {result.provider}/{result.model}
            </div>
          )}
        </div>

        <div className="ai-test-tabs">
          {[
            { id: 'overview', label: 'Tổng quan', icon: FileText },
            { id: 'criteria', label: 'Chi tiết điểm', icon: Brain },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`ai-test-tab${activeResultTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveResultTab(tab.id)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="ai-test-tab-content">
          {activeResultTab === 'overview' && (
            <div className="ai-test-overview">
              <div className="ai-test-criteria-grid">
                {criteriaList.map(c => (
                  <div key={c.key} className="ai-test-criteria-card" style={{ borderTopColor: c.color }}>
                    <div className="ai-test-criteria-name">{c.label}</div>
                    <div className="ai-test-criteria-score" style={{ color: c.color }}>
                      {c.band?.toFixed(1) ?? 'N/A'}
                    </div>
                    {c.detailedFeedback && (
                      <p className="ai-test-criteria-feedback">{c.detailedFeedback}</p>
                    )}
                    {c.strengths?.length > 0 && (
                      <div className="ai-test-criteria-tags">
                        {c.strengths.slice(0, 3).map((s, i) => (
                          <span key={i} className="ai-test-tag ai-test-tag-good">+ {s}</span>
                        ))}
                      </div>
                    )}
                    {c.weaknesses?.length > 0 && (
                      <div className="ai-test-criteria-tags">
                        {c.weaknesses.slice(0, 3).map((w, i) => (
                          <span key={i} className="ai-test-tag ai-test-tag-bad">- {w}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {result.overall_feedback && (
                <div className="ai-test-feedback-box">
                  <Quote size={18} />
                  <p>{result.overall_feedback}</p>
                </div>
              )}
              {result.improvement_priority?.length > 0 && (
                <div className="ai-test-improvement-list">
                  <h4>Ưu tiên cải thiện:</h4>
                  <ol>
                    {result.improvement_priority.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
          {activeResultTab === 'criteria' && (
            <div className="ai-test-criteria-detail">
              {criteriaList.map(c => (
                <div key={c.key} className="ai-test-subscore-card">
                  <div className="ai-test-subscore-header">
                    <span className="ai-test-subscore-title">{c.label}</span>
                    <span className="ai-test-subscore-band">{c.band?.toFixed(1) ?? 'N/A'}</span>
                  </div>
                  {c.strengths?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: 13, color: '#15803d' }}>Strengths:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 13, color: '#374151' }}>
                        {c.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {c.weaknesses?.length > 0 && (
                    <div>
                      <strong style={{ fontSize: 13, color: '#dc2626' }}>Weaknesses:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 13, color: '#374151' }}>
                        {c.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="ai-test-raw-toggle" onClick={() => setExpandedRaw(v => !v)}>
          {expandedRaw ? 'Ẩn' : 'Xem'} dữ liệu JSON thô
          {expandedRaw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedRaw && (
          <pre className="ai-test-raw-json">{JSON.stringify(result, null, 2)}</pre>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="ai-test-submit-btn" onClick={resetAll}>
            <RotateCw size={18} /> Làm bài khác
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="ai-test-input-section">
      <div className="ai-test-container">
        {error && (
          <div className="ai-test-error" style={{ marginBottom: 16 }}>
            <AlertCircle size={22} />
            <div><strong>Lỗi:</strong> {error}</div>
          </div>
        )}

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="ai-test-card">
            <div className="ai-test-card-header">
              <Mic size={22} />
              <span>Cấu hình bài nói</span>
            </div>
            <div className="ai-test-card-body" style={{ padding: 24 }}>
              <div className="ai-test-options">
                <div className="ai-test-option-group">
                  <label className="ai-test-label">Chọn Part muốn luyện tập</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PARTS.map(p => (
                      <label
                        key={p.value}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                          borderRadius: 10, border: selectedParts.includes(p.value) ? '2px solid #be185d' : '2px solid #e2e8f0',
                          background: selectedParts.includes(p.value) ? '#fdf2f8' : '#fff',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(p.value)}
                          onChange={() => togglePart(p.value)}
                          style={{ marginTop: 3, accentColor: '#be185d' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{p.label}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{p.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="ai-test-option-group" style={{ marginTop: 16 }}>
                  <label className="ai-test-label">Chủ đề (tùy chọn)</label>
                  <input
                    className="ai-test-input"
                    placeholder="VD: Environment, Technology, Education..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
                {onBack && (
                  <button
                    onClick={onBack}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                      borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff',
                      color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    ← Quay lại
                  </button>
                )}
                <button
                  className="ai-test-submit-btn"
                  onClick={handleStart}
                  disabled={loading || selectedParts.length === 0}
                  style={loading ? { opacity: 0.7 } : {}}
                >
                  {loading ? <><RotateCw size={18} className="spin" /> Đang tạo phiên...</> : <><Mic size={18} /> Bắt đầu luyện nói</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recording Step */}
        {step === 'recording' && (
          <div className="ai-test-card">
            <div className="ai-test-card-header">
              <Mic size={22} />
              <span>Part {currentPartIdx + 1}: {selectedParts[currentPartIdx]}</span>
            </div>
            <div className="ai-test-card-body" style={{ padding: 24 }}>
              {currentQuestion ? (
                <div style={{
                  background: '#f0f9ff', borderRadius: 10, padding: 16, marginBottom: 20,
                  border: '1px solid #bae6fd',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', marginBottom: 8, textTransform: 'uppercase' }}>
                    Câu hỏi
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: '#0c4a6e', whiteSpace: 'pre-wrap' }}>
                    {currentQuestion.question || currentQuestion.text || JSON.stringify(currentQuestion)}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                  {loadingQuestion ? (
                    <><RotateCw size={20} className="spin" style={{ verticalAlign: 'middle', marginRight: 8 }} /> Đang tạo câu hỏi...</>
                  ) : (
                    'Đang tải câu hỏi...'
                  )}
                </div>
              )}

              {audioUrl ? (
                <div style={{
                  background: '#f0fdf4', borderRadius: 10, padding: 16, marginBottom: 16,
                  border: '1px solid #bbf7d0',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>
                    Đã ghi âm ({formatTime(recSeconds)})
                  </div>
                  <audio src={audioUrl} controls style={{ width: '100%' }} />
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                      borderRadius: 10, border: 'none', background: '#be185d', color: '#fff',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    <Mic size={20} /> Ghi âm
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                      borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    <Square size={20} /> Dừng ({formatTime(recSeconds)})
                  </button>
                )}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  borderRadius: 10, border: '2px dashed #94a3b8', background: '#fff',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#64748b',
                }}>
                  <Upload size={20} />
                  Tải file audio
                  <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  className="ai-test-submit-btn"
                  onClick={submitAnswer}
                  disabled={loading || !audioBlob}
                >
                  {loading ? (
                    <><RotateCw size={18} className="spin" /> {uploadingFile ? 'Đang tải lên...' : 'Đang xử lý...'}</>
                  ) : (
                    <><Send size={18} /> {currentPartIdx < selectedParts.length - 1 ? 'Nộp & Part tiếp theo' : 'Nộp & Đánh giá'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evaluating Step */}
        {step === 'evaluating' && (
          <div className="ai-test-scan-card" style={{ marginTop: 24 }}>
            <div className="ai-test-scan-header">
              <Sparkles size={20} className="ai-test-scan-icon-pulse" />
              <span>AI đang đánh giá bài nói của bạn...</span>
            </div>
            <div className="ai-test-scan-stages">
              {SCAN_STAGES_SPEAKING.map((stage, i) => {
                const Icon = stage.icon;
                const isActive = i === scanStage;
                const isDone = i < scanStage;
                return (
                  <div key={stage.key} className={`ai-test-scan-stage${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                    <div className="ai-test-scan-stage-dot">
                      {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                    </div>
                    <div className="ai-test-scan-stage-info">
                      <div className="ai-test-scan-stage-label">{stage.label}</div>
                      {isActive && (
                        <div className="ai-test-scan-stage-bar">
                          <div className="ai-test-scan-stage-bar-fill" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && renderResult()}
      </div>
    </div>
  );
}
