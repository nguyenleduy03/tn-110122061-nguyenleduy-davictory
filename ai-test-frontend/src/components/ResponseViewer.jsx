import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ai_test_history';

export default function ResponseViewer({ response, error, loading, label }) {
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="response-viewer">
        <div className="response-viewer-header">
          <span>{label || 'Response'}</span>
          <span className="spinner" />
        </div>
        <code>Loading...</code>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-viewer">
        <div className="response-viewer-header" style={{ background: '#3d1f1f' }}>
          <span>Error</span>
          <span className="badge badge-danger">FAILED</span>
        </div>
        <code style={{ color: '#f87171' }}>{error}</code>
      </div>
    );
  }

  if (!response) return null;

  const data = typeof response === 'object' ? response : { data: response };
  const json = JSON.stringify(data, null, 2);

  return (
    <div className="response-viewer">
      <div className="response-viewer-header">
        <span>{label || 'Response'}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-success">{response.status || 'OK'}</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#a0a0b0', borderColor: '#3d3d4f', background: 'transparent' }}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>
      {!collapsed && <code>{json}</code>}
    </div>
  );
}

export function useHistoryLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLogs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const addLog = (entry) => {
    const newEntry = { ...entry, time: new Date().toISOString() };
    const updated = [newEntry, ...logs].slice(0, 100);
    setLogs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { logs, addLog, clearLogs };
}
