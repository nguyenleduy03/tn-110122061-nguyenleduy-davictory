import React, { useEffect } from 'react';
import { X, Plus, Image } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import ImageUploadZone from './shared/ImageUploadZone';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { loadImageFile } from './shared/blockHelpers';

const MultipleChoiceBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, testTitle, testId, module = 'READING',
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {

  const questions = group.questions ?? [];

  // Initialize options on mount if missing
  React.useEffect(() => {
    questions.forEach(q => {
      if (!q.options || q.options.length === 0) {
        const defaultOpts = ['A', 'B', 'C', 'D'].map((label, i) => ({
          id: Date.now() + i,
          optionLabel: label,
          optionText: '',
          isCorrect: false,
          orderIndex: i
        }));
        onUpdateQuestion(group.id, q.id, { options: defaultOpts });
      }
    });
  }, []);

  const ensureOptions = (q) => {
    if (!q.options || q.options.length === 0) {
      return ['A', 'B', 'C', 'D'].map((label, i) => ({
        id: Date.now() + i,
        optionLabel: label,
        optionText: '',
        isCorrect: false,
        orderIndex: i
      }));
    }
    return q.options;
  };

  const handleUpdateOption = (q, optIndex, updates) => {
    const opts = ensureOptions(q);
    const next = opts.map((o, i) => i === optIndex ? { ...o, ...updates } : o);
    onUpdateQuestion(group.id, q.id, { options: next });
  };

  const handleSetCorrect = (q, optIndex) => {
    const opts = ensureOptions(q);
    const next = opts.map((o, i) => ({ ...o, isCorrect: i === optIndex }));
    const correctOpt = opts[optIndex];
    onUpdateQuestion(group.id, q.id, {
      options: next,
      answerText: correctOpt?.optionLabel || String.fromCharCode(65 + optIndex)
    });
  };

  const handleAddOption = (q) => {
    const opts = ensureOptions(q);
    const nextLabel = String.fromCharCode(65 + opts.length);
    onUpdateQuestion(group.id, q.id, {
      options: [...opts, {
        id: Date.now(),
        optionLabel: nextLabel,
        optionText: '',
        isCorrect: false,
        orderIndex: opts.length
      }]
    });
  };

  const handleDeleteOption = (q, optIndex) => {
    const opts = ensureOptions(q);
    if (opts.length <= 2) return; // Keep at least 2 options
    onUpdateQuestion(group.id, q.id, { options: opts.filter((_, i) => i !== optIndex) });
  };

  const [importStates, setImportStates] = React.useState({});

  const handleImportOptions = (q, text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Xóa option rỗng (không có optionText)
    const existingOpts = (q.options || []).filter(o => o.optionText?.trim());
    const startIdx = existingOpts.length;

    const imported = lines.map((optText, i) => ({
      id: Date.now() + i,
      optionLabel: String.fromCharCode(65 + startIdx + i),
      optionText: optText,
      isCorrect: false,
      orderIndex: startIdx + i
    }));
    onUpdateQuestion(group.id, q.id, { options: [...existingOpts, ...imported] });
    setImportStates(prev => ({ ...prev, [q.id]: false }));
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-q-range-header">
        Questions {group.fromQuestion ?? questions[0]?.questionNumber ?? '?'}
        {(() => {
          const last = group.toQuestion ?? questions[questions.length - 1]?.questionNumber;
          const first = group.fromQuestion ?? questions[0]?.questionNumber;
          return (last && last !== first) ? `–${last}` : '';
        })()}
      </div>

      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Choose the correct letter, A, B, C or D."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Ngữ cảnh chung (nếu có)"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onInput={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        onBlur={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />

      {questions.map((q) => {
        const opts = ensureOptions(q);

        return (
          <div key={q.id}
            className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>

            <div className="exam-mc-q-header">
              <div className="exam-q-num">{q.questionNumber ?? '?'}</div>
              <RichInput
                style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Nội dung câu hỏi..."
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>

            <div className="exam-mc-options">
              {opts.map((opt, i) => {
                const isImg = opt.optionMode === 'image';
                const label = opt.optionLabel || String.fromCharCode(65 + i);

                return (
                  <div key={opt.id || `opt-${i}`}
                    className={`exam-mc-opt${opt.isCorrect ? ' correct' : ''}${isImg ? ' exam-mc-opt-img-row' : ''}`}>

                    <span className="exam-mc-opt-label">{label}</span>

                    {isImg ? (
                      <div className="exam-mc-opt-image-cell">
                        <ImageUploadZone
                          imageUrl={opt.optionImageUrl}
                          onImageChange={(url) => handleUpdateOption(q, i, { optionImageUrl: url })}
                          onImageDelete={() => handleUpdateOption(q, i, { optionImageUrl: '' })}
                          placeholder={`URL ảnh cho ${label}...`}
                          module={module}
                          assetLabel="MCQ_OPTION"
                          testTitle={testTitle}
                          testId={testId}
                          showPreview={true}
                          compact={false}
                        />
                      </div>
                    ) : (
                      <RichInput
                        style={{ flex: 1 }}
                        value={opt.optionText || ''}
                        placeholder={`Lựa chọn ${label}...`}
                        onChange={(html) => handleUpdateOption(q, i, { optionText: html })} />
                    )}

                    <button
                      className="exam-mc-opt-mode-btn"
                      title={isImg ? 'Chuyển sang text' : 'Chuyển sang ảnh'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateOption(q, i, { optionMode: isImg ? 'text' : 'image' });
                      }}>
                      {isImg ? <span style={{ fontSize: 11, fontWeight: 700 }}>Aa</span> : <Image size={12} />}
                    </button>

                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      className="exam-mc-opt-radio"
                      checked={!!opt.isCorrect}
                      title="Đáp án đúng"
                      onChange={() => handleSetCorrect(q, i)}
                      onClick={(e) => e.stopPropagation()} />

                    <button className="exam-q-del-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteOption(q, i); }}>×</button>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: 4 }}>
                <button className="exam-add-btn" style={{ padding: '3px 10px', fontSize: 11, marginTop: 4, flex: 1 }}
                  onClick={(e) => { e.stopPropagation(); handleAddOption(q); }}>
                  <Plus size={10} /> Thêm lựa chọn
                </button>
                <button className="exam-add-btn" style={{ padding: '3px 8px', fontSize: 11, marginTop: 4 }}
                  onClick={(e) => { e.stopPropagation(); setImportStates(prev => ({ ...prev, [q.id]: !prev[q.id] })); }}>
                  📋
                </button>
              </div>
              {importStates[q.id] && (
                <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Paste lựa chọn (mỗi dòng = 1 option):</div>
                  <textarea
                    rows={4}
                    placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
                    style={{ width: '100%', padding: 6, fontSize: 11, fontFamily: 'monospace', border: '1px solid #cbd5e1', borderRadius: 3 }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text');
                      handleImportOptions(q, text);
                    }}
                  />
                  <button className="exam-add-btn" onClick={(e) => {
                    e.stopPropagation();
                    const text = e.target.previousElementSibling.value;
                    handleImportOptions(q, text);
                  }} style={{ fontSize: 11, marginTop: 4 }}>
                    Import
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};

export default MultipleChoiceBlock;
