import React, { useState } from 'react';
import { Settings, MessageSquare } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';

const SpeakingPart0Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const initialConfig = group.passageText ? JSON.parse(group.passageText) : {
    includeWarmUp: true,
    optionalFrameCount: 2,
    mandatoryQuestionCount: 5,
    optionalQuestionCount: 4,
    part3QuestionCount: 5
  };

  const [config, setConfig] = useState(initialConfig);

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    onUpdate(group.id, { passageText: JSON.stringify(newConfig) });
  };

  const NumberInput = ({ label, value, onChange, min = 1, max = 20 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: '0.85em', color: '#374151', minWidth: 200 }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        style={{ width: 64, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '1.1em', color: '#c2410c' }}>
          <Settings size={18} /> Part 0 - Cấu hình đề thi Speaking
        </label>
        <p style={{ fontSize: '0.9em', color: '#666', marginTop: 8 }}>
          Dùng các block <strong>Part 1 - Interview</strong>, <strong>Part 2 - Cue Card</strong>, <strong>Part 3 - Discussion</strong> bên dưới làm nguồn dữ liệu.
          Hệ thống sẽ random chọn câu hỏi theo cấu hình bên dưới.
        </p>

        <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fefce8' }}>
          <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em' }}>
            <MessageSquare size={14} /> Part 0 - Warm-up
          </h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: '0.9em' }}>
            <input
              type="checkbox"
              checked={config.includeWarmUp}
              onChange={(e) => updateConfig({ ...config, includeWarmUp: e.target.checked })}
            />
            Bao gồm câu hỏi Warm-up (Name, Hometown, Student/Work)
          </label>
        </div>

        <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f0fdf4' }}>
          <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em', color: '#166534' }}>
            Cấu hình Part 1 - Interview
          </h4>
          <NumberInput
            label="Số Optional Frame sẽ lấy:"
            value={config.optionalFrameCount}
            onChange={(v) => updateConfig({ ...config, optionalFrameCount: v })}
          />
          <NumberInput
            label="Số câu mỗi Optional Frame (mặc định):"
            value={config.optionalQuestionCount}
            onChange={(v) => updateConfig({ ...config, optionalQuestionCount: v })}
          />
          <NumberInput
            label="Số câu Mandatory (mặc định):"
            value={config.mandatoryQuestionCount}
            onChange={(v) => updateConfig({ ...config, mandatoryQuestionCount: v })}
          />
        </div>

        <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fdf2f8' }}>
          <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em' }}>
            Cấu hình Part 3 - Discussion
          </h4>
          <NumberInput
            label="Số câu Part 3 (mặc định):"
            value={config.part3QuestionCount}
            onChange={(v) => updateConfig({ ...config, part3QuestionCount: v })}
          />
        </div>
      </div>
    </div>
  );
};

export default SpeakingPart0Block;
