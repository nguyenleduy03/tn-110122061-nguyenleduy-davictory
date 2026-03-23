import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const NoteCompletionBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

    {/* Instructions field */}
    <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
        Hướng dẫn:
      </label>
      <input
        type="text"
        style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
        value={group.instructions || ''}
        placeholder="Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer."
        onChange={(e) => onUpdate(group.id, { instructions: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
    </div>

    {/* Note title (e.g. "Phone call about second-hand furniture") */}
    <div contentEditable suppressContentEditableWarning className="exam-note-form-title"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
      data-placeholder="Tiêu đề ghi chú (VD: Phone call about furniture)"
      dangerouslySetInnerHTML={{ __html: group.title || '' }}
    />

    <RichBlankEditor
      value={group.noteText}
      onChange={(text) => onUpdate(group.id, { noteText: text })}
      placeholder={'VD:\nItems:\nDining table:\n  - (ô trống) shape\n  - medium size\n  - (ô trống) old'}
      preWrap
      blankClass="rbe-blank-amber"
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
    {(group.questions ?? []).map((q, idx) => (
      <div key={q.id} className={`exam-question${selectedQuestionId === q.id ? ' selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
        <div className="exam-q-num" style={{ background: '#854d0e' }}>{q.questionNumber ?? idx + 1}</div>
        <div className="exam-q-body">
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            Đáp án: <span style={{ fontSize: 11, color: '#94a3b8' }}>(dùng | để tách nhiều đáp án đúng, vd: 1|one)</span>
          </div>
          <input className="exam-q-fill-answer" style={{ display: 'block', width: '100%', textAlign: 'left' }}
            value={q.answerText || ''} placeholder="nhập đáp án..."
            onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
            onClick={(e) => e.stopPropagation()} />
        </div>
        <button className="exam-group-tool-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}><X size={11} /></button>
      </div>
    ))}
    <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
      <Plus size={12} /> Thêm ô trống
    </button>
  </div>
);

export default NoteCompletionBlock;
