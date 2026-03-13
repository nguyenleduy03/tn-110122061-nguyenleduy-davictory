import React from 'react';
import { ClipboardCheck, PlusCircle } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';

const assignments = [
  { title: 'Writing Task 1 Report', className: 'Batch 12', due: 'Mar 20', status: 'Open' },
  { title: 'Listening Micro Test', className: 'Night Class', due: 'Mar 21', status: 'Open' },
  { title: 'Reading Passage Pack', className: 'Batch 13', due: 'Mar 23', status: 'Closed' },
];

export default function LmsTeacherAssignments() {
  return (
    <LmsLayout title="Assignments" subtitle="Distribute homework and track submissions">
      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="lms-panel-title">Assignment pipeline</h3>
            <p className="lms-subtitle">Monitor upcoming deadlines and class completion.</p>
          </div>
          <button className="lms-cta"><PlusCircle size={14} /> New assignment</button>
        </div>
      </div>

      <div className="lms-panel">
        <table className="lms-table">
          <thead>
            <tr><th>Assignment</th><th>Class</th><th>Due</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.title}>
                <td>{a.title}</td>
                <td>{a.className}</td>
                <td>{a.due}</td>
                <td>
                  <span className={`lms-pill ${a.status === 'Open' ? 'warn' : 'neutral'}`}>
                    {a.status}
                  </span>
                </td>
                <td><button className="lms-cta ghost"><ClipboardCheck size={14} /> Check</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LmsLayout>
  );
}
