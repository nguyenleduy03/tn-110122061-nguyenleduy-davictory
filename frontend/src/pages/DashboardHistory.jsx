import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, CheckCircle2, XCircle, Search, ChevronRight,
  ChevronLeft, LayoutGrid, Headphones, BookOpen, PenLine, Mic,
  TrendingUp, ClipboardList, Timer,
} from 'lucide-react';
import DashboardLayout, { BADGE } from '../components/dashboard/DashboardLayout';
import '../styles/dashboard.css';

// ── Mock full history ─────────────────────────────────────────────────────────
const ALL_HISTORY = [
  { id:  1, date: '08/03/2026', title: 'Cambridge IELTS 18 – Academic Test 1',    skill: 'READING',   score: 7.5, duration: '60 phút', status: 'completed' },
  { id:  2, date: '06/03/2026', title: 'IELTS Listening Practice Test 5',         skill: 'LISTENING', score: 7.0, duration: '40 phút', status: 'completed' },
  { id:  3, date: '04/03/2026', title: 'IELTS Writing Task 1 & 2 – Set 3',        skill: 'WRITING',   score: 6.0, duration: '60 phút', status: 'completed' },
  { id:  4, date: '01/03/2026', title: 'Cambridge IELTS 17 – Academic Test 2',    skill: 'READING',   score: 6.5, duration: '60 phút', status: 'completed' },
  { id:  5, date: '26/02/2026', title: 'IELTS Speaking Mock Test – Part 1 & 2',   skill: 'SPEAKING',  score: 6.5, duration: '15 phút', status: 'completed' },
  { id:  6, date: '20/02/2026', title: 'IELTS Listening Full Test 3',             skill: 'LISTENING', score: 6.5, duration: '40 phút', status: 'completed' },
  { id:  7, date: '15/02/2026', title: 'Cambridge IELTS 16 – Academic Test 3',    skill: 'READING',   score: 7.0, duration: '60 phút', status: 'completed' },
  { id:  8, date: '10/02/2026', title: 'IELTS Writing Task 1 – Bar Chart',        skill: 'WRITING',   score: 5.5, duration: '20 phút', status: 'completed' },
  { id:  9, date: '05/02/2026', title: 'IELTS Listening Full Test 2',             skill: 'LISTENING', score: 7.5, duration: '40 phút', status: 'completed' },
  { id: 10, date: '01/02/2026', title: 'Cambridge IELTS 15 – GT Test 1',          skill: 'READING',   score: 6.0, duration: '60 phút', status: 'completed' },
  { id: 11, date: '28/01/2026', title: 'IELTS Speaking Full Mock Test',           skill: 'SPEAKING',  score: 7.0, duration: '15 phút', status: 'completed' },
  { id: 12, date: '20/01/2026', title: 'IELTS Writing Task 2 – Opinion Essay',    skill: 'WRITING',   score: 6.5, duration: '40 phút', status: 'completed' },
  { id: 13, date: '12/01/2026', title: 'IELTS Listening Test 1',                  skill: 'LISTENING', score: 6.0, duration: '40 phút', status: 'completed' },
  { id: 14, date: '05/01/2026', title: 'Cambridge IELTS 14 – Academic Test 4',    skill: 'READING',   score: 5.5, duration: '60 phút', status: 'completed' },
  { id: 15, date: '28/12/2025', title: 'IELTS Speaking Part 1 – Practice',        skill: 'SPEAKING',  score: 6.0, duration: '10 phút', status: 'completed' },
  { id: 16, date: '20/12/2025', title: 'IELTS Writing Task 1 – Line Graph',       skill: 'WRITING',   score: 6.5, duration: '20 phút', status: 'completed' },
  { id: 17, date: '15/12/2025', title: 'Cambridge IELTS 13 – Academic Test 1',    skill: 'READING',   score: 6.5, duration: '60 phút', status: 'completed' },
  { id: 18, date: '08/12/2025', title: 'IELTS Listening Full Test 4',             skill: 'LISTENING', score: 5.5, duration: '40 phút', status: 'completed' },
  { id: 19, date: '01/12/2025', title: 'IELTS Writing Task 2 – Discussion Essay', skill: 'WRITING',   score: 5.0, duration: '40 phút', status: 'completed' },
  { id: 20, date: '22/11/2025', title: 'Cambridge IELTS 12 – Academic Test 2',    skill: 'READING',   score: 6.0, duration: '60 phút', status: 'completed' },
  { id: 21, date: '15/11/2025', title: 'IELTS Listening Starter Test',            skill: 'LISTENING', score: 5.0, duration: '40 phút', status: 'completed' },
  { id: 22, date: '08/11/2025', title: 'IELTS Speaking Part 3 – Practice',        skill: 'SPEAKING',  score: 6.0, duration: '10 phút', status: 'completed' },
  { id: 23, date: '01/11/2025', title: 'Cambridge IELTS 11 – Academic Test 3',    skill: 'READING',   score: 5.0, duration: '60 phút', status: 'completed' },
  { id: 24, date: '25/10/2025', title: 'IELTS Listening Starter – Section 1 & 2', skill: 'LISTENING', score: 4.5, duration: '20 phút', status: 'completed' },
];

const SKILL_TABS = [
  { key: 'ALL',       label: 'Tất cả',    icon: LayoutGrid },
  { key: 'LISTENING', label: 'Listening', icon: Headphones },
  { key: 'READING',   label: 'Reading',   icon: BookOpen },
  { key: 'WRITING',   label: 'Writing',   icon: PenLine },
  { key: 'SPEAKING',  label: 'Speaking',  icon: Mic },
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Mới nhất' },
  { value: 'oldest',    label: 'Cũ nhất' },
  { value: 'score_hi',  label: 'Điểm cao nhất' },
  { value: 'score_lo',  label: 'Điểm thấp nhất' },
];

const PAGE_SIZE = 8;

function parseDateDMY(str) {
  const [d, m, y] = str.split('/');
  return new Date(+y, +m - 1, +d);
}

export default function DashboardHistory() {
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState('newest');
  const [page, setPage]               = useState(1);

  const filtered = useMemo(() => {
    let list = ALL_HISTORY;
    if (skillFilter !== 'ALL') list = list.filter(i => i.skill === skillFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest')   return parseDateDMY(b.date) - parseDateDMY(a.date);
      if (sortBy === 'oldest')   return parseDateDMY(a.date) - parseDateDMY(b.date);
      if (sortBy === 'score_hi') return b.score - a.score;
      if (sortBy === 'score_lo') return a.score - b.score;
      return 0;
    });
  }, [skillFilter, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const avgScore   = ALL_HISTORY.length ? (ALL_HISTORY.reduce((s, i) => s + i.score, 0) / ALL_HISTORY.length).toFixed(1) : 0;
  const totalMins  = ALL_HISTORY.reduce((s, i) => s + parseInt(i.duration), 0);

  const handleSkillFilter = (key) => { setSkillFilter(key); setPage(1); };
  const handleSearch      = (e)   => { setSearch(e.target.value); setPage(1); };
  const handleSort        = (e)   => { setSortBy(e.target.value); setPage(1); };

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="db-page-header">
        <div>
          <div className="db-breadcrumb">
            <Link to="/my-dashboard">Tổng quan</Link>
            <ChevronRight size={14} />
            <span>Lịch sử thi</span>
          </div>
          <h1 className="db-page-title">Lịch sử thi</h1>
          <p className="db-page-sub">Toàn bộ bài thi bạn đã thực hiện</p>
        </div>
        <Link to="/exam-library" className="db-welcome-cta">
          Làm thêm bài thi
        </Link>
      </div>

      {/* Summary stats */}
      <div className="db-hist-summary">
        <div className="db-hist-summary-item">
          <div className="db-hist-summary-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="db-hist-summary-val">{ALL_HISTORY.length}</p>
            <p className="db-hist-summary-label">Tổng bài thi</p>
          </div>
        </div>
        <div className="db-hist-summary-item">
          <div className="db-hist-summary-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="db-hist-summary-val">{avgScore}</p>
            <p className="db-hist-summary-label">Band trung bình</p>
          </div>
        </div>
        <div className="db-hist-summary-item">
          <div className="db-hist-summary-icon" style={{ background: '#fef9c3', color: '#a16207' }}>
            <Timer size={20} />
          </div>
          <div>
            <p className="db-hist-summary-val">{totalMins} phút</p>
            <p className="db-hist-summary-label">Tổng thời gian</p>
          </div>
        </div>
        <div className="db-hist-summary-item">
          <div className="db-hist-summary-icon" style={{ background: '#fce7f3', color: '#be185d' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="db-hist-summary-val">100%</p>
            <p className="db-hist-summary-label">Tỷ lệ hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="db-filter-card">
        {/* Skill tabs */}
        <div className="db-pill-tabs">
          {SKILL_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`db-pill-tab${skillFilter === key ? ' active' : ''}`}
              onClick={() => handleSkillFilter(key)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="db-filter-row">
          <div className="db-search-wrap">
            <Search size={15} className="db-search-icon" />
            <input
              className="db-search-input"
              placeholder="Tìm kiếm bài thi..."
              value={search}
              onChange={handleSearch}
            />
          </div>
          <select className="db-sort-select" value={sortBy} onChange={handleSort}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* History list */}
      <div className="db-hist-list-card">
        {pageItems.length === 0 ? (
          <div className="db-hist-empty">
            <ClipboardList size={40} color="#cbd5e1" />
            <p>Không tìm thấy bài thi nào</p>
          </div>
        ) : (
          <>
            <div className="db-hist-list-header">
              <span className="db-hist-col-num">#</span>
              <span className="db-hist-col-title">Tên bài thi</span>
              <span className="db-hist-col-skill">Kỹ năng</span>
              <span className="db-hist-col-date">Ngày thi</span>
              <span className="db-hist-col-dur">Thời gian</span>
              <span className="db-hist-col-score">Điểm Band</span>
            </div>

            {pageItems.map((item, idx) => (
              <div className="db-hist-row" key={item.id}>
                <span className="db-hist-col-num">{(page - 1) * PAGE_SIZE + idx + 1}</span>
                <div className="db-hist-col-title">
                  <div className="db-hist-status-dot">
                    {item.status === 'completed'
                      ? <CheckCircle2 size={15} color="#16a34a" />
                      : <XCircle size={15} color="#dc2626" />}
                  </div>
                  <span className="db-hist-row-title">{item.title}</span>
                </div>
                <span className="db-hist-col-skill">
                  <span className="db-history-badge" style={{ background: BADGE[item.skill].bg, color: BADGE[item.skill].text }}>
                    {item.skill}
                  </span>
                </span>
                <span className="db-hist-col-date">{item.date}</span>
                <span className="db-hist-col-dur">
                  <Clock size={12} /> {item.duration}
                </span>
                <span className="db-hist-col-score">
                  <span className="db-hist-band" style={{ color: item.score >= 7 ? '#15803d' : item.score >= 6 ? '#a16207' : '#dc2626' }}>
                    {item.score}
                  </span>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="db-pagination">
          <button
            className="db-page-btn"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} /> Trước
          </button>

          <div className="db-page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`db-page-num${page === n ? ' active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            className="db-page-btn"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            Sau <ChevronRight size={16} />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
