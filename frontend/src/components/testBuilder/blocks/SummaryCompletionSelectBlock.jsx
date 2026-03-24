import React, { useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { stripInlineStyles } from '../../../utils/textFormatters';

const SummaryCompletionSelectBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const options = group.optionBank ?? [];
  
  // Clean options on mount if they have HTML comments
  useEffect(() => {
    const needsCleaning = options.some(o => o.text && o.text.includes('<!--'));
    if (needsCleaning) {
      const cleaned = options.map(o => ({
        ...o,
        text: o.text ? stripInlineStyles(o.text) : ''
      }));
      onUpdate(group.id, { optionBank: cleaned });
    }
  }, []);

  // Auto-sync questions with blank count
  useEffect(() => {
    const noteText = group.noteText || '';
    const blankCount = (noteText.match(/\[blank\]/gi) || []).length;
    const currentQuestions = group.questions || [];
    
    if (blankCount !== currentQuestions.length) {
      const newQuestions = Array.from({ length: blankCount }, (_, i) => {
        return currentQuestions[i] || {
          id: Date.now() + i,
          questionNumber: (group.fromQuestion || 1) + i,
          answerText: ''
        };
      });
      onUpdate(group.id, { questions: newQuestions });
    }
  }, [group.noteText]);

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
          placeholder="Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      {/* Summary title */}
      <div contentEditable suppressContentEditableWarning className="exam-note-form-title"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
        data-placeholder="Tiêu đề tóm tắt (VD: The History of Glass)"
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />

      {/* Summary text with blanks */}
      <RichBlankEditor
        value={group.noteText}
        onChange={(text) => onUpdate(group.id, { noteText: text })}
        placeholder={'VD:\nGlass was first made in (ô trống) around 3000 BC. The Romans developed a method of (ô trống) glass...'}
        preWrap
        blankClass="rbe-blank-amber"
      />

      {/* Word bank section */}
      <div style={{ marginTop: 16, padding: '12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 6 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            Danh sách từ để chọn:
          </div>
          <label style={{ fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={group.allowOptionReuse !== false}
              onChange={(e) => onUpdate(group.id, { allowOptionReuse: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
            />
            Dùng lại được
          </label>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <RichInput 
                style={{ flex: 1, fontSize: 13 }}
                value={o.text || ''}
                placeholder={`Từ/cụm từ ${i + 1}...`}
                onChange={(html) => {
                  const n = [...options];
                  n[i] = { ...n[i], text: html };
                  onUpdate(group.id, { optionBank: n });
                }}
              />
              <button 
                style={{ padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
                onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { optionBank: options.filter((_, j) => j !== i) }); }}>
                ×
              </button>
            </div>
          ))}
          <button 
            style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { optionBank: [...options, { id: Date.now(), text: '' }] }); }}>
            <Plus size={12} /> Thêm từ
          </button>
        </div>
      </div>

      {/* Question range */}
      <div className="exam-q-range-header" style={{ marginTop: 12 }}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="10" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      </div>

      {/* Questions with dropdown answers */}
      {(group.questions ?? []).map((q, idx) => (
        <div key={q.id} className={`exam-question${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
          <div className="exam-q-num" style={{ background: '#854d0e' }}>{q.questionNumber ?? idx + 1}</div>
          <div className="exam-q-body">
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Đáp án đúng cho ô trống {idx + 1}:
            </div>
            <select 
              className="exam-heading-select"
              style={{ display: 'block', width: '100%' }}
              value={q.answerText || ''}
              onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })}
              onClick={(e) => e.stopPropagation()}>
              <option value="">— Chọn đáp án —</option>
              {options.map((o, i) => <option key={i} value={o.text}>{o.text?.replace(/<[^>]*>/g, '')}</option>)}
            </select>
          </div>
        </div>
      ))}
      
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>
        💡 Số ô nhập đáp án tự động cập nhật theo số [blank] trong nội dung
      </div>
    </div>
  );
};

export default SummaryCompletionSelectBlock;
