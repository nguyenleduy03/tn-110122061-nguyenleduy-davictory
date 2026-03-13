import React from 'react';
import { CalendarCheck, FilePlus, Megaphone, Sparkles } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const upcoming = [
  { title: 'IELTS Writing Task 2', className: 'Batch 12', due: 'Mar 20', status: 'Reviewing' },
  { title: 'Listening Mini Test', className: 'Night Class', due: 'Mar 21', status: 'Draft' },
  { title: 'Reading Skills Pack', className: 'Batch 13', due: 'Mar 23', status: 'Published' },
];

const submissions = [
  { student: 'Ngoc Tran', task: 'Task 1 - Report', words: 198, score: '6.5' },
  { student: 'Minh Le', task: 'Task 2 - Opinion', words: 284, score: '—' },
  { student: 'An Pham', task: 'Task 2 - Discussion', words: 302, score: '7.0' },
];

const classes = [
  { name: 'Batch 12', students: 28, next: 'Mar 18' },
  { name: 'Batch 13', students: 24, next: 'Mar 19' },
  { name: 'Night Class', students: 16, next: 'Mar 20' },
];

export default function LmsTeacherDashboard() {
  return (
    <LmsLayout
      title="Teacher control room"
      subtitle="Overview of classes, submissions, and teaching ops"
    >
      <section className="lms-hero">
        <div className="lms-hero-card">
          <h2>Plan the week, not the chaos.</h2>
          <p>Track pending submissions, publish new tests, and keep every class on pace.</p>
        </div>
        <div className="lms-panel">
          <h3 className="lms-panel-title">Quick actions</h3>
          <div className="lms-chip-row">
            <button className="lms-cta"><FilePlus size={14} /> New test</button>
            <button className="lms-cta ghost"><CalendarCheck size={14} /> Schedule class</button>
            <button className="lms-cta ghost"><Megaphone size={14} /> Announce</button>
          </div>
        </div>
      </section>

      <section className="lms-cards">
        <div className="lms-card">
          <h3>Active classes</h3>
          <div className="lms-card-value">6</div>
          <p className="lms-subtitle">2 new students this week</p>
        </div>
        <div className="lms-card">
          <h3>Pending submissions</h3>
          <div className="lms-card-value">12</div>
          <p className="lms-subtitle">Writing + speaking logs</p>
        </div>
        <div className="lms-card">
          <h3>Assessments live</h3>
          <div className="lms-card-value">4</div>
          <p className="lms-subtitle">Across 3 classes</p>
        </div>
        <div className="lms-card">
          <h3>Weekly engagement</h3>
          <div className="lms-card-value">82%</div>
          <p className="lms-subtitle">Above target by 5%</p>
        </div>
      </section>

      <section className="lms-grid">
        <div className="lms-panel">
          <h3 className="lms-panel-title">Upcoming deadlines</h3>
          <table className="lms-table">
            <thead>
              <tr><th>Task</th><th>Class</th><th>Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {upcoming.map((item) => (
                <tr key={item.title}>
                  <td>{item.title}</td>
                  <td>{item.className}</td>
                  <td>{item.due}</td>
                  <td>
                    <span className={`lms-pill ${item.status === 'Published' ? 'success' : item.status === 'Reviewing' ? 'warn' : 'neutral'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lms-panel">
          <h3 className="lms-panel-title">Recent submissions</h3>
          <table className="lms-table">
            <thead>
              <tr><th>Student</th><th>Task</th><th>Words</th><th>Score</th></tr>
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

      <section className="lms-section-title">Class pulse</section>
      <section className="lms-grid">
        {classes.map((c) => (
          <div key={c.name} className="lms-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="lms-panel-title">{c.name}</h3>
              <span className="lms-pill neutral">{c.students} students</span>
            </div>
            <p className="lms-subtitle">Next session: {c.next}</p>
            <div className="lms-chip-row">
              <span className="lms-chip">Homework 78%</span>
              <span className="lms-chip">Speaking 64%</span>
              <span className="lms-chip">Reading 82%</span>
            </div>
          </div>
        ))}
      </section>

      <section className="lms-panel" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} />
          <strong>Coach tip</strong>
        </div>
        <p className="lms-subtitle" style={{ marginTop: 8 }}>
          Use short writing checkpoints mid-week to reduce last-minute grading spikes.
        </p>
      </section>
    </LmsLayout>
  );
}
