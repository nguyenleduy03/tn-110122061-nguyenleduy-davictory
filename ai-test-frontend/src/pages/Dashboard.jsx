import { useState, useEffect } from 'react';
import {
  Cpu, HardDrive, Activity, Zap, CheckCircle, XCircle, ArrowRight,
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { speakingApi } from '../api/speakingApi';
import ResponseViewer from '../components/ResponseViewer';

async function checkService(url, name) {
  try {
    const res = await fetch(url);
    return { name, status: res.status, online: true };
  } catch {
    return { name, status: 'OFFLINE', online: false };
  }
}

export default function Dashboard() {
  const [services, setServices] = useState([]);
  const [writingConfig, setWritingConfig] = useState(null);
  const [speakingConfig, setSpeakingConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ws, ss, wc, sc] = await Promise.allSettled([
        checkService('/api/admin/ai/config', 'AI Writing Service'),
        checkService('/api/admin/speaking/config', 'AI Speaking Service'),
        writingApi.getConfig().catch(() => null),
        speakingApi.getConfig().catch(() => null),
      ]);

      setServices([
        ws.status === 'fulfilled' ? ws.value : { name: 'AI Writing Service', online: false },
        ss.status === 'fulfilled' ? ss.value : { name: 'AI Speaking Service', online: false },
      ]);
      if (wc.status === 'fulfilled' && wc.value) setWritingConfig(wc.value.data);
      if (sc.status === 'fulfilled' && sc.value) setSpeakingConfig(sc.value.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
          <div className="spinner" />
          <span style={{ color: 'var(--text-muted)' }}>Checking services...</span>
        </div>
      </div>
    );
  }

  const onlineCount = services.filter(s => s.online).length;

  return (
    <div className="main">
      <div className="welcome-banner">
        <h2>AI Test Center Dashboard</h2>
        <p>Overview of all AI services status and configuration</p>
        <span className="badge">{onlineCount}/{services.length} services online</span>
      </div>

      <div className="stats-grid">
        {services.map((svc) => (
          <div className="stat-card" key={svc.name}>
            <div className="stat-icon" style={{
              background: svc.online ? 'var(--success-bg)' : 'var(--danger-bg)',
            }}>
              {svc.online
                ? <CheckCircle size={20} color="var(--success)" />
                : <XCircle size={20} color="var(--danger)" />
              }
            </div>
            <div className="stat-value" style={{ fontSize: 16, fontWeight: 700 }}>
              {svc.name}
            </div>
            <div className="service-indicator" style={{ marginTop: 8 }}>
              <span className={`dot ${svc.online ? 'dot-online' : 'dot-offline'}`} />
              {svc.online ? 'Online' : 'Offline'}
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>
                (Status: {svc.status})
              </span>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-bg)' }}>
            <Cpu size={20} color="var(--primary)" />
          </div>
          <div className="stat-value" style={{ fontSize: 16, fontWeight: 700 }}>
            Writing Model
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {writingConfig?.model || 'N/A'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}>
            <Activity size={20} color="#B7950B" />
          </div>
          <div className="stat-value" style={{ fontSize: 16, fontWeight: 700 }}>
            Speaking Model
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {speakingConfig?.scoring?.model || 'N/A'}
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3><Cpu size={18} /> AI Writing Service Config</h3>
          {writingConfig ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><strong>Provider:</strong> {writingConfig.provider}</div>
              <div><strong>Model:</strong> {writingConfig.model}</div>
              <div><strong>Vector Store:</strong> {writingConfig.features?.rag ? 'Enabled' : 'Disabled'}</div>
              <div><strong>Quota Limit:</strong> {writingConfig.quota?.dailyLimit || 'N/A'}</div>
            </div>
          ) : <div className="service-indicator"><span className="dot dot-offline" /> Service offline</div>}
        </div>

        <div className="card">
          <h3><HardDrive size={18} /> AI Speaking Service Config</h3>
          {speakingConfig ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><strong>Conversation:</strong> {speakingConfig.conversation?.provider} / {speakingConfig.conversation?.model}</div>
              <div><strong>Scoring:</strong> {speakingConfig.scoring?.provider} / {speakingConfig.scoring?.model}</div>
              <div><strong>STT:</strong> {speakingConfig.stt?.provider} ({speakingConfig.stt?.model})</div>
              <div><strong>TTS:</strong> {speakingConfig.tts?.model} ({speakingConfig.tts?.voice})</div>
            </div>
          ) : <div className="service-indicator"><span className="dot dot-offline" /> Service offline</div>}
        </div>

        <div className="card">
          <h3><Zap size={18} /> Quick Actions</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/ai-test/writing" className="btn btn-primary">
              Test Writing <ArrowRight size={14} />
            </a>
            <a href="/ai-test/speaking" className="btn btn-primary">
              Test Speaking <ArrowRight size={14} />
            </a>
            <a href="/ai-test/admin" className="btn btn-secondary">Admin Panel</a>
            <a href="/ai-test/console" className="btn btn-secondary">API Console</a>
          </div>
        </div>
      </div>
    </div>
  );
}
