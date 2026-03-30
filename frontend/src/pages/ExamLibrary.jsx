import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Search,
  ChevronDown,
  ChevronRight,
  ListFilter,
  GraduationCap,
  Users,
  Zap,
  X,
  MonitorCheck,
  HelpCircle,
  Timer,
  Target,
  Laptop,
  Eye,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { API_CONFIG } from '../config/api';
import { ieltsApi } from '../services/ieltsApi';
import { buildTimerPersistKey, clearSubmittedLock } from '../utils/testRuntimeState';
import '../styles/examLibrary.css';

const TYPE_TABS = [
  { key: 'ALL', label: 'All Tests', Icon: ListFilter },
  { key: 'ACADEMIC', label: 'Academic Test', Icon: GraduationCap },
  { key: 'GENERAL', label: 'General Training Test', Icon: Users },
];

const SKILL_PILLS = [
  { key: 'ALL', label: 'All Skills', Icon: LayoutGrid },
  { key: 'LISTENING', label: 'Listening', Icon: Headphones },
  { key: 'READING', label: 'Reading', Icon: BookOpen },
  { key: 'WRITING', label: 'Writing', Icon: PenLine },
  { key: 'SPEAKING', label: 'Speaking', Icon: Mic },
];

const COVER_PALETTE = [
  { from: '#1c3d6b', to: '#0f2340' },
  { from: '#1a5038', to: '#0d2f20' },
  { from: '#5c1a3a', to: '#3a0f22' },
  { from: '#3a1c6b', to: '#220f40' },
  { from: '#5c3a1a', to: '#3a220f' },
  { from: '#1a5c58', to: '#0d3836' },
  { from: '#5c1a1a', to: '#3a0f0f' },
  { from: '#1a1a5c', to: '#0f0f3a' },
];

const SKILL_META = {
  LISTENING: { Icon: Headphones, color: '#0891b2', btnColor: '#0e7490', label: 'Listening' },
  READING: { Icon: BookOpen, color: '#16a34a', btnColor: '#15803d', label: 'Reading' },
  WRITING: { Icon: PenLine, color: '#d97706', btnColor: '#b45309', label: 'Writing' },
  SPEAKING: { Icon: Mic, color: '#9f1239', btnColor: '#881337', label: 'Speaking' },
};

const SKILL_MODE_META = {
  LISTENING: {
    estimatedTime: '30 mins',
    practiceHint: 'Train with instant feedback and review answers after submitting.',
    examHint: 'Run a full simulation flow and still review your answers after submission.',
  },
  READING: {
    estimatedTime: '60 mins',
    practiceHint: 'Practice by section and analyze mistakes immediately.',
    examHint: 'Full exam condition with fixed timer and review available after finishing.',
  },
  WRITING: {
    estimatedTime: '60 mins',
    practiceHint: 'Focus on structure and ideas with flexible practice flow.',
    examHint: 'Timed writing simulation with full exam pacing.',
  },
  SPEAKING: {
    estimatedTime: '12-15 mins',
    practiceHint: 'Practice each speaking part with comfortable pacing.',
    examHint: 'Simulated speaking flow with realistic examiner timing.',
  },
};

const SKILL_PRACTICE_SETUP = {
  LISTENING: { parts: [1, 2, 3, 4], timeOptions: [10, 20, 30, 32, 0], defaultTime: 32 },
  READING: { parts: [1, 2, 3], timeOptions: [20, 40, 60, 0], defaultTime: 60 },
  WRITING: { parts: [1, 2], timeOptions: [20, 40, 60, 0], defaultTime: 60 },
  SPEAKING: { parts: [1, 2, 3], timeOptions: [6, 10, 15, 0], defaultTime: 15 },
};

const parseJsonSafe = (raw, fallback = null) => {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const isAnsweredValue = (value) => {
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
};

const hasMeaningfulSkillDraft = (skill, payload) => {
  if (!payload || typeof payload !== 'object') return false;

  if (skill === 'WRITING') {
    const answers = payload.writingAnswers;
    if (!answers || typeof answers !== 'object') return false;
    return Object.values(answers).some((v) => typeof v === 'string' && v.trim() !== '');
  }

  if (skill === 'READING' || skill === 'LISTENING') {
    const answers = payload.answers;
    const bookmarks = payload.bookmarks;
    const hasAnswers = answers && typeof answers === 'object' && Object.values(answers).some(isAnsweredValue);
    const hasBookmarks = bookmarks && typeof bookmarks === 'object' && Object.values(bookmarks).some(Boolean);
    const hasMovedPart = Number(payload.currentPartIndex) > 0;
    return Boolean(hasAnswers || hasBookmarks || hasMovedPart);
  }

  if (skill === 'SPEAKING') {
    return Number(payload.recordedQuestionCount) > 0 || Number(payload.currentPartIdx) > 0;
  }

  return false;
};

const parseResumeFromTimerKey = (storageKey, skill, testId) => {
  const safeSkill = String(skill || '').toLowerCase();
  const safeTestId = String(testId || '').trim();
  if (!safeSkill || !safeTestId || !storageKey) return null;

  const pattern = new RegExp(
    `^ieltsTimerDeadline_${safeSkill}_${safeTestId}_(?:full_test|single_test)_(practice|exam)_(.+)$`
  );
  const match = storageKey.match(pattern);
  if (!match) return null;

  return {
    mode: match[1] || 'practice',
  };
};

// Scan sessionStorage for any submitted lock matching skill + testId → return redirectUrl or null
const getSubmittedResultUrl = (skill, testId) => {
  if (typeof window === 'undefined') return null;
  const safeSkill = String(skill || '').toLowerCase();
  const safeTestId = String(testId || '').trim();
  if (!safeSkill || !safeTestId) return null;

  // Pattern: ieltsSubmittedLock_{skill}_{testId}_*
  const prefix = `ieltsSubmittedLock_${safeSkill}_${safeTestId}_`;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    try {
      const payload = JSON.parse(sessionStorage.getItem(key) || '');
      if (payload && payload.redirectUrl) return { key, redirectUrl: payload.redirectUrl };
    } catch { /* ignore */ }
  }
  return null;
};

function BookCover({ series, index, small }) {
  const p = COVER_PALETTE[index % COVER_PALETTE.length];
  return (
    <div
      className={`book-cover${small ? ' book-cover-sm' : ''}`}
      style={{ background: `linear-gradient(160deg, ${p.from} 0%, ${p.to} 100%)` }}
    >
      <div className="book-cover-ielts">IELTS</div>
      <div className="book-cover-divider" />
      {series.year && <div className="book-cover-year">{series.year}</div>}
    </div>
  );
}

/* ── ALL SKILLS view: series cards (clickable) ── */
function SeriesCard({ series, index, onSelect }) {
  const skillCounts = useMemo(() => {
    const map = {};
    series.tests.forEach(t => { map[t.skill] = (map[t.skill] || 0) + 1; });
    return map;
  }, [series]);

  return (
    <div className="series-card" onClick={() => onSelect(series)}>
      <BookCover series={series} index={index} />
      <div className="series-card-body">
        <h3 className="series-card-title">{series.title}</h3>
        <div className="series-skill-counts">
          {Object.entries(skillCounts).map(([skill, count]) => {
            const m = SKILL_META[skill];
            if (!m) return null;
            return (
              <span key={skill} className="series-skill-chip" style={{ color: m.color }}>
                <m.Icon size={12} /> {count} {m.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── SKILL tab view: flat test grid ── */
function TestGrid({ tests }) {
  if (tests.length === 0) return <div className="el-empty">Không tìm thấy đề thi phù hợp.</div>;
  return (
    <div className="test-grid">
      {tests.map(test => (
        <Link
          key={test.id}
          to={`/test/${test.skill.toLowerCase()}/${test.id}`}
          className="test-grid-item"
        >
          <span className="test-grid-name">{test.name}</span>
        </Link>
      ))}
    </div>
  );
}

/* ── SERIES DETAIL view ── */
function SeriesDetail({ series, index, onBack, fullTestProgress }) {
  const [showFullTestModal, setShowFullTestModal] = useState(false);
  const [skillModeModal, setSkillModeModal] = useState(null);
  const timeMenuRef = useRef(null);
  const navigate = useNavigate();

  const skillGroups = useMemo(() => {
    const map = {};
    series.tests.forEach(t => {
      if (!map[t.skill]) map[t.skill] = [];
      map[t.skill].push(t);
    });
    return map;
  }, [series]);

  const skillOrder = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
  const available = skillOrder.filter(s => skillGroups[s]);
  const fullTestProgressPercent = Math.max(0, Math.min(100, Number(fullTestProgress?.progressPercent) || 0));
  const hasRemoteFullTestProgress = Boolean(fullTestProgress?.routePath) && fullTestProgressPercent < 100;
  const localFullTestSession = useMemo(() => {
    const localSession = parseJsonSafe(sessionStorage.getItem('ieltsFullTest'), null);
    if (!localSession?.sections?.length) return null;
    const inSameSeries = localSession.sections.some((section) => String(section?.testId || '') === String(series.backendId));
    return inSameSeries ? localSession : null;
  }, [series.backendId]);
  const hasSavedFullTestProgress = hasRemoteFullTestProgress || Boolean(localFullTestSession);
  const skillResumeMap = useMemo(() => {
    const map = {};
    if (typeof window === 'undefined') return map;
    const now = Date.now();

    available.forEach((skill) => {
      const testId = String(skillGroups[skill]?.[0]?.id || '');
      if (!testId) return;

      // Skip resume detection if test has been submitted (submitted lock exists)
      // UI will show "Xem kết quả" based on realtime submitted check.
      if (getSubmittedResultUrl(skill, testId)) return;

      const prefix = `ieltsDraft_${skill.toLowerCase()}_`;
      const suffix = `_${testId}`;
      let latest = null;
      let latestTimer = null;

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix) || !key.endsWith(suffix)) continue;

        const payload = parseJsonSafe(localStorage.getItem(key), null);
        if (!payload || typeof payload !== 'object') continue;
        if (!hasMeaningfulSkillDraft(skill, payload)) continue;

        const mode = key.slice(prefix.length, key.length - suffix.length) || 'practice';
        const savedAt = Number(payload.savedAt) || 0;
        if (!latest || savedAt > latest.savedAt) {
          const fallbackQuery = mode === 'exam' ? 'mode=exam&allowReview=true' : `mode=${mode}`;
          latest = {
            mode,
            queryString: payload.queryString || fallbackQuery,
            savedAt,
          };
        }
      }

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('ieltsTimerDeadline_')) continue;

        const parsedTimer = parseResumeFromTimerKey(key, skill, testId);
        if (!parsedTimer) continue;

        const timerPayload = parseJsonSafe(localStorage.getItem(key), null);
        if (!timerPayload || typeof timerPayload !== 'object') continue;

        const deadlineMs = Number(timerPayload.deadlineMs);
        if (!Number.isFinite(deadlineMs) || deadlineMs <= now) continue;

        const savedAt = Number(timerPayload.savedAt) || 0;
        if (!latestTimer || savedAt > latestTimer.savedAt) {
          const resumeQuery = parsedTimer.mode === 'exam'
            ? 'mode=exam&allowReview=true'
            : `mode=${parsedTimer.mode}`;
          latestTimer = {
            mode: parsedTimer.mode,
            queryString: resumeQuery,
            savedAt,
          };
        }
      }

      if (latest) {
        map[skill] = latest;
      } else if (latestTimer) {
        map[skill] = latestTimer;
      }
    });

    return map;
  }, [available, skillGroups]);

  const clearSubmittedLockForRoute = (skill, testId, rawQuery = '') => {
    const queryString = String(rawQuery || '').replace(/^\?/, '');
    const params = new URLSearchParams(queryString);
    const mode = params.get('mode') || 'practice';
    const isFullTest = params.get('fullTest') === 'true';

    const persistKey = buildTimerPersistKey({
      skill: String(skill || '').toLowerCase(),
      testId,
      mode,
      isFullTest,
      queryString,
    });

    clearSubmittedLock(persistKey);
  };

  const clearSubmittedLocksForSections = (sections, rawQuery = '') => {
    if (!Array.isArray(sections)) return;
    sections.forEach((section) => {
      if (!section?.skill || !section?.testId) return;
      clearSubmittedLockForRoute(section.skill, section.testId, rawQuery);
    });
  };

  const handleStartFullTest = () => {
    const sections = available.map((s, i) => ({
      skill: s.toLowerCase(),
      testId: skillGroups[s][0].id,
      label: SKILL_META[s].label,
      sectionNum: i + 1,
    }));
    const initialSessionState = {
      seriesTitle: series.title,
      totalSections: sections.length,
      sections,
      currentSection: 0,
      mode: 'practice',
    };

    if (hasRemoteFullTestProgress) {
      const restoredSession = parseJsonSafe(fullTestProgress?.sessionStateJson, initialSessionState);
      const resumeQuery = fullTestProgress?.queryString
        ? (fullTestProgress.queryString.startsWith('?') ? fullTestProgress.queryString : `?${fullTestProgress.queryString}`)
        : '';
      const normalizedResumeQuery = String(resumeQuery || '').replace(/^\?/, '') || `fullTest=true&mode=${restoredSession?.mode || 'practice'}`;

      clearSubmittedLocksForSections(restoredSession?.sections, normalizedResumeQuery);

      sessionStorage.setItem('ieltsFullTest', JSON.stringify(restoredSession));
      setShowFullTestModal(false);
      navigate(`${fullTestProgress.routePath}${resumeQuery}`);
      return;
    }

    if (localFullTestSession?.sections?.length) {
      const safeCurrentSection = Number.isFinite(localFullTestSession.currentSection)
        ? Math.max(0, Math.min(localFullTestSession.sections.length - 1, localFullTestSession.currentSection))
        : 0;
      const currentSection = localFullTestSession.sections[safeCurrentSection];
      if (currentSection?.skill && currentSection?.testId) {
        const localQuery = `fullTest=true&mode=${localFullTestSession.mode || 'practice'}`;
        clearSubmittedLocksForSections(localFullTestSession.sections, localQuery);
        sessionStorage.setItem('ieltsFullTest', JSON.stringify(localFullTestSession));
        setShowFullTestModal(false);
        navigate(`/test/${currentSection.skill}/${currentSection.testId}?${localQuery}`);
        return;
      }
    }

    sessionStorage.setItem('ieltsFullTest', JSON.stringify(initialSessionState));

    sections.forEach((section) => {
      sessionStorage.removeItem(`ieltsFullTestSnapshot_${section.skill}_${section.testId}`);
    });

    clearSubmittedLocksForSections(sections, 'fullTest=true&mode=practice');

    setShowFullTestModal(false);
    navigate(`/test/${sections[0].skill}/${sections[0].testId}?fullTest=true&mode=practice`);
  };

  const openSkillModeModal = (skill, testId) => {
    const setup = SKILL_PRACTICE_SETUP[skill] || SKILL_PRACTICE_SETUP.READING;
    setSkillModeModal({
      skill,
      testId,
      selectedParts: [...setup.parts],
      practiceDuration: setup.defaultTime,
      isTimeMenuOpen: false,
    });
  };

  const closeSkillModeModal = () => {
    setSkillModeModal(null);
  };

  const togglePracticePart = (partNo) => {
    setSkillModeModal((prev) => {
      if (!prev) return prev;
      const exists = prev.selectedParts.includes(partNo);
      return {
        ...prev,
        isTimeMenuOpen: false,
        selectedParts: exists
          ? prev.selectedParts.filter((p) => p !== partNo)
          : [...prev.selectedParts, partNo].sort((a, b) => a - b),
      };
    });
  };

  const setPracticeDuration = (minutes) => {
    setSkillModeModal((prev) => {
      if (!prev) return prev;
      return { ...prev, practiceDuration: minutes, isTimeMenuOpen: false };
    });
  };

  const togglePracticeDurationMenu = () => {
    setSkillModeModal((prev) => {
      if (!prev) return prev;
      return { ...prev, isTimeMenuOpen: !prev.isTimeMenuOpen };
    });
  };

  useEffect(() => {
    if (!skillModeModal?.isTimeMenuOpen) return undefined;

    const handleClickOutsideTimeMenu = (event) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(event.target)) {
        setSkillModeModal((prev) => {
          if (!prev) return prev;
          return { ...prev, isTimeMenuOpen: false };
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutsideTimeMenu);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTimeMenu);
    };
  }, [skillModeModal?.isTimeMenuOpen]);

  const handleStartSkillMode = (mode) => {
    if (!skillModeModal) return;
    const { skill, testId, selectedParts, practiceDuration } = skillModeModal;
    if (mode === 'practice' && (!selectedParts || selectedParts.length === 0)) return;

    const params = new URLSearchParams();
    params.set('mode', mode);
    if (mode === 'practice') {
      const sortedParts = [...selectedParts].sort((a, b) => a - b);
      params.set('parts', sortedParts.join(','));
      params.set('startPart', String(sortedParts[0]));
      if (Number.isFinite(practiceDuration) && practiceDuration > 0) {
        params.set('duration', String(practiceDuration));
      } else {
        params.set('noTimeLimit', 'true');
      }
    } else if (mode === 'exam') {
      params.set('allowReview', 'true');
    }

    closeSkillModeModal();
    const queryString = params.toString();
    clearSubmittedLockForRoute(skill, testId, queryString);
    navigate(`/test/${skill.toLowerCase()}/${testId}?${queryString}`);
  };

  return (
    <div className="series-detail">
      <h2 className="series-detail-title">{series.title}</h2>

      <div className="skill-cards-grid">
        {available.map(skill => {
          const m = SKILL_META[skill];
          const tests = skillGroups[skill];
          const testId = tests?.[0]?.id;
          const submitted = testId ? getSubmittedResultUrl(skill, testId) : null;
          return (
            <div key={skill} className="skill-card">
              <div className="skill-card-top">
                <m.Icon size={40} color={m.color} strokeWidth={1.5} />
                <span className="skill-card-label">{m.label}</span>
              </div>
              <div className="skill-card-spacer" />
              <button
                type="button"
                className="skill-card-btn"
                style={{ background: submitted ? '#16a34a' : m.btnColor }}
                onClick={() => {
                  const latestSubmitted = testId ? getSubmittedResultUrl(skill, testId) : null;
                  if (latestSubmitted) {
                    // Navigate to results and clear the lock
                    sessionStorage.removeItem(latestSubmitted.key);
                    navigate(latestSubmitted.redirectUrl);
                    return;
                  }
                  const resume = skillResumeMap[skill];
                  if (resume) {
                    const rawQuery = String(resume.queryString || '').replace(/^\?/, '');
                    const query = rawQuery || `mode=${resume.mode || 'practice'}`;
                    const normalizedParams = new URLSearchParams(query);
                    if ((normalizedParams.get('mode') || 'practice') === 'exam' && !normalizedParams.has('allowReview')) {
                      normalizedParams.set('allowReview', 'true');
                    }
                    const normalizedQuery = normalizedParams.toString();
                    clearSubmittedLockForRoute(skill, testId, normalizedQuery);
                    navigate(`/test/${skill.toLowerCase()}/${testId}?${normalizedQuery}`);
                    return;
                  }
                  openSkillModeModal(skill, testId);
                }}
              >
                {submitted
                  ? <><Eye size={15} color="white" /> Xem kết quả</>
                  : <><Zap size={15} fill="white" color="white" /> {skillResumeMap[skill] ? 'Tiếp tục' : 'Làm bài'}</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Full Test row */}
      <div className="full-test-row">
        <div className="full-test-info">
          <LayoutGrid size={20} color="#1e3a8a" />
          <span className="full-test-label">Full Test</span>
          <HelpCircle size={14} color="#9ca3af" />
        </div>
        <div className="full-test-progress-wrap">
          <div className="full-test-progress-bar">
            <div className="full-test-progress-fill" style={{ width: `${fullTestProgressPercent}%` }} />
            <span className="full-test-progress-text">{fullTestProgressPercent}%</span>
          </div>
        </div>
        <button className="full-test-start-btn" onClick={() => setShowFullTestModal(true)}>
          <Zap size={15} fill="white" color="white" /> {hasSavedFullTestProgress ? 'Tiếp tục' : 'Bắt đầu'}
        </button>
      </div>

      {/* Full Test Modal */}
      {showFullTestModal && (
        <div className="ft-overlay" onClick={() => setShowFullTestModal(false)}>
          <div className="ft-modal" onClick={e => e.stopPropagation()}>
            <button className="ft-modal-close" onClick={() => setShowFullTestModal(false)}>
              <X size={20} />
            </button>
            <div className="ft-modal-icon">
              <MonitorCheck size={56} color="#1e3a8a" strokeWidth={1.2} />
            </div>
            <h3 className="ft-modal-title">IELTS Full Test</h3>
            <div className="ft-modal-hint">
              <HelpCircle size={36} color="#e5a020" strokeWidth={1.2} />
              <p>Simulation test mode is the best option to experience the real IELTS on computer.</p>
            </div>
            <div className="ft-modal-info">
              <strong>Test information</strong>
              <ul>
                <li>This test includes the Listening, Reading, Writing and Speaking sections.</li>
                <li>It takes about 3 hours to complete (same as the real IELTS test).</li>
                {hasSavedFullTestProgress && (
                  <li>Bạn đang có tiến trình làm dở. Hệ thống sẽ mở lại đúng vị trí đang làm.</li>
                )}
              </ul>
            </div>
            <p className="ft-modal-confirm-text">Please confirm if you would like to continue.</p>
            <button className="ft-modal-confirm-btn" onClick={handleStartFullTest}>
              {hasSavedFullTestProgress ? 'Tiếp tục full test' : 'Xác nhận'}
            </button>
          </div>
        </div>
      )}

      {/* Skill Mode Modal */}
      {skillModeModal && (() => {
        const modalSkill = skillModeModal.skill;
        const meta = SKILL_META[modalSkill];
        const modeMeta = SKILL_MODE_META[modalSkill] || SKILL_MODE_META.READING;
        const practiceSetup = SKILL_PRACTICE_SETUP[modalSkill] || SKILL_PRACTICE_SETUP.READING;
        const selectedParts = skillModeModal.selectedParts || [];
        const practiceDuration = Number.isFinite(skillModeModal.practiceDuration)
          ? skillModeModal.practiceDuration
          : practiceSetup.defaultTime;
        const canStartPractice = selectedParts.length > 0;
        const noTimeLimit = practiceDuration === 0;
        const heading = `${meta?.label || 'Skill'} mode`;
        const timeOptions = Array.from(new Set([...(practiceSetup.timeOptions || []), 0])).sort((a, b) => {
          if (a === 0) return 1;
          if (b === 0) return -1;
          return a - b;
        });
        const isTimeMenuOpen = Boolean(skillModeModal.isTimeMenuOpen);
        const getTimeLabel = (mins) => (mins === 0 ? 'No time limit' : `${mins} mins`);

        return (
          <div className="sm-overlay" onClick={closeSkillModeModal}>
            <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
              <button className="sm-close" onClick={closeSkillModeModal}>
                <X size={20} />
              </button>

              <div className="sm-head" style={{ '--sm-accent': meta?.btnColor || '#1e3a8a' }}>
                {meta?.Icon ? <meta.Icon size={30} /> : <LayoutGrid size={30} />}
                <h3>Choose your {heading}</h3>
                <p>Select a mode that fits your current training goal.</p>
              </div>

              <div className="sm-cards">
                <div className="sm-card practice" style={{ '--sm-accent': meta?.color || '#1e3a8a' }}>
                  <div className="sm-card-title-row">
                    <Target size={19} />
                    <h4>Practice Mode</h4>
                  </div>
                  <p>{modeMeta.practiceHint}</p>

                  <div className="sm-practice-step">
                    <div className="sm-practice-label">1. Choose part(s) to practice:</div>
                    <div className="sm-part-grid">
                      {practiceSetup.parts.map((partNo) => {
                        const checked = selectedParts.includes(partNo);
                        return (
                          <button
                            type="button"
                            key={partNo}
                            className={`sm-part-chip${checked ? ' active' : ''}`}
                            onClick={() => togglePracticePart(partNo)}
                          >
                            <span>Part {partNo}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm-practice-step">
                    <div className="sm-practice-label">2. Choose a time limit:</div>
                    <div className="sm-time-select-wrap" ref={timeMenuRef}>
                      <button
                        type="button"
                        className={`sm-time-select${isTimeMenuOpen ? ' open' : ''}`}
                        onClick={togglePracticeDurationMenu}
                        aria-haspopup="listbox"
                        aria-expanded={isTimeMenuOpen}
                        aria-label="Choose practice time limit"
                      >
                        <span>{getTimeLabel(practiceDuration)}</span>
                        <ChevronDown size={16} className="sm-time-caret" />
                      </button>

                      {isTimeMenuOpen && (
                        <div className="sm-time-dropdown" role="listbox" aria-label="Time options">
                          {timeOptions.map((mins) => {
                            const active = mins === practiceDuration;
                            return (
                              <button
                                type="button"
                                key={mins}
                                className={`sm-time-option${active ? ' active' : ''}`}
                                role="option"
                                aria-selected={active}
                                onClick={() => setPracticeDuration(mins)}
                              >
                                {getTimeLabel(mins)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm-meta">
                    <span><Timer size={14} /> {noTimeLimit ? 'No time limit' : `${practiceDuration} mins`}</span>
                    <span><HelpCircle size={14} /> Review enabled</span>
                  </div>
                  <button
                    className="sm-start-btn"
                    onClick={() => handleStartSkillMode('practice')}
                    disabled={!canStartPractice}
                  >
                    Start practice <ChevronRight size={16} />
                  </button>
                </div>

                <div className="sm-card exam" style={{ '--sm-accent': meta?.btnColor || '#1e3a8a' }}>
                  <div className="sm-card-title-row">
                    <Laptop size={19} />
                    <h4>Simulation Mode</h4>
                  </div>
                  <p>{modeMeta.examHint}</p>
                  <div className="sm-meta">
                    <span><Timer size={14} /> {modeMeta.estimatedTime}</span>
                    <span><HelpCircle size={14} /> Strict exam mode</span>
                  </div>
                  <button className="sm-start-btn" onClick={() => handleStartSkillMode('exam')}>
                    Start simulation <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function ExamLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeType, setActiveType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeriesIndex, setSelectedSeriesIndex] = useState(0);
  const [testSeries, setTestSeries] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [fullTestProgressMap, setFullTestProgressMap] = useState({});

  useEffect(() => {
    const forceExit = sessionStorage.getItem('forceExitFullscreen') === 'true';
    const shouldExit = forceExit || Boolean(document.fullscreenElement);
    if (!shouldExit || !document.exitFullscreen) {
      if (forceExit) sessionStorage.removeItem('forceExitFullscreen');
      return;
    }

    document.exitFullscreen().catch(() => { });
    const timeoutId = window.setTimeout(() => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    }, 180);

    sessionStorage.removeItem('forceExitFullscreen');
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Fetch published tests from backend - đơn giản hóa
  useEffect(() => {
    const fetchPublishedTests = async () => {
      try {
        setLoadingTests(true);
        console.log('[ExamLibrary] Fetching tests...');

        const res = await fetch(`${API_CONFIG.BASE_URL}/tests/published`);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data || data.length === 0) {
          setTestSeries([]);
          setFetchError(null);
          return;
        }

        // Transform data đơn giản
        const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
        const mapped = data.map((test) => ({
          id: `be-${test.id}`,
          backendId: test.id,
          title: test.title || `Test ${test.id}`,
          type: test.test_type || 'ACADEMIC',
          year: new Date().getFullYear(),
          tests: test.is_full_test
            ? SKILL_ORDER.map((skill) => ({
              id: test.id,
              name: `${test.title} – ${skill.charAt(0) + skill.slice(1).toLowerCase()}`,
              skill,
            }))
            : (test.sessions || []).map((s) => ({
              id: test.id,
              name: `${test.title} – ${s.skill_type || 'Test'}`,
              skill: s.skill_type || 'READING',
            })),
        }));

        setTestSeries(mapped);
        setFetchError(null);
      } catch (err) {
        console.error('[ExamLibrary] Error:', err);
        setFetchError(err.message);
        setTestSeries([]);
      } finally {
        setLoadingTests(false);
      }
    };

    fetchPublishedTests();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFullTestProgress = async () => {
      try {
        const list = await ieltsApi.getMyFullTestProgress();
        if (!isMounted) return;

        const map = {};
        (Array.isArray(list) ? list : []).forEach((item) => {
          const key = String(item?.testId || '');
          if (!key) return;

          const prev = map[key];
          if (!prev || (Number(item?.progressPercent) || 0) > (Number(prev?.progressPercent) || 0)) {
            map[key] = item;
          }
        });

        setFullTestProgressMap(map);
      } catch (err) {
        if (err?.message !== 'AUTH_REQUIRED') {
          console.warn('[ExamLibrary] Failed to load full test progress:', err);
        }
      }
    };

    loadFullTestProgress();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loadingTests || !testSeries.length) return;
    const seriesIdParam = searchParams.get('seriesId');
    if (!seriesIdParam) return;

    const matchedSeries = testSeries.find((series) => String(series.backendId) === String(seriesIdParam));
    if (!matchedSeries) return;

    if (selectedSeries?.id === matchedSeries.id) return;

    const idx = testSeries.findIndex((series) => series.id === matchedSeries.id);
    setSelectedSeries(matchedSeries);
    setSelectedSeriesIndex(idx >= 0 ? idx : 0);
  }, [loadingTests, testSeries, searchParams, selectedSeries]);

  const rawSkill = searchParams.get('skill')?.toUpperCase() || 'ALL';
  const activeSkill = SKILL_PILLS.some(s => s.key === rawSkill) ? rawSkill : 'ALL';

  const setActiveSkill = (skill) => {
    setSelectedSeries(null);
    const next = new URLSearchParams(searchParams);
    next.delete('seriesId');
    if (skill === 'ALL') next.delete('skill');
    else next.set('skill', skill.toLowerCase());
    setSearchParams(next, { replace: true });
  };

  const filteredSeries = useMemo(() => {
    console.log('[ExamLibrary] Filtering - testSeries:', testSeries.length);
    console.log('[ExamLibrary] Filtering - activeType:', activeType, 'activeSkill:', activeSkill, 'searchQuery:', searchQuery);

    const filtered = testSeries.filter(series => {
      if (activeType !== 'ALL' && series.type !== activeType) {
        console.log('[ExamLibrary] Filtered out by type:', series.title, 'type:', series.type);
        return false;
      }
      if (searchQuery && !series.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        console.log('[ExamLibrary] Filtered out by search:', series.title);
        return false;
      }
      if (activeSkill !== 'ALL') {
        const hasSkill = series.tests.some(t => t.skill === activeSkill);
        if (!hasSkill) {
          console.log('[ExamLibrary] Filtered out by skill:', series.title, 'available skills:', series.tests.map(t => t.skill));
        }
        return hasSkill;
      }
      return true;
    });

    console.log('[ExamLibrary] Filtered result:', filtered.length, 'series');
    return filtered;
  }, [testSeries, activeType, activeSkill, searchQuery]);

  const flatTests = useMemo(() => {
    console.log('[ExamLibrary] flatTests - activeSkill:', activeSkill);
    console.log('[ExamLibrary] flatTests - filteredSeries:', filteredSeries.length);

    if (activeSkill === 'ALL') return [];

    const flat = filteredSeries.flatMap(s => {
      console.log('[ExamLibrary] Series tests:', s.title, s.tests?.length || 0);
      return s.tests?.filter(t => t.skill === activeSkill) || [];
    });

    console.log('[ExamLibrary] flatTests result:', flat.length);
    return flat;
  }, [activeSkill, filteredSeries]);

  const handleSelectSeries = (series) => {
    const idx = filteredSeries.findIndex(s => s.id === series.id);
    setSelectedSeries(series);
    setSelectedSeriesIndex(idx >= 0 ? idx : 0);

    const next = new URLSearchParams(searchParams);
    next.set('seriesId', String(series.backendId));
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="exam-library-page">
      <Navbar />

      {loadingTests ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#1e3a8a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p>Đang tải danh sách đề thi...</p>
          </div>
        </div>
      ) : fetchError ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', margin: '20px' }}>
            <p style={{ color: '#dc2626', marginBottom: '16px' }}>❌ Không thể tải danh sách đề thi</p>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 16px', backgroundColor: '#1e3a8a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Tải lại
            </button>
          </div>
        </div>
      ) : (
        <div className="exam-library-wrapper">
          <div className="exam-library-main">
            <nav className="el-breadcrumb">
              <Link to="/">Home</Link>
              <span className="el-breadcrumb-sep"> / </span>
              <span>IELTS Exam Library</span>
            </nav>

            <h1 className="el-title">IELTS Exam Library</h1>

            {/* Type tabs */}
            {!selectedSeries && (
              <div className="el-type-tabs">
                {TYPE_TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    className={`el-type-tab${activeType === key ? ' active' : ''}`}
                    onClick={() => {
                      setActiveType(key);
                      setSelectedSeries(null);
                      const next = new URLSearchParams(searchParams);
                      next.delete('seriesId');
                      setSearchParams(next, { replace: true });
                    }}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            )}

            {/* Skill pills */}
            {!selectedSeries && (
              <div className="el-skill-pills">
                {SKILL_PILLS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    className={`el-skill-pill${activeSkill === key ? ' active' : ''}`}
                    onClick={() => setActiveSkill(key)}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            )}

            {/* Search + Sort */}
            {!selectedSeries && (
              <div className="el-search-row">
                <div className="el-search-box">
                  <Search size={16} color="#9ca3af" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="el-sort-btn">
                  Newest <ChevronDown size={14} />
                </button>
              </div>
            )}

            {/* Content */}
            {selectedSeries ? (
              <SeriesDetail
                series={selectedSeries}
                index={selectedSeriesIndex}
                onBack={() => {
                  setSelectedSeries(null);
                  const next = new URLSearchParams(searchParams);
                  next.delete('seriesId');
                  setSearchParams(next, { replace: true });
                }}
                fullTestProgress={fullTestProgressMap[String(selectedSeries.backendId)] || null}
              />
            ) : activeSkill === 'ALL' ? (
              <div className="el-series-list">
                {fetchError ? (
                  <div className="el-empty">
                    <p>⚠️ Không kết nối được backend.</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{fetchError}</p>
                  </div>
                ) : filteredSeries.length === 0 ? (
                  <div className="el-empty">Chưa có đề thi nào được xuất bản.</div>
                ) : filteredSeries.map((series, idx) => (
                  <SeriesCard key={series.id} series={series} index={idx} onSelect={handleSelectSeries} />
                ))
                }
              </div>
            ) : (
              <TestGrid tests={flatTests} />
            )}
          </div>

        </div>
      )}
    </div>
  );
}
