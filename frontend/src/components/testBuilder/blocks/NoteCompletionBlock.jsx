import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight, getPartQuestionStartNumber } from './shared/blockHelpers';

// Bulk Answer Import Component
const BulkAnswerImport = ({ questions, onImport }) => {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');

  const handleImport = () => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      alert('Vui lòng nhập đáp án (mỗi dòng 1 đáp án)');
      return;
    }
    onImport(lines);
    setText('');
    setShow(false);
    alert(`Đã import ${lines.length} đáp án`);
  };

  if (!show) {
    return (
      <button
        className="exam-add-btn"
        onClick={() => setShow(true)}
        style={{ fontSize: 12, marginBottom: 8 }}
      >
        📋 Import hàng loạt đáp án
      </button>
    );
  }

  return (
    <div style={{ marginBottom: 12, padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        Paste đáp án (mỗi dòng 1 đáp án, theo thứ tự câu hỏi):
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(questions.length, 10)}
        placeholder={`Ví dụ:\nwater\n1|one\ntemperature\n...`}
        style={{
          width: '100%',
          padding: 8,
          border: '1px solid #cbd5e1',
          borderRadius: 3,
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          className="exam-add-btn"
          onClick={handleImport}
          style={{ fontSize: 12 }}
        >
          ✓ Import {text.split('\n').filter(l => l.trim()).length} đáp án
        </button>
        <button
          className="exam-add-btn"
          onClick={() => { setShow(false); setText(''); }}
          style={{ fontSize: 12, background: '#94a3b8' }}
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

const NoteCompletionBlock = ({ group, allGroups = [], onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const baseNumber = getPartQuestionStartNumber(group, allGroups);

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      {/* Note title (e.g. "Phone call about second-hand furniture") */}
      <div contentEditable suppressContentEditableWarning className="exam-note-form-title"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onInput={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        onBlur={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        data-placeholder="Tiêu đề ghi chú (VD: Phone call about furniture)"
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />

      <RichBlankEditor
        value={group.noteText}
        onChange={(text) => onUpdate(group.id, { noteText: text })}
        placeholder={'VD:\nItems:\nDining table:\n  - (ô trống) shape\n  - medium size\n  - (ô trống) old'}
        preWrap
        blankClass="rbe-blank-amber"
        startNumber={baseNumber}
      />

      {/* Answer validation options */}
      <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tùy chọn chấm điểm:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={group.ignoreCase !== false} onChange={(e) => onUpdate(group.id, { ignoreCase: e.target.checked })} />
            <span>Bỏ qua hoa/thường</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={group.ignoreSpaces || false} onChange={(e) => onUpdate(group.id, { ignoreSpaces: e.target.checked })} />
            <span>Bỏ qua khoảng trắng</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={group.ignorePunctuation || false} onChange={(e) => onUpdate(group.id, { ignorePunctuation: e.target.checked })} />
            <span>Bỏ qua dấu câu</span>
          </label>
        </div>
        <div style={{ marginTop: 6 }}>
          <input
            type="text"
            placeholder="Ký tự bỏ qua khác (vd: -_)"
            value={group.ignoreChars || ''}
            onChange={(e) => onUpdate(group.id, { ignoreChars: e.target.value })}
            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 12 }}
          />
        </div>
      </div>

      <div className="exam-q-range-header" style={{ marginTop: 12 }}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="10" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      </div>

      {/* Answer key section */}
      {(group.questions ?? []).length > 0 && (
        <div className="exam-ml-answer-section" onClick={(e) => e.stopPropagation()}>
          <div className="exam-ml-answer-title">🔑 Đáp án (theo thứ tự câu hỏi)</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic' }}>
            💡 Dùng | để tách nhiều đáp án đúng (vd: 1|one)
          </div>
          <BulkAnswerImport questions={group.questions} onImport={(answers) => {
            // Xóa tất cả câu rỗng (không có answerText) trước khi import
            const nonEmptyQuestions = (group.questions || []).filter(q => q.answerText?.trim());
            const emptyQuestions = (group.questions || []).filter(q => !q.answerText?.trim());

            // Nếu có câu rỗng và số câu import >= số câu rỗng, xóa hết câu rỗng
            let finalQuestions = [...nonEmptyQuestions];

            // Thêm câu mới hoặc update câu có sẵn
            answers.forEach((ans, idx) => {
              if (finalQuestions[idx]) {
                finalQuestions[idx] = { ...finalQuestions[idx], answerText: ans };
              } else {
                // Tạo câu mới
                finalQuestions.push({
                  id: Date.now() + idx,
                  questionNumber: (group.fromQuestion || 1) + idx,
                  answerText: ans
                });
              }
            });

            onUpdate(group.id, { questions: finalQuestions });
          }} />
          {(group.questions ?? []).map((q) => (
            <div key={q.id} className="exam-ml-answer-row">
              <span className="exam-ml-answer-num">Câu {q.questionNumber}</span>
              <input
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
                value={q.answerText ?? ''}
                placeholder="Đáp án đúng (vd: 1|one)..."
                onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })} />
            </div>
          ))}
        </div>
      )}

      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm ô trống
      </button>
    </div>
  );
};

export default NoteCompletionBlock;
