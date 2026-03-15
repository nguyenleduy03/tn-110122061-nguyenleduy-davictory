import React from 'react';
import { ClipboardCheck, PlusCircle } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const assignments = [
  { title: 'Writing Task 1 Report', className: 'Lớp 12A', due: '20/03', status: 'Đang mở' },
  { title: 'Listening Micro Test', className: 'Lớp tối', due: '21/03', status: 'Đang mở' },
  { title: 'Reading Passage Pack', className: 'Lớp 13A', due: '23/03', status: 'Đã đóng' },
];

export default function LmsTeacherAssignments() {
  return (
    <LmsLayout title="Bài tập" subtitle="Giao bài và theo dõi tiến độ nộp của học viên">
      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="lms-panel-title">Luồng bài tập</h3>
            <p className="lms-subtitle">Theo dõi hạn nộp và mức độ hoàn thành theo từng lớp.</p>
          </div>
          <button className="lms-cta"><PlusCircle size={14} /> Tạo bài tập mới</button>
        </div>
      </div>

      <div className="lms-panel">
        <table className="lms-table">
          <thead>
            <tr><th>Bài tập</th><th>Lớp</th><th>Hạn nộp</th><th>Trạng thái</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.title}>
                <td>{a.title}</td>
                <td>{a.className}</td>
                <td>{a.due}</td>
                <td>
                  <span className={`lms-pill ${a.status === 'Đang mở' ? 'warn' : 'neutral'}`}>
                    {a.status}
                  </span>
                </td>
                <td><button className="lms-cta ghost"><ClipboardCheck size={14} /> Kiểm tra</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LmsLayout>
  );
}
