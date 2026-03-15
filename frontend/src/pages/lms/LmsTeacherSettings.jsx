import React from 'react';
import LmsLayout from '../../components/lms/LmsLayout';

export default function LmsTeacherSettings() {
  return (
    <LmsLayout title="Cài đặt" subtitle="Quản lý thông báo, quy tắc chấm và tích hợp hệ thống">
      <div className="lms-panel">
        <h3 className="lms-panel-title">Quy tắc thông báo</h3>
        <p className="lms-subtitle">Thiết lập nhắc hạn nộp bài và thời gian bắt đầu buổi học.</p>
        <div className="lms-chip-row">
          <span className="lms-chip">Tóm tắt qua email</span>
          <span className="lms-chip">Cảnh báo tức thời</span>
          <span className="lms-chip">Nhắc tự động</span>
        </div>
      </div>
    </LmsLayout>
  );
}
