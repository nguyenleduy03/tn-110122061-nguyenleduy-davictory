import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Save, Send, Settings } from 'lucide-react';

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  REVIEWING: 'Đang kiểm duyệt',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
};

const BuilderHeader = ({ test, onTestChange, onSave, onSubmitReview, saving, onPreview }) => {
  return (
    <header className="tb-header">
      <div className="tb-header-title-wrap">
        <Link to="/teacher/tests" className="tb-back-btn" title="Quay lại danh sách">
          <ArrowLeft size={20} />
        </Link>

        <input
          className="tb-title-input"
          placeholder="Nhập tiêu đề đề thi..."
          value={test.title}
          onChange={(e) => onTestChange({ title: e.target.value })}
          maxLength={255}
        />

        <select
          className="tb-type-select"
          value={test.testType}
          onChange={(e) => onTestChange({ testType: e.target.value })}
        >
          <option value="ACADEMIC">Academic</option>
          <option value="GENERAL">General Training</option>
        </select>

        <span className={`tb-status-badge ${test.status}`}>
          {STATUS_LABELS[test.status] ?? test.status}
        </span>
      </div>

      <div className="tb-header-actions">
        <button className="tb-btn tb-btn-ghost tb-btn-sm" title="Xem trước" onClick={onPreview}>
          <Eye size={15} /> Xem trước
        </button>
        <button
          className="tb-btn tb-btn-ghost tb-btn-sm"
          onClick={onSave}
          disabled={saving}
        >
          <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
        </button>
        {test.status === 'DRAFT' && (
          <button className="tb-btn tb-btn-success tb-btn-sm" onClick={onSubmitReview}>
            <Send size={15} /> Gửi kiểm duyệt
          </button>
        )}
        <button className="tb-btn tb-btn-primary tb-btn-sm" title="Cài đặt">
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};

export default BuilderHeader;
