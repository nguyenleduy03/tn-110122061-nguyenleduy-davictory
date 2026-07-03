import { useState, useEffect } from 'react';
import {
  Settings, Plus, RefreshCw, Trash2, Database, Zap, Cpu, Key, Check, X, FileText, Save, Undo2, Server
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';

const SKILLS = [
  { value: 'writing', label: 'AI Writing' },
  { value: 'speaking', label: 'AI Speaking' },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('model');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [models, setModels] = useState([]);
  const [skillModels, setSkillModels] = useState({});
  const [selectedSkill, setSelectedSkill] = useState('writing');
  const [selectedModel, setSelectedModel] = useState('');
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('groq');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);

  async function callApi(fn, lbl) {
    setLoading(true); setError(null); setResponse(null); setLabel(lbl);
    try { const res = await fn(); setResponse(res.data); }
    catch (err) { setError(err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message); }
    finally { setLoading(false); }
  }

  async function loadModels() {
    try { const res = await writingApi.getModels(); setModels(res.data?.models || []); } catch {}
  }
  async function loadSkillConfig() {
    try { const res = await writingApi.getConfig(); setSkillModels(res.data?.skillConfig || {}); if (res.data?.model) setSelectedModel(res.data.model); } catch {}
  }
  async function loadKeys() {
    try { const res = await fetch('/api/admin/ai/keys'); setKeys((await res.json()).keys || []); } catch {}
  }
  async function loadPrompts() {
    try { const res = await fetch('/api/admin/ai/prompts'); setPrompts((await res.json()).templates || []); } catch {}
  }
  async function loadPromptContent(name) {
    try { const res = await fetch(`/api/admin/ai/prompts/${name}`); const data = await res.json(); setSelectedPrompt(data); setPromptContent(data.content || ''); setPromptDirty(false); } catch {}
  }
  async function handleSavePrompt() {
    if (!selectedPrompt) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai/prompts/${selectedPrompt.name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: promptContent }) });
      const data = await res.json(); setResponse(data); setPromptDirty(false); loadPrompts();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  async function handleResetPrompt() {
    if (!selectedPrompt || !confirm('Reset to default?')) return;
    try { const res = await fetch(`/api/admin/ai/prompts/${selectedPrompt.name}/reset`, { method: 'POST' }); const data = await res.json(); setResponse(data); loadPromptContent(selectedPrompt.name); } catch (err) { setError(err.message); }
  }
  useEffect(() => { loadModels(); loadSkillConfig(); loadKeys(); loadPrompts(); }, []);

  async function handleSetSkillModel() {
    if (!selectedModel) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai/skill-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill: selectedSkill, model: selectedModel }) });
      const data = await res.json(); setResponse(data); setSkillModels(p => ({ ...p, [selectedSkill]: selectedModel }));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  async function handleAddKey() {
    if (!newKey.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: newKey.trim(), provider: newKeyProvider, label: newKeyLabel.trim() }) });
      const data = await res.json(); setResponse(data); setNewKey(''); setNewKeyLabel(''); loadKeys();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  async function handleRemoveKey(keyId) {
    if (!confirm('Remove this key?')) return;
    try { const res = await fetch(`/api/admin/ai/keys/${keyId}`, { method: 'DELETE' }); setResponse(await res.json()); loadKeys(); } catch (err) { setError(err.message); }
  }

  const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', background: '#ffffff', transition: 'border-color 0.2s' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };

  const tabsConfig = [
    { id: 'model', label: 'Cấu hình Model', icon: Cpu, subtitle: 'Quản lý cấu hình LLM cho từng kỹ năng IELTS' },
    { id: 'keys', label: 'Quản lý API Key', icon: Key, subtitle: 'Quản lý mã thông báo kết nối API của nhà cung cấp' },
    { id: 'prompts', label: 'Prompt Templates', icon: FileText, subtitle: 'Chỉnh sửa mẫu chỉ dẫn hệ thống (System Prompts) cho AI' },
    { id: 'services', label: 'Dịch vụ AI', icon: Server, subtitle: 'Công cụ quản trị hệ thống, bộ nhớ cache và re-index' },
    { id: 'sample', label: 'Thêm Sample Essay', icon: Plus, subtitle: 'Đăng tải các bài viết mẫu IELTS chuẩn hóa làm ngữ cảnh' },
  ];

  return (
    <div>
      {/* Title block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '24px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#f5f3ff',
          color: '#4f46e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Settings size={22} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Admin Panel</h1>
          <p style={{ margin: '2px 0 0', fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
            Cấu hình LLM Models, quản lý API Keys, hệ thống Prompt Templates và các dịch vụ AI.
          </p>
        </div>
      </div>

      {/* Main Tab Area */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left tabs menu */}
        <div style={{ width: '220px', flexShrink: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
          {tabsConfig.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setResponse(null);
                  setError(null);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  border: 'none',
                  background: isActive ? '#f5f3ff' : 'transparent',
                  color: isActive ? '#4f46e5' : '#64748b',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  marginBottom: '4px'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right content panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Tab Panel Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeTab === 'model' && <Cpu size={16} color="#4f46e5" />}
              {activeTab === 'keys' && <Key size={16} color="#4f46e5" />}
              {activeTab === 'prompts' && <FileText size={16} color="#4f46e5" />}
              {activeTab === 'services' && <Server size={16} color="#4f46e5" />}
              {activeTab === 'sample' && <Plus size={16} color="#4f46e5" />}
              {tabsConfig.find(t => t.id === activeTab)?.label}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '24px', fontWeight: 500 }}>
              {tabsConfig.find(t => t.id === activeTab)?.subtitle}
            </p>

            {/* Render Tab Contents */}
            {activeTab === 'model' && (
              <div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Kỹ năng (Skill)</label>
                    <select
                      value={selectedSkill}
                      onChange={e => {
                        setSelectedSkill(e.target.value);
                        setSelectedModel(skillModels[e.target.value] || '');
                      }}
                      style={inputStyle}
                    >
                      {SKILLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Mô hình (Model)</label>
                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={inputStyle}>
                      {models.length === 0 && <option value="">Loading...</option>}
                      {models.filter(m => !m.id.includes('whisper')).map(m => <option key={m.id} value={m.id}>{m.id} ({m.owned_by})</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={handleSetSkillModel}
                    disabled={loading || !selectedModel}
                    style={{
                      padding: '10px 18px', borderRadius: 8, background: '#4f46e5', color: '#fff',
                      border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 4px 10px rgba(79,70,229,0.15)'
                    }}
                  >
                    <Check size={14} /> Áp dụng cấu hình
                  </button>
                  <button
                    onClick={loadModels}
                    style={{
                      padding: '10px 18px', borderRadius: 8, background: '#ffffff', color: '#475569',
                      border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <RefreshCw size={14} /> Làm mới mô hình
                  </button>
                </div>

                <div style={{
                  padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, fontSize: '12.5px', color: '#475569'
                }}>
                  <strong style={{ display: 'block', marginBottom: 6, color: '#0f172a' }}>Cấu hình hiện hành:</strong>
                  <div style={{ display: 'flex', gap: 24 }}>
                    {Object.entries(skillModels).map(([s, m]) => (
                      <span key={s}>
                        <strong style={{ textTransform: 'capitalize', color: '#4f46e5' }}>{s}:</strong> {m}
                      </span>
                    ))}
                    {!Object.keys(skillModels).length && <span>Không có cấu hình tùy chỉnh — Đang sử dụng mô hình mặc định</span>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Mã khóa API (API Key)</label>
                    <input
                      value={newKey}
                      onChange={e => setNewKey(e.target.value)}
                      placeholder="Nhập mã khóa (sk-...)"
                      style={{ ...inputStyle, fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ width: '120px' }}>
                    <label style={labelStyle}>Nhà cung cấp</label>
                    <select value={newKeyProvider} onChange={e => setNewKeyProvider(e.target.value)} style={inputStyle}>
                      <option value="groq">Groq</option>
                      <option value="nvidia">NVIDIA</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Nhãn phân biệt (Label)</label>
                    <input
                      value={newKeyLabel}
                      onChange={e => setNewKeyLabel(e.target.value)}
                      placeholder="Ví dụ: Dev Key"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={handleAddKey}
                      disabled={loading || !newKey.trim()}
                      style={{
                        padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: '#fff',
                        border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, height: '42px',
                        boxShadow: '0 4px 10px rgba(79,70,229,0.15)'
                      }}
                    >
                      <Plus size={15} /> Thêm Key mới
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Danh sách API Keys hoạt động
                </h3>
                <div style={{
                  maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: '4px 12px', background: '#f8fafc'
                }}>
                  {!keys.length && <div style={{ fontSize: '13px', color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>Không có API Keys nào được tìm thấy</div>}
                  {keys.map(k => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 99, fontSize: '10.5px', fontWeight: 700,
                        background: k.provider === 'groq' ? '#eef2ff' : '#fff7ed',
                        color: k.provider === 'groq' ? '#4f46e5' : '#d97706'
                      }}>
                        {k.provider}
                      </span>
                      <code style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>{k.key}</code>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto', fontWeight: 500 }}>{k.label || k.source || ''}</span>
                      {k.source !== 'env' && (
                        <button
                          onClick={() => handleRemoveKey(k.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                          title="Xóa"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'prompts' && (
              <div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  {/* Prompt sidebar list */}
                  <div style={{ width: '200px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Danh sách mẫu</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {prompts.map(p => (
                        <div
                          key={p.name}
                          onClick={() => loadPromptContent(p.name)}
                          style={{
                            padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '12.5px',
                            background: selectedPrompt?.name === p.name ? '#f5f3ff' : 'transparent',
                            color: selectedPrompt?.name === p.name ? '#4f46e5' : '#475569',
                            fontWeight: selectedPrompt?.name === p.name ? 700 : 500,
                            border: '1px solid',
                            borderColor: selectedPrompt?.name === p.name ? '#c7d2fe' : 'transparent',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            if (selectedPrompt?.name !== p.name) {
                              e.currentTarget.style.background = '#f8fafc';
                            }
                          }}
                          onMouseLeave={e => {
                            if (selectedPrompt?.name !== p.name) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>{p.lines} dòng · {(p.size / 1024).toFixed(1)}KB</div>
                        </div>
                      ))}
                    </div>
                    {!prompts.length && <div style={{ fontSize: '12px', color: '#94a3b8', padding: 8 }}>Không có template</div>}
                  </div>

                  {/* Prompt text editor */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {selectedPrompt ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>{selectedPrompt.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{selectedPrompt.description}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={handleResetPrompt}
                              style={{
                                padding: '6px 12px', borderRadius: 6, background: '#ffffff', color: '#475569',
                                border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <Undo2 size={12} /> Khôi phục
                            </button>
                            <button
                              onClick={handleSavePrompt}
                              disabled={loading || !promptDirty}
                              style={{
                                padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: promptDirty ? '#4f46e5' : '#ffffff',
                                color: promptDirty ? '#ffffff' : '#64748b',
                                border: promptDirty ? 'none' : '1px solid #cbd5e1',
                                boxShadow: promptDirty ? '0 4px 8px rgba(79,70,229,0.15)' : 'none'
                              }}
                            >
                              <Save size={12} /> {promptDirty ? 'Lưu*' : 'Đã lưu'}
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={promptContent}
                          onChange={e => {
                            setPromptContent(e.target.value);
                            setPromptDirty(true);
                          }}
                          style={{
                            width: '100%', minHeight: '280px', padding: 14, border: '1px solid #cbd5e1',
                            borderRadius: 8, fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
                            lineHeight: 1.6, outline: 'none', resize: 'vertical', background: '#fafbfc', color: '#0f172a'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6, textAlign: 'right', fontWeight: 500 }}>
                          {promptContent.length} ký tự · {promptContent.split('\n').length} dòng
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', color: '#94a3b8', fontSize: '13px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                        Chọn một prompt template ở danh sách bên trái để chỉnh sửa
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* AI Writing */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '16px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f5f3ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Database size={14} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>AI Writing Actions</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'Get Config', fn: () => writingApi.getConfig() },
                        { label: 'Cache Stats', fn: () => writingApi.getStats() },
                        { label: 'Sample Count', fn: () => writingApi.getSamplesCount() },
                      ].map(b => (
                        <button key={b.label} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'} onClick={() => callApi(b.fn, b.label)}>{b.label}</button>
                      ))}
                      <button style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.9} onMouseLeave={e => e.currentTarget.style.opacity = 1} onClick={() => callApi(() => writingApi.reindex(), 'Reindex')}>
                        <RefreshCw size={13} /> Reindex Database
                      </button>
                      <button style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.9} onMouseLeave={e => e.currentTarget.style.opacity = 1} onClick={() => callApi(() => writingApi.clearCache(), 'Clear Cache')}>
                        <Trash2 size={13} /> Clear Cache
                      </button>
                    </div>
                  </div>

                  {/* AI Speaking */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '16px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Server size={14} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>AI Speaking Actions</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'Get Config', fn: () => speakingApi.getConfig() },
                        { label: 'IELTS Rubric', fn: () => speakingApi.getRubric() },
                        { label: 'Cache Stats', fn: () => speakingApi.getCacheStats() },
                      ].map(b => (
                        <button key={b.label} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'} onClick={() => callApi(b.fn, b.label)}>{b.label}</button>
                      ))}
                      <button style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.9} onMouseLeave={e => e.currentTarget.style.opacity = 1} onClick={() => callApi(() => speakingApi.clearCache(), 'Clear Cache')}>
                        <Trash2 size={13} /> Clear Cache
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sample' && (
              <div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Task Type</label>
                    <select id="adminSampleTask" style={inputStyle} defaultValue="TASK2_ACADEMIC">
                      <option value="TASK1_ACADEMIC">Task 1 Academic</option>
                      <option value="TASK1_GENERAL">Task 1 General</option>
                      <option value="TASK2_ACADEMIC">Task 2 Academic</option>
                    </select>
                  </div>
                  <div style={{ width: '120px' }}>
                    <label style={labelStyle}>Điểm số (Band)</label>
                    <input id="adminSampleBand" type="number" defaultValue="7.0" step="0.5" style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Chủ đề (Topic)</label>
                  <input id="adminSampleTopic" defaultValue="Education" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Nội dung bài viết mẫu (Essay)</label>
                  <textarea id="adminSampleEssay" rows={6} style={{ ...inputStyle, resize: 'vertical', minHeight: '120px', lineHeight: 1.6 }} placeholder="Dán nội dung bài mẫu vào đây..." />
                </div>

                <button
                  onClick={() => {
                    callApi(() => writingApi.addSample({
                      taskType: document.getElementById('adminSampleTask').value,
                      bandScore: parseFloat(document.getElementById('adminSampleBand').value),
                      topic: document.getElementById('adminSampleTopic').value,
                      essayText: document.getElementById('adminSampleEssay').value,
                    }), 'Add Sample');
                  }}
                  disabled={loading}
                  style={{
                    padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 10px rgba(79,70,229,0.15)'
                  }}
                >
                  <Plus size={15} /> Thêm bài viết mẫu
                </button>
              </div>
            )}
          </div>

          {/* API Response Log Stream */}
          <ResponseViewer response={response} error={error} loading={loading} label={label} />
        </div>
      </div>
    </div>
  );
}
