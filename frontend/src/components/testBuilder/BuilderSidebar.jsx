import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Headphones, BookOpen, PenLine, Mic } from 'lucide-react';

const SESSIONS = [
  { key: 'LISTENING', label: 'Listen',   icon: Headphones, iconBg: '#dbeafe', iconColor: '#1d4ed8', meta: '40 câu • 30p' },
  { key: 'READING',   label: 'Reading',  icon: BookOpen,   iconBg: '#dcfce7', iconColor: '#15803d', meta: '40 câu • 60p' },
  { key: 'WRITING',   label: 'Writing',  icon: PenLine,    iconBg: '#fef9c3', iconColor: '#a16207', meta: 'Task 1&2 • 60p' },
  { key: 'SPEAKING',  label: 'Speaking', icon: Mic,        iconBg: '#fce7f3', iconColor: '#be185d', meta: 'Part 1-3 • 15p' },
];

const PALETTE_ITEMS = [
  // ── READING only ──
  { type: 'group', contentType: 'READING_PASSAGE',      label: 'Reading Passage',        icon: '📄', skills: ['READING'] },
  { type: 'group', contentType: 'MATCHING_HEADING',     label: 'Match Headings',         icon: '🔗', skills: ['READING'] },
  { type: 'group', contentType: 'TRUE_FALSE_NG',         label: 'True / False / Not Given', icon: '✅', skills: ['READING'] },
  { type: 'group', contentType: 'MULTIPLE_CHOICE_MULTI',label: 'Multiple Choice (chọn nhiều)', icon: '☑️', skills: ['READING'] },
  { type: 'group', contentType: 'NOTE_COMPLETION',      label: 'Note / Form',            icon: '📒', skills: ['READING'] },
  { type: 'image', contentType: 'PARA_IMAGE',           label: 'Ảnh cho đoạn văn',       icon: '🖼️', skills: ['READING'] },
  // ── LISTENING only ──
  { type: 'group', contentType: 'AUDIO_TRANSCRIPT',     label: 'Audio / Nghe',           icon: '🎵', skills: ['LISTENING'] },
  { type: 'group', contentType: 'MAP',                  label: 'Bản đồ',                 icon: '🗺️', skills: ['LISTENING'] },
  { type: 'group', contentType: 'MAP_LABELLING',        label: 'Map Labelling',          icon: '📍', skills: ['LISTENING'] },
  { type: 'group', contentType: 'DIAGRAM',              label: 'Sơ đồ / Chart',          icon: '📊', skills: ['LISTENING'] },
  { type: 'group', contentType: 'TABLE',                label: 'Bảng / Form',            icon: '📋', skills: ['LISTENING', 'WRITING'] },
  // ── LISTENING only ──
  { type: 'group', contentType: 'MULTIPLE_CHOICE_GROUP',label: 'Multiple Choice',        icon: '🔘', skills: ['LISTENING'] },
  { type: 'group', contentType: 'MULTIPLE_CHOICE_MULTI',label: 'Multiple Choice (nhiều)', icon: '☑️', skills: ['LISTENING'] },
  { type: 'group', contentType: 'SENTENCE_COMPLETION',  label: 'Sentence Completion',    icon: '✏️', skills: ['LISTENING'] },
  { type: 'group', contentType: 'SHORT_ANSWER_GROUP',   label: 'Short Answer',           icon: '💬', skills: ['LISTENING'] },
  { type: 'group', contentType: 'NOTE_COMPLETION',      label: 'Note / Form',            icon: '📒', skills: ['LISTENING'] },
  { type: 'group', contentType: 'DRAG_MATCHING',        label: 'Drag Matching',          icon: '↔️', skills: ['LISTENING'] },
  { type: 'group', contentType: 'TABLE_COMPLETION',     label: 'Table Completion',       icon: '📊', skills: ['LISTENING'] },
  { type: 'group', contentType: 'FLOW_CHART',           label: 'Flow-chart Completion',  icon: '🔍', skills: ['LISTENING'] },
  // ── WRITING / SPEAKING only ──
  { type: 'group', contentType: 'STANDALONE',           label: 'Câu độc lập',            icon: '📝', skills: ['LISTENING', 'WRITING', 'SPEAKING'] },
  { type: 'group', contentType: 'WRITING_TASK',          label: 'Writing Task',            icon: '✍️', skills: ['WRITING'] },
  // ── SPEAKING only ──
  { type: 'group', contentType: 'SPEAKING_INTERVIEW',   label: 'Câu hỏi Phỏng vấn',      icon: '🎤', skills: ['SPEAKING'] },
  { type: 'group', contentType: 'SPEAKING_CUECARD',     label: 'Cue Card (Part 2)',       icon: '🗂️', skills: ['SPEAKING'] },
];

const TYPE_META = {
  READING_PASSAGE:       { label: 'VB', bg: '#dcfce7', color: '#15803d' },
  AUDIO_TRANSCRIPT:      { label: 'NG', bg: '#dbeafe', color: '#1d4ed8' },
  STANDALONE:            { label: 'CĐ', bg: '#f3f4f6', color: '#374151' },
  DIAGRAM:               { label: 'SD', bg: '#fef9c3', color: '#a16207' },
  MAP:                   { label: 'BĐ', bg: '#fce7f3', color: '#be185d' },
  TABLE:                 { label: 'BG', bg: '#e0e7ff', color: '#4338ca' },
  MULTIPLE_CHOICE_GROUP: { label: 'MC', bg: '#ffe4e6', color: '#be123c' },
  MULTIPLE_CHOICE_MULTI: { label: 'MM', bg: '#fce7f3', color: '#9d174d' },
  SENTENCE_COMPLETION:   { label: 'SC', bg: '#ecfdf5', color: '#065f46' },
  SHORT_ANSWER_GROUP:    { label: 'SA', bg: '#f0fdf4', color: '#166534' },
  FLOW_CHART:            { label: 'FC', bg: '#f0fdfa', color: '#0f766e' },
  WRITING_TASK:          { label: 'WT', bg: '#fef9c3', color: '#a16207' },
  SPEAKING_INTERVIEW:    { label: 'IV', bg: '#fce7f3', color: '#be185d' },
  SPEAKING_CUECARD:      { label: 'CC', bg: '#fdf4ff', color: '#7e22ce' },
};

function DraggablePaletteItem({ item }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.contentType}`,
    data: { source: 'palette', ...item },
  });

  // Image item: use HTML5 native drag so it can drop onto passage paragraphs
  if (item.type === 'image') {
    return (
      <div
        className="tb-palette-item tb-palette-item--image"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/para-image', '1');
          e.dataTransfer.effectAllowed = 'copy';
        }}
      >
        <span className="tb-palette-item-icon">{item.icon}</span>
        <span className="tb-palette-item-label">{item.label}</span>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`tb-palette-item${isDragging ? ' dragging' : ''}`}>
      <span className="tb-palette-item-icon">{item.icon}</span>
      <span className="tb-palette-item-label">{item.label}</span>
    </div>
  );
}

const BuilderSidebar = ({ parts, sessions, activeSessionKey, selection, onSelectSession, onSelectPart, onSelectGroup, enabledSkills }) => {
  const [openParts, setOpenParts] = useState({});

  const togglePart = (partId) => setOpenParts((prev) => ({ ...prev, [partId]: !prev[partId] }));

  const selectedPartId   = selection?.type === 'part'  ? selection.data.id : null;
  const selectedGroupId  = selection?.type === 'group' ? selection.data.id : null;

  // Filter palette items to only show relevant types for the active skill
  const filteredPalette = PALETTE_ITEMS.filter(
    (item) => !item.skills || item.skills.includes(activeSessionKey)
  );

  return (
    <aside className="tb-sidebar">
      {/* Skill tabs */}
      <div className="tb-skill-tabs">
        {SESSIONS.filter(s => !enabledSkills || enabledSkills.includes(s.key)).map((s) => {
          const Icon = s.icon;
          const isActive = activeSessionKey === s.key;
          return (
            <button key={s.key} className={`tb-skill-tab${isActive ? ' active' : ''}`}
              onClick={() => onSelectSession(s.key)}>
              <div className="tb-skill-icon" style={{ background: s.iconBg, color: s.iconColor }}>
                <Icon size={14} />
              </div>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Structure tree */}
      <div className="tb-tree">
        <div className="tb-tree-section-label">Cấu trúc đề</div>
        {(parts ?? []).map((part) => {
          const isPartOpen   = openParts[part.id] !== false; // default open
          const isPartActive = selectedPartId === part.id;
          const groups = part.questionGroups ?? [];
          return (
            <div key={part.id} className="tb-tree-part">
              <div className={`tb-tree-part-header${isPartActive ? ' active' : ''}`}
                onClick={() => { togglePart(part.id); onSelectPart(part); }}>
                <span className={`tb-tree-chevron${isPartOpen ? ' open' : ''}`}>▶</span>
                <span className="tb-tree-part-name">{part.name || `Part ${part.orderIndex}`}</span>
                <span className="tb-tree-part-count">{groups.length} nhóm</span>
              </div>
              {isPartOpen && groups.map((g) => {
                const meta = TYPE_META[g.contentType] || TYPE_META.STANDALONE;
                const isGrpActive = selectedGroupId === g.id;
                return (
                  <div key={g.id} className={`tb-tree-group-item${isGrpActive ? ' active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onSelectGroup({ ...g, partId: part.id }); }}>
                    <span className="tb-tree-dot" />
                    <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.title || '(chưa đặt tên)'}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{g.questions?.length ?? 0}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        {(parts ?? []).length === 0 && (
          <div style={{ padding: '16px 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Chưa có Part nào
          </div>
        )}
      </div>

      {/* Drag palette */}
      <div className="tb-palette">
        <div className="tb-palette-title">Kéo thành phần vào đề</div>
        <div className="tb-palette-grid">
          {filteredPalette.map((item) => (
            <DraggablePaletteItem key={item.contentType} item={item} />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default BuilderSidebar;

