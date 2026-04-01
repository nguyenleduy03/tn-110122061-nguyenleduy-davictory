/**
 * Nhóm câu: bảng lựa chọn chung bên trái + từng dòng câu hỏi bên phải (IELTS Listening style).
 * Tách module — không dùng chung UI với MultipleChoiceBlock.
 * `toolbar`: truyền từ ExamCanvas (GroupToolbar + kéo thả / xóa / di chuyển).
 */
import React from 'react';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import RichInput from '../common/RichInput';
import ImageUploadZone from './blocks/shared/ImageUploadZone';
import { loadImageFile } from './blocks/shared/blockHelpers';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';

const defaultSharedOptions = () => [
  { id: `so-${Date.now()}-a`, key: 'A', label: '', imageUrl: '' },
  { id: `so-${Date.now()}-b`, key: 'B', label: '', imageUrl: '' },
  { id: `so-${Date.now()}-c`, key: 'C', label: '', imageUrl: '' },
];

const SharedOptionsDropdownBlock = ({
  toolbar,
  group,
  onUpdate,
  onSelect,
  selected,
  onSelectQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddQuestion,
  selectedQuestionId,
  testTitle,
  testId,
  module = 'READING',
}) => {
  const questions = group.questions ?? [];
  const sharedOptions = group.sharedOptions?.length ? group.sharedOptions : defaultSharedOptions();

  const syncSharedOptions = (next) => {
    onUpdate(group.id, { sharedOptions: next });
  };

  const updateOptionLabel = (idx, label) => {
    const next = sharedOptions.map((o, i) => (i === idx ? { ...o, label } : o));
    syncSharedOptions(next);
  };

  const addSharedOption = () => {
    const n = sharedOptions.length;
    const key = String.fromCharCode(65 + n);
    syncSharedOptions([...sharedOptions, { id: `so-${Date.now()}`, key, label: '' }]);
  };

  const removeSharedOption = (idx) => {
    if (sharedOptions.length <= 2) return;
    const next = sharedOptions.filter((_, i) => i !== idx).map((o, i) => ({
      ...o,
      key: String.fromCharCode(65 + i),
    }));
    syncSharedOptions(next);
  };

  const [showImportOptions, setShowImportOptions] = React.useState(false);
  const [showImportQuestions, setShowImportQuestions] = React.useState(false);

  const handleImportOptions = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const imported = lines.map((label, i) => ({
      id: `so-${Date.now()}-${i}`,
      key: String.fromCharCode(65 + i),
      label,
      imageUrl: ''
    }));
    syncSharedOptions(imported);
    setShowImportOptions(false);
  };

  const handleImportQuestions = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const fromQ = group.fromQuestion || 1;
    const imported = lines.map((qText, i) => ({
      id: `q-${Date.now()}-${i}`,
      questionNumber: fromQ + i,
      questionText: qText,
      answerText: '',
      answers: [{ blankIndex: 1, isCaseSensitive: false, answerText: '' }]
    }));
    onUpdate(group.id, { questions: imported });
    setShowImportQuestions(false);
  };

  return (
    <div
      className={`exam-group exam-shared-options-dropdown${selected ? ' selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(group);
      }}
    >
      {toolbar}

      <div className="tb-sod-layout">
        <aside className="tb-sod-rail" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="tb-sod-rail-title">Bảng lựa chọn</div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={group.hideOptionsTable ?? false}
                onChange={(e) => onUpdate(group.id, { hideOptionsTable: e.target.checked })}
              />
              Ẩn bảng
            </label>
          </div>
          <p className="tb-sod-rail-hint">Áp dụng cho mọi câu trong nhóm</p>
          {sharedOptions.map((opt, idx) => (
            <div key={opt.id || idx} className="tb-sod-opt-row">
              <span className="tb-sod-opt-key">{opt.key}</span>
              <RichInput
                value={opt.label ?? ''}
                placeholder="Mô tả lựa chọn..."
                onChange={(html) => updateOptionLabel(idx, html)}
              />
              <label className="exam-mc-img-file-btn" title="Thêm ảnh" style={{ marginRight: 4 }}>
                <ImageIcon size={12} />
                <input type="file" accept="image/*" hidden 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    loadImageFile(file, (imageUrl) => {
                      const next = sharedOptions.map((o, i) => i === idx ? { ...o, imageUrl } : o);
                      syncSharedOptions(next);
                    }, module, testTitle, testId, 'SHARED_OPTION');
                  }} />
              </label>
              {opt.imageUrl && (
                <button
                  type="button"
                  className="exam-q-del-btn"
                  title="Xóa ảnh"
                  onClick={() => {
                    const next = sharedOptions.map((o, i) => i === idx ? { ...o, imageUrl: '' } : o);
                    syncSharedOptions(next);
                  }}
                >
                  ×
                </button>
              )}
              <button
                type="button"
                className="exam-q-del-btn"
                title="Xóa lựa chọn"
                onClick={() => removeSharedOption(idx)}
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="exam-add-btn tb-sod-add-opt" onClick={addSharedOption} style={{ flex: 1 }}>
              <Plus size={12} /> Thêm lựa chọn
            </button>
            <button type="button" className="exam-add-btn" onClick={() => setShowImportOptions(!showImportOptions)} style={{ fontSize: 11, padding: '4px 8px' }}>
              📋
            </button>
          </div>
          {showImportOptions && (
            <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Paste danh sách (mỗi dòng = 1 lựa chọn):</div>
              <textarea
                rows={4}
                placeholder="A. Option 1&#10;B. Option 2&#10;C. Option 3"
                style={{ width: '100%', padding: 6, fontSize: 11, fontFamily: 'monospace', border: '1px solid #cbd5e1', borderRadius: 3 }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text');
                  handleImportOptions(text);
                }}
              />
              <button type="button" className="exam-add-btn" onClick={(e) => {
                const text = e.target.previousElementSibling.value;
                handleImportOptions(text);
              }} style={{ fontSize: 11, marginTop: 4 }}>
                Import
              </button>
            </div>
          )}
        </aside>

        <div className="tb-sod-main">
          <div className="tb-sod-range-row">
            <span className="tb-sod-range-label">Tiêu đề nhóm (vd: Questions 26–30)</span>
            <RichInput
              value={group.title ?? ''}
              placeholder="Questions 26 – 30"
              onChange={(html) => onUpdate(group.id, { title: html })}
            />
          </div>

          <div className="tb-sod-range-row exam-q-range-header" style={{ marginTop: 8 }}>
            Câu&nbsp;
            <input
              className="exam-q-range-input"
              value={group.fromQuestion ?? ''}
              placeholder="26"
              onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
              onClick={(e) => e.stopPropagation()}
            />
            &nbsp;–&nbsp;
            <input
              className="exam-q-range-input"
              value={group.toQuestion ?? ''}
              placeholder="30"
              onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="tb-sod-field">
            <label className="tb-sod-label">Hướng dẫn chính</label>
            <RichInput
              multiline
              rows={2}
              value={group.mainInstruction ?? ''}
              placeholder="In what time period can the float projects help with the issues 26–30 below?"
              onChange={(html) => onUpdate(group.id, { mainInstruction: html })}
            />
          </div>

          <div className="tb-sod-field">
            <label className="tb-sod-label">Hướng dẫn nhập đáp án</label>
            <RichInput
              multiline
              rows={2}
              value={group.subInstruction ?? ''}
              placeholder="Write the correct letter, A, B or C, next to questions 26–30."
              onChange={(html) => onUpdate(group.id, { subInstruction: html })}
            />
          </div>

          {/* Image upload */}
          <div className="tb-sod-field">
            <label className="tb-sod-label">Ảnh minh họa (tùy chọn)</label>
            <ImageUploadZone
              imageUrl={group.imageUrl}
              onImageChange={(url) => onUpdate(group.id, { imageUrl: url })}
              onImageDelete={() => onUpdate(group.id, { imageUrl: null })}
              placeholder="Nhập URL ảnh hoặc kéo thả/paste ảnh vào đây"
              module={module}
              testTitle={testTitle}
              testId={testId}
              assetLabel="SHARED_OPTIONS_DROPDOWN"
              showPreview={true}
            />
            {group.imageUrl && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Kích thước:</label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={group.imageWidth || 100}
                  onChange={(e) => onUpdate(group.id, { imageWidth: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, color: '#6b7280', minWidth: 40 }}>
                  {group.imageWidth || 100}%
                </span>
              </div>
            )}
          </div>

          <div className="tb-sod-questions">
            <div className="exam-ml-answer-section" onClick={(e) => e.stopPropagation()}>
              <div className="exam-ml-answer-title">🔑 Đáp án (chọn từ bảng lựa chọn)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic' }}>
                💡 Chọn đáp án đúng từ dropdown (A, B, C...)
              </div>
              {questions.map((q) => {
                const correct = (q.answerText ?? q.answers?.[0]?.answerText ?? '').trim();
                return (
                  <div key={q.id} className="exam-ml-answer-row">
                    <span className="exam-ml-answer-num">Câu {q.questionNumber ?? '?'}</span>
                    <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <RichInput
                        value={q.questionText || ''}
                        placeholder="Nhãn câu (vd: El Niño)..."
                        onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })}
                        style={{ flex: 1 }}
                      />
                      <select
                        className="tb-sod-correct-select"
                        value={correct}
                        title="Đáp án đúng"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const v = e.target.value;
                          onUpdateQuestion(group.id, q.id, {
                            answerText: v,
                            answers: [{ blankIndex: 1, isCaseSensitive: false, answerText: v }],
                          });
                        }}
                        style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
                      >
                        <option value="">—</option>
                        {sharedOptions.map((o) => (
                          <option key={o.key} value={o.key}>{o.key}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="exam-group-tool-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteQuestion(group.id, q.id);
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className="exam-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddQuestion(group);
              }}
              style={{ flex: 1 }}
            >
              <Plus size={12} /> Thêm câu
            </button>
            <button type="button" className="exam-add-btn" onClick={() => setShowImportQuestions(!showImportQuestions)} style={{ fontSize: 11, padding: '4px 8px' }}>
              📋
            </button>
          </div>
          {showImportQuestions && (
            <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Paste danh sách câu hỏi (mỗi dòng = 1 câu):</div>
              <textarea
                rows={6}
                placeholder="El Niño&#10;La Niña&#10;Climate change"
                style={{ width: '100%', padding: 6, fontSize: 11, fontFamily: 'monospace', border: '1px solid #cbd5e1', borderRadius: 3 }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text');
                  handleImportQuestions(text);
                }}
              />
              <button type="button" className="exam-add-btn" onClick={(e) => {
                const text = e.target.previousElementSibling.value;
                handleImportQuestions(text);
              }} style={{ fontSize: 11, marginTop: 4 }}>
                Import
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedOptionsDropdownBlock;
