import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  LayoutGrid,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { HISTORY, SKILL_META } from '../data/dashboardData';

const PAGE_SIZE = 6;

const SKILL_FILTERS = [
  { key: 'ALL',       label: 'Tất cả',   icon: LayoutGrid },
  { key: 'LISTENING', label: 'Listening', icon: Headphones },
  { key: 'READING',   label: 'Reading',   icon: BookOpen   },
  { key: 'WRITING',   label: 'Writing',   icon: PenLine    },
  { key: 'SPEAKING',  label: 'Speaking',  icon: Mic        },
];

// ── Score bar for overall summary ─────────────────────────────────────────────
function MiniBar({ value, max = 9, color }) {
  return (
    <div className="hist-minibar-track">
      <div className="hist-minibar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

export default function DashboardHistory() {
  const [query, setQuery]       = useState('');
  const [skillFilter, setSkill] = useState('ALL');
  const [page, setPage]         = useState(1);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return HISTORY.filter((item) => {
      const matchSkill = skillFilter === 'ALL' || item.skill === skillFilter;
      const matchQ     = item.title.toLowerCase().includes(query.toLowerCase());
      return matchSkill && matchQ;
    });
  }, [query, skillFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSkill(key) { setSkill(key); setPage(1); }
  function handleQuery(e)   { setQuery(e.target.value); setPage(1); }

  // ── Per-skill best scores (for summary cards) ─────────────────────────────
  const summary = useMemo(() => {
    return ['LISTENING', 'READING', 'WRITING', 'SPEAKING'].map((skill) => {
      const items  = HISTORY.filter((h) => h.skill === skill);
      const best   = items.length ? Math.max(...items.map((h) => h.score)) : 0;
      const avg    = items.length ? (items.reduce((s, h) => s + h.score, 0) / items.length).toFixed(1) : '—';
      return { skill, count: items.length, best, avg };
    });
  }, []);

  const SKILL_ICON = { LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic };

  return (
    <DashboardLayout>
      {/* ── Page header ── */}
      <div className="hist-header">
        <div>
          <h1 className="hist-title">Lịch sử thi</h1>
          <p className="hist-sub">Xem lại toàn bộ {HISTORY.length} bài thi bạn đã hoàn thành.</p>
        </div>
        <Link to="/exam-library" className="db-welcome-cta" style={{ fontSize: 13, padding: '10px 20px' }}>
          <RotateCcw size={16} /> Thi thêm
        </Link>
      </div>

      {/* ── Summary cards ── */}
      <div className="hist-summary-grid">
        {summary.map(({ skill, count, best, avg }) => {
          const Icon = SKILL_ICON[skill];
          const meta = SKILL_META[skill];
          return (
            <div className="hist-summary-card" key={skill}>
              <div className="hist-summary-icon" style={{ background: meta.bg, color: meta.text }}>
                <Icon size={18} />
              </div>
              <div className="hist-summary-body">
                <p className="hist-summary-skill">{meta.label}</p>
                <p className="hist-summary-count">{count} bài thi</p>
              </div>
              <div className="hist-summary-scores">
                <div className="hist-summary-score-row">
                  <span className="hist-summary-score-lbl">Best</span>
                  <span className="hist-summary-score-val" style={{ color: meta.text }}>{best}</span>
                </div>
                <MiniBar value={best} color={meta.text} />
                <div className="hist-summary-score-row" style={{ marginTop: 4 }}>
                  <span className="hist-summary-score-lbl">Avg</span>
                  <span className="hist-summary-score-val" style={{ color: meta.text }}>{avg}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="hist-filters">
        {/* Search */}
        <div className="hist-search-wrap">
          <Search size={15} className="hist-search-icon" />
          <input
            className="hist-search-input"
            placeholder="Tìm kiếm bài thi..."
            value={query}
            onChange={handleQuery}
          />
        </div>

        {/* Skill pills */}
        <div className="hist-skill-pills">
          <Filter size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
          {SKILL_FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`hist-pill${skillFilter === key ? ' active' : ''}`}
              onClick={() => handleSkill(key)}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results info ── */}
      <p className="hist-results-info">
        Hiển thị {paginated.length}/{filtered.length} bài thi
        {skillFilter !== 'ALL' && ` (${SKILL_META[skillFilter].label})`}
        {query && ` · tìm kiếm "${query}"`}
      </p>

      {/* ── Table ── */}
      {paginated.length === 0 ? (
        <div className="hist-empty">
          <XCircle size={40} color="#e2e8f0" />
          <p>Không tìm thấy bài thi nào.</p>
        </div>
      ) : (
        <>
          <div className="hist-table-wrap">
            <table className="hist-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên bài thi</th>
                  <th>Kỹ năng</th>
                  <th>Ngày thi</th>
                  <th>Thời gian</th>
                  <th>Điểm Band</th>
                  <th>Kết quả</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => {
                  const meta = SKILL_META[item.skill];
                  const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={item.id}>
                      <td className="hist-td-num">{globalIdx}</td>
                      <td className="hist-td-title">{item.title}</td>
                      <td>
                        <span className="db-history-badge"
                          style={{ background: meta.bg, color: meta.text }}>
                          {item.skill}
                        </span>
                      </td>
                      <td className="hist-td-date">{item.date}</td>
                      <td className="hist-td-dur">
                        <Clock size={12} style={{ marginRight: 4 }} />{item.duration}
                      </td>
                      <td>
                        <span className="hist-band-pill" style={{ color: meta.text, borderColor: meta.text }}>
                          {item.score}
                        </span>
                      </td>
                      <td>
                        {item.correct !== null
                          ? <span className="hist-correct">{item.correct}/{item.total} đúng</span>
                          : <span className="hist-correct-na">—</span>}
                      </td>
                      <td>
                        <button className="hist-view-btn">
                          <Eye size={14} /> Xem lại
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="hist-pagination">
              <button
                className="hist-page-btn"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`hist-page-btn${page === p ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="hist-page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
