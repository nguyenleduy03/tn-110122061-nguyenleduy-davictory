import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const submissions = [
  { student: 'Ngoc Tran', task: 'Task 2 Opinion', words: 284, score: '6.5', status: 'Pending' },
  { student: 'Minh Le', task: 'Task 1 Report', words: 198, score: '—', status: 'Pending' },
  { student: 'Ha Vu', task: 'Task 2 Discussion', words: 302, score: '7.0', status: 'Graded' },
];

export default function LmsTeacherSubmissions() {
  return (
    <LmsLayout title="Submissions" subtitle="Review writing, speaking logs, and feedback">
      <div className="lms-panel">
        <table className="lms-table">
          <thead>
            <tr><th>Student</th><th>Task</th><th>Words</th><th>Status</th><th>Score</th><th>Action</th></tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.student + s.task}>
                <td>{s.student}</td>
                <td>{s.task}</td>
                <td>{s.words}</td>
                <td>
                  <span className={`lms-pill ${s.status === 'Pending' ? 'warn' : 'success'}`}>
                    {s.status}
                  </span>
                </td>
                <td>{s.score}</td>
                <td><button className="lms-cta ghost"><CheckCircle2 size={14} /> Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LmsLayout>
  );
}
