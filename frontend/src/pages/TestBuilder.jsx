import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Headphones, BookOpen, PenLine, Mic, GripVertical } from 'lucide-react';

import BuilderHeader from '../components/testBuilder/BuilderHeader';
import BuilderSidebar from '../components/testBuilder/BuilderSidebar';
import ExamCanvas from '../components/testBuilder/ExamCanvas';
import PropertiesPanel from '../components/testBuilder/PropertiesPanel';
import PreviewModal from '../components/testBuilder/PreviewModal';
import { testBuilderApi, buildSavePayload, parseLoadedTest } from '../services/testBuilderApi';
import { authApi } from '../services/authApi';
import '../styles/testBuilder.css';

// Roles cho phép dùng Test Builder
const ALLOWED_ROLES = ['TEACHER', 'MANAGER', 'ADMIN'];
const hasTeacherRole = () => {
  const user = authApi.getStoredUser();
  if (!user?.roles) return false;
  return user.roles.some(r => ALLOWED_ROLES.includes(r));
};

// ---- Session definitions (mirror backend Session entity) ----
const SESSION_META = {
  LISTENING: { label: 'Listening', icon: Headphones, iconBg: '#dbeafe', iconColor: '#1d4ed8', durationMinutes: 30, totalQuestions: 40 },
  READING:   { label: 'Reading',   icon: BookOpen,   iconBg: '#dcfce7', iconColor: '#15803d', durationMinutes: 60, totalQuestions: 40 },
  WRITING:   { label: 'Writing',   icon: PenLine,    iconBg: '#fef9c3', iconColor: '#a16207', durationMinutes: 60, totalQuestions: 2  },
  SPEAKING:  { label: 'Speaking',  icon: Mic,        iconBg: '#fce7f3', iconColor: '#be185d', durationMinutes: 12, totalQuestions: 18 },
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
  if (skillKey === 'WRITING') {
    return [
      { id: nextId(), name: 'Task 1 – Report/Description', orderIndex: 1,
        durationMinutes: 20, totalQuestions: 1,
        instructions: 'Mô tả biểu đồ, bảng số liệu, sơ đồ hoặc bản đồ (tối thiểu 150 từ)', questionGroups: [] },
      { id: nextId(), name: 'Task 2 – Essay', orderIndex: 2,
        durationMinutes: 40, totalQuestions: 1,
        instructions: 'Viết bài luận (tối thiểu 250 từ)', questionGroups: [] },
    ];
  }
  if (skillKey === 'SPEAKING') {
    return [
      { id: nextId(), name: 'Part 1 – Introduction & Interview', orderIndex: 1,
        durationMinutes: 5, totalQuestions: 13,
        instructions: 'Giám khảo hỏi về bản thân, gia đình, sở thích (4-5 phút)', questionGroups: [] },
      { id: nextId(), name: 'Part 2 – Long Turn (Cue Card)', orderIndex: 2,
        durationMinutes: 2, totalQuestions: 1,
        instructions: 'Nói về chủ đề cho sẵn trong 1-2 phút sau 1 phút chuẩn bị', questionGroups: [] },
      { id: nextId(), name: 'Part 3 – Two-way Discussion', orderIndex: 3,
        durationMinutes: 5, totalQuestions: 4,
        instructions: 'Thảo luận sâu hơn về chủ đề trong Part 2 (4-5 phút)', questionGroups: [] },
    ];
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
  const { id: editTestId } = useParams(); // /teacher/tests/:id/edit

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
  const [shuffling, setShuffling] = useState(false);
  const [activeOverlayItem, setActiveOverlayItem] = useState(null);
  const [dragOverPartId, setDragOverPartId] = useState(null);
  const [dragOverPassagePaneId, setDragOverPassagePaneId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedTestId, setSavedTestId] = useState(editTestId ? Number(editTestId) : null);
  const [structure, setStructure] = useState(null); // Backend session/part IDs
  const [saveMessage, setSaveMessage] = useState('');
  const [roleError, setRoleError] = useState(false);

  // ─── Fetch backend structure + load existing test on mount ───
  useEffect(() => {
    const init = async () => {
      try {
        // Kiểm tra quyền TEACHER trước
        if (!hasTeacherRole()) {
          setRoleError(true);
          return;
        }

        // Lấy cấu trúc sessions/parts từ backend
        const struct = await testBuilderApi.getStructure(test.testType);
        setStructure(struct);

        // Nếu đang edit đề thi có sẵn → load dữ liệu
        if (editTestId) {
          const loaded = await testBuilderApi.loadFullTest(editTestId);
          const { test: loadedTest, sessions: loadedSessions, testId } = parseLoadedTest(loaded);
          setTest(prev => ({ ...prev, ...loadedTest }));
          setSessions(prev => {
            const merged = { ...prev };
            for (const [skill, parts] of Object.entries(loadedSessions)) {
              if (parts.length > 0) merged[skill] = parts;
            }
            return merged;
          });
          setSavedTestId(testId);
        }
      } catch (err) {
        console.error('Không thể tải cấu trúc bài thi:', err);
      }
    };
    init();
  }, [editTestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const parts = sessions[activeSkill] ?? [];

  const findQuestionContext = useCallback((questionId) => {
    for (const part of parts) {
      const groups = part.questionGroups ?? [];
      for (const group of groups) {
        const questions = group.questions ?? [];
        if (questions.some((q) => q.id === questionId)) {
          return { part, group };
        }
      }
    }
    return null;
  }, [parts]);

  // Skills hiển thị dựa trên chế độ Full/Single
  const enabledSkills = test.isFullTest
    ? ['LISTENING', 'READING', 'WRITING', 'SPEAKING']
    : [test.singleSkill || 'LISTENING'];

  // ------------ Updaters ------------

  const updateTest = useCallback((updates) => {
    setTest((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSkillModeChange = useCallback(({ isFullTest, singleSkill }) => {
    const SKILL_DURATIONS = { LISTENING: 30, READING: 60, WRITING: 60, SPEAKING: 12 };
    setTest(prev => ({
      ...prev,
      isFullTest,
      singleSkill: singleSkill || null,
      durationMinutes: isFullTest ? 165 : (SKILL_DURATIONS[singleSkill] || 30),
    }));
    if (!isFullTest && singleSkill) {
      setActiveSkill(singleSkill);
    }
    setSelection(null);
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
    // Ràng buộc: MATCHING_HEADING chỉ được thêm khi part đã có READING_PASSAGE với multiParagraph = true
    if (contentType === 'MATCHING_HEADING') {
      const hasMultiPassage = (part.questionGroups ?? []).some(
        (g) => g.contentType === 'READING_PASSAGE' && g.multiParagraph === true
      );
      if (!hasMultiPassage) {
        alert('Cần thêm "Đoạn văn" trước và nhấn "Thêm heading" để bật chế độ đa đoạn trước khi thêm Match Headings.');
        return;
      }
    }

    const groupIdx = (part.questionGroups?.length ?? 0) + 1;

    // Tính startQuestionNumber dựa trên group trước đó
    const lastGroup = part.questionGroups?.[part.questionGroups.length - 1];
    let startQuestionNumber = 1;
    
    if (lastGroup && lastGroup.questions?.length > 0) {
      const lastQuestion = lastGroup.questions[lastGroup.questions.length - 1];
      const lastQuestionCount = lastQuestion.questionCount || 1;
      startQuestionNumber = lastQuestion.questionNumber + lastQuestionCount;
    }

    // ── Helpers ──
    const makeQ = (offset, typeName = 'FILL_IN_BLANK', extra = {}) => ({
      id: nextId(), groupId: null, partId: part.id,
      questionNumber: startQuestionNumber + offset - 1,
      questionText: '', answerText: '',
      questionType: { typeName },
      options: [], answers: [], points: 1, orderIndex: offset,
      ...extra,
    });
    const makeMCQ = (num) => makeQ(num, 'MULTIPLE_CHOICE', {
      options: ['A','B','C','D'].map((l, i) => ({ id: nextId(), optionLabel: l, optionText: '', isCorrect: false, orderIndex: i })),
    });
    const makeMMCQ = (num) => makeQ(num, 'MULTIPLE_CHOICE_MULTIPLE', {
      chooseCount: 2,
      options: ['A','B','C','D','E'].map((l, i) => ({ id: nextId(), optionLabel: l, optionText: '', isCorrect: false, orderIndex: i })),
    });

    // ── Default seed data theo contentType ──
    const seed = (() => {
      switch (contentType) {
        case 'READING_PASSAGE':
          return {
            title: '',
            paragraphs: [
              { id: `p-${nextId()}`, label: 'A', text: '' },
            ],
          };

        case 'MATCHING_HEADING':
          return {
            title: `Match Headings ${groupIdx}`,
            fromQuestion: null, toQuestion: null,
            headingBank: [
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
            ],
            questions: [
              makeQ(1, 'FILL_IN_BLANK', { questionText: 'Section A' }),
              makeQ(2, 'FILL_IN_BLANK', { questionText: 'Section B' }),
              makeQ(3, 'FILL_IN_BLANK', { questionText: 'Section C' }),
              makeQ(4, 'FILL_IN_BLANK', { questionText: 'Section D' }),
            ],
          };

        case 'MULTIPLE_CHOICE_GROUP':
          return {
            title: `Multiple Choice ${groupIdx}`,
            fromQuestion: null, toQuestion: null,
            questions: [makeMCQ(1), makeMCQ(2), makeMCQ(3)],
          };

        case 'MULTIPLE_CHOICE_MULTI':
          return {
            title: `Multiple Choice (nhiều) ${groupIdx}`,
            chooseCount: 2,
            fromQuestion: null, toQuestion: null,
            questions: [makeMMCQ(1)],
          };

        case 'TRUE_FALSE_NG':
          return {
            title: '',
            fromQuestion: null, toQuestion: null,
            questions: [
              makeQ(1, 'TRUE_FALSE_NG'),
              makeQ(2, 'TRUE_FALSE_NG'),
              makeQ(3, 'TRUE_FALSE_NG'),
            ],
          };

        case 'SENTENCE_COMPLETION':
          return {
            title: `Sentence Completion ${groupIdx}`,
            fromQuestion: null, toQuestion: null,
            questions: [
              makeQ(1, 'FILL_IN_BLANK'),
              makeQ(2, 'FILL_IN_BLANK'),
              makeQ(3, 'FILL_IN_BLANK'),
            ],
          };

        case 'SHORT_ANSWER_GROUP':
          return {
            title: `Short Answer ${groupIdx}`,
            fromQuestion: null, toQuestion: null,
            questions: [
              makeQ(1, 'SHORT_ANSWER'),
              makeQ(2, 'SHORT_ANSWER'),
              makeQ(3, 'SHORT_ANSWER'),
            ],
          };

        case 'NOTE_COMPLETION':
          return {
            title: `Note Completion ${groupIdx}`,
            noteText: '',
            fromQuestion: null, toQuestion: null,
            questions: [],
          };

        case 'SUMMARY_COMPLETION':
          return {
            title: `Summary Completion ${groupIdx}`,
            summaryText: '',
            fromQuestion: null, toQuestion: null,
            questions: [],
          };

        case 'DRAG_MATCHING':
          return {
            title: `Drag Matching ${groupIdx}`,
            leftTitle: '', rightTitle: '',
            fromQuestion: null, toQuestion: null,
            optionBank: [
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
              { id: nextId(), text: '' },
            ],
            questions: [
              makeQ(1, 'FILL_IN_BLANK', { questionText: '' }),
              makeQ(2, 'FILL_IN_BLANK', { questionText: '' }),
              makeQ(3, 'FILL_IN_BLANK', { questionText: '' }),
            ],
          };

        case 'TABLE_COMPLETION': {
          const c0 = `c${nextId()}`, c1 = `c${nextId()}`, c2 = `c${nextId()}`;
          return {
            title: `Table Completion ${groupIdx}`,
            tableTitle: '',
            fromQuestion: 1,
            columns: [
              { id: c0, header: '' },
              { id: c1, header: '' },
              { id: c2, header: '' },
            ],
            tableRows: [
              { id: `r${nextId()}`, cells: { [c0]: '', [c1]: '', [c2]: '' } },
              { id: `r${nextId()}`, cells: { [c0]: '', [c1]: '', [c2]: '' } },
              { id: `r${nextId()}`, cells: { [c0]: '', [c1]: '', [c2]: '' } },
            ],
            questions: [],
          };
        }

        case 'AUDIO_TRANSCRIPT':
          return {
            title: `Part ${groupIdx}`,
            audioUrl: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'FILL_IN_BLANK')],
          };

        case 'MAP':
        case 'DIAGRAM':
          return {
            title: `${contentType === 'MAP' ? 'Bản đồ' : 'Sơ đồ'} ${groupIdx}`,
            imageUrl: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'FILL_IN_BLANK')],
          };

        case 'MAP_LABELLING':
          return {
            title: `Map Labelling ${groupIdx}`,
            imageUrl: '',
            imageWidth: 100, pinBoxWidth: 60,
            constrainHalfPage: false,
            fromQuestion: null, toQuestion: null,
            optionBank: [],
            questions: [],
          };

        case 'WRITING_TASK':
          return {
            title: `Writing Task ${groupIdx}`,
            passageText: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'WRITING_TASK', { questionText: '' })],
          };

        case 'SPEAKING_INTERVIEW':
          return {
            title: `Speaking Interview ${groupIdx}`,
            passageText: '',
            fromQuestion: null, toQuestion: null,
            questions: [
              makeQ(1, 'SPEAKING_INTERVIEW', { questionText: '' }),
              makeQ(2, 'SPEAKING_INTERVIEW', { questionText: '' }),
              makeQ(3, 'SPEAKING_INTERVIEW', { questionText: '' }),
            ],
          };

        case 'SPEAKING_CUECARD':
          return {
            title: `Cue Card ${groupIdx}`,
            passageText: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'SPEAKING_CUECARD', { questionText: '' })],
          };

        default: // STANDALONE, TABLE…
          return {
            title: `Nhóm ${groupIdx}`,
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'FILL_IN_BLANK')],
          };
      }
    })();

    const newGroup = {
      id: nextId(),
      partId: part.id,
      contentType,
      passageText: '',
      audioUrl: '',
      imageUrl: '',
      orderIndex: groupIdx,
      questions: [],
      ...seed,
    };

    // Gán groupId cho tất cả questions được seed
    if (newGroup.questions?.length) {
      newGroup.questions = newGroup.questions.map((q) => ({ ...q, groupId: newGroup.id }));
    }

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
    const ct = group.contentType;
    // Determine default questionType and options based on group contentType
    const isMCQ  = ct === 'MULTIPLE_CHOICE_GROUP';
    const isMMCQ = ct === 'MULTIPLE_CHOICE_MULTI';
    const isTFNG = ct === 'TRUE_FALSE_NG';
    const isFill = ['SENTENCE_COMPLETION', 'SHORT_ANSWER_GROUP', 'NOTE_COMPLETION', 'SUMMARY_COMPLETION'].includes(ct);

    const defaultOptions = (isMCQ || isMMCQ)
      ? [
          { id: nextId(), optionLabel: 'A', optionText: '', isCorrect: false, orderIndex: 0 },
          { id: nextId(), optionLabel: 'B', optionText: '', isCorrect: false, orderIndex: 1 },
          { id: nextId(), optionLabel: 'C', optionText: '', isCorrect: false, orderIndex: 2 },
          { id: nextId(), optionLabel: 'D', optionText: '', isCorrect: false, orderIndex: 3 },
        ]
      : [
          { id: nextId(), optionLabel: 'A', optionText: '', isCorrect: false, orderIndex: 0 },
          { id: nextId(), optionLabel: 'B', optionText: '', isCorrect: false, orderIndex: 1 },
          { id: nextId(), optionLabel: 'C', optionText: '', isCorrect: false, orderIndex: 2 },
          { id: nextId(), optionLabel: 'D', optionText: '', isCorrect: false, orderIndex: 3 },
        ];

    let questionTypeName = 'MULTIPLE_CHOICE';
    if (isMMCQ) questionTypeName = 'MULTIPLE_CHOICE_MULTIPLE';
    else if (isTFNG) questionTypeName = 'TRUE_FALSE_NG';
    else if (isFill) questionTypeName = 'FILL_IN_BLANK';
    else if (ct === 'SHORT_ANSWER_GROUP') questionTypeName = 'SHORT_ANSWER';

    const newQ = {
      id: nextId(),
      groupId: group.id,
      partId: group.partId,
      questionNumber: (group.questions?.length ?? 0) + 1,
      questionText: '',
      questionType: { typeName: questionTypeName },
      options: (isMCQ || isMMCQ) ? defaultOptions : [],
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

  const handleDragOver = ({ active, over }) => {
    const overData = over?.data?.current;
    const activeData = active?.data?.current;
    const isPassageItem = activeData?.contentType === 'READING_PASSAGE';
    if (overData?.type === 'passage-pane' && isPassageItem) {
      setDragOverPassagePaneId(over.id);
      setDragOverPartId(null);
    } else if (overData?.type === 'question-pane' || overData?.type === 'part') {
      setDragOverPartId(over.id);
      setDragOverPassagePaneId(null);
    } else {
      setDragOverPartId(null);
      setDragOverPassagePaneId(null);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveOverlayItem(null);
    setDragOverPartId(null);
    setDragOverPassagePaneId(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over?.data?.current;

    // 1. Palette item dropped onto passage pane → only allow READING_PASSAGE
    if (activeData?.source === 'palette' && overData?.type === 'passage-pane') {
      if (activeData.contentType !== 'READING_PASSAGE') return; // block non-passage items
      const partId = Number(overData.partId);
      const part = parts.find((p) => p.id === partId);
      if (part) addGroup(part, 'READING_PASSAGE');
      return;
    }

    // 2. Palette item dropped onto question pane → use dragged contentType (block READING_PASSAGE)
    if (activeData?.source === 'palette' && overData?.type === 'question-pane') {
      const partId = Number(overData.partId);
      const part = parts.find((p) => p.id === partId);
      if (part) {
        // Don't allow dropping READING_PASSAGE into question pane
        const ct = activeData.contentType === 'READING_PASSAGE' ? 'STANDALONE' : activeData.contentType;
        addGroup(part, ct);
      }
      return;
    }

    // 3. Palette item dropped onto generic part drop zone (Listening/Writing/Speaking)
    if (activeData?.source === 'palette' && overData?.type === 'part') {
      const partId = Number(overData.partId ?? overData.part?.id);
      const part = parts.find((p) => p.id === partId);
      if (part) addGroup(part, activeData.contentType);
      return;
    }

    // 4. Reorder parts
    if (activeData?.type === 'part' && overData?.type === 'part') {
      const oldIdx = parts.findIndex((p) => `part-${p.id}` === active.id);
      const newIdx = parts.findIndex((p) => `part-${p.id}` === over.id);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setParts(arrayMove(parts, oldIdx, newIdx));
      }
      return;
    }

    // 5. Reorder groups within same part
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

  const handleDragCancel = () => { setActiveOverlayItem(null); setDragOverPartId(null); setDragOverPassagePaneId(null); };

  // ------------ Save ------------

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      // Lấy cấu trúc nếu chưa có
      let struct = structure;
      if (!struct) {
        struct = await testBuilderApi.getStructure(test.testType);
        setStructure(struct);
      }

      const user = authApi.getStoredUser();
      const userId = user?.id || 1;

      const payload = buildSavePayload(test, sessions, struct, userId, savedTestId);
      const result = await testBuilderApi.saveFullTest(payload);

      setSavedTestId(result.id);
      setSaveMessage('Đã lưu đề thi thành công!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Lỗi lưu đề thi:', err);
      if (err.response?.status === 403) {
        setSaveMessage('Bạn không có quyền lưu đề thi. Cần đăng nhập tài khoản có quyền TEACHER/MANAGER/ADMIN.');
      } else {
        setSaveMessage('Lỗi khi lưu đề thi: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = () => {
    updateTest({ status: 'REVIEWING' });
  };

  // ------------ Shuffle ------------

  const handleShuffle = async () => {
    setShuffling(true);
    setSaveMessage('');
    try {
      const user = authApi.getStoredUser();
      const userId = user?.id || 1;

      const result = await testBuilderApi.shuffleTest({
        title: `Đề trộn - ${new Date().toLocaleDateString('vi-VN')}`,
        testType: test.testType,
        createdByUserId: userId,
        isFullTest: true,
      });

      // Load kết quả vào builder
      const { test: shuffledTest, sessions: shuffledSessions, testId } = parseLoadedTest(result);
      setTest(prev => ({ ...prev, ...shuffledTest }));
      setSessions(prev => {
        const merged = { ...prev };
        for (const [skill, parts] of Object.entries(shuffledSessions)) {
          if (parts.length > 0) merged[skill] = parts;
        }
        return merged;
      });
      setSavedTestId(testId);
      setSaveMessage('Trộn đề thành công! Đề mới đã được tạo.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Lỗi trộn đề:', err);
      setSaveMessage('Lỗi trộn đề: ' + (err.response?.data?.error || err.message));
    } finally {
      setShuffling(false);
    }
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

  if (roleError) {
    return (
      <div className="tb-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff3cd', borderRadius: 12, maxWidth: 500 }}>
          <h2 style={{ color: '#856404', marginBottom: 12 }}>Không có quyền truy cập</h2>
          <p style={{ color: '#856404', marginBottom: 20 }}>
            Tính năng tạo đề thi yêu cầu tài khoản có quyền <strong>TEACHER</strong>, <strong>MANAGER</strong> hoặc <strong>ADMIN</strong>.
          </p>
          <p style={{ color: '#856404', fontSize: 14 }}>
            Tài khoản hiện tại chỉ có quyền <strong>STUDENT</strong>. Vui lòng đăng nhập lại bằng tài khoản giáo viên.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            style={{ marginTop: 16, padding: '10px 24px', background: '#856404', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}
          >
            Đăng nhập lại
          </button>
        </div>
      </div>
    );
  }

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
        onShuffle={handleShuffle}
        shuffling={shuffling}
        saveMessage={saveMessage}
        onSkillModeChange={handleSkillModeChange}
      />

      <div className="tb-workspace">
        <DndContext
          sensors={sensors}
          collisionDetection={({ active, droppableContainers, ...rest }) => {
            // For palette items use rectIntersection so empty panes are detectable
            if (active.data.current?.source === 'palette') {
              return rectIntersection({ active, droppableContainers, ...rest });
            }
            return closestCenter({ active, droppableContainers, ...rest });
          }}
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
            enabledSkills={enabledSkills}
            onSelectSession={(key) => { setActiveSkill(key); setSelection(null); }}
            onSelectPart={(p) => setSelection({ type: 'part', data: p })}
            onSelectGroup={(g) => setSelection({ type: 'group', data: { ...g } })}
          />

          <ExamCanvas
            skill={activeSkill}
            parts={parts}
            selection={selection}
            dragOverPartId={dragOverPartId}
            dragOverPassagePaneId={dragOverPassagePaneId}
            draggingContentType={activeOverlayItem?.contentType ?? null}
            onSelectGroup={(g, partId) => setSelection({ type: 'group', data: { ...g, partId } })}
            onSelectQuestion={(q) => {
              const ctx = findQuestionContext(q.id);
              if (ctx) {
                setSelection({
                  type: 'question',
                  data: {
                    ...q,
                    partId: ctx.part.id,
                    groupId: ctx.group.id,
                    groupContentType: ctx.group.contentType,
                  },
                });
              } else {
                setSelection({ type: 'question', data: q });
              }
            }}
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
            onAddGroup={(part, contentType) => addGroup(part, contentType)}
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
