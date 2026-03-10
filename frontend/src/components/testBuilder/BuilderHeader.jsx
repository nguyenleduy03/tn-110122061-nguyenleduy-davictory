import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Save, Send, Settings, Shuffle } from 'lucide-react';

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  REVIEWING: 'Đang kiểm duyệt',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
};

const SKILL_OPTIONS = [
  { key: 'LISTENING', label: 'Listening' },
  { key: 'READING', label: 'Reading' },
  { key: 'WRITING', label: 'Writing' },
  { key: 'SPEAKING', label: 'Speaking' },
];

const BuilderHeader = ({ test, onTestChange, onSave, onSubmitReview, saving, onPreview, onShuffle, shuffling, saveMessage, onSkillModeChange }) => {
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

        <select
          className="tb-type-select"
          value={test.isFullTest ? 'FULL' : (test.singleSkill || 'LISTENING')}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'FULL') {
              onSkillModeChange({ isFullTest: true, singleSkill: null });
            } else {
              onSkillModeChange({ isFullTest: false, singleSkill: val });
            }
          }}
        >
          <option value="FULL">Full Test (4 skills)</option>
          {SKILL_OPTIONS.map(s => (
            <option key={s.key} value={s.key}>Chỉ {s.label}</option>
          ))}
        </select>

        <span className={`tb-status-badge ${test.status}`}>
          {STATUS_LABELS[test.status] ?? test.status}
        </span>
      </div>

      <div className="tb-header-actions">
        <button
          className="tb-btn tb-btn-ghost tb-btn-sm"
          onClick={onShuffle}
          disabled={shuffling}
          title="Trộn đề ngẫu nhiên từ các đề đã xuất bản"
        >
          <Shuffle size={15} /> {shuffling ? 'Đang trộn...' : 'Trộn đề'}
        </button>
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
        {saveMessage && (
          <span className="tb-save-message" style={{
            marginLeft: 8, fontSize: 13, fontWeight: 500,
            color: saveMessage.includes('Lỗi') ? '#dc2626' : '#16a34a',
          }}>
            {saveMessage}
          </span>
        )}
      </div>
    </header>
  );
};

export default BuilderHeader;
