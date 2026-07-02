import React, { useMemo, useState, useEffect } from 'react';
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
  const hasSavedDraftMetadata = Number(payload.savedAt) > 0 || Object.keys(payload).length > 0;

  if (skill === 'WRITING') {
    const answers = payload.writingAnswers;
    const hasAnswers = answers && typeof answers === 'object'
      && Object.values(answers).some((v) => typeof v === 'string' && v.trim() !== '');
    return Boolean(hasAnswers || hasSavedDraftMetadata);
  }

  if (skill === 'READING' || skill === 'LISTENING') {
    const answers = payload.answers;
    const bookmarks = payload.bookmarks;
    const hasAnswers = answers && typeof answers === 'object' && Object.values(answers).some(isAnsweredValue);
    const hasBookmarks = bookmarks && typeof bookmarks === 'object' && Object.values(bookmarks).some(Boolean);
    const hasMovedPart = Number(payload.currentPartIndex) > 0;
    return Boolean(hasAnswers || hasBookmarks || hasMovedPart || hasSavedDraftMetadata);
  }

  if (skill === 'SPEAKING') {
    return Boolean(Number(payload.recordedQuestionCount) > 0 || Number(payload.currentPartIdx) > 0 || hasSavedDraftMetadata);
  }

  // Realtime timer keys may not exist anymore; a saved draft itself means
  // the attempt is in progress until the user submits (draft is cleared on submit).
  return hasSavedDraftMetadata;
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

// Kiểm tra xem có tiến trình nháp (draft) đang làm dở hay không
const hasActiveDraft = (skill, testId) => {
  if (typeof window === 'undefined') return false;
  const safeSkill = String(skill || '').toLowerCase();
  const safeTestId = String(testId || '').trim();
  const prefix = `ieltsDraft_${safeSkill}_`;
  const suffix = `_${safeTestId}`;

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key.endsWith(suffix)) {
      const payload = parseJsonSafe(localStorage.getItem(key), null);
      if (payload && hasMeaningfulSkillDraft(skill, payload)) {
        return true;
      }
    }
  }
  return false;
};

// Check if test has been completed (submitted or viewed result)
const isTestCompleted = (skill, testId) => {
  if (typeof window === 'undefined') return false;
  const safeSkill = String(skill || '').toLowerCase();
  const safeTestId = String(testId || '').trim();
  if (!safeSkill || !safeTestId) return false;

  // Nếu đang làm dở (có draft hoạt động), xem như bài thi chưa hoàn thành (đang làm lại)
  if (hasActiveDraft(skill, testId)) return false;

  // Check if viewed result (for all skills)
  const viewedKey = `ieltsResultViewed_${safeSkill}_${safeTestId}`;
  if (localStorage.getItem(viewedKey)) return true;

  // Check if submitted lock exists (means submitted but not viewed yet)
  const prefix = `ieltsSubmittedLock_${safeSkill}_${safeTestId}_`;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(prefix)) return true;
  }

  return false;
};

// Phát hiện tiến trình làm bài dở của kỹ năng lẻ
const detectSkillResume = (skill, testId) => {
  if (!testId || typeof window === 'undefined') return null;

  // Bỏ qua khôi phục nếu bài thi đã nộp/hoàn thành
  if (isTestCompleted(skill, testId)) return null;

  const prefix = `ieltsDraft_${skill.toLowerCase()}_`;
  const suffix = `_${testId}`;
  let latest = null;
  let latestTimer = null;
  const now = Date.now();

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

  return latest || latestTimer || null;
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
function TestGrid({ tests, onStartTest }) {
  if (tests.length === 0) return <div className="el-empty">Không tìm thấy đề thi phù hợp.</div>;
  return (
    <div className="test-grid">
      {tests.map(test => (
        <button
          key={test.id}
          type="button"
          className="test-grid-item"
          onClick={() => onStartTest(test.skill, test.id, null)}
        >
          <span className="test-grid-name">{test.name}</span>
        </button>
      ))}
    </div>
  );
}

/* ── SERIES DETAIL view ── */
function SeriesDetail({ series, fullTestProgress, onOpenSkillModal }) {
  const [showFullTestModal, setShowFullTestModal] = useState(false);
  const [mountTime] = useState(() => Date.now());
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
    const now = mountTime;

    available.forEach((skill) => {
      const testId = String(skillGroups[skill]?.[0]?.id || '');
      if (!testId) return;

      // Skip resume detection for completed tests.
      if (isTestCompleted(skill, testId)) return;

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
  }, [available, skillGroups, mountTime]);

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

  const handleStartFullTest = (chosenMode) => {
    const mode = chosenMode || 'practice';
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
      mode: mode,
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
      localStorage.removeItem(`ieltsResultViewed_${section.skill}_${section.testId}`);
    });

    clearSubmittedLocksForSections(sections, `fullTest=true&mode=${mode}`);

    setShowFullTestModal(false);
    navigate(`/test/${sections[0].skill}/${sections[0].testId}?fullTest=true&mode=${mode}`);
  };



  return (
    <div className="series-detail">
      <h2 className="series-detail-title">{series.title}</h2>

      <div className="skill-cards-grid">
        {available.map(skill => {
          const m = SKILL_META[skill];
          const tests = skillGroups[skill];
          const testId = tests?.[0]?.id;
          const isCompleted = testId ? isTestCompleted(skill, testId) : false;
          const hasResume = skillResumeMap[skill];

          // Determine button text
          let buttonText;
          if (isCompleted) {
            buttonText = <><Zap size={15} fill="white" color="white" /> Làm lại</>;
          } else if (hasResume) {
            buttonText = <><Zap size={15} fill="white" color="white" /> Tiếp tục</>;
          } else {
            buttonText = <><Zap size={15} fill="white" color="white" /> Làm bài</>;
          }

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
                style={{ background: m.btnColor }}
                onClick={() => {
                  const resume = skillResumeMap[skill];
                  onOpenSkillModal(skill, testId, resume || null);
                }}
              >
                {buttonText}
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
          <Zap size={15} fill="white" color="white" />
          {(() => {
            // Check if all skills completed
            const allSkillsCompleted = available.every(skill => {
              const testId = skillGroups[skill]?.[0]?.id;
              return testId && isTestCompleted(skill, testId);
            });

            if (allSkillsCompleted) return 'Làm lại';
            if (hasSavedFullTestProgress) return 'Tiếp tục';
            return 'Bắt đầu';
          })()}
        </button>
      </div>

      {/* Full Test Modal */}
      {showFullTestModal && (
        <div className="sm-overlay" onClick={() => setShowFullTestModal(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <button className="sm-close" onClick={() => setShowFullTestModal(false)}>
              <X size={20} />
            </button>

            {hasSavedFullTestProgress ? (
              <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <MonitorCheck size={56} color="#1e3a8a" strokeWidth={1.2} />
                <h3 className="ft-modal-title">IELTS Full Test</h3>
                <div className="ft-modal-hint" style={{ width: '100%', textAlign: 'left' }}>
                  <HelpCircle size={36} color="#e5a020" strokeWidth={1.2} />
                  <p>Bạn đang có tiến trình làm dở. Hệ thống sẽ mở lại đúng vị trí đang làm.</p>
                </div>
                <button
                  className="sm-start-btn"
                  onClick={() => handleStartFullTest()}
                  style={{ maxWidth: '300px', margin: '10px auto 0' }}
                >
                  Tiếp tục full test
                </button>
              </div>
            ) : (
              <>
                <div className="sm-head" style={{ '--sm-accent': '#1e3a8a', marginBottom: '24px' }}>
                  <MonitorCheck size={36} />
                  <h3>Choose your Full Test mode</h3>
                  <p>Select a mode that fits your current training goal.</p>
                </div>

                <div className="sm-cards">
                  <div className="sm-card practice" style={{ '--sm-accent': '#3b82f6' }}>
                    <div className="sm-card-title-row">
                      <Target size={19} />
                      <h4>Practice Mode</h4>
                    </div>
                    <p>Practice all skills (Listening, Reading, Writing, Speaking) with comfortable pacing and review enabled.</p>
                    <div className="sm-meta" style={{ marginTop: '20px', marginBottom: '20px' }}>
                      <span><Timer size={14} /> Flexible time limit</span>
                      <span><HelpCircle size={14} /> Review enabled</span>
                    </div>
                    <button className="sm-start-btn" onClick={() => handleStartFullTest('practice')}>
                      Start practice <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="sm-card exam" style={{ '--sm-accent': '#1e3a8a' }}>
                    <div className="sm-card-title-row">
                      <Laptop size={19} />
                      <h4>Simulation Mode</h4>
                    </div>
                    <p>Simulated full test flow with realistic examiner timing. Strict exam mode.</p>
                    <div className="sm-meta" style={{ marginTop: '20px', marginBottom: '20px' }}>
                      <span><Timer size={14} /> ~3 hours</span>
                      <span><HelpCircle size={14} /> Strict exam mode</span>
                    </div>
                    <button className="sm-start-btn" onClick={() => handleStartFullTest('exam')}>
                      Start simulation <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function ExamLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeriesIndex, setSelectedSeriesIndex] = useState(0);
  const [testSeries, setTestSeries] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [fullTestProgressMap, setFullTestProgressMap] = useState({});
  // Modal chọn chế độ thi kỹ năng lẻ
  const [skillModeModal, setSkillModeModal] = useState(null); // { skill, testId, resume }

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

  // Mở modal chọn chế độ thi kỹ năng lẻ
  const handleOpenSkillModal = (skill, testId, resume) => {
    const activeResume = resume || detectSkillResume(skill, testId);
    setSkillModeModal({ skill, testId, resume: activeResume });
  };

  // Khi người dùng chọn chế độ từ modal kỹ năng lẻ
  const handleStartSkillMode = (mode) => {
    if (!skillModeModal) return;
    const { skill, testId, resume } = skillModeModal;
    setSkillModeModal(null);

    // Nếu tiếp tục bài làm dở (mode === null là signal resume)
    if (resume && mode === null) {
      const rawQuery = String(resume.queryString || '').replace(/^\?/, '');
      const query = rawQuery || `mode=${resume.mode || 'practice'}`;
      const normalizedParams = new URLSearchParams(query);
      // Resume giữ nguyên allowReview theo chế độ gốc, không thay đổi
      const normalizedQuery = normalizedParams.toString();
      const persistKey = buildTimerPersistKey({
        skill: String(skill || '').toLowerCase(),
        testId,
        mode: normalizedParams.get('mode') || 'practice',
        isFullTest: false,
        queryString: normalizedQuery,
      });
      clearSubmittedLock(persistKey);
      navigate(`/test/${skill.toLowerCase()}/${testId}?${normalizedQuery}`);
      return;
    }

    // Xóa kết quả đã xem trước đó để bắt đầu đợt thi mới (cho phép nút Tiếp tục hiển thị nếu thoát ra giữa chừng)
    const safeSkill = String(skill).toLowerCase();
    localStorage.removeItem(`ieltsResultViewed_${safeSkill}_${testId}`);

    const setup = SKILL_PRACTICE_SETUP[String(skill).toUpperCase()] || SKILL_PRACTICE_SETUP.READING;
    const params = new URLSearchParams();
    params.set('mode', mode || 'practice');
    const sortedParts = [...setup.parts].sort((a, b) => a - b);
    params.set('parts', sortedParts.join(','));
    params.set('startPart', String(sortedParts[0]));

    // KHÔNG set ?duration ở đây → trang thi sẽ dùng totalMinutes từ server
    // (tức là thời gian admin đặt trong TestBuilder, không phải hardcode)
    if (mode === 'exam') {
      // Simulation: thi nghiêm ngặt, không cho xem lại kết quả trong khi thi
      params.set('allowReview', 'false');
    }
    // Practice mode: không set duration, không set allowReview → trang thi tự dùng server time

    const queryString = params.toString();
    const persistKey = buildTimerPersistKey({
      skill: String(skill || '').toLowerCase(),
      testId,
      mode: mode || 'practice',
      isFullTest: false,
      queryString,
    });
    clearSubmittedLock(persistKey);
    navigate(`/test/${skill.toLowerCase()}/${testId}?${queryString}`);
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
                {TYPE_TABS.map((tab) => {
                  const TabIcon = tab.Icon;
                  return (
                    <button
                      key={tab.key}
                      className={`el-type-tab${activeType === tab.key ? ' active' : ''}`}
                      onClick={() => {
                        setActiveType(tab.key);
                        setSelectedSeries(null);
                        const next = new URLSearchParams(searchParams);
                        next.delete('seriesId');
                        setSearchParams(next, { replace: true });
                      }}
                    >
                      <TabIcon size={16} /> {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Skill pills */}
            {!selectedSeries && (
              <div className="el-skill-pills">
                {SKILL_PILLS.map((pill) => {
                  const PillIcon = pill.Icon;
                  return (
                    <button
                      key={pill.key}
                      className={`el-skill-pill${activeSkill === pill.key ? ' active' : ''}`}
                      onClick={() => setActiveSkill(pill.key)}
                    >
                      <PillIcon size={14} /> {pill.label}
                    </button>
                  );
                })}
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
                onOpenSkillModal={handleOpenSkillModal}
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
              <TestGrid tests={flatTests} onStartTest={handleOpenSkillModal} />
            )}
          </div>

        </div>
      )}

      {/* Skill Mode Modal - hiện cho tất cả kỹ năng lẻ */}
      {skillModeModal && (() => {
        const { skill, resume } = skillModeModal;
        const m = SKILL_META[String(skill).toUpperCase()] || SKILL_META.READING;
        const SkillIcon = m.Icon;
        return (
          <div className="sm-overlay" onClick={() => setSkillModeModal(null)}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
              <button className="sm-close" onClick={() => setSkillModeModal(null)}>
                <X size={20} />
              </button>

              {resume ? (
                <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <SkillIcon size={56} color={m.color} strokeWidth={1.2} />
                  <h3 className="ft-modal-title">{m.label}</h3>
                  <div className="ft-modal-hint" style={{ width: '100%', textAlign: 'left' }}>
                    <HelpCircle size={36} color="#e5a020" strokeWidth={1.2} />
                    <p>Bạ đang có tiến trình làm dở. Hệ thống sẽ mở lại đúng vị trí đang làm.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      className="sm-start-btn"
                      onClick={() => handleStartSkillMode(null)}
                      style={{ maxWidth: '220px' }}
                    >
                      Tiếp tục làm
                    </button>
                    <button
                      className="sm-start-btn"
                      onClick={() => handleStartSkillMode('practice')}
                      style={{ maxWidth: '220px', background: '#64748b' }}
                    >
                      Bắt đầu lại
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sm-head" style={{ '--sm-accent': m.color, marginBottom: '24px' }}>
                    <SkillIcon size={36} />
                    <h3>Choose your {m.label} mode</h3>
                    <p>Select a mode that fits your current training goal.</p>
                  </div>

                  <div className="sm-cards">
                    <div className="sm-card practice" style={{ '--sm-accent': '#3b82f6' }}>
                      <div className="sm-card-title-row">
                        <Target size={19} />
                        <h4>Practice Mode</h4>
                      </div>
                      <p>Practice {m.label.toLowerCase()} skills with flexible pacing and review enabled after submission.</p>
                      <div className="sm-meta" style={{ marginTop: '20px', marginBottom: '20px' }}>
                        <span><Timer size={14} /> Flexible time limit</span>
                        <span><HelpCircle size={14} /> Review enabled</span>
                      </div>
                      <button className="sm-start-btn" onClick={() => handleStartSkillMode('practice')}>
                        Start practice <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="sm-card exam" style={{ '--sm-accent': '#1e3a8a' }}>
                      <div className="sm-card-title-row">
                        <Laptop size={19} />
                        <h4>Simulation Mode</h4>
                      </div>
                      <p>Simulated exam condition with realistic timing and strict exam mode.</p>
                      <div className="sm-meta" style={{ marginTop: '20px', marginBottom: '20px' }}>
                        <span><Timer size={14} /> Timed exam</span>
                        <span><HelpCircle size={14} /> Strict exam mode</span>
                      </div>
                      <button className="sm-start-btn" onClick={() => handleStartSkillMode('exam')}>
                        Start simulation <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
