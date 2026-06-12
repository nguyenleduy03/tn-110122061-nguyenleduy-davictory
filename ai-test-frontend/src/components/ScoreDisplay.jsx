import { Target, Layers, BookOpen, Languages } from 'lucide-react';

export function BandScore({ band, size = 120 }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min((band / 9) * 100, 100);
  const color = band >= 8 ? '#10B981' : band >= 7 ? '#4F46E5' : band >= 6 ? '#F59E0B' : '#EF4444';
  
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle 
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${(circ * pct) / 100} ${circ}`}
          transform="rotate(-90 60 60)" 
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: color, lineHeight: 1 }}>{band.toFixed(1)}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '4px' }}>Band Score</div>
      </div>
    </div>
  );
}

export function CriterionMeter({ label, band, color, icon: Icon }) {
  const pct = Math.min((band / 9) * 100, 100);
  return (
    <div className="card" style={{ padding: '16px', marginBottom: '12px', borderTop: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ color: color, background: `${color}15`, padding: '6px', borderRadius: 'var(--radius-sm)' }}>
            <Icon size={18} />
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: color }}>{band > 0 ? band.toFixed(1) : '-'}</div>
      </div>
      <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, width: `${pct}%`, transition: 'width 1s ease-in-out' }} />
      </div>
    </div>
  );
}
