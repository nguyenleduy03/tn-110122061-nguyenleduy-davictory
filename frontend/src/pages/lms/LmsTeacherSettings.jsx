import React from 'react';
import LmsLayout from '../../components/lms/LmsLayout';

export default function LmsTeacherSettings() {
  return (
    <LmsLayout title="Settings" subtitle="Manage notifications, grading, and integrations">
      <div className="lms-panel">
        <h3 className="lms-panel-title">Notification rules</h3>
        <p className="lms-subtitle">Set reminders for submissions and class start times.</p>
        <div className="lms-chip-row">
          <span className="lms-chip">Email digests</span>
          <span className="lms-chip">Slack alerts</span>
          <span className="lms-chip">Auto follow-up</span>
        </div>
      </div>
    </LmsLayout>
  );
}
