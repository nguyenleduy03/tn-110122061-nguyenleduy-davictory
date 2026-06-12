import { useState, useEffect } from 'react';
import {
  Cpu, HardDrive, Activity, Zap, CheckCircle, XCircle, ArrowRight,
  ShieldCheck, Server, Gauge, Globe
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { speakingApi } from '../api/speakingApi';

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Initializing system monitor...</span>
      </div>
    );
  }

  const onlineCount = services.filter(s => s.online).length;

  return (
    <div className="animate-fade">
      <div className="card" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: 'white', border: 'none', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>System Overview</h2>
            <p style={{ opacity: 0.7, fontSize: '0.9375rem' }}>Real-time status and configuration of DAVictory AI services.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} />
            <span style={{ fontWeight: 700 }}>{onlineCount}/{services.length} Online</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {services.map((svc) => (
          <div className="card" key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)', 
              background: svc.online ? 'var(--secondary-light)' : '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: svc.online ? 'var(--secondary)' : 'var(--danger)'
            }}>
              {svc.online ? <CheckCircle size={24} /> : <XCircle size={24} />}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Status</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{svc.name}</div>
              <div style={{ fontSize: '0.8125rem', color: svc.online ? 'var(--secondary)' : 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                {svc.online ? `Running (HTTP ${svc.status})` : 'Offline'}
              </div>
            </div>
          </div>
        ))}
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: 'var(--radius-md)', 
            background: 'var(--primary-light)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active AI Engine</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{writingConfig?.model || 'Scanning...'}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
              Provider: {writingConfig?.provider || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--primary)" />
            Writing Service Details
          </h3>
          {writingConfig ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Engine Provider</span>
                <span style={{ fontWeight: 600 }}>{writingConfig.provider}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Model Version</span>
                <span style={{ fontWeight: 600 }}>{writingConfig.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>RAG Enhancement</span>
                <span className="badge-primary badge" style={{ padding: '2px 8px' }}>{writingConfig.features?.rag ? 'Active' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Daily Quota Limit</span>
                <span style={{ fontWeight: 600 }}>{writingConfig.quota?.dailyLimit || 'Unlimited'}</span>
              </div>
            </div>
          ) : <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>Service data unavailable</div>}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} color="var(--secondary)" />
            Speaking Service Details
          </h3>
          {speakingConfig ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Conversation LLM</span>
                <span style={{ fontWeight: 600 }}>{speakingConfig.conversation?.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Scoring LLM</span>
                <span style={{ fontWeight: 600 }}>{speakingConfig.scoring?.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Voice (TTS)</span>
                <span style={{ fontWeight: 600 }}>{speakingConfig.tts?.model} ({speakingConfig.tts?.voice})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>STT Engine</span>
                <span style={{ fontWeight: 600 }}>{speakingConfig.stt?.provider}</span>
              </div>
            </div>
          ) : <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>Service data unavailable</div>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={20} color="var(--accent)" />
          Quick Test Launch
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/ai-test/writing" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Launch Writing Test <ArrowRight size={16} />
          </a>
          <a href="/ai-test/speaking" className="btn btn-primary" style={{ textDecoration: 'none', background: 'var(--secondary)' }}>
            Launch Speaking Test <ArrowRight size={16} />
          </a>
          <a href="/ai-test/console" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Open API Console
          </a>
        </div>
      </div>
    </div>
  );
}
