import { Target, Layers, BookOpen, Languages } from 'lucide-react';

export function BandScore({ band, size = 120 }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min((band / 9) * 100, 100);
  const color = band >= 8 ? '#10B981' : band >= 7 ? '#6366F1' : band >= 6 ? '#F59E0B' : '#EF4444';
  
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ filter: `drop-shadow(0 0 12px ${color}66)` }}>
        <circle cx="60" cy="60" r={r} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle 
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${(circ * pct) / 100} ${circ}`}
          transform="rotate(-90 60 60)" 
          style={{ transition: 'stroke-dasharray 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        {/* Glow effect */}
        <circle cx="60" cy="60" r={r-8} fill="rgba(255,255,255,0.03)" />
      </svg>
      {/* Outer pulsing ring */}
      <div 
        className="radar-pulse-ring" 
        style={{ 
          borderColor: color, 
          display: 'block', 
          opacity: 0.15,
          width: '100%',
          height: '100%',
          top: 0, left: 0, right: 0, bottom: 0 
        }} 
      />
      <div style={{ position: 'absolute', textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontSize: `${size/4.2}px`, fontWeight: 900, color: 'white', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
          {band > 0 ? band.toFixed(1) : '-'}
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Band Score
        </div>
      </div>
    </div>
  );
}

export function CriterionMeter({ label, band, color, icon: Icon }) {
  const pct = Math.min((band / 9) * 100, 100);
  return (
    <div className="card glass-premium" style={{ 
      padding: '20px', 
      marginBottom: '12px', 
      borderLeft: `5px solid ${color}`, 
      borderRadius: 'var(--radius-lg)', 
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = `0 12px 24px -10px ${color}33`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.06)';
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: color, background: `${color}12`, padding: '10px', borderRadius: '12px', boxShadow: `0 0 12px ${color}1a` }}>
            <Icon size={20} />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{label}</div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: color, textShadow: `0 2px 8px ${color}22` }}>
          {band > 0 ? band.toFixed(1) : '-'}
        </div>
      </div>
      <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ 
          height: '100%', 
          background: `linear-gradient(90deg, ${color}bb, ${color})`, 
          width: `${pct}%`, 
          transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 10px ${color}66`,
          borderRadius: '999px'
        }} />
        {/* Glow sheen animation */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: '40px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'scan-v 2.5s infinite linear'
        }} />
      </div>
    </div>
  );
}
