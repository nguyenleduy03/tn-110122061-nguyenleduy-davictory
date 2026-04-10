import React from 'react';
import { Trash2, MousePointerClick, ChevronLeft, ChevronRight } from 'lucide-react';
import RichInput from '../common/RichInput';
import { toPlainText } from './blocks/shared/blockHelpers';

const CONTENT_TYPES = [
  'READING_PASSAGE', 'AUDIO_TRANSCRIPT', 'STANDALONE',
  'DIAGRAM', 'MAP', 'MAP_LABELLING', 'TABLE', 'TABLE_COMPLETION', 'MATCHING_HEADING', 'DRAG_MATCHING', 'FILL_BLANK_DRAG', 'SENTENCE_COMPLETION_DRAG', 'SUMMARY_COMPLETION_DRAG', 'NOTE_COMPLETION_DRAG', 'SUMMARY_COMPLETION', 'SUMMARY_COMPLETION_SELECT', 'NOTE_COMPLETION', 'FLOW_CHART', 'WRITING_TASK',
  'SPEAKING_INTERVIEW', 'SPEAKING_CUECARD', 'SPEAKING_PART1', 'SPEAKING_PART2', 'SPEAKING_PART3',
  'CUSTOM',
];
const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice (1 đáp án)' },
  { value: 'MULTIPLE_CHOICE_MULTIPLE', label: 'Multiple Choice (nhiều đáp án)' },
  { value: 'FILL_IN_BLANK', label: 'Fill in the Blank' },
  { value: 'TRUE_FALSE_NG', label: 'True / False / Not Given' },
  { value: 'MATCHING_HEADINGS', label: 'Matching Headings' },
  { value: 'MATCHING_INFO', label: 'Matching Information' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'NOTE_COMPLETION', label: 'Note Completion' },
  // Biến thể: Matching → Fill-in
  { value: 'MATCHING_FILLABLE', label: 'Matching (Fill-in)' },
  { value: 'MATCHING_HEADINGS_FILLABLE', label: 'Matching Headings (Fill-in)' },
  // Biến thể: Fill-in → Drag-drop
  { value: 'FILL_BLANK_DRAG', label: 'Fill in the Blank (Drag-drop)' },
  { value: 'SENTENCE_COMPLETION_DRAG', label: 'Sentence Completion (Drag-drop)' },
  { value: 'SUMMARY_COMPLETION_DRAG', label: 'Summary Completion (Drag-drop)' },
  { value: 'NOTE_COMPLETION_DRAG', label: 'Note Completion (Drag-drop)' },
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
      <RichInput
        multiline
        rows={3}
        value={part.instructions ?? ''}
        onChange={(html) => onChange({ instructions: html })}
        placeholder="Nội dung hướng dẫn cho học viên..."
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
      <RichInput
        multiline
        rows={2}
        value={group.title ?? ''}
        onChange={(html) => onChange({ title: html })}
        placeholder="VD: Questions 1-13"
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

    {(['DRAG_MATCHING', 'FILL_BLANK_DRAG', 'SENTENCE_COMPLETION_DRAG', 'SUMMARY_COMPLETION_DRAG', 'NOTE_COMPLETION_DRAG'].includes(group.contentType)) && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Drag-drop Completion</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #86efac' }}>
          Cột trái: thêm mục (người/nơi). Cột phải: thêm lựa chọn vào ngân từ. Chọn đáp án đúng cho từng mục.
        </div>
      </div>
    )}

    {(group.contentType === 'SHARED_OPTIONS_DROPDOWN') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Dropdown (lựa chọn chung)</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#e0f2fe', borderRadius: 6, border: '1px solid #7dd3fc' }}>
          Cột trái canvas: bảng chữ A, B, C… và mô tả. Bên phải: hướng dẫn + từng dòng câu; chọn đáp án đúng bằng dropdown. Khác hoàn toàn với nhóm Multiple Choice (mỗi câu một bộ A–D).
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

    {(group.contentType === 'SUMMARY_COMPLETION_SELECT') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Summary Completion (Select)</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fbbf24' }}>
          Học viên chọn từ trong danh sách để điền vào ô trống. Thêm từ vào Word Bank trong canvas.
        </div>
      </div>
    )}

    {(group.contentType === 'NOTE_COMPLETION') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Note Completion</label>
        <div className="tb-field" style={{ marginTop: 8 }}>
          <label className="tb-label">Tiêu đề ghi chú</label>
          <RichInput
            value={group.title ?? ''}
            onChange={(html) => onChange({ title: html })}
            placeholder="VD: Phone call about furniture"
          />
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fefce8', borderRadius: 6, border: '1px solid #fde68a' }}>
          <div>Nhập nội dung ghi chú vào canvas trực tiếp. Dùng <code>[blank]</code> để đánh dấu ô trống.</div>
          <div style={{ marginTop: '8px', padding: '6px', background: '#fff3cd', borderRadius: 4, border: '1px solid #ffeaa7' }}>
            <strong>Chú thích số thứ tự:</strong><br />
            • Vị trí trong đoạn văn: 1, 2, 3, 4, 5...<br />
            • Số câu hỏi thực tế: Sẽ tiếp tục từ group trước<br />
            • Học viên điền đáp án theo số câu hỏi thực tế
          </div>
        </div>
      </div>
    )}

    {(group.contentType === 'FLOW_CHART') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Flow-chart Completion</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#f0fdfa', borderRadius: 6, border: '1px solid #99f6e4' }}>
          Nhập tiêu đề sơ đồ → Thêm các ô (bước) → Dùng <code>[blank]</code> trong ô để tạo ô trống có số. Thêm từ ngân ở cột phải → Điền đáp án cho từng ô bên dưới.
        </div>
      </div>
    )}

    {(['DRAG_MATCHING', 'FILL_BLANK_DRAG', 'SENTENCE_COMPLETION_DRAG', 'SUMMARY_COMPLETION_DRAG', 'NOTE_COMPLETION_DRAG', 'FLOW_CHART', 'MAP_LABELLING', 'MATCHING_HEADING'].includes(group.contentType)) && (
      <div className="tb-field">
        <label className="tb-label">Kéo thả: dùng lại thẻ</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
          <input
            type="checkbox"
            checked={group.allowOptionReuse !== false} // Default true
            onChange={(e) => onChange({ allowOptionReuse: e.target.checked })}
          />
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
            Bật để <strong>thẻ không bị mất</strong> sau khi kéo (có thể dùng cho nhiều ô). Tắt để mỗi thẻ chỉ dùng 1 lần.
          </div>
        </div>
      </div>
    )}

    {(group.contentType === 'WRITING_TASK') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Writing Task</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fef9c3', borderRadius: 6, border: '1px solid #fde68a' }}>
          Nhập đề bài → Tải ảnh biểu đồ (tuỳ chọn) → Đặt số từ tối thiểu và thời gian. Khi xem trước: thí sinh viết trực tiếp vào ô văn bản có đếm từ.
        </div>
      </div>
    )}

    {(group.contentType === 'SPEAKING_INTERVIEW') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Câu hỏi Phỏng vấn</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fce7f3', borderRadius: 6, border: '1px solid #fbcfe8' }}>
          Chọn Part 1 hoặc Part 3 → Thêm câu hỏi của giám khảo → Khi xem trước: hiển thị danh sách câu hỏi theo phong cách trang thi Speaking.
        </div>
      </div>
    )}

    {(group.contentType === 'SPEAKING_CUECARD') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Cue Card (Part 2)</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fdf4ff', borderRadius: 6, border: '1px solid #e9d5ff' }}>
          Nhập chủ đề → Thêm bullet points (“You should say”) → Câu kết. Khi xem trước: hiển thị thẻ gợi ý đồng hồ đếm ngược 1 phút.
        </div>
      </div>
    )}

    {(group.contentType === 'TABLE_COMPLETION') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Table Completion</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#e0e7ff', borderRadius: 6, border: '1px solid #a5b4fc' }}>
          Thêm cột/hàng → Nhập nội dung ô → Nhấn <code>+□</code> để chèn ô trống → Điền đáp án đúng bên dưới.
        </div>
      </div>
    )}

    {(group.contentType === 'SPEAKING_PART1') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Speaking Part 1</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#dbeafe', borderRadius: 6, border: '1px solid #bfdbfe' }}>
          Introduction & Interview: Tạo 2-3 topics với 3-4 câu hỏi mỗi topic về bản thân, công việc, sở thích.
        </div>
      </div>
    )}

    {(group.contentType === 'SPEAKING_PART2') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Speaking Part 2</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a' }}>
          Individual Long Turn: Cue card với topic, bullet points, thời gian chuẩn bị (60s) và nói (1-2 phút), kèm follow-up questions.
        </div>
      </div>
    )}

    {(group.contentType === 'SPEAKING_PART3') && (
      <div className="tb-field">
        <label className="tb-label">ℹ️ Speaking Part 3</label>
        <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#e0e7ff', borderRadius: 6, border: '1px solid #c7d2fe' }}>
          Two-way Discussion: Thảo luận sâu về chủ đề Part 2 với 4-6 câu hỏi trừu tượng, phân tích.
        </div>
      </div>
    )}

    {(group.contentType === 'READING_PASSAGE') && (
      <div className="tb-field">
        <label className="tb-label">Nội dung bài đọc</label>
        <RichInput
          multiline
          rows={8}
          value={group.passageText ?? ''}
          onChange={(html) => onChange({ passageText: html })}
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

    {(group.contentType === 'DIAGRAM' || group.contentType === 'MAP' || group.contentType === 'MAP_LABELLING') && (
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
  const isSpeakingGroup = ['SPEAKING_INTERVIEW', 'SPEAKING_CUECARD'].includes(question.groupContentType);
  const isSharedDropdown = question.groupContentType === 'SHARED_OPTIONS_DROPDOWN';

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

      {!isSharedDropdown && (
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
      )}
      {isSharedDropdown && (
        <div className="tb-field">
          <label className="tb-label">Loại</label>
          <div className="tb-input" style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}>
            Dropdown chung (một chữ A/B/C…)
          </div>
        </div>
      )}

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
        <RichInput
          multiline
          rows={3}
          value={question.questionText ?? ''}
          onChange={(html) => onChange({ questionText: html })}
          placeholder="Nhập nội dung câu hỏi..."
        />
      </div>

      {isSharedDropdown && (
        <div className="tb-field">
          <label className="tb-label">Đáp án đúng</label>
          <select
            className="tb-select"
            value={(question.answerText ?? answers[0]?.answerText ?? '').trim()}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                answerText: v,
                answers: [{ ...(answers[0] ?? { blankIndex: 1, isCaseSensitive: false }), answerText: v }],
              });
            }}
          >
            <option value="">—</option>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => (
              <option key={L} value={L}>{L}</option>
            ))}
          </select>
        </div>
      )}

      {/* Options for MCQ (single) */}
      {!isSharedDropdown && qtype === 'MULTIPLE_CHOICE' && (
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
      {!isSharedDropdown && qtype === 'MULTIPLE_CHOICE_MULTIPLE' && (
        <>
          <div className="tb-field">
            <label className="tb-label">Instruction chung</label>
            <input className="tb-input"
              value={question.groupInstruction ?? 'Choose TWO correct answers.'}
              onChange={(e) => onChange({ groupInstruction: e.target.value })}
              placeholder="Choose TWO correct answers." />
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
      {!isSharedDropdown && qtype === 'TRUE_FALSE_NG' && (
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
      {!isSpeakingGroup && !isSharedDropdown && ['FILL_IN_BLANK', 'SHORT_ANSWER', 'NOTE_COMPLETION'].includes(qtype) && (
        <div className="tb-field">
          <label className="tb-label">Đáp án đúng <span>*</span></label>
          <input
            className="tb-input"
            value={answers[0]?.answerText ?? ''}
            onChange={(e) =>
              onChange({
                answerText: e.target.value,
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
const PropertiesPanel = ({ selection, onChange, onDelete, collapsed = false, onToggleCollapsed }) => {
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
    if (selection.type === 'group') return toPlainText(selection.data.title) || '—';
    return `Câu ${selection.data.questionNumber ?? ''}`;
  };

  return (
    <aside className={`tb-panel${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="tb-panel-toggle tb-panel-toggle-right"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Hiện bảng thuộc tính' : 'Ẩn bảng thuộc tính'}
        aria-label={collapsed ? 'Hiện bảng thuộc tính' : 'Ẩn bảng thuộc tính'}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

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
