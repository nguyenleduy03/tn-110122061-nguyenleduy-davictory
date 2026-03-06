import React from 'react';
import { Trash2, MousePointerClick } from 'lucide-react';

const CONTENT_TYPES = [
  'READING_PASSAGE', 'AUDIO_TRANSCRIPT', 'STANDALONE',
  'DIAGRAM', 'MAP', 'TABLE', 'MATCHING_HEADING', 'SUMMARY_COMPLETION'
];
const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE',          label: 'Multiple Choice (1 đáp án)' },
  { value: 'MULTIPLE_CHOICE_MULTIPLE', label: 'Multiple Choice (nhiều đáp án)' },
  { value: 'FILL_IN_BLANK',            label: 'Fill in the Blank' },
  { value: 'TRUE_FALSE_NG',            label: 'True / False / Not Given' },
  { value: 'MATCHING_HEADINGS',        label: 'Matching Headings' },
  { value: 'MATCHING_INFO',            label: 'Matching Information' },
  { value: 'SHORT_ANSWER',             label: 'Short Answer' },
  { value: 'NOTE_COMPLETION',          label: 'Note Completion' },
];

// ---- Sub-panel: Part properties ----
const PartPanel = ({ part, onChange, onDelete }) => (
  <>
    <div className="tb-panel-section-title">Thông tin Part</div>

    <div className="tb-field">
      <label className="tb-label">Tên Part <span>*</span></label>
      <input
        className="tb-input"
        value={part.name ?? ''}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="VD: Part 1 – Short Conversations"
        maxLength={100}
      />
    </div>

    <div className="tb-field">
      <label className="tb-label">Hướng dẫn</label>
      <textarea
        className="tb-textarea"
        value={part.instructions ?? ''}
        onChange={(e) => onChange({ instructions: e.target.value })}
        placeholder="Nội dung hướng dẫn cho học viên..."
        rows={3}
      />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div className="tb-field">
        <label className="tb-label">Số câu hỏi</label>
        <input
          className="tb-input"
          type="number"
          min={1}
          value={part.totalQuestions ?? ''}
          onChange={(e) => onChange({ totalQuestions: Number(e.target.value) })}
          placeholder="10"
        />
      </div>
      <div className="tb-field">
        <label className="tb-label">Thời gian (phút)</label>
        <input
          className="tb-input"
          type="number"
          min={1}
          value={part.durationMinutes ?? ''}
          onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
          placeholder="30"
        />
      </div>
    </div>

    <div className="tb-section-divider" />
    <button className="tb-delete-btn" onClick={onDelete}>
      <Trash2 size={14} /> Xóa Part này
    </button>
  </>
);

// ---- Sub-panel: Question Group properties ----
const GroupPanel = ({ group, onChange, onDelete }) => (
  <>
    <div className="tb-panel-section-title">Thông tin Nhóm câu hỏi</div>

    <div className="tb-field">
      <label className="tb-label">Tiêu đề nhóm <span>*</span></label>
      <input
        className="tb-input"
        value={group.title ?? ''}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="VD: Questions 1-13"
        maxLength={200}
      />
    </div>

    <div className="tb-field">
      <label className="tb-label">Loại nội dung</label>
      <select
        className="tb-select"
        value={group.contentType ?? 'STANDALONE'}
        onChange={(e) => onChange({ contentType: e.target.value })}
      >
        {CONTENT_TYPES.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </div>

    {(group.contentType === 'MATCHING_HEADING') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Matching Headings</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fff7ed', borderRadius: 6, border: '1px solid #fed7aa' }}>
          Thêm heading trong canvas trực tiếp. Tại đây bạn có thể đổi tên và cài đặt phạm vi câu hỏi.
        </div>
      </div>
    )}

    {(group.contentType === 'SUMMARY_COMPLETION') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Summary Completion</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
          Nhập văn bản tóm tắt vào canvas trực tiếp. Dùng <code>[blank]</code> để đánh dấu ô trống.
        </div>
      </div>
    )}

    {(group.contentType === 'READING_PASSAGE') && (
      <div className="tb-field">
        <label className="tb-label">Nội dung bài đọc</label>
        <textarea
          className="tb-textarea"
          style={{ minHeight: 120 }}
          value={group.passageText ?? ''}
          onChange={(e) => onChange({ passageText: e.target.value })}
          placeholder="Dán nội dung bài đọc vào đây..."
        />
      </div>
    )}

    {(group.contentType === 'AUDIO_TRANSCRIPT') && (
      <div className="tb-field">
        <label className="tb-label">URL Audio</label>
        <input
          className="tb-input"
          value={group.audioUrl ?? ''}
          onChange={(e) => onChange({ audioUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    )}

    {(group.contentType === 'DIAGRAM' || group.contentType === 'MAP') && (
      <div className="tb-field">
        <label className="tb-label">URL Hình ảnh</label>
        <input
          className="tb-input"
          value={group.imageUrl ?? ''}
          onChange={(e) => onChange({ imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div className="tb-field">
        <label className="tb-label">Câu hỏi từ</label>
        <input
          className="tb-input"
          type="number"
          min={1}
          value={group.fromQuestion ?? ''}
          onChange={(e) => onChange({ fromQuestion: Number(e.target.value) })}
          placeholder="1"
        />
      </div>
      <div className="tb-field">
        <label className="tb-label">Đến câu</label>
        <input
          className="tb-input"
          type="number"
          min={1}
          value={group.toQuestion ?? ''}
          onChange={(e) => onChange({ toQuestion: Number(e.target.value) })}
          placeholder="13"
        />
      </div>
    </div>

    <div className="tb-section-divider" />
    <button className="tb-delete-btn" onClick={onDelete}>
      <Trash2 size={14} /> Xóa Nhóm này
    </button>
  </>
);

// ---- Sub-panel: Question properties ----
const QuestionPanel = ({ question, onChange, onDelete }) => {
  const qtype = question.questionType?.typeName ?? 'MULTIPLE_CHOICE';
  const options = question.options ?? [];
  const answers = question.answers ?? [];

  const updateOption = (idx, key, val) => {
    const next = options.map((o, i) => i === idx ? { ...o, [key]: val } : o);
    onChange({ options: next });
  };

  const addOption = () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    onChange({
      options: [...options, {
        id: Date.now(),
        optionLabel: labels[options.length] ?? String(options.length + 1),
        optionText: '',
        isCorrect: false,
        orderIndex: options.length,
      }],
    });
  };

  const removeOption = (idx) => {
    onChange({ options: options.filter((_, i) => i !== idx) });
  };

  return (
    <>
      <div className="tb-panel-section-title">Câu hỏi</div>

      <div className="tb-field">
        <label className="tb-label">Loại câu hỏi</label>
        <select
          className="tb-select"
          value={qtype}
          onChange={(e) =>
            onChange({ questionType: { typeName: e.target.value } })
          }
        >
          {QUESTION_TYPES.map((qt) => (
            <option key={qt.value} value={qt.value}>{qt.label}</option>
          ))}
        </select>
      </div>

      <div className="tb-field">
        <label className="tb-label">Số câu</label>
        <input
          className="tb-input"
          type="number"
          min={1}
          value={question.questionNumber ?? ''}
          onChange={(e) => onChange({ questionNumber: Number(e.target.value) })}
          placeholder="1"
        />
      </div>

      <div className="tb-field">
        <label className="tb-label">Nội dung câu hỏi</label>
        <textarea
          className="tb-textarea"
          value={question.questionText ?? ''}
          onChange={(e) => onChange({ questionText: e.target.value })}
          placeholder="Nhập nội dung câu hỏi..."
          rows={3}
        />
      </div>

      {/* Options for MCQ (single) */}
      {qtype === 'MULTIPLE_CHOICE' && (
        <div className="tb-field">
          <label className="tb-label">Các lựa chọn</label>
          <div className="tb-option-list">
            {options.map((opt, idx) => (
              <div key={opt.id ?? idx} className="tb-option-row">
                <div className={`tb-option-label-badge${opt.isCorrect ? ' correct' : ''}`}>{opt.optionLabel}</div>
                <input className="tb-input" style={{ flex: 1 }} value={opt.optionText}
                  onChange={(e) => updateOption(idx, 'optionText', e.target.value)}
                  placeholder={`Lựa chọn ${opt.optionLabel}`} />
                <input className="tb-option-correct-check" type="checkbox" title="Đáp án đúng"
                  checked={opt.isCorrect} onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)} />
                <button className="tb-icon-btn danger" onClick={() => removeOption(idx)} title="Xóa"><Trash2 size={12} /></button>
              </div>
            ))}
            <button className="tb-add-question-btn" style={{ justifyContent: 'flex-start' }} onClick={addOption}>+ Thêm lựa chọn</button>
          </div>
        </div>
      )}

      {/* Options for MCQ multiple */}
      {qtype === 'MULTIPLE_CHOICE_MULTIPLE' && (
        <>
          <div className="tb-field">
            <label className="tb-label">Số đáp án cần chọn</label>
            <input className="tb-input" type="number" min={1} max={10}
              value={question.chooseCount ?? 2}
              onChange={(e) => onChange({ chooseCount: Number(e.target.value) })}
              placeholder="2" />
          </div>
          <div className="tb-field">
            <label className="tb-label">Các lựa chọn (tick để chọn đáp án đúng)</label>
            <div className="tb-option-list">
              {options.map((opt, idx) => (
                <div key={opt.id ?? idx} className="tb-option-row">
                  <div className={`tb-option-label-badge${opt.isCorrect ? ' correct' : ''}`}>{opt.optionLabel}</div>
                  <input className="tb-input" style={{ flex: 1 }} value={opt.optionText}
                    onChange={(e) => updateOption(idx, 'optionText', e.target.value)}
                    placeholder={`Lựa chọn ${opt.optionLabel}`} />
                  <input className="tb-option-correct-check" type="checkbox" title="Đáp án đúng"
                    checked={opt.isCorrect} onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)} />
                  <button className="tb-icon-btn danger" onClick={() => removeOption(idx)} title="Xóa"><Trash2 size={12} /></button>
                </div>
              ))}
              <button className="tb-add-question-btn" style={{ justifyContent: 'flex-start' }} onClick={addOption}>+ Thêm lựa chọn</button>
            </div>
          </div>
        </>
      )}

      {/* Options for TRUE_FALSE_NG */}
      {qtype === 'TRUE_FALSE_NG' && (
        <div className="tb-field">
          <label className="tb-label">Các lựa chọn</label>
          <div className="tb-option-list">
            {options.map((opt, idx) => (
              <div key={opt.id ?? idx} className="tb-option-row">
                <div className={`tb-option-label-badge${opt.isCorrect ? ' correct' : ''}`}>{opt.optionLabel}</div>
                <input className="tb-input" style={{ flex: 1 }} value={opt.optionText}
                  onChange={(e) => updateOption(idx, 'optionText', e.target.value)}
                  placeholder={`Lựa chọn ${opt.optionLabel}`} />
                <input className="tb-option-correct-check" type="checkbox" title="Đáp án đúng"
                  checked={opt.isCorrect} onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)} />
                <button className="tb-icon-btn danger" onClick={() => removeOption(idx)} title="Xóa"><Trash2 size={12} /></button>
              </div>
            ))}
            <button className="tb-add-question-btn" style={{ justifyContent: 'flex-start' }} onClick={addOption}>+ Thêm lựa chọn</button>
          </div>
        </div>
      )}

      {/* Answer for fill-in / short answer */}
      {['FILL_IN_BLANK', 'SHORT_ANSWER', 'NOTE_COMPLETION'].includes(qtype) && (
        <div className="tb-field">
          <label className="tb-label">Đáp án đúng <span>*</span></label>
          <input
            className="tb-input"
            value={answers[0]?.answerText ?? ''}
            onChange={(e) =>
              onChange({
                answers: [{ ...(answers[0] ?? { blankIndex: 0, isCaseSensitive: false }), answerText: e.target.value }],
              })
            }
            placeholder="Nhập đáp án..."
          />
        </div>
      )}

      <div className="tb-field">
        <label className="tb-label">Điểm</label>
        <input
          className="tb-input"
          type="number"
          min={0}
          step={0.5}
          value={question.points ?? 1}
          onChange={(e) => onChange({ points: Number(e.target.value) })}
        />
      </div>

      <div className="tb-section-divider" />
      <button className="tb-delete-btn" onClick={onDelete}>
        <Trash2 size={14} /> Xóa Câu hỏi này
      </button>
    </>
  );
};

// ---- Main PropertiesPanel ----
const PropertiesPanel = ({ selection, onChange, onDelete }) => {
  const renderContent = () => {
    if (!selection) {
      return (
        <div className="tb-panel-empty">
          <MousePointerClick size={32} strokeWidth={1.5} style={{ color: '#d1d5db' }} />
          <p>Nhấn vào một Part, Nhóm câu hỏi hoặc Câu hỏi để chỉnh sửa thuộc tính.</p>
        </div>
      );
    }

    if (selection.type === 'part') {
      return (
        <PartPanel
          part={selection.data}
          onChange={(updates) => onChange({ type: 'part', updates })}
          onDelete={() => onDelete({ type: 'part', id: selection.data.id })}
        />
      );
    }

    if (selection.type === 'group') {
      return (
        <GroupPanel
          group={selection.data}
          onChange={(updates) => onChange({ type: 'group', updates })}
          onDelete={() => onDelete({ type: 'group', id: selection.data.id, partId: selection.data.partId })}
        />
      );
    }

    if (selection.type === 'question') {
      return (
        <QuestionPanel
          question={selection.data}
          onChange={(updates) => onChange({ type: 'question', updates })}
          onDelete={() =>
            onDelete({
              type: 'question',
              id: selection.data.id,
              groupId: selection.data.groupId,
              partId: selection.data.partId,
            })
          }
        />
      );
    }

    return null;
  };

  const panelTitle = () => {
    if (!selection) return 'Thuộc tính';
    if (selection.type === 'part') return 'Part';
    if (selection.type === 'group') return 'Nhóm câu hỏi';
    return 'Câu hỏi';
  };

  const panelSub = () => {
    if (!selection) return 'Chọn một phần tử';
    if (selection.type === 'part') return selection.data.name || '—';
    if (selection.type === 'group') return selection.data.title || '—';
    return `Câu ${selection.data.questionNumber ?? ''}`;
  };

  return (
    <aside className="tb-panel">
      <div className="tb-panel-header">
        <div>
          <div className="tb-panel-title">{panelTitle()}</div>
          <div className="tb-panel-subtitle">{panelSub()}</div>
        </div>
      </div>
      <div className="tb-panel-body">
        {renderContent()}
      </div>
    </aside>
  );
};

export default PropertiesPanel;
