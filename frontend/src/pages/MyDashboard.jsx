import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Headphones, BookOpen, PenLine, Mic,
  Trophy, TrendingUp, Clock, Target,
  ChevronRight, Star, Calendar, BarChart2,
  PlayCircle, CheckCircle2, XCircle, Flame, ClipboardList,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { authApi } from '../services/authApi';
import '../styles/dashboard.css';

const STATS = [
  { label: 'Bài thi đã làm',     value: '24',  icon: ClipboardList, color: '#1d4ed8', bg: '#dbeafe' },
  { label: 'Điểm Band tốt nhất', value: '7.5', icon: Trophy,        color: '#a16207', bg: '#fef9c3' },
  { label: 'Điểm trung bình',    value: '6.8', icon: TrendingUp,    color: '#15803d', bg: '#dcfce7' },
  { label: 'Ngày luyện tập',     value: '42',  icon: Flame,         color: '#dc2626', bg: '#fee2e2' },
];

const SKILLS = [
  { key: 'listening', label: 'Listening', icon: Headphones, score: 7.0, tests: 8, color: '#1d4ed8', bg: '#dbeafe', path: '/test/listening' },
  { key: 'reading',   label: 'Reading',   icon: BookOpen,   score: 7.5, tests: 9, color: '#15803d', bg: '#dcfce7', path: '/test/reading'   },
  { key: 'writing',   label: 'Writing',   icon: PenLine,    score: 6.0, tests: 4, color: '#a16207', bg: '#fef9c3', path: '/test/writing'   },
  { key: 'speaking',  label: 'Speaking',  icon: Mic,        score: 6.5, tests: 3, color: '#be185d', bg: '#fce7f3', path: '/test/speaking'  },
];

const RECOMMENDED = [
  { id: 1, title: 'Cambridge IELTS 18 – Test 1', skill: 'READING',   difficulty: 'Trung bình', rating: 4.8, users: '12.4k' },
  { id: 2, title: 'IELTS Listening Full Test 5',  skill: 'LISTENING', difficulty: 'Dễ',        rating: 4.7, users: '9.1k'  },
  { id: 3, title: 'IELTS Writing Practice Set 3', skill: 'WRITING',   difficulty: 'Khó',       rating: 4.6, users: '5.8k'  },
];

function bandLabel(score) {
  if (score >= 8.5) return 'Expert';
  if (score >= 7.5) return 'Very Good';
  if (score >= 6.5) return 'Competent';
  if (score >= 5.5) return 'Modest';
  return 'Limited';
}

function ScoreRing({ score, color, size = 76 }) {
  const r    = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 9) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={10} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

export default function MyDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      setError('Không thể tải thông tin người dùng');
      console.error('Load user error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Đang tải thông tin người dùng..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorMessage message={error} onRetry={loadUserData} />
      </DashboardLayout>
    );
  }

  const displayName = user?.fullName || user?.username || 'Học viên';
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A';

  return (
    <DashboardLayout>
      {/* Welcome banner */}
      <div className="db-welcome">
        <div className="db-welcome-left">
          <p className="db-welcome-greeting">Chào mừng trở lại,</p>
          <h1 className="db-welcome-name">{displayName} 👋</h1>
          <p className="db-welcome-sub">
            <Calendar size={14} /> Thành viên từ {joinDate} · Hãy tiếp tục luyện tập để đạt mục tiêu!
          </p>
        </div>
        <Link to="/exam-library" className="db-welcome-cta">
          <PlayCircle size={18} /> Bắt đầu thi ngay
        </Link>
      </div>

      {/* Stat cards */}
      <div className="db-stats-grid">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div className="db-stat-card" key={label}>
            <div className="db-stat-icon" style={{ background: bg, color }}><Icon size={22} /></div>
            <div className="db-stat-body">
              <p className="db-stat-value">{value}</p>
              <p className="db-stat-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Skill scores + recent history */}
      <div className="db-mid-row">
        <section className="db-skills-section">
          <h2 className="db-section-title"><BarChart2 size={18} /> Điểm theo kỹ năng</h2>
          <div className="db-skills-grid">
            {SKILLS.map(({ key, label, icon: Icon, score, tests, color, bg, path }) => (
              <div className="db-skill-card" key={key}>
                <div className="db-skill-header">
                  <div className="db-skill-icon" style={{ background: bg, color }}><Icon size={18} /></div>
                  <div>
                    <p className="db-skill-name">{label}</p>
                    <p className="db-skill-tests">{tests} bài đã làm</p>
                  </div>
                </div>
                <div className="db-skill-ring-wrap">
                  <ScoreRing score={score} color={color} />
                  <div className="db-skill-ring-center">
                    <span className="db-skill-score" style={{ color }}>{score}</span>
                    <span className="db-skill-score-label">{bandLabel(score)}</span>
                  </div>
                </div>
                <div className="db-skill-progress-bar">
                  <div className="db-skill-progress-fill" style={{ width: `${(score/9)*100}%`, background: color }} />
                </div>
                <Link to={path} className="db-skill-practice-link" style={{ color }}>
                  Luyện tập <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="db-history-section">
          <div className="db-section-head">
            <h2 className="db-section-title"><Clock size={18} /> Lịch sử gần đây</h2>
            <Link to="/my-dashboard/history" className="db-see-all-btn">
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>
          <div className="db-history-list">
            {HISTORY.slice(0, 5).map((item) => (
              <div className="db-history-item" key={item.id}>
                <div className="db-history-status">
                  {item.status === 'completed'
                    ? <CheckCircle2 size={18} color="#16a34a" />
                    : <XCircle size={18} color="#dc2626" />}
                </div>
                <div className="db-history-body">
                  <p className="db-history-title">{item.title}</p>
                  <div className="db-history-meta">
                    <span className="db-history-badge"
                      style={{ background: SKILL_META[item.skill].bg, color: SKILL_META[item.skill].text }}>
                      {item.skill}
                    </span>
                    <span className="db-history-date">{item.date}</span>
                    <span className="db-history-dur"><Clock size={12} /> {item.duration}</span>
                  </div>
                </div>
                <div className="db-history-score">
                  <span className="db-history-band">{item.score}</span>
                  <span className="db-history-band-label">Band</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recommended tests */}
      <section className="db-recommended">
        <div className="db-section-head">
          <h2 className="db-section-title"><Target size={18} /> Đề thi gợi ý</h2>
          <Link to="/exam-library" className="db-see-all-btn">Xem thêm <ChevronRight size={14} /></Link>
        </div>
        <div className="db-rec-grid">
          {RECOMMENDED.map((item) => (
            <div className="db-rec-card" key={item.id}>
              <div className="db-rec-top">
                <span className="db-rec-badge"
                  style={{ background: SKILL_META[item.skill].bg, color: SKILL_META[item.skill].text }}>
                  {item.skill}
                </span>
                <span className={`db-rec-diff diff-${item.difficulty === 'Dễ' ? 'easy' : item.difficulty === 'Khó' ? 'hard' : 'medium'}`}>
                  {item.difficulty}
                </span>
              </div>
              <p className="db-rec-title">{item.title}</p>
              <div className="db-rec-meta">
                <span className="db-rec-rating"><Star size={13} fill="#f59e0b" color="#f59e0b" /> {item.rating}</span>
                <span className="db-rec-users">{item.users} người đã làm</span>
              </div>
              <Link to="/exam-library" className="db-rec-start-btn"
                style={{ borderColor: SKILL_META[item.skill].text, color: SKILL_META[item.skill].text }}>
                Làm bài <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
