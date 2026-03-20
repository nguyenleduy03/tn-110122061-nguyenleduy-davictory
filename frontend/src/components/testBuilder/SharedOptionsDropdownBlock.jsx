/**
 * Nhóm câu: bảng lựa chọn chung bên trái + từng dòng câu hỏi bên phải (IELTS Listening style).
 * Tách module — không dùng chung UI với MultipleChoiceBlock.
 * `toolbar`: truyền từ ExamCanvas (GroupToolbar + kéo thả / xóa / di chuyển).
 */
import React from 'react';
import { X, Plus } from 'lucide-react';
import RichInput from '../common/RichInput';

const defaultSharedOptions = () => [
  { id: `so-${Date.now()}-a`, key: 'A', label: '' },
  { id: `so-${Date.now()}-b`, key: 'B', label: '' },
  { id: `so-${Date.now()}-c`, key: 'C', label: '' },
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
          <div className="tb-sod-rail-title">Bảng lựa chọn</div>
          <p className="tb-sod-rail-hint">Áp dụng cho mọi câu trong nhóm</p>
          {sharedOptions.map((opt, idx) => (
            <div key={opt.id || idx} className="tb-sod-opt-row">
              <span className="tb-sod-opt-key">{opt.key}</span>
              <RichInput
                value={opt.label ?? ''}
                placeholder="Mô tả lựa chọn..."
                onChange={(html) => updateOptionLabel(idx, html)}
              />
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
          <button type="button" className="exam-add-btn tb-sod-add-opt" onClick={addSharedOption}>
            <Plus size={12} /> Thêm lựa chọn
          </button>
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

          <div className="tb-sod-questions">
            {questions.map((q) => {
              const correct = (q.answerText ?? q.answers?.[0]?.answerText ?? '').trim();
              return (
                <div
                  key={q.id}
                  className={`tb-sod-q-row${selectedQuestionId === q.id ? ' selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectQuestion(q);
                  }}
                >
                  <span className="exam-q-num" style={{ background: '#0369a1' }}>{q.questionNumber ?? '?'}</span>
                  <RichInput
                    value={q.questionText || ''}
                    placeholder="Nhãn câu (vd: El Niño)..."
                    onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })}
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
              );
            })}
          </div>

          <button
            type="button"
            className="exam-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddQuestion(group);
            }}
          >
            <Plus size={12} /> Thêm câu
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharedOptionsDropdownBlock;
