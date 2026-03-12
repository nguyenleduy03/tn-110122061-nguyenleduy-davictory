import React, { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Search,
  ChevronDown,
  ListFilter,
  GraduationCap,
  Users,
  ArrowLeft,
  Zap,
  X,
  MonitorCheck,
  HelpCircle,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { TEST_SERIES } from '../data/examLibraryData';
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
function SeriesDetail({ series, index, onBack }) {
  const [showModal, setShowModal] = useState(false);
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

  const handleStartFullTest = () => {
    const sections = available.map((s, i) => ({
      skill: s.toLowerCase(),
      testId: skillGroups[s][0].id,
      label: SKILL_META[s].label,
      sectionNum: i + 1,
    }));
    sessionStorage.setItem('ieltsFullTest', JSON.stringify({
      seriesTitle: series.title,
      totalSections: sections.length,
      sections,
      currentSection: 0,
      mode: 'practice',
    }));
    setShowModal(false);
    navigate(`/test/${sections[0].skill}/${sections[0].testId}?fullTest=true&mode=practice`);
  };

  return (
    <div className="series-detail">
      <h2 className="series-detail-title">{series.title}</h2>

      <div className="skill-cards-grid">
        {available.map(skill => {
          const m = SKILL_META[skill];
          const tests = skillGroups[skill];
          return (
            <div key={skill} className="skill-card">
              <div className="skill-card-top">
                <m.Icon size={40} color={m.color} strokeWidth={1.5} />
                <span className="skill-card-label">{m.label}</span>
              </div>
              <div className="skill-card-spacer" />
              <Link
                to={`/test/${skill.toLowerCase()}/${tests[0].id}?mode=practice`}
                className="skill-card-btn"
                style={{ background: m.btnColor }}
              >
                <Zap size={15} fill="white" color="white" /> Làm bài
              </Link>
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
            <div className="full-test-progress-fill" style={{ width: '0%' }} />
            <span className="full-test-progress-text">0%</span>
          </div>
        </div>
        <button className="full-test-start-btn" onClick={() => setShowModal(true)}>
          <Zap size={15} fill="white" color="white" /> Start
        </button>
      </div>

      {/* Full Test Modal */}
      {showModal && (
        <div className="ft-overlay" onClick={() => setShowModal(false)}>
          <div className="ft-modal" onClick={e => e.stopPropagation()}>
            <button className="ft-modal-close" onClick={() => setShowModal(false)}>
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
              </ul>
            </div>
            <p className="ft-modal-confirm-text">Please confirm if you would like to continue.</p>
            <button className="ft-modal-confirm-btn" onClick={handleStartFullTest}>Xác nhận</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeType, setActiveType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeriesIndex, setSelectedSeriesIndex] = useState(0);

  const rawSkill = searchParams.get('skill')?.toUpperCase() || 'ALL';
  const activeSkill = SKILL_PILLS.some(s => s.key === rawSkill) ? rawSkill : 'ALL';

  const setActiveSkill = (skill) => {
    setSelectedSeries(null);
    const next = new URLSearchParams(searchParams);
    if (skill === 'ALL') next.delete('skill');
    else next.set('skill', skill.toLowerCase());
    setSearchParams(next, { replace: true });
  };

  const filteredSeries = useMemo(() => {
    return TEST_SERIES.filter(series => {
      if (activeType !== 'ALL' && series.type !== activeType) return false;
      if (searchQuery && !series.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeSkill !== 'ALL') return series.tests.some(t => t.skill === activeSkill);
      return true;
    });
  }, [activeType, activeSkill, searchQuery]);

  const flatTests = useMemo(() => {
    if (activeSkill === 'ALL') return [];
    return filteredSeries.flatMap(s => s.tests.filter(t => t.skill === activeSkill));
  }, [activeSkill, filteredSeries]);

  const handleSelectSeries = (series) => {
    const idx = filteredSeries.findIndex(s => s.id === series.id);
    setSelectedSeries(series);
    setSelectedSeriesIndex(idx >= 0 ? idx : 0);
  };

  return (
    <div className="exam-library-page">
      <Navbar />

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
                  onClick={() => { setActiveType(key); setSelectedSeries(null); }}
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
              onBack={() => setSelectedSeries(null)}
            />
          ) : activeSkill === 'ALL' ? (
            <div className="el-series-list">
              {filteredSeries.length === 0
                ? <div className="el-empty">Không tìm thấy đề thi phù hợp.</div>
                : filteredSeries.map((series, idx) => (
                  <SeriesCard key={series.id} series={series} index={idx} onSelect={handleSelectSeries} />
                ))
              }
            </div>
          ) : (
            <TestGrid tests={flatTests} />
          )}
        </div>

        {/* Sidebar */}
        <aside className="exam-library-sidebar">
          <div className="sidebar-promo-card">
            <div className="sidebar-promo-badge">IELTS</div>
            <h3 className="sidebar-promo-title">
              Luyện thi IELTS<br />
              hiệu quả cùng<br />
              DAVictory
            </h3>
            <ul className="sidebar-promo-list">
              <li>✔ Đề thi cập nhật thường xuyên</li>
              <li>✔ Chấm điểm tự động chính xác</li>
              <li>✔ Phân tích kết quả chi tiết</li>
              <li>✔ Giải thích đáp án đầy đủ</li>
              <li>✔ Luyện tập mọi lúc mọi nơi</li>
            </ul>
            <button className="sidebar-promo-btn">Bắt đầu ngay →</button>
          </div>

          <div className="sidebar-stats-card">
            <h4 className="sidebar-stats-title">Thống kê</h4>
            <div className="sidebar-stats-grid">
              <div className="sidebar-stat">
                <span className="stat-value">500+</span>
                <span className="stat-label">Đề thi</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-value">50K+</span>
                <span className="stat-label">Học viên</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-value">4</span>
                <span className="stat-label">Kỹ năng</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-value">Free</span>
                <span className="stat-label">Miễn phí</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
