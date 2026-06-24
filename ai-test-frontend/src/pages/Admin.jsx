import { useState, useEffect } from 'react';
import { Settings, Plus, RefreshCw, Trash2, Database, Zap, Cpu, Key, Check, X, FileText, Save, Undo2 } from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';

const SKILLS = [
  { value: 'writing', label: 'AI Writing' },
  { value: 'speaking', label: 'AI Speaking' },
];

export default function Admin() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');

  // Model management
  const [models, setModels] = useState([]);
  const [skillModels, setSkillModels] = useState({});
  const [selectedSkill, setSelectedSkill] = useState('writing');
  const [selectedModel, setSelectedModel] = useState('');

  // Key management
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('groq');
  const [newKeyLabel, setNewKeyLabel] = useState('');

  // Prompt management
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);

  async function callApi(fn, lbl) {
    setLoading(true);
    setError(null);
    setResponse(null);
    setLabel(lbl);
    try {
      const res = await fn();
      setResponse(res.data);
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadModels() {
    try {
      const res = await writingApi.getModels();
      setModels(res.data?.models || []);
    } catch { /* ignore */ }
  }

  async function loadSkillConfig() {
    try {
      const res = await writingApi.getConfig();
      setSkillModels(res.data?.skillConfig || {});
      if (res.data?.model) setSelectedModel(res.data.model);
    } catch { /* ignore */ }
  }

  async function loadKeys() {
    try {
      const res = await fetch('/api/admin/ai/keys');
      setKeys((await res.json()).keys || []);
    } catch { /* ignore */ }
  }

  async function loadPrompts() {
    try {
      const res = await fetch('/api/admin/ai/prompts');
      setPrompts((await res.json()).templates || []);
    } catch { /* ignore */ }
  }

  async function loadPromptContent(name) {
    try {
      const res = await fetch(`/api/admin/ai/prompts/${name}`);
      const data = await res.json();
      setSelectedPrompt(data);
      setPromptContent(data.content || '');
      setPromptDirty(false);
    } catch { /* ignore */ }
  }

  async function handleSavePrompt() {
    if (!selectedPrompt) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai/prompts/${selectedPrompt.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: promptContent }),
      });
      const data = await res.json();
      setResponse(data);
      setPromptDirty(false);
      loadPrompts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPrompt() {
    if (!selectedPrompt || !confirm('Reset to default?')) return;
    try {
      const res = await fetch(`/api/admin/ai/prompts/${selectedPrompt.name}/reset`, { method: 'POST' });
      const data = await res.json();
      setResponse(data);
      loadPromptContent(selectedPrompt.name);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadModels(); loadSkillConfig(); loadKeys(); loadPrompts(); }, []);

  async function handleSetSkillModel() {
    if (!selectedModel) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai/skill-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: selectedSkill, model: selectedModel }),
      });
      const data = await res.json();
      setResponse(data);
      setSkillModels(p => ({ ...p, [selectedSkill]: selectedModel }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKey() {
    if (!newKey.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), provider: newKeyProvider, label: newKeyLabel.trim() }),
      });
      const data = await res.json();
      setResponse(data);
      setNewKey(''); setNewKeyLabel('');
      loadKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveKey(keyId) {
    if (!confirm('Remove this key?')) return;
    try {
      const res = await fetch(`/api/admin/ai/keys/${keyId}`, { method: 'DELETE' });
      setResponse(await res.json());
      loadKeys();
    } catch (err) { setError(err.message); }
  }

  const promptEditorHeight = selectedPrompt?.name?.endsWith('.json') ? 300 : 500;

  return (
    <div className="main">
      <div className="page-header">
        <h1><Settings size={28} /> Admin Panel</h1>
        <p>Configure AI models, API keys, prompt templates, and manage services</p>
      </div>

      <div className="card-grid">
        {/* MODEL CONFIG */}
        <div className="card">
          <h3><Cpu size={18} /> Model Configuration Per Skill</h3>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Skill</label>
              <select value={selectedSkill} onChange={e => {
                setSelectedSkill(e.target.value);
                setSelectedModel(skillModels[e.target.value] || '');
              }}>
                {SKILLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label>Model</label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                {models.length === 0 && <option value="">Loading...</option>}
                {models.filter(m => !m.id.includes('whisper')).map(m => (
                  <option key={m.id} value={m.id}>{m.id} ({m.owned_by})</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSetSkillModel} disabled={loading || !selectedModel}>
              <Check size={14} /> Apply
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadModels}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: '#64748B' }}>
            {Object.entries(skillModels).map(([s, m]) => (
              <span key={s} style={{ marginRight: 12 }}><strong>{s}:</strong> {m}</span>
            ))}
            {!Object.keys(skillModels).length && <span>No custom config — using default model</span>}
          </div>
        </div>

        {/* API KEYS */}
        <div className="card">
          <h3><Key size={18} /> API Key Management</h3>
          <div style={{ marginBottom: 12, fontSize: 13, color: '#64748B' }}>
            <div className="form-row" style={{ gap: 8 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <input value={newKey} onChange={e => setNewKey(e.target.value)}
                  placeholder="sk-..." style={{ fontSize: 13, fontFamily: 'monospace' }} />
              </div>
              <div className="form-group" style={{ width: 100, margin: 0 }}>
                <select value={newKeyProvider} onChange={e => setNewKeyProvider(e.target.value)}>
                  <option value="groq">Groq</option>
                  <option value="nvidia">NVIDIA</option>
                </select>
              </div>
            </div>
            <div className="form-row" style={{ gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <input value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="Label" style={{ fontSize: 13 }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddKey} disabled={loading || !newKey.trim()}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 160, overflow: 'auto' }}>
            {!keys.length && <div style={{ fontSize: 13, color: '#94A3B8', padding: 8 }}>No keys</div>}
            {keys.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                <span className={`badge ${k.provider === 'groq' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{k.provider}</span>
                <code style={{ fontSize: 12, color: '#475569' }}>{k.key}</code>
                <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>{k.label || k.source || ''}</span>
                {k.source !== 'env' && (
                  <button className="btn-icon" onClick={() => handleRemoveKey(k.id)} style={{ color: '#EF4444' }} title="Remove">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PROMPT MANAGEMENT */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3><FileText size={18} /> Prompt Template Management</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Templates</div>
              {prompts.map(p => (
                <div key={p.name} onClick={() => loadPromptContent(p.name)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    background: selectedPrompt?.name === p.name ? '#EEF2FF' : 'transparent',
                    color: selectedPrompt?.name === p.name ? '#4F46E5' : '#334155',
                    fontWeight: selectedPrompt?.name === p.name ? 600 : 400,
                    marginBottom: 4, border: '1px solid', borderColor: selectedPrompt?.name === p.name ? '#C7D2FE' : 'transparent',
                  }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.lines} lines · {(p.size / 1024).toFixed(1)}KB</div>
                </div>
              ))}
              {!prompts.length && <div style={{ fontSize: 13, color: '#94A3B8' }}>No templates</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedPrompt ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{selectedPrompt.name}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{selectedPrompt.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-secondary" onClick={handleResetPrompt} title="Reset to default">
                        <Undo2 size={12} /> Reset
                      </button>
                      <button className={`btn btn-sm ${promptDirty ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={handleSavePrompt} disabled={loading || !promptDirty}>
                        <Save size={12} /> {promptDirty ? 'Save*' : 'Saved'}
                      </button>
                    </div>
                  </div>
                  <textarea value={promptContent} onChange={e => { setPromptContent(e.target.value); setPromptDirty(true); }}
                    style={{
                      width: '100%', minHeight: promptEditorHeight, padding: 14, border: '1.5px solid #E2E8F0',
                      borderRadius: 10, fontSize: 13, fontFamily: promptEditorHeight < 400 ? 'monospace' : 'JetBrains Mono, monospace',
                      lineHeight: 1.6, outline: 'none', resize: 'vertical', background: '#FAFBFC', color: '#0F172A',
                    }} />
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                    {promptContent.length} chars · {promptContent.split('\n').length} lines
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#94A3B8', fontSize: 14 }}>
                  Select a template from the left to view/edit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WRITING ADMIN */}
        <div className="card">
          <h3><Database size={18} /> AI Writing Service</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getConfig(), 'Config')}>Get Config</button>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getStats(), 'Stats')}>Cache Stats</button>
            <button className="btn btn-secondary" onClick={() => callApi(() => writingApi.getSamplesCount(), 'Samples')}>Sample Count</button>
            <button className="btn btn-danger" onClick={() => callApi(() => writingApi.reindex(), 'Reindex')}><RefreshCw size={14} /> Reindex</button>
            <button className="btn btn-danger" onClick={() => callApi(() => writingApi.clearCache(), 'Clear')}><Trash2 size={14} /> Clear Cache</button>
          </div>
        </div>

        {/* ADD SAMPLE */}
        <div className="card">
          <h3><Plus size={18} /> Add Sample Essay</h3>
          <div className="form-row">
            <div className="form-group"><label>Task Type</label><select id="adminSampleTask" defaultValue="TASK2_ACADEMIC">
              <option value="TASK1_ACADEMIC">Task 1 Academic</option>
              <option value="TASK1_GENERAL">Task 1 General</option>
              <option value="TASK2_ACADEMIC">Task 2</option>
            </select></div>
            <div className="form-group"><label>Band</label><input id="adminSampleBand" type="number" defaultValue="7.0" step="0.5" /></div>
          </div>
          <div className="form-group"><label>Topic</label><input id="adminSampleTopic" defaultValue="Education" /></div>
          <div className="form-group"><label>Essay</label><textarea id="adminSampleEssay" rows={4} /></div>
          <button className="btn btn-primary" onClick={() => {
            callApi(() => writingApi.addSample({
              taskType: document.getElementById('adminSampleTask').value,
              bandScore: parseFloat(document.getElementById('adminSampleBand').value),
              topic: document.getElementById('adminSampleTopic').value,
              essayText: document.getElementById('adminSampleEssay').value,
            }), 'Add Sample');
          }} disabled={loading}><Plus size={16} /> Add</button>
        </div>

        {/* SPEAKING ADMIN */}
        <div className="card">
          <h3><Zap size={18} /> AI Speaking Service</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getConfig(), 'Config')}>Get Config</button>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getRubric(), 'Rubric')}>IELTS Rubric</button>
            <button className="btn btn-secondary" onClick={() => callApi(() => speakingApi.getCacheStats(), 'Stats')}>Cache Stats</button>
            <button className="btn btn-danger" onClick={() => callApi(() => speakingApi.clearCache(), 'Clear')}><Trash2 size={14} /> Clear Cache</button>
          </div>
        </div>
      </div>

      <ResponseViewer response={response} error={error} loading={loading} label={label} />
    </div>
  );
}
