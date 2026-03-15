import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const submissions = [
  { student: 'Ngọc Trần', task: 'Task 2 Opinion', words: 284, score: '6.5', status: 'Chờ chấm' },
  { student: 'Minh Lê', task: 'Task 1 Report', words: 198, score: '—', status: 'Chờ chấm' },
  { student: 'Hà Vũ', task: 'Task 2 Discussion', words: 302, score: '7.0', status: 'Đã chấm' },
];

export default function LmsTeacherSubmissions() {
  return (
    <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
      <div className="lms-panel">
        <table className="lms-table">
          <thead>
            <tr><th>Học viên</th><th>Bài làm</th><th>Số từ</th><th>Trạng thái</th><th>Điểm</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.student + s.task}>
                <td>{s.student}</td>
                <td>{s.task}</td>
                <td>{s.words}</td>
                <td>
                  <span className={`lms-pill ${s.status === 'Chờ chấm' ? 'warn' : 'success'}`}>
                    {s.status}
                  </span>
                </td>
                <td>{s.score}</td>
                <td><button className="lms-cta ghost"><CheckCircle2 size={14} /> Chấm bài</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LmsLayout>
  );
}
