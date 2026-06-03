import { useState } from 'react';
import { Terminal, Send, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useHistoryLog } from '../components/ResponseViewer';

export default function Console() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/api/admin/ai/config');
  const [body, setBody] = useState('');
  const [headers, setHeaders] = useState('{\n  "X-User-Id": "test",\n  "X-User-Role": "ADMIN"\n}');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState(null);
  const { logs, addLog, clearLogs } = useHistoryLog();

  async function sendRequest() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setStatusCode(null);

    try {
      let parsedHeaders = {};
      let parsedBody = null;
      try { parsedHeaders = JSON.parse(headers); } catch { /* ignore */ }
      try { if (body.trim()) parsedBody = JSON.parse(body); } catch { /* ignore */ }

      const res = await axios({
        method: method.toLowerCase(),
        url,
        headers: parsedHeaders,
        data: parsedBody,
      });

      setResponse(res.data);
      setStatusCode(res.status);
      addLog({
        method,
        url,
        status: res.status,
        body: parsedBody,
        response: res.data,
      });
    } catch (err) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(msg);
      setStatusCode(err.response?.status);
      addLog({
        method,
        url,
        status: err.response?.status,
        error: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main">
      <div className="page-header">
        <h1><Terminal size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />API Console</h1>
        <p>Direct HTTP requests to any AI service endpoint</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
            <label>Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/api/ai/writing/test-grade" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={sendRequest} disabled={loading}>
              {loading ? <span className="spinner" /> : <Send size={16} />}
              Send
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Headers (JSON)</label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              rows={4}
              style={{ fontSize: 12 }}
            />
          </div>
          {method !== 'GET' && (
            <div className="form-group">
              <label>Body (JSON)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{ fontSize: 12 }}
                placeholder='{"essayText": "Hello world"}'
              />
            </div>
          )}
        </div>
      </div>

      {(response || error || loading) && (
        <div className="card">
          <h3>
            Response
            {statusCode && (
              <span className={`badge ${statusCode < 400 ? 'badge-success' : 'badge-danger'}`}>
                {statusCode}
              </span>
            )}
          </h3>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
              <span className="spinner" /> Sending request...
            </div>
          ) : error ? (
            <div className="response-viewer">
              <div className="response-viewer-header" style={{ background: '#3d1f1f' }}>
                <span>Error</span>
              </div>
              <code style={{ color: '#f87171' }}>{error}</code>
            </div>
          ) : (
            <div className="response-viewer">
              <code>{JSON.stringify(response, null, 2)}</code>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="card">
        <h3>
          Request History
          <button className="btn btn-sm btn-danger" onClick={clearLogs} style={{ marginLeft: 'auto' }}>
            <Trash2 size={12} /> Clear
          </button>
        </h3>
        {logs.length === 0 ? (
          <div className="empty-state">
            <Terminal size={32} />
            <p>No requests yet. Send one to see history.</p>
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onClick={() => {
                  setUrl(log.url);
                  setMethod(log.method);
                  if (log.body) setBody(JSON.stringify(log.body, null, 2));
                }}
              >
                <span className={`badge ${log.status < 400 ? 'badge-success' : 'badge-danger'}`} style={{ minWidth: 40, textAlign: 'center' }}>
                  {log.status}
                </span>
                <strong>{log.method}</strong>
                <span style={{ color: 'var(--text-muted)', flex: 1 }}>{log.url}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(log.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
