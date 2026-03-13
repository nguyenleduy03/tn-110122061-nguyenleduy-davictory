import React from 'react';
import { FilePlus, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import LmsLayout from '../../components/lms/LmsLayout';

const tests = [
  { title: 'Academic Listening Mock 04', status: 'Published', attempts: 84, updated: 'Mar 12' },
  { title: 'Reading Focus: Matching Headings', status: 'Reviewing', attempts: 42, updated: 'Mar 11' },
  { title: 'Writing Task 2 Pack', status: 'Draft', attempts: 0, updated: 'Mar 10' },
];

export default function LmsTeacherTests() {
  return (
    <LmsLayout title="Assessment library" subtitle="Create, publish, and track test performance">
      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h3 className="lms-panel-title">Active tests</h3>
            <p className="lms-subtitle">Keep your students aligned with weekly practice.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/teacher/tests" className="lms-cta ghost">
              <ShieldCheck size={14} /> Manage tests
            </Link>
            <Link to="/teacher/tests/new" className="lms-cta">
              <FilePlus size={14} /> New test
            </Link>
          </div>
        </div>
      </div>

      <div className="lms-panel">
        <table className="lms-table">
          <thead>
            <tr><th>Test</th><th>Status</th><th>Attempts</th><th>Updated</th><th>Action</th></tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.title}>
                <td>{t.title}</td>
                <td>
                  <span className={`lms-pill ${t.status === 'Published' ? 'success' : t.status === 'Reviewing' ? 'warn' : 'neutral'}`}>
                    {t.status}
                  </span>
                </td>
                <td>{t.attempts}</td>
                <td>{t.updated}</td>
                <td>
                  <Link to="/teacher/tests" className="lms-cta ghost">
                    <ShieldCheck size={14} /> Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LmsLayout>
  );
}
