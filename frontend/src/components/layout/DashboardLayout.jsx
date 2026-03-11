import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  User,
  Settings,
  LogOut,
  Award,
  Clock,
  Target,
  FilePlus,
  FolderOpen,
} from 'lucide-react';
import Navbar from './Navbar';
import { authApi } from '../../services/authApi';
import '../../styles/dashboard.css';

const SIDEBAR_ITEMS = [
  { label: 'Tổng quan', icon: LayoutDashboard, path: '/my-dashboard' },
  { label: 'Lịch sử thi', icon: Clock, path: '/my-dashboard/history' },
  { label: 'Lộ trình học', icon: Target, path: '/my-dashboard/roadmap' },
  { label: 'Hồ sơ cá nhân', icon: User, path: '/profile' },
  { label: 'Cài đặt', icon: Settings, path: '/my-dashboard/settings' },
];

const TEACHER_SIDEBAR_ITEMS = [
  { label: 'Tạo đề thi', icon: FilePlus, path: '/teacher/tests/new' },
  { label: 'Quản lý đề thi', icon: FolderOpen, path: '/teacher/tests' },
];

const isTeacherOrAbove = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return ['ADMIN', 'MANAGER', 'TEACHER'].some(r => rolesArray.includes(r));
};

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    avatar: 'VH',
    memberType: 'Thành viên',
    roles: [],
  });

  const loadUser = async () => {
    try {
      const data = await authApi.getCurrentUser();
      const roles = data.roles || [];
      const memberType = roles.includes('ADMIN') ? 'Quản trị viên'
        : roles.includes('MANAGER') ? 'Quản lý'
          : roles.includes('TEACHER') ? 'Giảng viên'
            : 'Thành viên';

      const name = data.fullName || data.username || 'Khách';
      const avatar = name.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase() || '?';

      setUserInfo({
        name,
        email: data.email || '',
        avatar,
        memberType,
        roles: Array.isArray(roles) ? roles : Array.from(roles),
      });
    } catch (err) {
      console.error('Lỗi khi load sidebar user:', err);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('profileUpdated', loadUser);
    return () => window.removeEventListener('profileUpdated', loadUser);
  }, []);

  return (
    <div className="db-root">
      <Navbar />
      <div className="db-layout">

        {/* ── Sidebar ── */}
        <aside className="db-sidebar">
          <div className="db-user-card">
            <div className="db-avatar">{userInfo.avatar}</div>
            <div className="db-user-info">
              <p className="db-user-name">{userInfo.name}</p>
              <p className="db-user-email">{userInfo.email}</p>
              <span className="db-user-badge">{userInfo.memberType}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="db-nav">
            {SIDEBAR_ITEMS.map(({ label, icon: Icon, path }) => (
              <Link
                key={path}
                to={path}
                className={`db-nav-item${location.pathname === path ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            {isTeacherOrAbove(userInfo.roles) && (
              <>
                <div className="db-sidebar-divider" style={{ margin: '8px 0' }} />
                <p className="db-nav-section-label" style={{ fontSize: 11, color: '#9ca3af', padding: '0 12px', marginBottom: 4 }}>Giảng viên</p>
                {TEACHER_SIDEBAR_ITEMS.map(({ label, icon: Icon, path }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`db-nav-item${location.pathname === path ? ' active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="db-sidebar-divider" />

          {/* Upgrade banner */}
          <div className="db-upgrade-banner">
            <Award size={28} className="db-upgrade-icon" />
            <p className="db-upgrade-title">Nâng cấp Premium</p>
            <p className="db-upgrade-desc">
              Mở khoá toàn bộ đề thi và giải thích chi tiết không giới hạn.
            </p>
            <button className="db-upgrade-btn">Nâng cấp ngay</button>
          </div>

          {/* Logout */}
          <Link to="/login" className="db-logout-btn">
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </Link>
        </aside>

        {/* ── Page content ── */}
        <main className="db-main">
          {children}
        </main>

      </div>
    </div>
  );
}
