import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, User, Settings, LogOut, Award } from 'lucide-react';
import Navbar from '../layout/Navbar';

// ── Shared constants exported for use in sub-pages ────────────────────────────
export const USER = {
  name: 'Nguyễn Văn An',
  email: 'nguyenvanan@email.com',
  avatar: 'NVA',
  joinDate: 'Tháng 1, 2024',
  memberType: 'Thành viên Miễn phí',
};

export const BADGE = {
  LISTENING: { bg: '#dbeafe', text: '#1d4ed8' },
  READING:   { bg: '#dcfce7', text: '#15803d' },
  WRITING:   { bg: '#fef9c3', text: '#a16207' },
  SPEAKING:  { bg: '#fce7f3', text: '#be185d' },
};

const SIDEBAR_ITEMS = [
  { label: 'Tổng quan',      icon: LayoutDashboard, path: '/my-dashboard' },
  { label: 'Lịch sử thi',   icon: ClipboardList,   path: '/my-dashboard/history' },
  { label: 'Hồ sơ cá nhân', icon: User,            path: '/my-dashboard/profile' },
  { label: 'Cài đặt',       icon: Settings,        path: '/my-dashboard/settings' },
];

export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="db-root">
      <Navbar />
      <div className="db-layout">
        {/* ── Sidebar ── */}
        <aside className="db-sidebar">
          {/* User card */}
          <div className="db-user-card">
            <div className="db-avatar">{USER.avatar}</div>
            <div className="db-user-info">
              <p className="db-user-name">{USER.name}</p>
              <p className="db-user-email">{USER.email}</p>
              <span className="db-user-badge">{USER.memberType}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="db-nav">
            {SIDEBAR_ITEMS.map(({ label, icon: Icon, path }) => (
              <Link
                key={path}
                to={path}
                className={`db-nav-item${pathname === path ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="db-sidebar-divider" />

          {/* Upgrade banner */}
          <div className="db-upgrade-banner">
            <Award size={28} className="db-upgrade-icon" />
            <p className="db-upgrade-title">Nâng cấp Premium</p>
            <p className="db-upgrade-desc">Mở khoá toàn bộ đề thi và giải thích chi tiết không giới hạn.</p>
            <button className="db-upgrade-btn">Nâng cấp ngay</button>
          </div>

          {/* Logout */}
          <button className="db-logout-btn" onClick={() => navigate('/login')}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </aside>

        {/* ── Page content ── */}
        <main className="db-main">
          {children}
        </main>
      </div>
    </div>
  );
}
