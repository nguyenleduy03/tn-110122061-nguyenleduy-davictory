import React, { useState, useEffect, useRef } from 'react';
import { Settings, Database, List, MessageSquare, Plus, X } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import { API_CONFIG } from '../../../config/api';

const WARMUP_CATEGORIES = ['NAME', 'HOMETOWN', 'STUDENT', 'WORK', 'GENERAL'];

const SpeakingNewFormatBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const [bankData, setBankData] = useState({ frames: [], combos: [] });
  const [loading, setLoading] = useState(true);
  const [showImportWarmUp, setShowImportWarmUp] = useState(false);
  const importWarmUpRef = useRef(null);

  const initialConfig = group.passageText ? JSON.parse(group.passageText) : {
    mode: 'BANK',
    selectedComboId: null,
    selectedOptionalFrameIds: [],
    autoRandomOptionalFrames: true,
    includeWarmUp: true,
    warmUpQuestions: [],
    mandatoryQuestionCount: 5,
    optionalFrameCount: 2,
    optionalQuestionCount: 4,
    part3QuestionCount: 5
  };

  const [config, setConfig] = useState(initialConfig);

  const addWarmUpQuestion = () => {
    const questions = config.warmUpQuestions || [];
    updateConfig({ ...config, warmUpQuestions: [...questions, { text: '', type: 'GENERAL' }] });
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
    const text = importWarmUpRef.current?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) { setShowImportWarmUp(false); return; }
    const existing = config.warmUpQuestions || [];
    const imported = lines.map(line => ({ text: line, type: 'GENERAL' }));
    updateConfig({ ...config, warmUpQuestions: [...existing, ...imported] });
    setShowImportWarmUp(false);
  };

  useEffect(() => {
    const fetchBankData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const [framesRes, combosRes] = await Promise.all([
          fetch(API_CONFIG.BASE_URL + '/speaking-gen/frames', {
            headers: { 'Authorization': 'Bearer ' + token }
          }),
          fetch(API_CONFIG.BASE_URL + '/speaking-gen/combos', {
            headers: { 'Authorization': 'Bearer ' + token }
          })
        ]);

        if (framesRes.ok && combosRes.ok) {
          const frames = await framesRes.json();
          const combos = await combosRes.json();
          setBankData({ frames, combos });
        }
      } catch (error) {
        console.error("Failed to fetch speaking bank data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBankData();
  }, []);

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    onUpdate(group.id, { passageText: JSON.stringify(newConfig) });
  };

  if (loading) return <div className="exam-group">Loading Speaking Bank...</div>;

  const optionalFrames = bankData.frames.filter(f => f.frameType === 'OPTIONAL');

  const handleFrameToggle = (frameId) => {
    const current = config.selectedOptionalFrameIds || [];
    const next = current.includes(frameId)
      ? current.filter(id => id !== frameId)
      : [...current, frameId];
    updateConfig({ ...config, selectedOptionalFrameIds: next });
  };

  const NumberInput = ({ label, value, onChange, min = 1, max = 20 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: '0.85em', color: '#374151', minWidth: 180 }}>{label}</span>
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

  const isInline = config.mode === 'INLINE';

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '1.1em', color: '#be185d' }}>
          <Settings size={18} /> Cấu hình đề thi Speaking
        </label>
        <p style={{ fontSize: '0.9em', color: '#666', marginTop: 8 }}>
          {isInline
            ? 'Chế độ INLINE: Dùng các block Part 1/2/3 bên dưới làm nguồn dữ liệu. Hệ thống sẽ random chọn câu hỏi theo cấu hình.'
            : 'Chế độ BANK: Dùng dữ liệu từ Speaking Bank. Chọn combo và frames bên dưới.'}
        </p>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.85em', fontWeight: 600, color: '#374151' }}>Chế độ:</span>
          <button
            onClick={() => updateConfig({ ...config, mode: 'BANK' })}
            style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer',
              background: !isInline ? '#be185d' : '#f3f4f6', color: !isInline ? 'white' : '#374151',
              fontWeight: 600, fontSize: '0.85em'
            }}
          >
            <Database size={14} style={{ marginRight: 4 }} /> BANK
          </button>
          <button
            onClick={() => updateConfig({ ...config, mode: 'INLINE' })}
            style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer',
              background: isInline ? '#be185d' : '#f3f4f6', color: isInline ? 'white' : '#374151',
              fontWeight: 600, fontSize: '0.85em'
            }}
          >
            <List size={14} style={{ marginRight: 4 }} /> INLINE
          </button>
        </div>

        {/* Part 0 - chung cho cả 2 mode */}
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
                <button className="exam-spk-qadd" onClick={(e) => { e.stopPropagation(); setShowImportWarmUp(true); }}>
                  📋 Import
                </button>
              </div>
            </div>
          )}
        </div>

        {isInline ? (
          <>
            {/* INLINE mode config */}
            <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f0fdf4' }}>
              <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em', color: '#166534' }}>
                <List size={14} /> Cấu hình INLINE
              </h4>
              <p style={{ fontSize: '0.85em', color: '#4b5563', marginBottom: 12 }}>
                Dùng các block <strong>Part 1 - Interview</strong>, <strong>Part 2 - Cue Card</strong>, <strong>Part 3 - Discussion</strong> bên dưới.
                Mỗi block Part 1 là một Frame — nhập frameType, profile, randomCount trong block đó.
              </p>
              <NumberInput
                label="Số Optional Frame sẽ lấy:"
                value={config.optionalFrameCount || 2}
                onChange={(v) => updateConfig({ ...config, optionalFrameCount: v })}
              />
              <NumberInput
                label="Số câu mỗi Optional Frame (mặc định):"
                value={config.optionalQuestionCount || 4}
                onChange={(v) => updateConfig({ ...config, optionalQuestionCount: v })}
              />
              <NumberInput
                label="Số câu Mandatory (mặc định):"
                value={config.mandatoryQuestionCount || 5}
                onChange={(v) => updateConfig({ ...config, mandatoryQuestionCount: v })}
              />
            </div>

            <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fdf2f8' }}>
              <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em' }}>
                <Database size={14} /> Part 3 - Số câu Discussion (mặc định)
              </h4>
              <NumberInput
                label="Số câu Part 3:"
                value={config.part3QuestionCount || 5}
                onChange={(v) => updateConfig({ ...config, part3QuestionCount: v })}
              />
            </div>
          </>
        ) : (
          <>
            {/* BANK mode config */}
            <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f0f9ff' }}>
              <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em' }}>
                <List size={14} /> Part 1 - Số lượng câu hỏi
              </h4>
              <NumberInput
                label="Số câu từ Frame bắt buộc:"
                value={config.mandatoryQuestionCount || 5}
                onChange={(v) => updateConfig({ ...config, mandatoryQuestionCount: v })}
              />
              <NumberInput
                label="Số Frame tùy chọn:"
                value={config.optionalFrameCount || 2}
                onChange={(v) => updateConfig({ ...config, optionalFrameCount: v })}
              />
              <NumberInput
                label="Số câu mỗi Frame tùy chọn:"
                value={config.optionalQuestionCount || 4}
                onChange={(v) => updateConfig({ ...config, optionalQuestionCount: v })}
              />
            </div>

            <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fdf2f8' }}>
              <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em' }}>
                <Database size={14} /> Part 2 & 3 - Combo
              </h4>
              <select
                value={config.selectedComboId || ''}
                onChange={(e) => updateConfig({ ...config, selectedComboId: e.target.value ? Number(e.target.value) : null })}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', marginBottom: 10 }}
              >
                <option value="">-- Vui lòng chọn 1 Combo --</option>
                {bankData.combos.map(combo => (
                  <option key={combo.id} value={combo.id}>{combo.title}</option>
                ))}
              </select>
              <NumberInput
                label="Số câu Part 3 Discussion:"
                value={config.part3QuestionCount || 5}
                onChange={(v) => updateConfig({ ...config, part3QuestionCount: v })}
              />
            </div>

            <div style={{ marginTop: 16, padding: 15, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f0fdf4' }}>
              <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95em' }}>
                <Database size={14} /> Chọn Frame Part 1
              </h4>
              <p style={{ fontSize: '0.85em', color: '#4b5563', marginBottom: 10 }}>
                Hệ thống luôn tự động chọn 1 Frame bắt buộc dựa trên thông tin thí sinh (Student/Work).
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15, fontWeight: 500, fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={config.autoRandomOptionalFrames}
                  onChange={(e) => {
                    const isAuto = e.target.checked;
                    updateConfig({ ...config, autoRandomOptionalFrames: isAuto, selectedOptionalFrameIds: isAuto ? [] : config.selectedOptionalFrameIds });
                  }}
                />
                Hệ thống tự động random Frame tùy chọn
              </label>
              {!config.autoRandomOptionalFrames && (
                <div style={{ marginLeft: 24 }}>
                  <p style={{ fontSize: '0.85em', color: '#666', marginBottom: 8 }}>Chọn thủ công các Frame:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {optionalFrames.map(frame => (
                      <label key={frame.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: '0.85em' }}>
                        <input type="checkbox" checked={(config.selectedOptionalFrameIds || []).includes(frame.id)} onChange={() => handleFrameToggle(frame.id)} />
                        {frame.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Import modal */}
      {showImportWarmUp && (
        <div className="exam-import-modal" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000, width: '400px', border: '1px solid #e5e7eb'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Import Warm-up Questions</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Mỗi dòng là một câu hỏi</p>
          <textarea ref={importWarmUpRef} rows={8}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}
            placeholder="VD:&#10;What is your full name?&#10;Where do you live?&#10;Do you work or study?" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleImportWarmUp} style={{
              flex: 1, padding: '8px 16px', backgroundColor: '#be185d', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Import</button>
            <button onClick={() => setShowImportWarmUp(false)} style={{
              padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#4b5563',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingNewFormatBlock;
