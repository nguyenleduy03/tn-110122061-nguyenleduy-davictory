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
      {/* Left Section - Navigation & Title */}
      <div className="tb-header-left">
        <Link to="/teacher/tests" className="tb-back-btn" title="Quay lại danh sách">
          <ArrowLeft size={18} />
        </Link>
        
        <div className="tb-divider"></div>
        
        <input
          className="tb-title-input"
          placeholder="Nhập tiêu đề đề thi..."
          value={test.title}
          onChange={(e) => onTestChange({ title: e.target.value })}
          maxLength={255}
        />
      </div>

      {/* Center Section - Test Configuration */}
      <div className="tb-header-center">
        <div className="tb-toolbar-group">
          <select
            className="tb-select"
            value={test.testType}
            onChange={(e) => onTestChange({ testType: e.target.value })}
          >
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General Training</option>
          </select>

          <select
            className="tb-select"
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
            <option value="FULL">Full Test</option>
            {SKILL_OPTIONS.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        <span className={`tb-status-badge tb-status-${test.status.toLowerCase()}`}>
          {STATUS_LABELS[test.status] ?? test.status}
        </span>
      </div>

      {/* Right Section - Actions Toolbar */}
      <div className="tb-header-right">
        <div className="tb-toolbar-group">
          <button
            className="tb-tool-btn"
            onClick={onShuffle}
            disabled={shuffling}
            title="Trộn đề ngẫu nhiên"
          >
            <Shuffle size={16} />
            <span>{shuffling ? 'Đang trộn...' : 'Trộn đề'}</span>
          </button>
          
          <button 
            className="tb-tool-btn" 
            title="Xem trước" 
            onClick={onPreview}
          >
            <Eye size={16} />
            <span>Xem trước</span>
          </button>
        </div>

        <div className="tb-divider"></div>

        <div className="tb-toolbar-group">
          <button
            className="tb-tool-btn tb-tool-btn-primary"
            onClick={onSave}
            disabled={saving}
            title="Lưu đề thi"
          >
            <Save size={16} />
            <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
          
          {test.status === 'DRAFT' && (
            <button 
              className="tb-tool-btn tb-tool-btn-success" 
              onClick={onSubmitReview}
              title="Gửi kiểm duyệt"
            >
              <Send size={16} />
              <span>Gửi duyệt</span>
            </button>
          )}
          
          <button 
            className="tb-tool-btn" 
            title="Cài đặt đề thi"
          >
            <Settings size={16} />
          </button>
        </div>

        {saveMessage && (
          <div className={`tb-save-status ${saveMessage.includes('Lỗi') ? 'tb-save-error' : 'tb-save-success'}`}>
            {saveMessage}
          </div>
        )}
      </div>
    </header>
  );
};

export default BuilderHeader;
