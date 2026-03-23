import React from 'react';
import { GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';
import { TYPE_META } from './blockTypes';

const GroupToolbar = ({ group, dragHandleProps, onDelete, onMoveUp, onMoveDown }) => {
  const meta = TYPE_META[group.contentType] || TYPE_META.STANDALONE;
  return (
    <div className="exam-group-toolbar exam-group-toolbar-draggable" {...dragHandleProps}>
      <span className="exam-group-drag-handle"><GripVertical size={13} /></span>
      <span className="exam-type-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      <button 
        className="exam-group-tool-btn" 
        onPointerDown={(e) => e.stopPropagation()} 
        onClick={(e) => { e.stopPropagation(); onMoveUp?.(group.id); }} 
        title="Di chuyển lên"
      >
        <ChevronUp size={12} />
      </button>
      <button 
        className="exam-group-tool-btn" 
        onPointerDown={(e) => e.stopPropagation()} 
        onClick={(e) => { e.stopPropagation(); onMoveDown?.(group.id); }} 
        title="Di chuyển xuống"
      >
        <ChevronDown size={12} />
      </button>
      <button 
        className="exam-group-tool-btn danger" 
        onPointerDown={(e) => e.stopPropagation()} 
        onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} 
        title="Xóa nhóm"
      >
        <X size={12} />
      </button>
    </div>
  );
};

export default GroupToolbar;
