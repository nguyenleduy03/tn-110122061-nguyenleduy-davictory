import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';import { Headphones, BookOpen, PenLine, Mic, GripVertical } from 'lucide-react';

import BuilderHeader from '../components/testBuilder/BuilderHeader';
import BuilderSidebar from '../components/testBuilder/BuilderSidebar';
import ExamCanvas from '../components/testBuilder/ExamCanvas';
import PropertiesPanel from '../components/testBuilder/PropertiesPanel';
import PreviewModal from '../components/testBuilder/PreviewModal';
import '../styles/testBuilder.css';

// ---- Session definitions (mirror backend Session entity) ----
const SESSION_META = {
  LISTENING: { label: 'Listening', icon: Headphones, iconBg: '#dbeafe', iconColor: '#1d4ed8', durationMinutes: 30, totalQuestions: 40 },
  READING:   { label: 'Reading',   icon: BookOpen,   iconBg: '#dcfce7', iconColor: '#15803d', durationMinutes: 60, totalQuestions: 40 },
  WRITING:   { label: 'Writing',   icon: PenLine,    iconBg: '#fef9c3', iconColor: '#a16207', durationMinutes: 60, totalQuestions: 2  },
  SPEAKING:  { label: 'Speaking',  icon: Mic,        iconBg: '#fce7f3', iconColor: '#be185d', durationMinutes: 15, totalQuestions: 3  },
};

// ---- Helpers ----
let _nextId = 1000;
const nextId = () => ++_nextId;

const makeDefaultParts = (skillKey) => {
  if (skillKey === 'LISTENING') {
    return [1, 2, 3, 4].map((i) => ({
      id: nextId(), name: `Part ${i}`, orderIndex: i,
      durationMinutes: null, totalQuestions: 10,
      instructions: '', questionGroups: [],
    }));
  }
  if (skillKey === 'READING') {
    return [1, 2, 3].map((i) => ({
      id: nextId(), name: `Passage ${i}`, orderIndex: i,
      durationMinutes: null, totalQuestions: 13,
      instructions: '', questionGroups: [],
    }));
  }
  return [{
    id: nextId(), name: 'Part 1', orderIndex: 1,
    durationMinutes: null, totalQuestions: 1,
    instructions: '', questionGroups: [],
  }];
};

const initialSessions = () =>
  Object.fromEntries(
    Object.keys(SESSION_META).map((key) => [key, makeDefaultParts(key)])
  );

// ---- Main Component ----
const TestBuilder = () => {
  const [test, setTest] = useState({
    title: '',
    description: '',
    testType: 'ACADEMIC',
    status: 'DRAFT',
    isFullTest: true,
    durationMinutes: 165,
    targetBand: '6.5',
  });

  // parts per skill key
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSkill, setActiveSkill] = useState('LISTENING');

  // selection state for properties panel
  const [selection, setSelection] = useState(null);
  // { type: 'part'|'group'|'question', data: {...} }

  const [saving, setSaving] = useState(false);
  const [activeOverlayItem, setActiveOverlayItem] = useState(null);
  const [dragOverPartId, setDragOverPartId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const parts = sessions[activeSkill] ?? [];

  // ------------ Updaters ------------

  const updateTest = useCallback((updates) => {
    setTest((prev) => ({ ...prev, ...updates }));
  }, []);

  const setParts = (updater) =>
    setSessions((prev) => ({
      ...prev,
      [activeSkill]: typeof updater === 'function' ? updater(prev[activeSkill]) : updater,
    }));

  const addPart = () => {
    const newPart = {
      id: nextId(),
      name: `Part ${parts.length + 1}`,
      orderIndex: parts.length + 1,
      durationMinutes: null,
      totalQuestions: 10,
      instructions: '',
      questionGroups: [],
    };
    setParts((prev) => [...prev, newPart]);
    setSelection({ type: 'part', data: newPart });
  };

  const deletePart = (partId) => {
    setParts((prev) => prev.filter((p) => p.id !== partId));
    if (selection?.type === 'part' && selection.data.id === partId) setSelection(null);
  };

  const duplicatePart = (part) => {
    const clone = {
      ...part,
      id: nextId(),
      name: `${part.name} (copy)`,
      orderIndex: parts.length + 1,
      questionGroups: part.questionGroups.map((g) => ({
        ...g,
        id: nextId(),
        questions: (g.questions ?? []).map((q) => ({ ...q, id: nextId() })),
      })),
    };
    setParts((prev) => [...prev, clone]);
  };

  const updatePart = (partId, updates) => {
    setParts((prev) =>
      prev.map((p) => (p.id === partId ? { ...p, ...updates } : p))
    );
    if (selection?.type === 'part' && selection.data.id === partId) {
      setSelection((s) => ({ ...s, data: { ...s.data, ...updates } }));
    }
  };

  const addGroup = (part, contentType = 'STANDALONE') => {
    const newGroup = {
      id: nextId(),
      partId: part.id,
      title: `Nhóm ${(part.questionGroups?.length ?? 0) + 1}`,
      contentType,
      passageText: '',
      audioUrl: '',
      imageUrl: '',
      fromQuestion: null,
      toQuestion: null,
      orderIndex: (part.questionGroups?.length ?? 0) + 1,
      questions: [],
    };
    updatePart(part.id, {
      questionGroups: [...(part.questionGroups ?? []), newGroup],
    });
    setSelection({ type: 'group', data: newGroup });
  };

  const updateGroup = (partId, groupId, updates) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        return {
          ...p,
          questionGroups: p.questionGroups.map((g) =>
            g.id === groupId ? { ...g, ...updates } : g
          ),
        };
      })
    );
    if (selection?.type === 'group' && selection.data.id === groupId) {
      setSelection((s) => ({ ...s, data: { ...s.data, ...updates } }));
    }
  };

  const deleteGroup = (partId, groupId) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        return { ...p, questionGroups: p.questionGroups.filter((g) => g.id !== groupId) };
      })
    );
    if (selection?.type === 'group' && selection.data.id === groupId) setSelection(null);
  };

  const addQuestion = (group) => {
    const newQ = {
      id: nextId(),
      groupId: group.id,
      partId: group.partId,
      questionNumber: (group.questions?.length ?? 0) + 1,
      questionText: '',
      questionType: { typeName: 'MULTIPLE_CHOICE' },
      options: [
        { id: nextId(), optionLabel: 'A', optionText: '', isCorrect: false, orderIndex: 0 },
        { id: nextId(), optionLabel: 'B', optionText: '', isCorrect: false, orderIndex: 1 },
        { id: nextId(), optionLabel: 'C', optionText: '', isCorrect: false, orderIndex: 2 },
        { id: nextId(), optionLabel: 'D', optionText: '', isCorrect: false, orderIndex: 3 },
      ],
      answers: [],
      points: 1,
      orderIndex: (group.questions?.length ?? 0) + 1,
    };
    updateGroup(group.partId, group.id, {
      questions: [...(group.questions ?? []), newQ],
    });
    setSelection({ type: 'question', data: newQ });
  };

  const updateQuestion = (partId, groupId, questionId, updates) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        return {
          ...p,
          questionGroups: p.questionGroups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              questions: g.questions.map((q) =>
                q.id === questionId ? { ...q, ...updates } : q
              ),
            };
          }),
        };
      })
    );
    if (selection?.type === 'question' && selection.data.id === questionId) {
      setSelection((s) => ({ ...s, data: { ...s.data, ...updates } }));
    }
  };

  const deleteQuestion = (partId, groupId, questionId) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        return {
          ...p,
          questionGroups: p.questionGroups.map((g) => {
            if (g.id !== groupId) return g;
            return { ...g, questions: g.questions.filter((q) => q.id !== questionId) };
          }),
        };
      })
    );
    if (selection?.type === 'question' && selection.data.id === questionId) setSelection(null);
  };

  // ------------ Properties panel change handler ------------

  const handlePanelChange = ({ type, updates }) => {
    if (type === 'part') {
      updatePart(selection.data.id, updates);
    } else if (type === 'group') {
      updateGroup(selection.data.partId, selection.data.id, updates);
    } else if (type === 'question') {
      updateQuestion(selection.data.partId, selection.data.groupId, selection.data.id, updates);
    }
  };

  const handlePanelDelete = ({ type, id, partId, groupId }) => {
    if (type === 'part') deletePart(id);
    else if (type === 'group') deleteGroup(partId, id);
    else if (type === 'question') deleteQuestion(partId, groupId, id);
  };

  // ------------ DnD handlers ------------

  const handleDragStart = ({ active }) => {
    setActiveOverlayItem(active.data.current ?? null);
  };

  const handleDragOver = ({ over }) => {
    const overData = over?.data?.current;
    if (overData?.type === 'part') {
      setDragOverPartId(over.id);
    } else {
      setDragOverPartId(null);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveOverlayItem(null);
    setDragOverPartId(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over?.data?.current;

    // 1. Palette item dropped onto a part → add group
    if (activeData?.source === 'palette' && overData?.type === 'part') {
      const partId = overData.partId ?? overData.part?.id;
      const part = parts.find((p) => p.id === partId);
      if (part) addGroup(part, activeData.contentType);
      return;
    }

    // 2. Reorder parts
    if (activeData?.type === 'part' && overData?.type === 'part') {
      const oldIdx = parts.findIndex((p) => `part-${p.id}` === active.id);
      const newIdx = parts.findIndex((p) => `part-${p.id}` === over.id);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setParts(arrayMove(parts, oldIdx, newIdx));
      }
      return;
    }

    // 3. Reorder groups within same part
    if (activeData?.type === 'group' && overData?.type === 'group') {
      setParts((prev) =>
        prev.map((p) => {
          const groups = p.questionGroups ?? [];
          const aIdx = groups.findIndex((g) => `group-${g.id}` === active.id);
          const bIdx = groups.findIndex((g) => `group-${g.id}` === over.id);
          if (aIdx === -1 || bIdx === -1 || aIdx === bIdx) return p;
          return { ...p, questionGroups: arrayMove(groups, aIdx, bIdx) };
        })
      );
    }
  };

  const handleDragCancel = () => { setActiveOverlayItem(null); setDragOverPartId(null); };

  // ------------ Save ------------

  const handleSave = async () => {
    setSaving(true);
    // TODO: POST /api/tests with test + sessions payload
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
  };

  const handleSubmitReview = () => {
    updateTest({ status: 'REVIEWING' });
  };

  // ------------ Render session header ------------

  const renderSessionHeader = () => {
    const meta = SESSION_META[activeSkill];
    if (!meta) return null;
    const Icon = meta.icon;
    const totalQuestions = parts.reduce(
      (acc, p) => acc + (p.questionGroups ?? []).reduce((a, g) => a + (g.questions?.length ?? 0), 0),
      0
    );
    return (
      <div className="tb-canvas-session-header">
        <div
          className="tb-canvas-session-icon"
          style={{ background: meta.iconBg, color: meta.iconColor }}
        >
          <Icon size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="tb-canvas-session-name">{meta.label}</div>
          <div className="tb-canvas-session-meta">
            {meta.durationMinutes} phút • {meta.totalQuestions} câu chuẩn •{' '}
            <strong>{totalQuestions}</strong> câu đã thêm
          </div>
        </div>
      </div>
    );
  };

  // ------------ Render ------------

  return (
    <div className="tb-page">
      {previewOpen && (
        <PreviewModal
          test={test}
          sessions={sessions}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      <BuilderHeader
        test={test}
        onTestChange={updateTest}
        onSave={handleSave}
        onPreview={() => setPreviewOpen(true)}
        onSubmitReview={handleSubmitReview}
        saving={saving}
      />

      <div className="tb-workspace">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <BuilderSidebar
            parts={parts}
            sessions={sessions}
            activeSessionKey={activeSkill}
            selection={selection}
            onSelectSession={(key) => { setActiveSkill(key); setSelection(null); }}
            onSelectPart={(p) => setSelection({ type: 'part', data: p })}
            onSelectGroup={(g) => setSelection({ type: 'group', data: { ...g } })}
          />

          <ExamCanvas
            skill={activeSkill}
            parts={parts}
            selection={selection}
            dragOverPartId={dragOverPartId}
            onSelectGroup={(g, partId) => setSelection({ type: 'group', data: { ...g, partId } })}
            onSelectQuestion={(q) => setSelection({ type: 'question', data: q })}
            onUpdateGroup={(groupId, upd) => {
              const part = parts.find((p) => p.questionGroups?.some((g) => g.id === groupId));
              if (part) updateGroup(part.id, groupId, upd);
            }}
            onUpdateQuestion={(groupId, questionId, upd) => {
              const part = parts.find((p) => p.questionGroups?.some((g) => g.id === groupId));
              if (part) updateQuestion(part.id, groupId, questionId, upd);
            }}
            onDeleteGroup={(groupId) => {
              const part = parts.find((p) => p.questionGroups?.some((g) => g.id === groupId));
              if (part) deleteGroup(part.id, groupId);
            }}
            onDeleteQuestion={(groupId, questionId) => {
              const part = parts.find((p) => p.questionGroups?.some((g) => g.id === groupId));
              if (part) deleteQuestion(part.id, groupId, questionId);
            }}
            onAddQuestion={(group) => addQuestion(group)}
            onAddGroup={(part) => addGroup(part)}
            onAddPart={addPart}
          />

          {/* Drag overlay */}
          <DragOverlay>
            {activeOverlayItem?.source === 'palette' && (
              <div className="tb-drag-preview">
                <span style={{ fontSize: 16 }}>{activeOverlayItem.icon}</span>
                <span>{activeOverlayItem.label}</span>
              </div>
            )}
            {activeOverlayItem?.type === 'group' && (
              <div className="tb-drag-preview">
                <GripVertical size={14} /> Nhóm câu hỏi
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <PropertiesPanel
          selection={selection}
          onChange={handlePanelChange}
          onDelete={handlePanelDelete}
        />
      </div>
    </div>
  );
};

export default TestBuilder;
