import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
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

  useEffect(() => {
    loadData();
  }, []);

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

      // Poll for results
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
    <div style={styles.container}>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.header}>
          <Bot size={32} color="#2563eb" />
          <div>
            <h1 style={styles.title}>AI Agent Dashboard</h1>
            <p style={styles.sub}>Quản lý và giám sát Multi-Agent System</p>
          </div>
        </div>

        {/* Agent Cards */}
        {loading ? (
          <div style={styles.loading}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải...</div>
        ) : (
          <div style={styles.grid}>
            {agents.map(agent => {
              const cfg = AGENT_ICONS[agent.name] || { icon: <Bot size={24} />, color: '#64748b', bg: '#f8fafc' };
              return (
                <div key={agent.name} style={{ ...styles.card, borderLeftColor: cfg.color }}>
                  <div style={{ ...styles.cardIcon, background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.cardName}>{agent.name}</h3>
                    <p style={styles.cardDesc}>{agent.description}</p>
                    <div style={styles.cardCaps}>
                      {agent.capabilities?.slice(0, 4).map(c => (
                        <span key={c} style={{ ...styles.capBadge, background: cfg.bg, color: cfg.color }}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Query Simulator */}
        <div style={styles.querySection}>
          <h2 style={styles.sectionTitle}>Query Simulator</h2>
          <div style={styles.queryInput}>
            <input
              style={styles.input}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuery(); }}
              placeholder="Nhập yêu cầu để test agent..."
              disabled={queryLoading}
            />
            <button style={styles.queryBtn} onClick={handleQuery} disabled={queryLoading || !query.trim()}>
              {queryLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Bot size={18} />}
              Gửi
            </button>
          </div>

          {queryResult && (
            <div style={styles.resultBox}>
              <p style={styles.resultMeta}>
                Intent: <strong>{queryResult.intent || 'N/A'}</strong> |
                Agents: <strong>{(queryResult.agents || []).join(', ') || 'N/A'}</strong> |
                Session: <strong>{queryResult.session_id || 'N/A'}</strong>
              </p>
              {queryResult.error && <p style={{ color: '#dc2626' }}>❌ {queryResult.error}</p>}
            </div>
          )}

          {tasks.length > 0 && (
            <div style={styles.tasksSection}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Tasks</h3>
              {tasks.map(task => (
                <div key={task.id} style={styles.taskCard}>
                  <div style={styles.taskHeader}>
                    <span style={{
                      ...styles.taskBadge,
                      background: task.status === 'completed' ? '#d1fae5' : task.status === 'processing' ? '#dbeafe' : '#fef3c7',
                      color: task.status === 'completed' ? '#059669' : task.status === 'processing' ? '#2563eb' : '#d97706',
                    }}>
                      {task.status}
                    </span>
                    <span style={styles.taskAgent}>{task.agent_type}</span>
                    <span style={styles.taskIntent}>{task.intent}</span>
                  </div>
                  {task.result?.response && (
                    <p style={styles.taskResponse}>{task.result.response.slice(0, 300)}</p>
                  )}
                  {task.error && <p style={{ color: '#dc2626', fontSize: 13 }}>❌ {task.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f8fafc' },
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 16px' },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { fontSize: 14, color: '#64748b', margin: '4px 0 0' },
  loading: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 40, color: '#64748b' },
  grid: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginBottom: 32 },
  card: {
    background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
    borderLeft: '4px solid', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex', gap: 14,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardName: { fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0, textTransform: 'capitalize' },
  cardDesc: { fontSize: 13, color: '#64748b', margin: '4px 0', lineHeight: 1.4 },
  cardCaps: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 },
  capBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500 },
  querySection: { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 16 },
  queryInput: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' },
  queryBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px',
    borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  resultBox: { marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 13 },
  resultMeta: { color: '#475569', margin: 0 },
  tasksSection: { marginTop: 16 },
  taskCard: {
    padding: 12, background: '#f8fafc', borderRadius: 10, marginBottom: 8,
    border: '1px solid #e2e8f0',
  },
  taskHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  taskBadge: { padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  taskAgent: { fontSize: 13, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' },
  taskIntent: { fontSize: 12, color: '#64748b' },
  taskResponse: { fontSize: 13, color: '#334155', lineHeight: 1.5, margin: 0 },
};
