import React, { useState, useRef } from 'react';
import { Settings, MessageSquare, Plus, X } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';

const WARMUP_CATEGORIES = ['NAME', 'HOMETOWN', 'STUDENT', 'WORK', 'GENERAL'];

const SpeakingPart0Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const initialConfig = group.passageText ? JSON.parse(group.passageText) : {
    includeWarmUp: true,
    warmUpQuestions: [],
    optionalFrameCount: 2,
    mandatoryQuestionCount: 5,
    optionalQuestionCount: 4,
    part3QuestionCount: 5
  };

  const [config, setConfig] = useState(initialConfig);
  const [showImport, setShowImport] = useState(false);
  const importRef = useRef(null);

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    onUpdate(group.id, { passageText: JSON.stringify(newConfig) });
  };

  const addWarmUpQuestion = () => {
    const questions = config.warmUpQuestions || [];
    updateConfig({
      ...config,
      warmUpQuestions: [...questions, { text: '', type: 'GENERAL' }]
    });
  };

  const updateWarmUpQuestion = (idx, field, value) => {
    const questions = [...(config.warmUpQuestions || [])];
    questions[idx] = { ...questions[idx], [field]: value };
    updateConfig({ ...config, warmUpQuestions: questions });
  };

  const removeWarmUpQuestion = (idx) => {
    const questions = (config.warmUpQuestions || []).filter((_, i) => i !== idx);
    updateConfig({ ...config, warmUpQuestions: questions });
  };

  const handleImportWarmUp = () => {
    const text = importRef.current?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) { setShowImport(false); return; }
    const existing = config.warmUpQuestions || [];
    const imported = lines.map(line => ({ text: line, type: 'GENERAL' }));
    updateConfig({ ...config, warmUpQuestions: [...existing, ...imported] });
    setShowImport(false);
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
            Bao gồm câu hỏi Warm-up
          </label>

          {config.includeWarmUp && (
            <div style={{ marginTop: 12 }}>
              {(config.warmUpQuestions || []).map((q, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateWarmUpQuestion(idx, 'text', e.target.value)}
                    placeholder="Nhập câu hỏi warm-up..."
                    rows={2}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.85em', outline: 'none', resize: 'vertical' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateWarmUpQuestion(idx, 'type', e.target.value)}
                    style={{ width: 110, padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.8em' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {WARMUP_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button onClick={(e) => { e.stopPropagation(); removeWarmUpQuestion(idx); }}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#dc2626' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="exam-spk-qadd" onClick={(e) => { e.stopPropagation(); addWarmUpQuestion(); }}>
                  <Plus size={12} /> Thêm câu hỏi
                </button>
                <button className="exam-spk-qadd" onClick={(e) => { e.stopPropagation(); setShowImport(true); }}>
                  📋 Import
                </button>
              </div>
            </div>
          )}
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

      {showImport && (
        <div className="exam-import-modal" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000, width: '400px', border: '1px solid #e5e7eb'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Import Warm-up Questions</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Mỗi dòng là một câu hỏi</p>
          <textarea ref={importRef} rows={8}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}
            placeholder="VD:&#10;What is your full name?&#10;Where do you live?&#10;Do you work or study?" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleImportWarmUp} style={{
              flex: 1, padding: '8px 16px', backgroundColor: '#c2410c', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Import</button>
            <button onClick={() => setShowImport(false)} style={{
              padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#4b5563',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingPart0Block;
