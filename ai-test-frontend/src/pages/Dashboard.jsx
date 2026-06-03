import { useState, useEffect } from 'react';
import {
  Cpu, HardDrive, Activity, Zap, CheckCircle, XCircle,
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
          Checking services...
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      <div className="page-header">
        <h1>AI Test Center Dashboard</h1>
        <p>Overview of all AI services status and configuration</p>
      </div>

      <div className="stats-grid">
        {services.map((svc) => (
          <div className="stat-card" key={svc.name}>
            <div className="stat-icon" style={{ background: svc.online ? '#d1fae5' : '#fee2e2' }}>
              {svc.online ? <CheckCircle size={20} color="#00b894" /> : <XCircle size={20} color="#d63031" />}
            </div>
            <div className="stat-value" style={{ fontSize: 18, fontWeight: 700 }}>
              {svc.name}
            </div>
            <div className="service-indicator" style={{ marginTop: 8 }}>
              <span className={`dot ${svc.online ? 'dot-online' : 'dot-offline'}`} />
              {svc.online ? 'Online' : 'Offline'} (Status: {svc.status})
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Cpu size={20} color="#1e40af" />
          </div>
          <div className="stat-value" style={{ fontSize: 18, fontWeight: 700 }}>
            Writing Model
          </div>
          <div className="service-indicator" style={{ marginTop: 8 }}>
            {writingConfig?.model || 'N/A'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <Activity size={20} color="#92400e" />
          </div>
          <div className="stat-value" style={{ fontSize: 18, fontWeight: 700 }}>
            Speaking Model
          </div>
          <div className="service-indicator" style={{ marginTop: 8 }}>
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
            <a href="#/writing" className="btn btn-primary">Test Writing</a>
            <a href="#/speaking" className="btn btn-primary">Test Speaking</a>
            <a href="#/admin" className="btn btn-secondary">Admin Panel</a>
            <a href="#/console" className="btn btn-secondary">API Console</a>
          </div>
        </div>
      </div>
    </div>
  );
}
