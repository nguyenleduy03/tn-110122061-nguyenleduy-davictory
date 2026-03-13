import React from 'react';
import { Users, CalendarDays, MessageSquare } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const classes = [
  { name: 'Batch 12', level: 'Upper-Intermediate', students: 28, schedule: 'Mon/Wed/Fri', next: 'Mar 18 18:00' },
  { name: 'Batch 13', level: 'Intermediate', students: 24, schedule: 'Tue/Thu', next: 'Mar 19 19:00' },
  { name: 'Night Class', level: 'Foundation', students: 16, schedule: 'Sat', next: 'Mar 20 20:00' },
];

const roster = [
  { name: 'Ngoc Tran', progress: '78%', status: 'Active' },
  { name: 'Minh Le', progress: '72%', status: 'Active' },
  { name: 'An Pham', progress: '65%', status: 'Needs support' },
  { name: 'Ha Vu', progress: '88%', status: 'Active' },
];

export default function LmsTeacherClasses() {
  return (
    <LmsLayout title="Classrooms" subtitle="Manage cohorts, schedules, and student rosters">
      <div className="lms-cards">
        {classes.map((c) => (
          <div key={c.name} className="lms-card">
            <h3>{c.name}</h3>
            <div className="lms-card-value">{c.students}</div>
            <p className="lms-subtitle">{c.level} · {c.schedule}</p>
            <p className="lms-subtitle">Next: {c.next}</p>
          </div>
        ))}
      </div>

      <div className="lms-grid">
        <div className="lms-panel">
          <h3 className="lms-panel-title">Class roster</h3>
          <table className="lms-table">
            <thead>
              <tr><th>Student</th><th>Progress</th><th>Status</th></tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.progress}</td>
                  <td>
                    <span className={`lms-pill ${r.status === 'Active' ? 'success' : 'warn'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lms-panel">
          <h3 className="lms-panel-title">Quick tools</h3>
          <div className="lms-chip-row">
            <button className="lms-cta"><Users size={14} /> Add students</button>
            <button className="lms-cta ghost"><CalendarDays size={14} /> Schedule session</button>
            <button className="lms-cta ghost"><MessageSquare size={14} /> Message class</button>
          </div>
          <p className="lms-subtitle" style={{ marginTop: 12 }}>
            Sync attendance and export engagement reports with one click.
          </p>
        </div>
      </div>
    </LmsLayout>
  );
}
