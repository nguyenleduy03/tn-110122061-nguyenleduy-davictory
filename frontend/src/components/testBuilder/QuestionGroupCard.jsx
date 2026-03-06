import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, Trash2, Plus } from 'lucide-react';

const CONTENT_TYPE_LABELS = {
  READING_PASSAGE: 'Reading Passage',
  AUDIO_TRANSCRIPT: 'Audio',
  STANDALONE: 'Standalone',
  DIAGRAM: 'Diagram',
  MAP: 'Map',
  TABLE: 'Table',
};

const QTYPE_LABELS = {
  MULTIPLE_CHOICE: 'MCQ',
  FILL_IN_BLANK: 'Fill',
  TRUE_FALSE_NG: 'T/F/NG',
  MATCHING_HEADINGS: 'Matching',
  MATCHING_INFO: 'Match Info',
  SHORT_ANSWER: 'Short Ans.',
  NOTE_COMPLETION: 'Note',
};

const QuestionGroupCard = ({
  group,
  selected,
  onSelect,
  onQuestionSelect,
  selectedQuestionId,
  onAddQuestion,
}) => {
  const [open, setOpen] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${group.id}`, data: { type: 'group', group } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const contentTypeClass = group.contentType ?? 'STANDALONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tb-group-card${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="tb-group-header">
        <span
          className="tb-drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          style={{ marginRight: 2 }}
        >
          <GripVertical size={14} />
        </span>

        <span className={`tb-group-type-badge ${contentTypeClass}`}>
          {CONTENT_TYPE_LABELS[contentTypeClass] ?? contentTypeClass}
        </span>

        <span className="tb-group-title">
          {group.title || 'Nhóm chưa đặt tên'}
        </span>

        <span className="tb-group-qcount">
          {group.questions?.length ?? 0} câu
        </span>

        <div className="tb-part-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="tb-icon-btn danger"
            title="Xóa nhóm"
            onClick={() => {/* handled via panel */}}
          >
            <Trash2 size={12} />
          </button>
        </div>

        <ChevronDown
          size={14}
          className={`tb-chevron${open ? ' open' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        />
      </div>

      {open && (
        <div className="tb-group-body">
          {(group.questions ?? []).map((q) => {
            const typeKey = q.questionType?.typeName ?? 'MULTIPLE_CHOICE';
            return (
              <div
                key={q.id}
                className={`tb-question-row${selectedQuestionId === q.id ? ' selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); onQuestionSelect(q); }}
              >
                <div className="tb-q-num">{q.questionNumber}</div>
                <span className={`tb-q-type-pill ${typeKey.replace(/\s/g, '_')}`}>
                  {QTYPE_LABELS[typeKey] ?? typeKey}
                </span>
                <span className="tb-q-text">
                  {q.questionText
                    ? q.questionText.replace(/<[^>]+>/g, '').slice(0, 60)
                    : 'Câu hỏi trống'}
                </span>
                <GripVertical size={12} style={{ color: '#d1d5db', flexShrink: 0 }} />
              </div>
            );
          })}

          <button
            className="tb-add-question-btn"
            onClick={(e) => { e.stopPropagation(); onAddQuestion(); }}
          >
            <Plus size={13} /> Thêm câu hỏi
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionGroupCard;
