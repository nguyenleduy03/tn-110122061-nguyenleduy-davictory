import { useState, useEffect, useCallback } from 'react';
import { Pencil, FileText, Layers, Send, CheckCircle, XCircle, Plus, RefreshCw, Cpu, AlertTriangle, Database, Code, ArrowRight } from 'lucide-react';
import { writingApi } from '../api/writingApi';
import ResponseViewer from '../components/ResponseViewer';
import { useHeader } from '../context/HeaderContext';

const DEFAULT_ESSAY = `Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?

In recent years, there has been considerable debate about whether unpaid community service should be mandatory for high school students. While some argue that this would place an unnecessary burden on young people, I strongly believe that such programmes offer invaluable benefits that outweigh the potential drawbacks.

First and foremost, compulsory community service helps students develop essential life skills that traditional academic subjects often overlook. Through volunteering at local charities or environmental projects, students learn teamwork, communication, and problem-solving in real-world contexts. These practical experiences not only enhance their personal development but also make them more attractive to future employers and universities.

Furthermore, requiring community service fosters a sense of social responsibility among young people. When teenagers engage with diverse groups in their community, they develop empathy and understanding for people from different backgrounds. This exposure helps combat prejudice and creates a more cohesive society in the long term.

However, opponents argue that forcing students to volunteer defeats the very purpose of volunteering. They contend that genuine altruism cannot be mandated and that adding another requirement to already busy student schedules could increase stress levels. While these concerns are valid, schools can implement flexible programmes that accommodate students' individual circumstances.

In conclusion, I firmly believe that the benefits of compulsory community service far surpass the disadvantages. By carefully designing these programmes to be flexible and meaningful, schools can nurture well-rounded individuals who are both academically capable and socially conscious.`;

export default function Writing() {
  const [tab, setTab] = useState('test-grade');
  const { setTabs, activeTab } = useHeader();

  const tabDefs = [
    { key: 'test-grade', label: 'Test Grade', icon: FileText, onClick: () => setTab('test-grade') },
    { key: 'submission', label: 'Grade by ID', icon: CheckCircle, onClick: () => setTab('submission') },
    { key: 'batch', label: 'Batch Grade', icon: Layers, onClick: () => setTab('batch') },
    { key: 'admin', label: 'Admin', icon: Plus, onClick: () => setTab('admin') },
  ];

  useEffect(() => {
    setTabs(tabDefs);
    return () => setTabs([]);
  }, []);
  const [essayText, setEssayText] = useState(DEFAULT_ESSAY);
  const [taskType, setTaskType] = useState('TASK2_ACADEMIC');
  const [topic, setTopic] = useState('Education');
  const [promptText, setPromptText] = useState('');
  const [showRawPrompt, setShowRawPrompt] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [batchIds, setBatchIds] = useState('');
  const [batchId, setBatchId] = useState('');
  const [userId, setUserId] = useState('test');
  const [role, setRole] = useState('TEACHER');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [switchingModel, setSwitchingModel] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      const res = await writingApi.getModels();
      const data = res.data || {};
      const modelsList = data.models || [];
      const flat = modelsList.map((m) => ({
        model: m.id,
        label: m.id,
        provider: m.owned_by || 'groq',
        active: m.active,
      }));
      setModels(flat);
      const current = flat.find((m) => m.active && m.model === currentModel) || flat.find((m) => m.active) || flat[0];
      if (current) setCurrentModel(current.model);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  async function callApi(fn, lbl) {
    setLoading(true);
    setError(null);
    setResponse(null);
    setLabel(lbl);
    try {
      const res = await fn();
      setResponse(res.data);
    } catch (err) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleMatchSamples() {
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const res = await writingApi.matchSamples(essayText, taskType);
      setMatchResult(res.data);
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    } finally {
      setMatchLoading(false);
    }
  }

  return (
    <div className="main">
      <div className="page-header">
        <h1><Pencil size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />IELTS Writing AI Test</h1>
        <p>Test all AI Writing service endpoints — grading, batch processing, admin controls</p>
      </div>

      <div className="model-selector">
        <Cpu size={16} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Model:</span>
        <select
          value={currentModel}
          onChange={async (e) => {
            const newModel = e.target.value;
            if (newModel === currentModel) return;
            setSwitchingModel(true);
            try {
              await writingApi.switchModel(newModel);
              setCurrentModel(newModel);
              setError(null);
            } catch (err) {
              setError('Switch failed: ' + (err.response?.data?.error || err.message));
            } finally {
              setSwitchingModel(false);
            }
          }}
          style={{ width: 260, padding: '6px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--bg)' }}
          disabled={switchingModel}
        >
          {models.map((m) => (
            <option key={m.model} value={m.model}>
              {m.label} ({m.provider})
            </option>
          ))}
        </select>
        {switchingModel && <span className="spinner" />}
        <button className="btn btn-sm btn-secondary" onClick={loadModels} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Refresh
        </button>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 600,
          background: 'var(--warning-bg)', color: '#B7950B',
        }}>
          <AlertTriangle size={12} /> Rate limit? Switch model
        </span>
      </div>

      {tab === 'test-grade' && (
        <div className="card">
          <h3><FileText size={18} /> Grade a Free-Text Essay (No Submission Required)</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Task Type</label>
              <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                <option value="TASK1_ACADEMIC">Task 1 Academic</option>
                <option value="TASK1_GENERAL">Task 1 General</option>
                <option value="TASK2_ACADEMIC">Task 2 Academic</option>
                <option value="TASK2_GENERAL">Task 2 General</option>
              </select>
            </div>
            <div className="form-group">
              <label>Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Education" />
            </div>
          </div>
          <div className="form-group">
            <label>Prompt / Question (optional — nếu có, AI chấm chính xác hơn)</label>
            <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={3} placeholder="Paste the essay question/prompt here..." />
          </div>
          <div className="form-group">
            <label>Essay Text</label>
            {showRawPrompt && response?.full_prompt ? (
              <pre style={{
                padding: 16, background: '#0f172a', borderRadius: 8,
                minHeight: 250, fontSize: 12, lineHeight: 1.5,
                fontFamily: "'Monaco','Menlo','Consolas',monospace",
                whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                color: '#e2e8f0', marginBottom: 8,
              }}>
                {response.full_prompt}
              </pre>
            ) : showRawPrompt ? (
              <div style={{
                padding: 16, background: '#1f2937', borderRadius: 8,
                minHeight: 250, fontSize: 13,
                fontFamily: "'Monaco','Menlo','Consolas',monospace",
                whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                color: '#e2e8f0', lineHeight: 1.6, marginBottom: 8,
              }}>
                <div style={{ marginBottom: 12, color: '#94a3b8', fontSize: 12 }}>
                  ⚡ Payload gốc gửi đến backend → Python service → LLM
                </div>
                <div style={{ color: '#60a5fa', fontSize: 11, marginBottom: 4 }}>
                  task_type: {taskType}
                </div>
                <div style={{ color: '#60a5fa', fontSize: 11, marginBottom: 4 }}>
                  topic: {topic || '(không có)'}
                </div>
                <div style={{ color: '#60a5fa', fontSize: 11, marginBottom: 8 }}>
                  prompt_text: {promptText ? promptText.substring(0, 80) + (promptText.length > 80 ? '...' : '') : '(không có)'}
                </div>
                <div style={{ borderTop: '1px solid #334155', paddingTop: 12, color: '#fbbf24', fontSize: 11, marginBottom: 8 }}>
                  essayText ({essayText.trim() ? essayText.trim().split(/\s+/).length : 0} words):
                </div>
                <div style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {essayText.trim() || '(trống)'}
                </div>
              </div>
            ) : (
              <textarea value={essayText} onChange={(e) => setEssayText(e.target.value)} rows={12} />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowRawPrompt(v => !v)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 5,
                  border: '1px solid #d1d5db',
                  background: showRawPrompt ? '#3b82f6' : 'transparent',
                  color: showRawPrompt ? '#fff' : '#6b7280',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Code size={13} />
                {showRawPrompt && response?.full_prompt ? 'Soạn thảo' : showRawPrompt ? 'Soạn thảo' : response?.full_prompt ? 'Xem prompt thật đã gửi LLM' : 'Xem nội dung gửi LLM'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className="btn btn-secondary"
              onClick={handleMatchSamples}
              disabled={matchLoading || !essayText.trim()}
            >
              <Database size={16} /> {matchLoading ? 'Matching...' : 'Check ChromaDB Match'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => callApi(() => writingApi.testGrade(essayText, taskType, topic, promptText), 'Test Grade Result')}
              disabled={loading}
            >
              <Send size={16} /> Grade Essay
            </button>
          </div>

              {matchResult && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} /> ChromaDB Matched Samples ({matchResult.total})
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                  — Avg similarity: {matchResult.avgSimilarity}
                </span>
              </h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Band</th>
                    <th>Similarity</th>
                    <th>Topic</th>
                    <th>Keywords</th>
                  </tr>
                </thead>
                <tbody>
                  {matchResult.samples?.map((s) => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td><span className="badge badge-info">{s.bandScore}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-bar-fill" style={{
                              width: `${Math.min(100, s.similarity * 100)}%`,
                              background: s.similarity > 0.7 ? 'var(--success)' : s.similarity > 0.5 ? 'var(--warning)' : 'var(--danger)',
                            }} />
                          </div>
                          {s.similarityPercent}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.topic || 'N/A'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {s.keywords?.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ResponseViewer response={response} error={error} loading={loading} label={label} />
        </div>
      )}

      {tab === 'submission' && (
        <div className="card">
          <h3><CheckCircle size={18} /> Grade a Submission by ID</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Submission ID</label>
              <input
                type="number"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <div className="form-group">
              <label>User ID</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="test" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="TEACHER">TEACHER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="STUDENT">STUDENT</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => callApi(() => writingApi.gradeSubmission(submissionId, userId, role), `Grade Submission #${submissionId}`)}
              disabled={loading || !submissionId}
            >
              <Send size={16} /> Grade
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => callApi(() => writingApi.getResult(submissionId), `Result for #${submissionId}`)}
              disabled={loading || !submissionId}
            >
              <RefreshCw size={16} /> Get Result
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => callApi(() => writingApi.approve(submissionId, null, 'Looks correct', 1), `Approve #${submissionId}`)}
              disabled={loading || !submissionId}
            >
              <CheckCircle size={16} /> Approve
            </button>
            <button
              className="btn btn-danger"
              onClick={() => callApi(() => writingApi.reject(submissionId, 'Inaccurate'), `Reject #${submissionId}`)}
              disabled={loading || !submissionId}
            >
              <XCircle size={16} /> Reject
            </button>
          </div>
          <ResponseViewer response={response} error={error} loading={loading} label={label} />
        </div>
      )}

      {tab === 'batch' && (
        <>
          <div className="card">
            <h3><Layers size={18} /> Start Batch Grading</h3>
            <div className="form-group">
              <label>Submission IDs (comma-separated)</label>
              <input
                value={batchIds}
                onChange={(e) => setBatchIds(e.target.value)}
                placeholder="e.g. 1,2,3,4,5"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                const ids = batchIds.split(',').map((s) => Number(s.trim())).filter(Boolean);
                callApi(() => writingApi.startBatch(ids, userId), 'Batch Grading Started');
              }}
              disabled={loading || !batchIds}
            >
              <Send size={16} /> Start Batch
            </button>
            <ResponseViewer response={response} error={error} loading={loading} label={label} />
          </div>

          <div className="card">
            <h3>Check Batch Status</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Batch ID</label>
                <input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Enter batch job ID" />
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => callApi(() => writingApi.getBatchStatus(batchId), `Batch Status: ${batchId}`)}
              disabled={loading || !batchId}
            >
              <RefreshCw size={16} /> Check Status
            </button>
            <ResponseViewer response={response} error={error} loading={loading} label={label} />
          </div>
        </>
      )}

      {tab === 'admin' && (
        <>
          <div className="card-grid">
            <div className="card">
              <h3><Plus size={18} /> Add Sample Essay</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Task Type</label>
                  <select id="sampleTask" defaultValue="TASK2_ACADEMIC">
                    <option value="TASK1_ACADEMIC">Task 1 Academic</option>
                    <option value="TASK2_ACADEMIC">Task 2 Academic</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Band Score</label>
                  <input id="sampleBand" type="number" defaultValue="7.0" step="0.5" min="0" max="9" />
                </div>
              </div>
              <div className="form-group">
                <label>Topic</label>
                <input id="sampleTopic" defaultValue="Education" />
              </div>
              <div className="form-group">
                <label>Essay Text</label>
                <textarea id="sampleEssay" rows={6} defaultValue="Some people think that..." />
              </div>
              <div className="form-group">
                <label>Source ID (optional)</label>
                <input id="sampleSource" placeholder="Unique identifier" />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const data = {
                    taskType: document.getElementById('sampleTask').value,
                    bandScore: parseFloat(document.getElementById('sampleBand').value),
                    topic: document.getElementById('sampleTopic').value,
                    essayText: document.getElementById('sampleEssay').value,
                    sourceId: document.getElementById('sampleSource').value || undefined,
                  };
                  callApi(() => writingApi.addSample(data), 'Add Sample');
                }}
                disabled={loading}
              >
                <Plus size={16} /> Add Sample
              </button>
            </div>

            <div className="card">
              <h3>Admin Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getSamplesCount(), 'Samples Count')}>
                  Get Samples Count
                </button>
                <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getStats(), 'Cache Stats')}>
                  Cache Statistics
                </button>
                <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getModels(), 'AI Models')}>
                  List AI Models
                </button>
                <button className="btn btn-danger" onClick={() => callApi(() => writingApi.reindex(), 'Reindex')}>
                  <RefreshCw size={14} /> Reindex Vector Store
                </button>
                <button className="btn btn-danger" onClick={() => callApi(() => writingApi.clearCache(), 'Clear Cache')}>
                  Clear AI Cache
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Switch AI Model</h3>
              <div className="form-group">
                <label>Model Name</label>
                <input id="switchModel" placeholder="e.g. llama-3.3-70b-versatile" />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const model = document.getElementById('switchModel').value;
                  callApi(() => writingApi.switchModel(model), `Switch to ${model}`);
                }}
                disabled={loading}
              >
                <RefreshCw size={16} /> Switch Model
              </button>
            </div>
          </div>
          <ResponseViewer response={response} error={error} loading={loading} label={label} />
        </>
      )}
    </div>
  );
}
