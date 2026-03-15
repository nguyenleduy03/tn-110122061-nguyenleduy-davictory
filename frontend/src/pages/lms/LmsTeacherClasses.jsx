import React from 'react';
import { Users, CalendarDays, MessageSquare } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const classes = [
  { name: 'Lớp 12A', level: 'Trung cấp cao', students: 28, schedule: 'Thứ 2/4/6', next: '18/03 18:00' },
  { name: 'Lớp 13A', level: 'Trung cấp', students: 24, schedule: 'Thứ 3/5', next: '19/03 19:00' },
  { name: 'Lớp tối', level: 'Nền tảng', students: 16, schedule: 'Thứ 7', next: '20/03 20:00' },
];

const roster = [
  { name: 'Ngọc Trần', progress: '78%', status: 'Đang học tốt' },
  { name: 'Minh Lê', progress: '72%', status: 'Đang học tốt' },
  { name: 'An Phạm', progress: '65%', status: 'Cần hỗ trợ' },
  { name: 'Hà Vũ', progress: '88%', status: 'Đang học tốt' },
];

export default function LmsTeacherClasses() {
  return (
    <LmsLayout title="Lớp học" subtitle="Quản lý lớp, lịch học và danh sách học viên">
      <div className="lms-cards">
        {classes.map((c) => (
          <div key={c.name} className="lms-card">
            <h3>{c.name}</h3>
            <div className="lms-card-value">{c.students}</div>
            <p className="lms-subtitle">{c.level} · {c.schedule}</p>
            <p className="lms-subtitle">Buổi kế tiếp: {c.next}</p>
          </div>
        ))}
      </div>

      <div className="lms-grid">
        <div className="lms-panel">
          <h3 className="lms-panel-title">Danh sách lớp</h3>
          <table className="lms-table">
            <thead>
              <tr><th>Học viên</th><th>Tiến độ</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.progress}</td>
                  <td>
                    <span className={`lms-pill ${r.status === 'Đang học tốt' ? 'success' : 'warn'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lms-panel">
          <h3 className="lms-panel-title">Công cụ nhanh</h3>
          <div className="lms-chip-row">
            <button className="lms-cta"><Users size={14} /> Thêm học viên</button>
            <button className="lms-cta ghost"><CalendarDays size={14} /> Lên lịch buổi học</button>
            <button className="lms-cta ghost"><MessageSquare size={14} /> Nhắn cả lớp</button>
          </div>
          <p className="lms-subtitle" style={{ marginTop: 12 }}>
            Đồng bộ điểm danh và xuất báo cáo tương tác chỉ với một lần bấm.
          </p>
        </div>
      </div>
    </LmsLayout>
  );
}
