import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
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
import IframePreviewModal from '../components/testBuilder/IframePreviewModal';
import PropertiesPanel from '../components/testBuilder/PropertiesPanel';
import ErrorBoundary from '../components/common/ErrorBoundary';
import VersionHistoryModal from '../components/common/VersionHistoryModal';
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
  READING: { label: 'Reading', icon: BookOpen, iconBg: '#dcfce7', iconColor: '#15803d', durationMinutes: 60, totalQuestions: 40 },
  WRITING: { label: 'Writing', icon: PenLine, iconBg: '#fef9c3', iconColor: '#a16207', durationMinutes: 60, totalQuestions: 2 },
  SPEAKING: { label: 'Speaking', icon: Mic, iconBg: '#fce7f3', iconColor: '#be185d', durationMinutes: 12, totalQuestions: 18 },
};

// ---- Helpers ----
let _nextId = 1000;
const nextId = () => ++_nextId;

// Tính lại fromQuestion và toQuestion cho tất cả groups trong một part
const getGroupQuestionCount = (group) => {
  if (group?.contentType === 'AUDIO_TRANSCRIPT') return 0;
  
  // Matching Heading: đếm theo số paragraphs (nếu có passage)
  if (group?.contentType === 'MATCHING_HEADING') {
    // Nếu đã có questions thì đếm questions
    if (group.questions && group.questions.length > 0) {
      return group.questions.length;
    }
    // Nếu chưa có questions, trả về 0 (sẽ được tính khi có passage)
    return 0;
  }
  
  return (group?.questions ?? []).reduce((sum, q) => sum + (q.questionCount || 1), 0);
};

const recalculateQuestionNumbers = (groups, partOffset = 0) => {
  let runningTotal = partOffset;
  const result = groups.map((g) => {
    const questionCount = getGroupQuestionCount(g);

    const fromQuestion = questionCount > 0 ? runningTotal + 1 : null;
    const toQuestion = questionCount > 0 ? runningTotal + questionCount : null;

    runningTotal += questionCount;

    // Chỉ tạo object mới nếu fromQuestion/toQuestion thay đổi
    if (g.fromQuestion === fromQuestion && g.toQuestion === toQuestion) {
      return g;
    }

    console.log('🔢 Recalculate:', { 
      groupId: g.id, 
      contentType: g.contentType,
      questionCount, 
      fromQuestion, 
      toQuestion,
      partOffset
    });

    return {
      ...g,
      fromQuestion,
      toQuestion,
    };
  });
  return result;
};

// Helper: tính số câu từ các part trước partId
const getPartOffset = (parts, partId) => {
  const partIndex = parts.findIndex(p => p.id === partId);
  if (partIndex <= 0) return 0;
  
  return parts.slice(0, partIndex).reduce((sum, p) => {
    return sum + (p.questionGroups ?? []).reduce((gSum, g) => gSum + getGroupQuestionCount(g), 0);
  }, 0);
};

const hasActiveMediaUpload = (sessions = {}) => Object.values(sessions).some((parts) => (
  (parts || []).some((part) => (
    (part.questionGroups || []).some((group) => group?.audioUploadStatus === 'uploading')
  ))
));

const createListeningAudioGroup = (partId, orderIndex = 1) => ({
  id: nextId(),
  partId,
  contentType: 'AUDIO_TRANSCRIPT',
  title: 'Audio transcript',
  passageText: '',
  audioUrl: '',
  audioPlayCount: 1,
  imageUrl: '',
  orderIndex,
  questions: [],
});

const makeDefaultParts = (skillKey) => {
  if (skillKey === 'LISTENING') {
    return [1, 2, 3, 4].map((i) => {
      const partId = nextId();
      const start = (i - 1) * 10 + 1;
      const end = start + 9;
      return {
        id: partId,
        name: `Part ${i}`,
        orderIndex: i,
        durationMinutes: null,
        totalQuestions: 10,
        instructions: `<strong>Questions ${start}–${end}</strong>`,
        questionGroups: [createListeningAudioGroup(partId)],
      };
    });
  }
  if (skillKey === 'READING') {
    return [1, 2, 3].map((i) => {
      const start = (i - 1) * 13 + 1;
      const end = start + 12;
      return {
        id: nextId(), name: `Passage ${i}`, orderIndex: i,
        durationMinutes: null, totalQuestions: 13,
        instructions: `<strong>Questions ${start}–${end}</strong>`, questionGroups: [],
      };
    });
  }
  if (skillKey === 'WRITING') {
    return [
      {
        id: nextId(), name: 'Task 1 – Report/Description', orderIndex: 1,
        durationMinutes: 20, totalQuestions: 1,
        instructions: 'Mô tả biểu đồ, bảng số liệu, sơ đồ hoặc bản đồ (tối thiểu 150 từ)', questionGroups: []
      },
      {
        id: nextId(), name: 'Task 2 – Essay', orderIndex: 2,
        durationMinutes: 40, totalQuestions: 1,
        instructions: 'Viết bài luận (tối thiểu 250 từ)', questionGroups: []
      },
    ];
  }
  if (skillKey === 'SPEAKING') {
    return [
      {
        id: nextId(), name: 'Part 1 – Introduction & Interview', orderIndex: 1,
        durationMinutes: 5, totalQuestions: 13,
        instructions: 'Giám khảo hỏi về bản thân, gia đình, sở thích (4-5 phút)', questionGroups: []
      },
      {
        id: nextId(), name: 'Part 2 – Long Turn (Cue Card)', orderIndex: 2,
        durationMinutes: 2, totalQuestions: 1,
        instructions: 'Nói về chủ đề cho sẵn trong 1-2 phút sau 1 phút chuẩn bị', questionGroups: []
      },
      {
        id: nextId(), name: 'Part 3 – Two-way Discussion', orderIndex: 3,
        durationMinutes: 5, totalQuestions: 4,
        instructions: 'Thảo luận sâu hơn về chủ đề trong Part 2 (4-5 phút)', questionGroups: []
      },
    ];
  }
  return [{
    id: nextId(), name: 'Part 1', orderIndex: 1,
    durationMinutes: null, totalQuestions: 10,
    instructions: '<strong>Questions 1–10</strong>', questionGroups: [],
  }];
};

const initialSessions = () =>
  Object.fromEntries(
    Object.keys(SESSION_META).map((key) => [key, makeDefaultParts(key)])
  );

const AUTO_SAVE_STORAGE_KEY = 'testBuilder:autoSaveEnabled';

const DEFAULT_SESSION_DURATIONS = {
  LISTENING: 30,
  READING: 60,
  WRITING: 60,
  SPEAKING: 12,
};

const readAutoSaveEnabled = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

// ---- Main Component ----
const TestBuilder = () => {
  const { id: editTestId } = useParams(); // /teacher/tests/:id/edit
  const navigate = useNavigate();

  const [test, setTest] = useState({
    title: '',
    description: '',
    testType: 'ACADEMIC',
    seriesLabel: 'IELTS',
    status: 'DRAFT',
    isFullTest: true,
    durationMinutes: 165,
    targetBand: '6.5',
  });

  // parts per skill key
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSkill, setActiveSkill] = useState('LISTENING');
  const [sessionDurations, setSessionDurations] = useState(DEFAULT_SESSION_DURATIONS);

  // selection state for properties panel
  const [selection, setSelection] = useState(null);
  // { type: 'part'|'group'|'question', data: {...} }

  const [saving, setSaving] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(readAutoSaveEnabled);
  const [activeOverlayItem, setActiveOverlayItem] = useState(null);
  const [dragOverPartId, setDragOverPartId] = useState(null);
  const [dragOverPassagePaneId, setDragOverPassagePaneId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedTestId, setSavedTestId] = useState(editTestId ? Number(editTestId) : null);
  const [structure, setStructure] = useState(null); // Backend session/part IDs
  const [saveMessage, setSaveMessage] = useState('');
  const [roleError, setRoleError] = useState(false);
  const [showFormatToolbar, setShowFormatToolbar] = useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const lastAutoSaveSnapshotRef = useRef(JSON.stringify({ test, sessions }));
  const hasChangedSinceEntryRef = useRef(false); // true khi user thay đổi kể từ lúc vào editor
  const autoSaveTimerRef = useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const pendingNavigationRef = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, String(autoSaveEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [autoSaveEnabled]);

  // Theo dõi thay đổi
  useEffect(() => {
    if (isInitialLoad) return;
    const currentSnapshot = JSON.stringify({ test, sessions });
    const hasChanges = currentSnapshot !== lastAutoSaveSnapshotRef.current;
    setHasUnsavedChanges(hasChanges);
    if (hasChanges) hasChangedSinceEntryRef.current = true;
  }, [test, sessions, isInitialLoad]);

  // Chặn navigation khi có thay đổi chưa lưu
  useBeforeUnload(
    useCallback((e) => {
      if (hasUnsavedChanges && !saving) {
        e.preventDefault();
        return (e.returnValue = '');
      }
    }, [hasUnsavedChanges, saving])
  );

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
          const nextTest = { ...test, ...loadedTest };
          const nextSessions = (() => {
            const merged = { ...sessions };
            for (const [skill, parts] of Object.entries(loadedSessions)) {
              if (parts.length > 0) merged[skill] = parts;
            }
            return merged;
          })();
          setTest(prev => ({ ...prev, ...loadedTest }));
          setSessions(prev => {
            const merged = { ...prev };
            for (const [skill, parts] of Object.entries(loadedSessions)) {
              if (parts.length > 0) merged[skill] = parts;
            }
            return merged;
          });
          setSessionDurations(loadedTest.sessionDurations || DEFAULT_SESSION_DURATIONS);
          setSavedTestId(testId);
          // Set snapshot và bật tracking sau khi load xong
          setTimeout(() => {
            const snap = JSON.stringify({ test: nextTest, sessions: nextSessions });
            lastAutoSaveSnapshotRef.current = snap;
            hasChangedSinceEntryRef.current = false;
            setIsInitialLoad(false);
          }, 100);
        } else {
          hasChangedSinceEntryRef.current = false;
          setIsInitialLoad(false);
        }
      } catch (err) {
        console.error('Không thể tải cấu trúc bài thi:', err);
      }
    };
    init();
  }, [editTestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
      // Add error handling
      onActivation: (event) => {
        console.log('Sensor activated:', event);
      }
    })
  );

  const parts = sessions[activeSkill] ?? [];
  const sessionDuration = sessionDurations?.[activeSkill]
    ?? test.sessionDurations?.[activeSkill]
    ?? parts.find((part) => Number.isFinite(part?.durationMinutes))?.durationMinutes
    ?? null;

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

  function getFirstLoadedSkill(sessionMap) {
    const skillOrder = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
    return skillOrder.find((skillKey) => (sessionMap?.[skillKey] || []).some((part) => (part.questionGroups || []).length > 0)) || null;
  }

  // Luôn đồng bộ tab đang mở với chế độ 1 kỹ năng sau khi load/đổi kiểu đề
  useEffect(() => {
    if (!test.isFullTest) {
      const resolvedSkill = test.singleSkill || getFirstLoadedSkill(sessions) || 'LISTENING';
      if (resolvedSkill && activeSkill !== resolvedSkill) {
        setActiveSkill(resolvedSkill);
      }
    }
  }, [test.isFullTest, test.singleSkill, sessions, activeSkill]);

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

  const setParts = (updater) => {
    console.log('🔄 setParts called for skill:', activeSkill);
    setSessions((prev) => {
      const currentParts = prev[activeSkill] || [];
      const newParts = typeof updater === 'function' ? updater(currentParts) : updater;
      
      // Tính offset từ các session trước activeSkill
      const skillOrder = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
      const currentSkillIndex = skillOrder.indexOf(activeSkill);
      
      let sessionOffset = 0;
      for (let i = 0; i < currentSkillIndex; i++) {
        const skillKey = skillOrder[i];
        const skillParts = prev[skillKey] || [];
        sessionOffset += skillParts.reduce((sum, p) => {
          return sum + (p.questionGroups ?? []).reduce((gSum, g) => gSum + getGroupQuestionCount(g), 0);
        }, 0);
      }
      
      console.log('📊 Session offset for', activeSkill, ':', sessionOffset);
      
      // Recalculate question numbers cho tất cả parts với offset đúng
      const recalculatedParts = newParts.map((part, index) => {
        const partOffset = sessionOffset + newParts.slice(0, index).reduce((sum, p) => {
          return sum + (p.questionGroups ?? []).reduce((gSum, g) => gSum + getGroupQuestionCount(g), 0);
        }, 0);
        
        return {
          ...part,
          questionGroups: recalculateQuestionNumbers(part.questionGroups, partOffset)
        };
      });
      
      const updated = {
        ...prev,
        [activeSkill]: recalculatedParts,
      };
      console.log('✅ Sessions updated:', { 
        skill: activeSkill, 
        partsCount: updated[activeSkill]?.length,
        firstPartGroups: updated[activeSkill]?.[0]?.questionGroups?.length 
      });
      return updated;
    });
  };

  const addPart = () => {
    // Tính toán question range theo quy chuẩn IELTS
    const lastPart = parts[parts.length - 1];
    let startQ = 1;
    if (lastPart) {
      const lastGroups = lastPart.questionGroups || [];
      if (lastGroups.length > 0) {
        const lastGroup = lastGroups[lastGroups.length - 1];
        startQ = (lastGroup.toQuestion || lastGroup.fromQuestion || 0) + 1;
      }
    }
    const endQ = startQ + 9; // Mặc định 10 câu

    const newPart = {
      id: nextId(),
      name: `Part ${parts.length + 1}`,
      orderIndex: parts.length + 1,
      durationMinutes: null,
      totalQuestions: 10,
      instructions: `<strong>Questions ${startQ}–${endQ}</strong>`,
      questionGroups: activeSkill === 'LISTENING' ? [createListeningAudioGroup(null)] : [],
    };

    if (activeSkill === 'LISTENING') {
      newPart.questionGroups = [createListeningAudioGroup(newPart.id)];
    }
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
      prev.map((p) => {
        if (p.id !== partId) return p;
        const updated = { ...p, ...updates };
        // Nếu questionGroups thay đổi, tính lại question numbers
        if ('questionGroups' in updates) {
          updated.questionGroups = recalculateQuestionNumbers(updated.questionGroups);
        }
        return updated;
      })
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

    // Tính startQuestionNumber: cộng tất cả câu hỏi từ các part trước + part hiện tại
    const parts = sessions[activeSkill] || [];
    const partIndex = parts.findIndex(p => p.id === part.id);
    
    // Đếm câu từ các part trước
    const questionsBeforePart = parts.slice(0, partIndex).reduce((sum, p) => {
      return sum + (p.questionGroups ?? []).reduce((gSum, g) => gSum + getGroupQuestionCount(g), 0);
    }, 0);
    
    // Đếm câu trong part hiện tại
    const questionsInCurrentPart = (part.questionGroups ?? []).reduce((sum, g) => {
      return sum + getGroupQuestionCount(g);
    }, 0);
    
    const startQuestionNumber = questionsBeforePart + questionsInCurrentPart + 1;

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
      options: ['A', 'B', 'C', 'D'].map((l, i) => ({ id: nextId(), optionLabel: l, optionText: '', isCorrect: false, orderIndex: i })),
    });
    const makeMMCQ = (num) => makeQ(num, 'MULTIPLE_CHOICE_MULTIPLE', {
      chooseCount: 2,  // Số đáp án đúng cần chọn
      questionCount: 2,  // Tính 2 câu (tương ứng với 2 đáp án đúng)
      options: ['A', 'B', 'C', 'D', 'E'].map((l, i) => ({ id: nextId(), optionLabel: l, optionText: '', isCorrect: false, orderIndex: i })),
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
            headingBank: [],
            questions: [],
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
            instructions: '',
            chooseCount: 2,
            fromQuestion: null, toQuestion: null,
            questions: [makeMMCQ(1)],
          };

        case 'SHARED_OPTIONS_DROPDOWN': {
          const mkDrop = (n) => makeQ(n, 'MCQ_DROPDOWN', {
            options: [],
            answerText: '',
            answers: [{ answerText: '', blankIndex: 1, isCaseSensitive: false }],
          });
          return {
            title: `Questions ${startQuestionNumber}–${startQuestionNumber + 4}`,
            fromQuestion: startQuestionNumber,
            toQuestion: startQuestionNumber + 4,
            instructions: '',
            questionTitle: '',
            mainInstruction: '',
            subInstruction: '',
            imageUrl: '',
            imageWidth: 100,
            sharedOptions: [
              { id: `so-${Date.now()}-a`, key: 'A', label: '', imageUrl: '' },
              { id: `so-${Date.now()}-b`, key: 'B', label: '', imageUrl: '' },
              { id: `so-${Date.now()}-c`, key: 'C', label: '', imageUrl: '' },
            ],
            questions: [mkDrop(1), mkDrop(2), mkDrop(3), mkDrop(4), mkDrop(5)],
          };
        }

        case 'TRUE_FALSE_NG':
          return {
            title: '',
            fromQuestion: null, toQuestion: null,
            questions: [],
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
            title: '',
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
        case 'FILL_BLANK_DRAG':
        case 'SENTENCE_COMPLETION_DRAG':
        case 'SUMMARY_COMPLETION_DRAG':
        case 'NOTE_COMPLETION_DRAG':
          return {
            title: (contentType === 'DRAG_MATCHING')
              ? `Drag Matching ${groupIdx}`
              : (contentType === 'FILL_BLANK_DRAG')
                ? `Fill Blank (Drag) ${groupIdx}`
                : (contentType === 'SENTENCE_COMPLETION_DRAG')
                  ? `Sentence (Drag) ${groupIdx}`
                  : (contentType === 'SUMMARY_COMPLETION_DRAG')
                    ? `Summary (Drag) ${groupIdx}`
                    : `Note (Drag) ${groupIdx}`,
            leftTitle: '', rightTitle: '',
            allowOptionReuse: true, // Mặc định cho phép dùng lại thẻ
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
            questions: [],
          };

        case 'MAP':
        case 'DIAGRAM':
          return {
            title: `${contentType === 'MAP' ? 'Bản đồ' : 'Sơ đồ'} ${groupIdx}`,
            imageUrl: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'FILL_IN_BLANK')],
          };

        case 'MAP_LABELLING': {
          return {
            title: `Map Labelling ${groupIdx}`,
            imageUrl: '',
            pinBoxWidth: 60,
            constrainHalfPage: false,
            allowOptionReuse: true, // Mặc định cho phép dùng lại thẻ
            fromQuestion: null, toQuestion: null,
            optionBank: [],
            questions: [],
          };
        }

        case 'IMAGE_NOTE_FORM': {
          return {
            title: `Image + Note Form ${groupIdx}`,
            imageUrl: '',                    // Link ảnh
            imagePosition: 'middle',         // 'top' | 'middle' | 'bottom'
            pinBoxWidth: 60,                 // Độ rộng ô pin
            noteText: '',                    // Nội dung form/note có chỗ trống (legacy/combined)
            topNoteText: '',                 // Đoạn văn phía trên ảnh
            bottomNoteText: '',              // Đoạn văn phía dưới ảnh
            fromQuestion: startQuestionNumber,
            toQuestion: startQuestionNumber,
            questions: [],                   // KHÔNG tạo sẵn câu hỏi
          };
        }

        case 'WRITING_TASK':
          return {
            title: `Writing Task ${groupIdx}`,
            passageText: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'WRITING_TASK', { questionText: '' })],
          };

        case 'SPEAKING_INTERVIEW':
          return {
            title: `Part 1 - Interview ${groupIdx}`,
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
            title: `Part 2 - Cue Card ${groupIdx}`,
            passageText: '',
            fromQuestion: null, toQuestion: null,
            questions: [makeQ(1, 'SPEAKING_CUECARD', { questionText: '' })],
          };

        case 'SPEAKING_DISCUSSION':
          return {
            title: `Part 3 - Discussion ${groupIdx}`,
            passageText: '',
            fromQuestion: null, toQuestion: null,
            questions: [
              makeQ(1, 'SPEAKING_DISCUSSION', { questionText: '' }),
              makeQ(2, 'SPEAKING_DISCUSSION', { questionText: '' }),
            ],
          };

        case 'CUSTOM':
          return {
            title: `Custom ${groupIdx}`,
            fromQuestion: null, toQuestion: null,
            // Schema v2: bộ công cụ IELTS (completion, MCQ, drag-drop)
            customSchema: {
              version: 2,
              mode: 'BLANKS', // BLANKS | MCQ_SINGLE | MCQ_MULTI | DRAG_DROP
              promptHtml: '',
              optionBank: [
                { id: nextId(), text: '' },
                { id: nextId(), text: '' },
                { id: nextId(), text: '' },
                { id: nextId(), text: '' },
              ],
              leftItems: [
                { id: nextId(), text: '' },
                { id: nextId(), text: '' },
                { id: nextId(), text: '' },
              ],
              chooseCount: 2,
            },
            questions: [makeQ(1, 'FILL_IN_BLANK', { questionText: '' })],
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

  const updateGroup = useCallback((partId, groupId, updates) => {
    setParts((prev) => {
      const currentPart = prev.find((p) => p.id === partId);
      const currentGroup = currentPart?.questionGroups?.find((g) => g.id === groupId);
      if (!currentGroup) return prev;

      // So sánh sâu để tránh update không cần thiết
      const hasChanges = Object.keys(updates).some((key) => {
        if (key === 'questions') {
          return JSON.stringify(currentGroup.questions ?? []) !== JSON.stringify(updates.questions ?? []);
        }
        return currentGroup[key] !== updates[key];
      });

      if (!hasChanges) {
        return prev;
      }

      // Update parts state
      return prev.map((p) => {
        if (p.id !== partId) return p;
        const updatedGroups = p.questionGroups.map((g) => {
          if (g.id !== groupId) return g;
          const updated = { ...g, ...updates };
          if (updated.contentType === 'MULTIPLE_CHOICE_MULTI' && 'chooseCount' in updates) {
            updated.questions = (updated.questions || []).map(q => ({
              ...q,
              questionCount: updates.chooseCount
            }));
          }
          return updated;
        });
        return { ...p, questionGroups: recalculateQuestionNumbers(updatedGroups) };
      });
    });

    // QUAN TRỌNG: Cũng update sessions state
    setSessions((prev) => {
      const updated = { ...prev };
      for (const [skillKey, parts] of Object.entries(updated)) {
        updated[skillKey] = parts.map(p => {
          if (p.id !== partId) return p;
          const updatedGroups = (p.questionGroups || []).map(g => {
            if (g.id !== groupId) return g;
            return { ...g, ...updates };
          });
          return { ...p, questionGroups: updatedGroups };
        });
      }
      return updated;
    });

    setSelection((s) => {
      if (s?.type === 'group' && s.data.id === groupId) {
        return { ...s, data: { ...s.data, ...updates } };
      }
      return s;
    });
  }, []);

  const deleteGroup = (partId, groupId) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;

        const filteredGroups = p.questionGroups.filter((g) => g.id !== groupId);
        return { ...p, questionGroups: recalculateQuestionNumbers(filteredGroups) };
      })
    );
    if (selection?.type === 'group' && selection.data.id === groupId) setSelection(null);
  };

  const moveGroupByStep = (partId, groupId, direction) => {
    setParts((prev) => {
      const groups = prev.find((p) => p.id === partId)?.questionGroups ?? [];
      const idx = groups.findIndex((g) => g.id === groupId);
      if (idx === -1) return prev;

      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= groups.length) return prev;

      return prev.map((p) => {
        if (p.id !== partId) return p;

        const reorderedGroups = arrayMove(groups, idx, targetIdx);
        return { ...p, questionGroups: recalculateQuestionNumbers(reorderedGroups) };
      });
    });
  };

  const addQuestion = (group) => {
    const ct = group.contentType;
    // Determine default questionType and options based on group contentType
    const isMCQ = ct === 'MULTIPLE_CHOICE_GROUP';
    const isMMCQ = ct === 'MULTIPLE_CHOICE_MULTI';
    const isSharedDrop = ct === 'SHARED_OPTIONS_DROPDOWN';
    const isTFNG = ct === 'TRUE_FALSE_NG';
    const isFill = ['SENTENCE_COMPLETION', 'SHORT_ANSWER_GROUP', 'NOTE_COMPLETION', 'SUMMARY_COMPLETION', 'IMAGE_NOTE_FORM'].includes(ct);

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
    else if (isSharedDrop) questionTypeName = 'MCQ_DROPDOWN';
    else if (isTFNG) questionTypeName = 'TRUE_FALSE_NG';
    else if (isFill) questionTypeName = 'FILL_IN_BLANK';
    else if (ct === 'SHORT_ANSWER_GROUP') questionTypeName = 'SHORT_ANSWER';

    // Tính questionNumber đúng cho IMAGE_NOTE_FORM
    let questionNumber = (group.questions?.length ?? 0) + 1;
    if (ct === 'IMAGE_NOTE_FORM') {
      const partGroups = parts.find((p) => p.id === group.partId)?.questionGroups ?? [];
      const startNum = partGroups.reduce((sum, g) => {
        if (g.id === group.id) return sum;
        return sum + getGroupQuestionCount(g);
      }, 0) + 1;
      const maxNum = group.questions && group.questions.length > 0
        ? Math.max(...group.questions.map(q => q.questionNumber || 0))
        : startNum - 1;
      questionNumber = maxNum + 1;
    }

    const newQ = {
      id: nextId(),
      groupId: group.id,
      partId: group.partId,
      questionNumber: questionNumber,
      questionText: '',
      answerText: '', // Khởi tạo answerText rỗng cho drag matching
      questionType: { typeName: questionTypeName },
      options: (isMCQ || isMMCQ) ? defaultOptions : [],
      answers: isSharedDrop ? [{ answerText: '', blankIndex: 1, isCaseSensitive: false }] : [],
      points: 1,
      orderIndex: (group.questions?.length ?? 0) + 1,
      ...(isMMCQ && { questionCount: group.chooseCount || 2 }),
    };

    const updatedQuestions = [...(group.questions ?? []), newQ];

    // Tự động cập nhật fromQuestion và toQuestion cho TẤT CẢ groups trong part
    setParts((prev) => prev.map((p) => {
      if (p.id !== group.partId) return p;

      const updatedGroups = p.questionGroups.map((g) =>
        g.id === group.id ? { ...g, questions: updatedQuestions } : g
      );

      return { ...p, questionGroups: recalculateQuestionNumbers(updatedGroups) };
    }));

    setSelection({ type: 'question', data: newQ });
  };

  const updateQuestion = useCallback((partId, groupId, questionId, updates) => {
    console.log('🔧 updateQuestion called:', { partId, groupId, questionId, updates });
    
    // Tìm skill của part này
    let targetSkill = activeSkill;
    for (const [skill, parts] of Object.entries(sessions)) {
      if (parts.some(p => p.id === partId)) {
        targetSkill = skill;
        break;
      }
    }
    console.log('🎯 Target skill:', targetSkill, 'for partId:', partId);
    
    setSessions((prev) => {
      const parts = prev[targetSkill] || [];
      const partOffset = getPartOffset(parts, partId);
      
      return {
        ...prev,
        [targetSkill]: parts.map((p) => {
          if (p.id !== partId) return p;
          const updatedGroups = p.questionGroups.map((g) => {
            if (g.id !== groupId) return g;

            const updatedQuestions = g.questions.map((q) => {
              if (q.id !== questionId) return q;
              const updated = { ...q, ...updates };

              // Nếu là MMCQ và update options, tự động tính questionCount từ số đáp án đúng
              if (g.contentType === 'MULTIPLE_CHOICE_MULTI' && 'options' in updates) {
                const correctCount = (updates.options || []).filter(opt => opt.isCorrect).length;
                if (correctCount > 0) {
                  updated.questionCount = correctCount;
                }
                console.log('✅ Updated MMCQ options:', {
                  skill: targetSkill,
                  optionsCount: updates.options?.length,
                  correctCount,
                  questionCount: updated.questionCount
                });
              }

              return updated;
            });

            return { ...g, questions: updatedQuestions };
          });

          // Tính lại question numbers nếu questionCount thay đổi
          return 'questionCount' in updates || ('options' in updates)
            ? { ...p, questionGroups: recalculateQuestionNumbers(updatedGroups, partOffset) }
            : { ...p, questionGroups: updatedGroups };
        })
      };
    });
    
    setSelection((s) => {
      if (s?.type === 'question' && s.data.id === questionId) {
        return { ...s, data: { ...s.data, ...updates } };
      }
      return s;
    });
  }, [activeSkill, sessions]);

  const deleteQuestion = (partId, groupId, questionId) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;

        const updatedGroups = p.questionGroups.map((g) =>
          g.id === groupId
            ? { ...g, questions: g.questions.filter((q) => q.id !== questionId) }
            : g
        );

        return { ...p, questionGroups: recalculateQuestionNumbers(updatedGroups) };
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
    try {
      console.log('Drag start:', active.id, active.data.current);
      setActiveOverlayItem(active.data.current ?? null);
    } catch (error) {
      console.error('Error in handleDragStart:', error);
    }
  };

  const handleDragOver = ({ active, over }) => {
    try {
      const overData = over?.data?.current;
      const activeData = active?.data?.current;
      const isPassageItem = activeData?.contentType === 'READING_PASSAGE';

      console.log('Drag over:', {
        activeId: active.id,
        overId: over?.id,
        activeData,
        overData,
        isPassageItem
      });

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
    } catch (error) {
      console.error('Error in handleDragOver:', error);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    try {
      console.log('Drag end:', {
        activeId: active.id,
        overId: over?.id,
        activeData: active.data.current,
        overData: over?.data?.current
      });

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

      // 2.5 Palette item dropped onto an existing group card:
      // DnD users often drop on top of the group instead of the explicit drop-zone.
      // We treat it as "add group into the same Part" to avoid "can't drag into canvas".
      if (activeData?.source === 'palette' && overData?.type === 'group') {
        const partId = Number(overData.partId ?? overData.part?.id);
        const part = parts.find((p) => p.id === partId);
        if (part) {
          const ct = activeData.contentType === 'READING_PASSAGE' ? 'READING_PASSAGE' : activeData.contentType;
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

      // 5. Reorder/move existing groups
      if (activeData?.type === 'group') {
        // 5a) Drop group onto another group
        if (overData?.type === 'group') {
          const sourcePartId = Number(activeData.partId);
          const targetPartId = Number(overData.partId);

          if (!Number.isFinite(sourcePartId) || !Number.isFinite(targetPartId)) return;

          setParts((prev) => {
            const srcPart = prev.find((p) => p.id === sourcePartId);
            const dstPart = prev.find((p) => p.id === targetPartId);
            if (!srcPart || !dstPart) return prev;

            const srcGroups = srcPart.questionGroups ?? [];
            const dstGroups = dstPart.questionGroups ?? [];
            const srcIdx = srcGroups.findIndex((g) => `group-${g.id}` === active.id);
            const dstIdx = dstGroups.findIndex((g) => `group-${g.id}` === over.id);
            if (srcIdx === -1 || dstIdx === -1) return prev;

            // Same part: reorder only
            if (sourcePartId === targetPartId) {
              if (srcIdx === dstIdx) return prev;
              return prev.map((p) =>
                p.id === sourcePartId
                  ? { ...p, questionGroups: recalculateQuestionNumbers(arrayMove(srcGroups, srcIdx, dstIdx)) }
                  : p
              );
            }

            // Different part: move to target part at drop index
            const movingGroup = srcGroups[srcIdx];
            if (!movingGroup) return prev;

            const nextSrc = srcGroups.filter((_, i) => i !== srcIdx);
            const nextDst = [...dstGroups];
            nextDst.splice(dstIdx, 0, movingGroup);

            return prev.map((p) => {
              if (p.id === sourcePartId) return { ...p, questionGroups: recalculateQuestionNumbers(nextSrc) };
              if (p.id === targetPartId) return { ...p, questionGroups: recalculateQuestionNumbers(nextDst) };
              return p;
            });
          });
          return;
        }

        // 5b) Drop group onto pane/part drop-zone => move group to end of target part
        if (overData?.type === 'part' || overData?.type === 'question-pane' || overData?.type === 'passage-pane') {
          const sourcePartId = Number(activeData.partId);
          const targetPartId = Number(overData.partId ?? overData.part?.id);
          if (!Number.isFinite(sourcePartId) || !Number.isFinite(targetPartId)) return;

          setParts((prev) => {
            const srcPart = prev.find((p) => p.id === sourcePartId);
            const dstPart = prev.find((p) => p.id === targetPartId);
            if (!srcPart || !dstPart) return prev;

            const srcGroups = srcPart.questionGroups ?? [];
            const dstGroups = dstPart.questionGroups ?? [];
            const srcIdx = srcGroups.findIndex((g) => `group-${g.id}` === active.id);
            if (srcIdx === -1) return prev;

            const movingGroup = srcGroups[srcIdx];
            if (!movingGroup) return prev;

            // Reading split-pane constraints
            if (overData.type === 'passage-pane' && movingGroup.contentType !== 'READING_PASSAGE') {
              return prev;
            }
            if (overData.type === 'question-pane' && movingGroup.contentType === 'READING_PASSAGE') {
              return prev;
            }

            // Same part and dropped to end with no order change
            if (sourcePartId === targetPartId && srcIdx === srcGroups.length - 1) return prev;

            const nextSrc = srcGroups.filter((_, i) => i !== srcIdx);
            const nextDst = sourcePartId === targetPartId ? nextSrc : [...dstGroups];
            nextDst.push(movingGroup);

            return prev.map((p) => {
              if (p.id === sourcePartId) return { ...p, questionGroups: recalculateQuestionNumbers(nextSrc) };
              if (p.id === targetPartId) return { ...p, questionGroups: recalculateQuestionNumbers(nextDst) };
              return p;
            });
          });
        }
      }
    } catch (error) {
      console.error('Error in handleDragEnd:', error);
      // Reset state on error
      setActiveOverlayItem(null);
      setDragOverPartId(null);
      setDragOverPassagePaneId(null);
    }
  };

  const handleDragCancel = () => {
    try {
      console.log('Drag cancelled');
      setActiveOverlayItem(null);
      setDragOverPartId(null);
      setDragOverPassagePaneId(null);
    } catch (error) {
      console.error('Error in handleDragCancel:', error);
    }
  };

  // ------------ Save ------------

  const handleSave = useCallback(async (options = {}) => {
    const { createVersion = false } = options;

    setSaving(true);
    setSaveMessage('');
    try {
      let struct = structure;
      if (!struct) {
        struct = await testBuilderApi.getStructure(test.testType);
        setStructure(struct);
      }

      const user = authApi.getStoredUser();
      const userId = user?.id || 1;

      // Đợi để React flush tất cả state updates
      const latestSessions = await new Promise(resolve => {
        setTimeout(() => {
          setSessions(prev => {
            console.log('💾 Getting sessions for save:', prev);
            resolve(prev);
            return prev;
          });
        }, 100);
      });

      const payload = buildSavePayload(test, latestSessions, struct, userId, savedTestId, sessionDurations, createVersion);
      const result = await testBuilderApi.saveFullTest(payload);

      setSavedTestId(result.id);
      lastAutoSaveSnapshotRef.current = JSON.stringify({ test, sessions: latestSessions });
      setHasUnsavedChanges(false);
      setSaveMessage('Đã lưu thành công!');

      if (!savedTestId) {
        navigate(`/teacher/tests/${result.id}/edit`, { replace: true });
      }

      setTimeout(() => setSaveMessage(''), 3000);
      return result;
    } catch (err) {
      console.error('Lỗi lưu đề thi:', err);
      if (err.response?.status === 403) {
        setSaveMessage('Bạn không có quyền lưu đề thi.');
      } else {
        setSaveMessage('Lỗi khi lưu: ' + (err.response?.data?.error || err.message));
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [savedTestId, structure, test, navigate, sessionDurations]);

  useEffect(() => {
    if (!autoSaveEnabled || roleError || saving || hasActiveMediaUpload(sessions)) return undefined;

    const currentSnapshot = JSON.stringify({ test, sessions });
    if (currentSnapshot === lastAutoSaveSnapshotRef.current) return undefined;

    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave({}); // auto-save: không tạo version
    }, 1200);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [autoSaveEnabled, handleSave, roleError, saving, test, sessions]);

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
        seriesLabel: test.seriesLabel,
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
    <ErrorBoundary>
      <div className="tb-page">
        <BuilderHeader
          test={test}
          onTestChange={updateTest}
          onSave={() => handleSave({})}
          onPreview={() => setPreviewMode(true)}
          onSubmitReview={handleSubmitReview}
          saving={saving}
          onShuffle={handleShuffle}
          shuffling={shuffling}
          saveMessage={saveMessage}
          autoSaveEnabled={autoSaveEnabled}
          onToggleAutoSave={() => setAutoSaveEnabled((prev) => !prev)}
          onSkillModeChange={handleSkillModeChange}
          showFormatToolbar={showFormatToolbar}
          onToggleFormatToolbar={() => setShowFormatToolbar(!showFormatToolbar)}
          seriesLabel={test.seriesLabel}
          savedTestId={savedTestId}
          previewMode={previewMode}
          onPreviewToggle={() => setPreviewMode((prev) => !prev)}
          activeSkill={activeSkill}
          hasUnsavedChanges={hasUnsavedChanges}
          onOpenVersionHistory={savedTestId ? () => setShowVersionHistory(true) : undefined}
          onNavigate={(path) => {
            if (hasChangedSinceEntryRef.current) {
              pendingNavigationRef.current = path;
              setShowExitConfirm(true);
            } else {
              navigate(path);
            }
          }}
        />

        <div className="tb-workspace" style={{ position: 'relative' }}>
          <ErrorBoundary>
            <DndContext
              sensors={sensors}
              collisionDetection={({ active, droppableContainers, ...rest }) => {
                try {
                  if (active?.data?.current?.source === 'palette') {
                    return rectIntersection({ active, droppableContainers, ...rest });
                  }
                  return closestCenter({ active, droppableContainers, ...rest });
                } catch (error) {
                  console.error('Error in collision detection:', error);
                  return closestCenter({ active, droppableContainers, ...rest });
                }
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <ErrorBoundary>
                <BuilderSidebar
                  parts={parts}
                  sessions={sessions}
                  activeSessionKey={activeSkill}
                  sessionDurations={sessionDurations}
                  selection={selection}
                  enabledSkills={enabledSkills}
                  collapsed={leftSidebarCollapsed}
                  onToggleCollapsed={() => setLeftSidebarCollapsed((prev) => !prev)}
                  onSelectSession={(key) => { setActiveSkill(key); setSelection(null); }}
                  onSelectPart={(p) => setSelection({ type: 'part', data: p })}
                  onSelectGroup={(g) => setSelection({ type: 'group', data: { ...g } })}
                  onUpdateSessionTime={(skillKey, minutes) => {
                    setSessionDurations((prev) => ({
                      ...prev,
                      [skillKey]: minutes,
                    }));
                    setTest(prev => ({
                      ...prev,
                      sessionDurations: {
                        ...prev.sessionDurations,
                        [skillKey]: minutes
                      }
                    }));
                  }}
                />
              </ErrorBoundary>

              <ErrorBoundary>
                <ExamCanvas
                  test={test}
                  testId={savedTestId || test?.id}
                  skill={activeSkill}
                  seriesLabel={test.seriesLabel}
                  parts={parts}
                  sessionDuration={sessionDuration}
                  selection={selection}
                  dragOverPartId={dragOverPartId}
                  dragOverPassagePaneId={dragOverPassagePaneId}
                  draggingContentType={activeOverlayItem?.contentType ?? null}
                  onUpdatePart={updatePart}
                  onMoveGroupUp={(groupId) => {
                    const part = parts.find((p) => p.questionGroups?.some((g) => g.id === groupId));
                    if (part) moveGroupByStep(part.id, groupId, -1);
                  }}
                  onMoveGroupDown={(groupId) => {
                    const part = parts.find((p) => p.questionGroups?.some((g) => g.id === groupId));
                    if (part) moveGroupByStep(part.id, groupId, 1);
                  }}
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
                  onUpdateSessionTime={(skillKey, minutes) => {
                    setSessionDurations((prev) => ({
                      ...prev,
                      [skillKey]: minutes,
                    }));
                    setTest((prev) => ({
                      ...prev,
                      sessionDurations: {
                        ...(prev.sessionDurations || {}),
                        [skillKey]: minutes,
                      },
                    }));
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
              </ErrorBoundary>

              <DragOverlay>
                {activeOverlayItem?.source === 'palette' && (
                  <div className="tb-drag-preview">
                    <span style={{ fontSize: 16 }}>
                      {activeOverlayItem.icon ? React.createElement(activeOverlayItem.icon, { size: 16 }) : '📄'}
                    </span>
                    <span>{activeOverlayItem.label || 'Unknown Item'}</span>
                  </div>
                )}
                {activeOverlayItem?.type === 'group' && (
                  <div className="tb-drag-preview">
                    <GripVertical size={14} /> Nhóm câu hỏi
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </ErrorBoundary>

          {!previewMode && (
            <ErrorBoundary>
              <PropertiesPanel
                selection={selection}
                onChange={handlePanelChange}
                onDelete={handlePanelDelete}
                collapsed={rightPanelCollapsed}
                onToggleCollapsed={() => setRightPanelCollapsed((prev) => !prev)}
              />
            </ErrorBoundary>
          )}
        </div>

        {previewMode && (
          <IframePreviewModal
            testId={savedTestId || test?.id}
            skillType={(test?.singleSkill || activeSkill || 'READING').toLowerCase()}
            isVisible={previewMode}
            onClose={() => setPreviewMode(false)}
          />
        )}

        <VersionHistoryModal
          testId={savedTestId}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestoreVersion={(snapshotData, versionNumber) => {
            const { test: restoredTest, sessions: restoredSessions } = parseLoadedTest(snapshotData);
            setTest(prev => ({ ...prev, ...restoredTest }));
            setSessions(prev => {
              const merged = { ...prev };
              for (const [skill, parts] of Object.entries(restoredSessions)) {
                if (parts.length > 0) merged[skill] = parts;
              }
              return merged;
            });
            hasChangedSinceEntryRef.current = true;
            setSaveMessage(`Đã tải phiên bản ${versionNumber}. Nhấn Lưu để áp dụng.`);
            setTimeout(() => setSaveMessage(''), 4000);
          }}
        />

        {showExitConfirm && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 10000
          }}>
            <div style={{
              background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ marginBottom: 16, fontSize: 20, color: '#1f2937' }}>
                Lưu phiên bản mới?
              </h3>
              <p style={{ marginBottom: 24, color: '#6b7280', lineHeight: 1.6 }}>
                Bạn đã thực hiện thay đổi. Lưu phiên bản mới để có thể khôi phục sau này?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    const path = pendingNavigationRef.current;
                    pendingNavigationRef.current = null;
                    if (path) navigate(path);
                  }}
                  style={{
                    padding: '10px 20px', border: '1px solid #d1d5db',
                    background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 15
                  }}
                >
                  Không lưu
                </button>
                <button
                  onClick={async () => {
                    setShowExitConfirm(false);
                    const path = pendingNavigationRef.current;
                    pendingNavigationRef.current = null;
                    try {
                      await handleSave({ createVersion: true });
                      hasChangedSinceEntryRef.current = false;
                    } catch (_) { }
                    if (path) navigate(path);
                  }}
                  disabled={saving}
                  style={{
                    padding: '10px 20px', border: 'none', background: '#3b82f6',
                    color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 500
                  }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu phiên bản mới'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default TestBuilder;
