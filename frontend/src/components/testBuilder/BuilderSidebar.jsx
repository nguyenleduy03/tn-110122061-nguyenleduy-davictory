import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  FileText,
  ClipboardList,
  CheckCircle2,
  List,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

const SESSIONS = [
  { key: 'LISTENING', label: 'Listen',   icon: Headphones, iconBg: '#dbeafe', iconColor: '#1d4ed8', prefix: '40 câu', defaultDuration: 30 },
  { key: 'READING',   label: 'Reading',  icon: BookOpen,   iconBg: '#dcfce7', iconColor: '#15803d', prefix: '40 câu', defaultDuration: 60 },
  { key: 'WRITING',   label: 'Writing',  icon: PenLine,    iconBg: '#fef9c3', iconColor: '#a16207', prefix: 'Task 1&2', defaultDuration: 60 },
  { key: 'SPEAKING',  label: 'Speaking', icon: Mic,        iconBg: '#fce7f3', iconColor: '#be185d', prefix: 'Part 1-3', defaultDuration: 12 },
];

const PALETTE_ITEMS = [
  // ── READING only ──
  { type: 'group', contentType: 'READING_PASSAGE',      label: 'Reading Passage',        icon: FileText, skills: ['READING'] },
  { type: 'group', contentType: 'MATCHING_HEADING',     label: 'Match Headings',         icon: ClipboardList, skills: ['READING'] },
  { type: 'group', contentType: 'MATCHING_FEATURES',    label: 'Matching Features',      icon: List,          skills: ['READING', 'LISTENING'] },
  { type: 'group', contentType: 'TRUE_FALSE_NG',        label: 'True / False / Not Given', icon: CheckCircle2, skills: ['READING'] },
  { type: 'group', contentType: 'MULTIPLE_CHOICE_MULTI',label: 'Multiple Choice (chọn nhiều)', icon: List, skills: ['READING', 'LISTENING'] },
  { type: 'group', contentType: 'SHARED_OPTIONS_DROPDOWN', label: 'Dropdown (lựa chọn chung)', icon: ClipboardList, skills: ['READING', 'LISTENING'] },
  { type: 'group', contentType: 'NOTE_COMPLETION',      label: 'Note / Form',            icon: ClipboardList, skills: ['READING', 'LISTENING'] },
  { type: 'image', contentType: 'PARA_IMAGE',           label: 'Ảnh cho đoạn văn',       icon: ImageIcon, skills: ['READING'] },
  // ── Biến thể mới: Matching → Fill-in ──
  { type: 'group', contentType: 'MATCHING_FILLABLE',    label: 'Matching (Fill-in)',     icon: PenLine, skills: ['READING', 'LISTENING'] },
  { type: 'group', contentType: 'MATCHING_HEADINGS_FILLABLE', label: 'Match Headings (Fill)', icon: ClipboardList, skills: ['READING', 'LISTENING'] },
  // ── LISTENING + READING ──
  { type: 'group', contentType: 'AUDIO_TRANSCRIPT',     label: 'Audio / Nghe',           icon: Headphones, skills: ['LISTENING'] },
  { type: 'group', contentType: 'MAP',                  label: 'Bản đồ',                 icon: BookOpen, skills: ['LISTENING'] },
  { type: 'group', contentType: 'MAP_LABELLING',        label: 'Map Labelling',          icon: BookOpen, skills: ['LISTENING'] },
  { type: 'group', contentType: 'IMAGE_NOTE_FORM',      label: 'Ảnh + Note Form',        icon: ImageIcon, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'DIAGRAM',              label: 'Sơ đồ / Chart',          icon: ClipboardList, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'TABLE',                label: 'Bảng / Form',            icon: ClipboardList, skills: ['LISTENING', 'READING', 'WRITING'] },
  { type: 'group', contentType: 'MULTIPLE_CHOICE_GROUP',label: 'Multiple Choice',        icon: List, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'SENTENCE_COMPLETION',  label: 'Sentence Completion',    icon: PenLine, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'SHORT_ANSWER_GROUP',   label: 'Short Answer',           icon: PenLine, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'DRAG_MATCHING',        label: 'Drag Matching',          icon: List, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'TABLE_COMPLETION',     label: 'Table Completion',       icon: ClipboardList, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'FLOW_CHART',           label: 'Flow-chart Completion',  icon: ClipboardList, skills: ['LISTENING', 'READING'] },
  // ── Biến thể mới: Fill-in → Drag-drop ──
  { type: 'group', contentType: 'FILL_BLANK_DRAG',      label: 'Fill Blank (Drag)',      icon: List, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'SENTENCE_COMPLETION_DRAG', label: 'Sentence (Drag)',    icon: List, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'SUMMARY_COMPLETION_DRAG', label: 'Summary (Drag)',      icon: List, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'SUMMARY_COMPLETION_SELECT', label: 'Summary (Select)',  icon: List, skills: ['LISTENING', 'READING'] },
  { type: 'group', contentType: 'NOTE_COMPLETION_DRAG', label: 'Note (Drag)',            icon: List, skills: ['LISTENING'] },
  // ── WRITING / SPEAKING only ──
  { type: 'group', contentType: 'STANDALONE',           label: 'Câu độc lập',            icon: FileText, skills: ['LISTENING', 'WRITING', 'SPEAKING'] },
  { type: 'group', contentType: 'WRITING_TASK',         label: 'Writing Task',           icon: PenLine, skills: ['WRITING'] },
  // ── SPEAKING only ──
  { type: 'group', contentType: 'SPEAKING_INTERVIEW',   label: 'Part 1 - Interview',     icon: Mic, skills: ['SPEAKING'] },
  { type: 'group', contentType: 'SPEAKING_CUECARD',     label: 'Part 2 - Cue Card',      icon: Mic, skills: ['SPEAKING'] },
  { type: 'group', contentType: 'SPEAKING_DISCUSSION',  label: 'Part 3 - Discussion',    icon: Mic, skills: ['SPEAKING'] },
  // ── CUSTOM (all) ──
  { type: 'group', contentType: 'CUSTOM',              label: 'Tự thiết kế (Custom)',    icon: ClipboardList, skills: ['READING', 'LISTENING', 'WRITING', 'SPEAKING'] },
];

const TYPE_META = {
  READING_PASSAGE:       { label: 'VB', bg: '#dcfce7', color: '#15803d' },
  AUDIO_TRANSCRIPT:      { label: 'NG', bg: '#dbeafe', color: '#1d4ed8' },
  STANDALONE:            { label: 'CĐ', bg: '#f3f4f6', color: '#374151' },
  DIAGRAM:               { label: 'SD', bg: '#fef9c3', color: '#a16207' },
  MAP:                   { label: 'BĐ', bg: '#fce7f3', color: '#be185d' },
  MAP_LABELLING:         { label: 'ML', bg: '#fce7f3', color: '#be185d' },
  IMAGE_NOTE_FORM:       { label: 'IF', bg: '#e0e7ff', color: '#4338ca' },
  TABLE:                 { label: 'BG', bg: '#e0e7ff', color: '#4338ca' },
  SHARED_OPTIONS_DROPDOWN: { label: 'DD', bg: '#e0f2fe', color: '#0369a1' },
  MULTIPLE_CHOICE_GROUP: { label: 'MC', bg: '#ffe4e6', color: '#be123c' },
  MULTIPLE_CHOICE_MULTI: { label: 'MM', bg: '#fce7f3', color: '#9d174d' },
  SENTENCE_COMPLETION:   { label: 'SC', bg: '#ecfdf5', color: '#065f46' },
  SHORT_ANSWER_GROUP:    { label: 'SA', bg: '#f0fdf4', color: '#166534' },
  FLOW_CHART:            { label: 'FC', bg: '#f0fdfa', color: '#0f766e' },
  MATCHING_FILLABLE:     { label: 'MF', bg: '#e0f2fe', color: '#0369a1' },
  MATCHING_HEADINGS_FILLABLE: { label: 'MH', bg: '#e0f2fe', color: '#0369a1' },
  WRITING_TASK:          { label: 'WT', bg: '#fef9c3', color: '#a16207' },
  SPEAKING_INTERVIEW:    { label: 'P1', bg: '#fce7f3', color: '#be185d' },
  SPEAKING_CUECARD:      { label: 'P2', bg: '#fdf4ff', color: '#7e22ce' },
  SPEAKING_DISCUSSION:   { label: 'P3', bg: '#ede9fe', color: '#6d28d9' },
  MATCHING_FEATURES:     { label: 'MF', bg: '#f3e8ff', color: '#7c3aed' },
  CUSTOM:                { label: 'CT', bg: '#fff7ed', color: '#c2410c' },
};

const PALETTE_ORDER = {
  READING_PASSAGE: 10,
  AUDIO_TRANSCRIPT: 10,
  STANDALONE: 15,
  WRITING_TASK: 15,
  SPEAKING_INTERVIEW: 15,
  SPEAKING_CUECARD: 16,
  SPEAKING_DISCUSSION: 17,
  MATCHING_HEADING: 20,
  MATCHING_FEATURES: 21,
  MATCHING_FILLABLE: 22,
  MATCHING_HEADINGS_FILLABLE: 23,
  DRAG_MATCHING: 24,
  TABLE: 30,
  TABLE_COMPLETION: 31,
  DIAGRAM: 32,
  FLOW_CHART: 33,
  MAP: 34,
  MAP_LABELLING: 35,
  IMAGE_NOTE_FORM: 36,
  MULTIPLE_CHOICE_GROUP: 40,
  MULTIPLE_CHOICE_MULTI: 41,
  SHARED_OPTIONS_DROPDOWN: 42,
  NOTE_COMPLETION: 43,
  NOTE_COMPLETION_DRAG: 44,
  SUMMARY_COMPLETION_SELECT: 45,
  SUMMARY_COMPLETION_DRAG: 46,
  SENTENCE_COMPLETION: 50,
  SENTENCE_COMPLETION_DRAG: 51,
  SHORT_ANSWER_GROUP: 52,
  FILL_BLANK_DRAG: 53,
  TRUE_FALSE_NG: 60,
  CUSTOM: 90,
};

const toTreePlainText = (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);

  try {
    const el = document.createElement('div');
    el.innerHTML = value;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  } catch {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

function DraggablePaletteItem({ item }) {
  try {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `palette-${item.contentType}`,
      data: { source: 'palette', ...item },
    });

    const Icon = item.icon;

    // Image item: use HTML5 native drag so it can drop onto passage paragraphs
    if (item.type === 'image') {
      return (
        <div
          className="tb-palette-item tb-palette-item--image"
          draggable
          onDragStart={(e) => {
            try {
              e.dataTransfer.setData('application/para-image', '1');
              e.dataTransfer.effectAllowed = 'copy';
            } catch (error) {
              console.error('Error in image drag start:', error);
            }
          }}
        >
          <span className="tb-palette-item-icon">{Icon ? <Icon size={15} strokeWidth={2} /> : null}</span>
          <span className="tb-palette-item-label">{item.label}</span>
        </div>
      );
    }

    return (
      <div ref={setNodeRef} {...listeners} {...attributes}
        className={`tb-palette-item${isDragging ? ' dragging' : ''}`}
        onMouseDown={(e) => {
          console.log('Palette item mouse down:', item.contentType);
        }}
        onDragStart={(e) => {
          console.log('Palette item drag start:', item.contentType);
        }}>
        <span className="tb-palette-item-icon">{Icon ? <Icon size={15} strokeWidth={2} /> : null}</span>
        <span className="tb-palette-item-label">{item.label}</span>
        <span className="tb-palette-item-drag-hint" aria-hidden="true"><GripVertical size={13} /></span>
      </div>
    );
  } catch (error) {
    console.error('Error in DraggablePaletteItem:', error);
    return (
      <div className="tb-palette-item tb-palette-item--error">
        <span className="tb-palette-item-label">Error: {item.label}</span>
      </div>
    );
  }
}

const BuilderSidebar = ({
  parts,
  sessions,
  activeSessionKey,
  selection,
  onSelectSession,
  onSelectPart,
  onSelectGroup,
  enabledSkills,
  sessionDurations,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const [openParts, setOpenParts] = useState({});
  const [paletteQuery, setPaletteQuery] = useState('');
  const [splitRatio, setSplitRatio] = useState(62);
  const [showDragGuide, setShowDragGuide] = useState(true);
  const splitRef = useRef(null);
  const draggingRef = useRef(false);

  const togglePart = (partId) => setOpenParts((prev) => ({ ...prev, [partId]: !prev[partId] }));

  const selectedPartId   = selection?.type === 'part'  ? selection.data.id : null;
  const selectedGroupId  = selection?.type === 'group' ? selection.data.id : null;

  // Filter palette items to only show relevant types for the active skill + search keyword
  const filteredPalette = useMemo(() => {
    const bySkill = PALETTE_ITEMS.filter(
      (item) => !item.skills || item.skills.includes(activeSessionKey)
    );

    const q = paletteQuery.trim().toLowerCase();
    if (!q) return bySkill;

    return bySkill.filter((item) => {
      const text = `${item.label} ${item.contentType}`.toLowerCase();
      return text.includes(q);
    });
  }, [activeSessionKey, paletteQuery]);

  const sortedPalette = useMemo(() => {
    return [...filteredPalette].sort((a, b) => {
      const orderA = PALETTE_ORDER[a.contentType] ?? 999;
      const orderB = PALETTE_ORDER[b.contentType] ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label, 'vi');
    });
  }, [filteredPalette]);

  useEffect(() => {
    if (!draggingRef.current) return undefined;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

      const updateRatioFromEvent = (clientY) => {
      const el = splitRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next = ((clientY - rect.top) / rect.height) * 100;
        setSplitRatio(clamp(next, 3, 97));
    };

    const onMove = (event) => updateRatioFromEvent(event.clientY);
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('tb-split-dragging');
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('tb-split-dragging');
    };
  }, [splitRatio]);

  return (
    <aside className={`tb-sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="tb-panel-toggle tb-panel-toggle-left"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Hiện thanh thành phần' : 'Ẩn thanh thành phần'}
        aria-label={collapsed ? 'Hiện thanh thành phần' : 'Ẩn thanh thành phần'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Skill tabs */}
      <div className="tb-skill-tabs">
        {SESSIONS.filter(s => !enabledSkills || enabledSkills.includes(s.key)).map((s) => {
          const Icon = s.icon;
          const isActive = activeSessionKey === s.key;
          const skillParts = sessions?.[s.key] ?? [];
          const totalQuestions = skillParts.reduce((sum, part) => {
            const value = Number(part?.totalQuestions ?? 0);
            return sum + (Number.isFinite(value) ? value : 0);
          }, 0);
          const durationMinutes = sessionDurations?.[s.key] ?? s.defaultDuration;
          const questionLabel = totalQuestions > 0 ? `${totalQuestions} câu` : s.prefix;
          
          return (
            <div key={s.key} className="tb-skill-card">
              <button
                className={`tb-skill-tab${isActive ? ' active' : ''}`}
                onClick={() => onSelectSession(s.key)}>
                <div className="tb-skill-tab-top">
                  <div className="tb-skill-icon" style={{ background: s.iconBg, color: s.iconColor }}>
                    <Icon size={14} />
                  </div>
                  <div className="tb-skill-tab-texts">
                    <span className="tb-skill-tab-label">{s.label}</span>
                    <span className="tb-skill-tab-meta">{questionLabel} • {durationMinutes === 0 ? 'No limit' : `${durationMinutes}p`}</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="tb-sidebar-split" ref={splitRef}>
      {/* Structure tree */}
      <div className="tb-tree" style={{ flex: `0 0 ${splitRatio}%` }}>
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
                <span className="tb-tree-part-name">{toTreePlainText(part.name) || `Part ${part.orderIndex}`}</span>
                <span className="tb-tree-part-count">{groups.length} nhóm</span>
              </div>
              {isPartOpen && groups.map((g) => {
                const meta = TYPE_META[g.contentType] || TYPE_META.STANDALONE;
                const isGrpActive = selectedGroupId === g.id;
                return (
                  <div key={g.id} className={`tb-tree-group-item${isGrpActive ? ' active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onSelectGroup({ ...g, partId: part.id }); }}>
                    <span className="tb-tree-dot" />
                    <span className="tb-tree-group-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <span className="tb-tree-group-name">
                      {toTreePlainText(g.title) || '(chưa đặt tên)'}
                    </span>
                    <span className="tb-tree-group-count">
                      {(g.questions ?? []).reduce((sum, q) => sum + (q.questionCount || 1), 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
        {(parts ?? []).length === 0 && (
          <div className="tb-tree-empty">
            Chưa có Part nào
          </div>
        )}
      </div>

      <div
        className="tb-sidebar-split-handle"
        role="separator"
        aria-orientation="vertical"
        title="Kéo lên/xuống để đổi chiều cao"
        onPointerDown={(e) => {
          draggingRef.current = true;
          document.body.classList.add('tb-split-dragging');
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const el = splitRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const next = ((e.clientY - rect.top) / rect.height) * 100;
          setSplitRatio(Math.max(3, Math.min(97, next)));
        }}
      >
        <span />
      </div>

      {/* Drag palette */}
      <div className="tb-palette" style={{ flex: `0 0 ${100 - splitRatio}%` }}>
        <div className="tb-palette-title">Kéo thành phần vào đề</div>
        <input
          className="tb-palette-search"
          value={paletteQuery}
          onChange={(e) => setPaletteQuery(e.target.value)}
          placeholder="Tìm nhanh dạng câu hỏi..."
        />

        <div className={`tb-dnd-guide${showDragGuide ? '' : ' collapsed'}`}>
          <div className="tb-dnd-guide-header">
            <p><strong>Kéo-thả nhanh</strong></p>
            <button
              type="button"
              className="tb-dnd-guide-toggle"
              onClick={() => setShowDragGuide((prev) => !prev)}
              title={showDragGuide ? 'Ẩn hướng dẫn' : 'Hiện hướng dẫn'}
            >
              {showDragGuide ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
          {showDragGuide && (
            <ul>
              <li>Kéo loại câu hỏi từ danh sách bên dưới vào vùng canvas.</li>
              <li>Với Reading, kéo <strong>Reading Passage</strong> vào cột trái trước.</li>
              <li>Sau đó kéo nhóm câu hỏi vào cột phải để hoàn tất.</li>
            </ul>
          )}
        </div>

        <div className="tb-palette-grid">
          {sortedPalette.map((item) => (
            <DraggablePaletteItem key={item.contentType} item={item} />
          ))}
        </div>
        {sortedPalette.length === 0 && (
          <div className="tb-palette-empty">Không có thành phần phù hợp từ khóa.</div>
        )}
      </div>
      </div>

    </aside>
  );
};

export default BuilderSidebar;

