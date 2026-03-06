import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, Trash2, Plus, Copy } from 'lucide-react';
import QuestionGroupCard from './QuestionGroupCard';

const PartCard = ({
  part,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onGroupSelect,
  selectedGroupId,
  onQuestionSelect,
  selectedQuestionId,
  onAddGroup,
  onAddQuestion,
  isOver,
}) => {
  const [open, setOpen] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `part-${part.id}`, data: { type: 'part', part, partId: part.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tb-part-card${selected ? ' selected' : ''}${isOver ? ' drag-over' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(part); }}
    >
      <div className="tb-part-header">
        {/* Drag handle */}
        <span
          className="tb-drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </span>

        <span className="tb-part-badge">Part {part.orderIndex}</span>
        <span className="tb-part-name">{part.name || 'Part chưa đặt tên'}</span>
        <span className="tb-part-meta">
          {part.questionGroups?.reduce((acc, g) => acc + (g.questions?.length ?? 0), 0) ?? 0} câu
          {part.durationMinutes ? ` • ${part.durationMinutes} phút` : ''}
        </span>

        <div className="tb-part-actions" onClick={(e) => e.stopPropagation()}>
          <button className="tb-icon-btn" title="Nhân đôi Part" onClick={() => onDuplicate(part)}>
            <Copy size={14} />
          </button>
          <button className="tb-icon-btn danger" title="Xóa Part" onClick={() => onDelete(part.id)}>
            <Trash2 size={14} />
          </button>
        </div>

        <ChevronDown
          size={16}
          className={`tb-chevron${open ? ' open' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        />
      </div>

      {open && (
        <div className="tb-part-body">
          {isOver && (
            <div className="tb-drop-placeholder">Thả vào đây để thêm nhóm câu hỏi</div>
          )}

          {(part.questionGroups ?? []).map((group) => (
            <QuestionGroupCard
              key={group.id}
              group={group}
              selected={selectedGroupId === group.id}
              onSelect={() => onGroupSelect(group)}
              onQuestionSelect={onQuestionSelect}
              selectedQuestionId={selectedQuestionId}
              onAddQuestion={() => onAddQuestion(group)}
            />
          ))}

          <button
            className="tb-add-group-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddGroup(part);
            }}
          >
            <Plus size={14} /> Thêm nhóm câu hỏi
          </button>
        </div>
      )}
    </div>
  );
};

export default PartCard;
