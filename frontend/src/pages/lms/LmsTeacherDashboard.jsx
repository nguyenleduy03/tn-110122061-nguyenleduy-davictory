import React from 'react';
import { CalendarCheck, FilePlus, Megaphone, Sparkles } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const upcoming = [
  { title: 'IELTS Writing Task 2', className: 'Lớp 12A', due: '20/03', status: 'Đang duyệt' },
  { title: 'Listening Mini Test', className: 'Lớp tối', due: '21/03', status: 'Bản nháp' },
  { title: 'Reading Skills Pack', className: 'Lớp 13A', due: '23/03', status: 'Đã phát hành' },
];

const submissions = [
  { student: 'Ngọc Trần', task: 'Task 1 - Report', words: 198, score: '6.5' },
  { student: 'Minh Lê', task: 'Task 2 - Opinion', words: 284, score: '—' },
  { student: 'An Phạm', task: 'Task 2 - Discussion', words: 302, score: '7.0' },
];

const classes = [
  { name: 'Lớp 12A', students: 28, next: '18/03' },
  { name: 'Lớp 13A', students: 24, next: '19/03' },
  { name: 'Lớp tối', students: 16, next: '20/03' },
];

export default function LmsTeacherDashboard() {
  return (
    <LmsLayout
      title="Tổng quan giảng viên"
      subtitle="Theo dõi lớp học, bài nộp và hoạt động giảng dạy"
    >
      <section className="lms-hero">
        <div className="lms-hero-card">
          <h2>Lên kế hoạch rõ ràng cho cả tuần.</h2>
          <p>Theo dõi bài nộp chờ chấm, phát hành đề mới và giữ tiến độ học tập ổn định.</p>
        </div>
        <div className="lms-panel">
          <h3 className="lms-panel-title">Thao tác nhanh</h3>
          <div className="lms-chip-row">
            <button className="lms-cta"><FilePlus size={14} /> Tạo đề mới</button>
            <button className="lms-cta ghost"><CalendarCheck size={14} /> Lên lịch học</button>
            <button className="lms-cta ghost"><Megaphone size={14} /> Gửi thông báo</button>
          </div>
        </div>
      </section>

      <section className="lms-cards">
        <div className="lms-card">
          <h3>Lớp đang hoạt động</h3>
          <div className="lms-card-value">6</div>
          <p className="lms-subtitle">+2 học viên mới trong tuần</p>
        </div>
        <div className="lms-card">
          <h3>Bài nộp chờ chấm</h3>
          <div className="lms-card-value">12</div>
          <p className="lms-subtitle">Writing + nhật ký Speaking</p>
        </div>
        <div className="lms-card">
          <h3>Đề thi đang mở</h3>
          <div className="lms-card-value">4</div>
          <p className="lms-subtitle">Áp dụng cho 3 lớp</p>
        </div>
        <div className="lms-card">
          <h3>Tương tác tuần</h3>
          <div className="lms-card-value">82%</div>
          <p className="lms-subtitle">Vượt mục tiêu 5%</p>
        </div>
      </section>

      <section className="lms-grid">
        <div className="lms-panel">
          <h3 className="lms-panel-title">Hạn nộp sắp tới</h3>
          <table className="lms-table">
            <thead>
              <tr><th>Nhiệm vụ</th><th>Lớp</th><th>Hạn</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {upcoming.map((item) => (
                <tr key={item.title}>
                  <td>{item.title}</td>
                  <td>{item.className}</td>
                  <td>{item.due}</td>
                  <td>
                    <span className={`lms-pill ${item.status === 'Đã phát hành' ? 'success' : item.status === 'Đang duyệt' ? 'warn' : 'neutral'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lms-panel">
          <h3 className="lms-panel-title">Bài nộp gần đây</h3>
          <table className="lms-table">
            <thead>
              <tr><th>Học viên</th><th>Bài</th><th>Số từ</th><th>Điểm</th></tr>
            </thead>
            <tbody>
              {submissions.map((item) => (
                <tr key={item.student}>
                  <td>{item.student}</td>
                  <td>{item.task}</td>
                  <td>{item.words}</td>
                  <td>{item.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lms-section-title">Tình hình lớp học</section>
      <section className="lms-grid">
        {classes.map((c) => (
          <div key={c.name} className="lms-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="lms-panel-title">{c.name}</h3>
              <span className="lms-pill neutral">{c.students} học viên</span>
            </div>
            <p className="lms-subtitle">Buổi học tiếp theo: {c.next}</p>
            <div className="lms-chip-row">
              <span className="lms-chip">Bài tập 78%</span>
              <span className="lms-chip">Speaking 64%</span>
              <span className="lms-chip">Reading 82%</span>
            </div>
          </div>
        ))}
      </section>

      <section className="lms-panel" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} />
          <strong>Gợi ý giảng dạy</strong>
        </div>
        <p className="lms-subtitle" style={{ marginTop: 8 }}>
          Nên chèn bài kiểm tra viết ngắn giữa tuần để giảm tải chấm bài vào phút cuối.
        </p>
      </section>
    </LmsLayout>
  );
}
