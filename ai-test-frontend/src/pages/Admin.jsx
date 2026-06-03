import { useState } from 'react';
import { Settings, Plus, RefreshCw, Trash2, Database, Zap } from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';

export default function Admin() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');

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

  return (
    <div className="main">
      <div className="page-header">
        <h1><Settings size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />Admin Panel</h1>
        <p>Admin controls for both AI Writing and AI Speaking services</p>
      </div>

      <div className="card-grid">
        {/* Writing Admin */}
        <div className="card">
          <h3><Database size={18} /> AI Writing Service Admin</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getConfig(), 'Writing Config')}>
              Get Config
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getSamplesCount(), 'Samples Count')}>
              Sample Count
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getStats(), 'Cache Stats')}>
              Cache Stats
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getModels(), 'Models')}>
              List Models
            </button>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <input id="switchModelInput" placeholder="New model name..." style={{ fontSize: 12 }} />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const model = document.getElementById('switchModelInput').value;
                  if (model) callApi(() => writingApi.switchModel(model), `Switch to ${model}`);
                }}
                disabled={loading}
              >
                <RefreshCw size={14} /> Switch
              </button>
            </div>

            <button className="btn btn-danger" onClick={() => callApi(() => writingApi.reindex(), 'Reindex')}>
              <RefreshCw size={14} /> Reindex Vector Store
            </button>
            <button className="btn btn-danger" onClick={() => callApi(() => writingApi.clearCache(), 'Clear Cache')}>
              <Trash2 size={14} /> Clear AI Cache
            </button>
          </div>
        </div>

        {/* Add Sample */}
        <div className="card">
          <h3><Plus size={18} /> Add Sample Essay</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Task Type</label>
              <select id="adminSampleTask" defaultValue="TASK2_ACADEMIC">
                <option value="TASK1_ACADEMIC">Task 1 Academic</option>
                <option value="TASK1_GENERAL">Task 1 General</option>
                <option value="TASK2_ACADEMIC">Task 2 Academic</option>
                <option value="TASK2_GENERAL">Task 2 General</option>
              </select>
            </div>
            <div className="form-group">
              <label>Band</label>
              <input id="adminSampleBand" type="number" defaultValue="7.0" step="0.5" />
            </div>
          </div>
          <div className="form-group">
            <label>Topic</label>
            <input id="adminSampleTopic" defaultValue="Education" />
          </div>
          <div className="form-group">
            <label>Essay</label>
            <textarea id="adminSampleEssay" rows={5} defaultValue="Some people believe that..." />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              const data = {
                taskType: document.getElementById('adminSampleTask').value,
                bandScore: parseFloat(document.getElementById('adminSampleBand').value),
                topic: document.getElementById('adminSampleTopic').value,
                essayText: document.getElementById('adminSampleEssay').value,
              };
              callApi(() => writingApi.addSample(data), 'Add Sample');
            }}
            disabled={loading}
          >
            <Plus size={16} /> Add Sample
          </button>
        </div>

        {/* Speaking Admin */}
        <div className="card">
          <h3><Zap size={18} /> AI Speaking Service Admin</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getConfig(), 'Speaking Config')}>
              Get Config
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getRubric(), 'Rubric')}>
              IELTS Rubric
            </button>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getCacheStats(), 'Cache Stats')}>
              Cache Stats
            </button>
            <button className="btn btn-danger" onClick={() => callApi(() => speakingApi.clearCache(), 'Clear Cache')}>
              <Trash2 size={14} /> Clear Cache
            </button>
            <button className="btn btn-danger" onClick={() => callApi(() => speakingApi.resetQuota(), 'Reset Quota')}>
              <RefreshCw size={14} /> Reset All Quotas
            </button>
          </div>
        </div>
      </div>

      <ResponseViewer response={response} error={error} loading={loading} label={label} />
    </div>
  );
}
