import React from 'react';
import { TrendingUp } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const bars = [
  { label: 'Nghe', value: 78 },
  { label: 'Đọc', value: 82 },
  { label: 'Viết', value: 64 },
  { label: 'Nói', value: 58 },
];

export default function LmsTeacherAnalytics() {
  return (
    <LmsLayout title="Báo cáo" subtitle="Xu hướng kết quả học tập và mức độ tương tác">
      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={18} />
          <h3 className="lms-panel-title">Chỉ số tiến bộ theo kỹ năng</h3>
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
          <h3 className="lms-panel-title">Tương tác theo tuần</h3>
          <p className="lms-subtitle">82% học viên đã hoàn thành bài tập gần nhất.</p>
          <div className="lms-chip-row">
            <span className="lms-chip">+6% so với tuần trước</span>
            <span className="lms-chip">Band trung bình 6.4</span>
            <span className="lms-chip">Lớp nổi bật: 12A</span>
          </div>
        </div>
        <div className="lms-panel">
          <h3 className="lms-panel-title">Khối lượng chấm bài</h3>
          <p className="lms-subtitle">Còn 12 bài nộp đang chờ chấm.</p>
          <div className="lms-chip-row">
            <span className="lms-chip">5 bài Viết</span>
            <span className="lms-chip">4 bài Nói</span>
            <span className="lms-chip">3 ghi chú Đọc</span>
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}
