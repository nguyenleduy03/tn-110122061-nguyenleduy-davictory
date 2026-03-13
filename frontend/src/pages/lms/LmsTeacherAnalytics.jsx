import React from 'react';
import { TrendingUp } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const bars = [
  { label: 'Listening', value: 78 },
  { label: 'Reading', value: 82 },
  { label: 'Writing', value: 64 },
  { label: 'Speaking', value: 58 },
];

export default function LmsTeacherAnalytics() {
  return (
    <LmsLayout title="Analytics" subtitle="Performance and engagement trends">
      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={18} />
          <h3 className="lms-panel-title">Skill progress index</h3>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {bars.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 90, fontSize: 12, color: '#6b7280' }}>{b.label}</div>
              <div style={{ flex: 1, height: 10, background: '#efe8da', borderRadius: 999 }}>
                <div style={{ width: `${b.value}%`, height: '100%', background: '#1b7f79', borderRadius: 999 }} />
              </div>
              <div style={{ width: 40, fontSize: 12, fontWeight: 600 }}>{b.value}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lms-grid">
        <div className="lms-panel">
          <h3 className="lms-panel-title">Weekly engagement</h3>
          <p className="lms-subtitle">82% students completed last assignment.</p>
          <div className="lms-chip-row">
            <span className="lms-chip">+6% WoW</span>
            <span className="lms-chip">Avg band 6.4</span>
            <span className="lms-chip">Top class: Batch 12</span>
          </div>
        </div>
        <div className="lms-panel">
          <h3 className="lms-panel-title">Grading load</h3>
          <p className="lms-subtitle">12 submissions awaiting review.</p>
          <div className="lms-chip-row">
            <span className="lms-chip">5 Writing</span>
            <span className="lms-chip">4 Speaking</span>
            <span className="lms-chip">3 Reading notes</span>
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}
