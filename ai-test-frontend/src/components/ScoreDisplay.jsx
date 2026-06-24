import { Target, Layers, BookOpen, Languages } from 'lucide-react';

export function BandScore({ band, size = 120 }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min((band / 9) * 100, 100);
  // Improved colors for more professional look
  const color = band >= 8 ? '#10B981' : band >= 7 ? '#6366F1' : band >= 6 ? '#F59E0B' : '#EF4444';
  
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}>
        <circle cx="60" cy="60" r={r} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <circle 
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${(circ * pct) / 100} ${circ}`}
          transform="rotate(-90 60 60)" 
          style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        {/* Inner glow effect */}
        <circle cx="60" cy="60" r={r-8} fill="rgba(255,255,255,0.05)" />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: `${size/4}px`, fontWeight: 900, color: 'white', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>{band > 0 ? band.toFixed(1) : '-'}</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Band Score</div>
      </div>
    </div>
  );
}

export function CriterionMeter({ label, band, color, icon: Icon }) {
  const pct = Math.min((band / 9) * 100, 100);
  return (
    <div className="card" style={{ padding: '20px', marginBottom: '12px', borderTop: `6px solid ${color}`, borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: color, background: `${color}15`, padding: '10px', borderRadius: '12px' }}>
            <Icon size={22} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: color }}>{band > 0 ? band.toFixed(1) : '-'}</div>
      </div>
      <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          background: `linear-gradient(90deg, ${color}88, ${color})`, 
          width: `${pct}%`, 
          transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 10px ${color}55`
        }} />
      </div>
    </div>
  );
}
