import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

const SKILL_BADGE_COLORS = {
  LISTENING: { bg: '#dbeafe', text: '#1d4ed8' },
  READING:   { bg: '#dcfce7', text: '#15803d' },
  WRITING:   { bg: '#fef9c3', text: '#a16207' },
  SPEAKING:  { bg: '#fce7f3', text: '#be185d' },
};

function BookCover({ series, index }) {
  const p = COVER_PALETTE[index % COVER_PALETTE.length];
  return (
    <div
      className="book-cover"
      style={{ background: `linear-gradient(160deg, ${p.from} 0%, ${p.to} 100%)` }}
    >
      <div className="book-cover-ielts">IELTS</div>
      <div className="book-cover-divider" />
      {series.year && <div className="book-cover-year">{series.year}</div>}
    </div>
  );
}

function TestCard({ series, activeSkill, index }) {
  const displayTests = useMemo(() => {
    if (activeSkill === 'ALL') return series.tests;
    return series.tests.filter((t) => t.skill === activeSkill);
  }, [series, activeSkill]);

  if (displayTests.length === 0) return null;

  return (
    <div className="test-card">
      <BookCover series={series} index={index} />
      <div className="test-card-content">
        <h3 className="test-card-title">{series.title}</h3>
        <div className="test-card-items">
          {displayTests.map((test) => {
            const badge = SKILL_BADGE_COLORS[test.skill];
            return (
              <Link
                key={test.id}
                to={`/test/${test.skill.toLowerCase()}/${test.id}`}
                className="test-card-item"
              >
                {activeSkill === 'ALL' && (
                  <span
                    className="test-skill-badge"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {test.skill[0] + test.skill.slice(1).toLowerCase()}
                  </span>
                )}
                {test.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ExamLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeType, setActiveType] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const rawSkill = searchParams.get('skill')?.toUpperCase() || 'ALL';
  const activeSkill = SKILL_PILLS.some((s) => s.key === rawSkill) ? rawSkill : 'ALL';

  const setActiveSkill = (skill) => {
    const next = new URLSearchParams(searchParams);
    if (skill === 'ALL') {
      next.delete('skill');
    } else {
      next.set('skill', skill.toLowerCase());
    }
    setSearchParams(next, { replace: true });
  };

  const filteredSeries = useMemo(() => {
    return TEST_SERIES.filter((series) => {
      if (activeType !== 'ALL' && series.type !== activeType) return false;
      if (searchQuery && !series.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeSkill !== 'ALL') {
        return series.tests.some((t) => t.skill === activeSkill);
      }
      return true;
    });
  }, [activeType, activeSkill, searchQuery]);

  return (
    <div className="exam-library-page">
      <Navbar />

      <div className="exam-library-wrapper">
        {/* ── Main ── */}
        <div className="exam-library-main">
          {/* Breadcrumb */}
          <nav className="el-breadcrumb">
            <Link to="/">Home</Link>
            <span className="el-breadcrumb-sep"> / </span>
            <span>IELTS Exam Library</span>
          </nav>

          {/* Title */}
          <h1 className="el-title">IELTS Exam Library</h1>

          {/* Type tabs */}
          <div className="el-type-tabs">
            {TYPE_TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`el-type-tab${activeType === key ? ' active' : ''}`}
                onClick={() => setActiveType(key)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Skill pills */}
          <div className="el-skill-pills">
            {SKILL_PILLS.map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`el-skill-pill${activeSkill === key ? ' active' : ''}`}
                onClick={() => setActiveSkill(key)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="el-search-row">
            <div className="el-search-box">
              <Search size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="el-sort-btn">
              Newest <ChevronDown size={14} />
            </button>
          </div>

          {/* Test list */}
          <div className="el-test-list">
            {filteredSeries.length === 0 ? (
              <div className="el-empty">Không tìm thấy đề thi phù hợp.</div>
            ) : (
              filteredSeries.map((series, idx) => (
                <TestCard
                  key={series.id}
                  series={series}
                  activeSkill={activeSkill}
                  index={idx}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
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
