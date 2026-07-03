import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import agentApi from '../services/agentApi';
import { Bot, BarChart3, FileText, Mail, Search, Loader2 } from 'lucide-react';

const AGENT_ICONS = {
  content: { icon: <FileText size={24} />, color: '#7c3aed', bg: '#f5f3ff' },
  info: { icon: <Search size={24} />, color: '#2563eb', bg: '#eff6ff' },
  report: { icon: <BarChart3 size={24} />, color: '#059669', bg: '#ecfdf5' },
  email: { icon: <Mail size={24} />, color: '#d97706', bg: '#fffbeb' },
};

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await agentApi.listAgents();
      setAgents(res.data?.agents || []);
    } catch (e) {
      console.error('Failed to load agents', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || queryLoading) return;
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const res = await agentApi.query(query);
      const data = res.data;
      setQueryResult({ ...data, message: query });
      if (data.session_id) {
        let count = 0;
        const timer = setInterval(async () => {
          count++;
          try {
            const taskRes = await agentApi.getTasks(data.session_id);
            setTasks(taskRes.data?.tasks || []);
            const allDone = (taskRes.data?.tasks || []).every(t => t.status === 'completed' || t.status === 'failed');
            if (allDone || count > 30) clearInterval(timer);
          } catch (e) { /* ignore */ }
        }, 1500);
      }
    } catch (e) {
      setQueryResult({ error: e.message });
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <AdminLayout title="AI Agent Dashboard" subtitle="Quản lý và giám sát Multi-Agent System">
      {loading ? (
        <div className="admin-loading"><Loader2 size={24} className="admin-spin" /> Đang tải...</div>
      ) : (
        <div className="admin-cards-grid">
          {agents.map(agent => {
            const cfg = AGENT_ICONS[agent.name] || { icon: <Bot size={24} />, color: '#64748b', bg: '#f8fafc' };
            return (
              <div key={agent.name} className="admin-card" style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>{agent.name}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0', lineHeight: 1.4 }}>{agent.description}</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {agent.capabilities?.slice(0, 4).map(c => (
                      <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500, background: cfg.bg, color: cfg.color }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="admin-panel" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Query Simulator</h3>
        <div className="admin-filter-row">
          <input
            className="admin-input"
            style={{ flex: 1 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQuery(); }}
            placeholder="Nhập yêu cầu để test agent..."
            disabled={queryLoading}
          />
          <button className="admin-btn primary" onClick={handleQuery} disabled={queryLoading || !query.trim()}>
            {queryLoading ? <Loader2 size={18} className="admin-spin" /> : <Bot size={18} />}
            Gửi
          </button>
        </div>

        {queryResult && (
          <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 14, fontSize: 13 }}>
            <p style={{ color: '#475569', margin: 0 }}>
              Intent: <strong>{queryResult.intent || 'N/A'}</strong> |
              Agents: <strong>{(queryResult.agents || []).join(', ') || 'N/A'}</strong> |
              Session: <strong>{queryResult.session_id || 'N/A'}</strong>
            </p>
            {queryResult.error && <p style={{ color: '#dc2626' }}>Lỗi: {queryResult.error}</p>}
          </div>
        )}

        {tasks.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Tasks</h4>
            {tasks.map(task => (
              <div key={task.id} style={{ padding: 12, background: '#f8fafc', borderRadius: 14, marginBottom: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`admin-pill ${task.status === 'completed' ? 'success' : task.status === 'processing' ? 'neutral' : 'warn'}`}>
                    {task.status}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{task.agent_type}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{task.intent}</span>
                </div>
                {task.result?.response && (
                  <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, margin: 0 }}>{task.result.response.slice(0, 300)}</p>
                )}
                {task.error && <p style={{ color: '#dc2626', fontSize: 13 }}>Lỗi: {task.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
