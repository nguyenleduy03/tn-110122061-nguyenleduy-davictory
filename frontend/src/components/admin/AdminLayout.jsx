import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Award,
  BarChart3,
  Database,
  FolderOpen,
  Settings,
  LogOut,
  Bell,
  Search,
  GraduationCap,
  ChevronDown
} from 'lucide-react';
import { authApi } from '../../services/authApi';
import '../../styles/adminDashboard.css';

const NAV_ITEMS = [
  { label: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
  { label: 'Quản lý đề thi', path: '/admin/tests', icon: FileText },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Báo cáo & Thống kê', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Quản lý lớp học', path: '/admin/teacher-class', icon: FolderOpen },
  { label: 'Cài đặt hệ thống', path: '/admin/settings', icon: Settings },
  { label: 'Hệ thống', path: '/admin/system', icon: Database },
];

export default function AdminLayout({ title, subtitle, children }) {
  const location = useLocation();
  const user = authApi.getStoredUser();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const adminName = user?.fullName || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const hasAvatar = !!user?.avatar;

  return (
    <div className="admin-layout-root">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand-icon-wrap">
              <GraduationCap size={24} className="admin-brand-cap-icon" />
            </div>
            <div className="admin-brand-title">
              IELTS Manager
            </div>
          </div>

          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const path = location.pathname;
              const active =
                path === item.path ||
                (item.path === '/admin' &&
                  path.startsWith('/admin') &&
                  !path.startsWith('/admin/users') &&
                  !path.startsWith('/admin/tests') &&
                  !path.startsWith('/admin/teacher-class') &&
                  !path.startsWith('/admin/analytics') &&
                  !path.startsWith('/admin/test-approval') &&
                  !path.startsWith('/admin/settings') &&
                  !path.startsWith('/admin/agents')) ||
                path.startsWith(item.path + '/');

              return (
                <Link key={item.label} to={item.path} className={`admin-nav-item${active ? ' active' : ''}`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-profile-card">
              {hasAvatar ? (
                <img src={user.avatar} alt="Admin Avatar" className="admin-sidebar-avatar" />
              ) : (
                <div className="admin-sidebar-avatar admin-avatar-placeholder">{adminInitial}</div>
              )}
              <div className="admin-sidebar-profile-info">
                <div className="admin-sidebar-profile-name">{adminName}</div>
                <div className="admin-sidebar-profile-role">Quản trị viên</div>
              </div>
            </div>
            <button onClick={handleLogout} className="admin-sidebar-logout-btn">
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        <main className="admin-content">
          <header className="admin-topbar-new">
            <div className="admin-topbar-left">
              <h1 className="admin-page-title">{title}</h1>
              {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
            </div>

            <div className="admin-topbar-right">
              <div className="admin-search-new">
                <Search size={16} className="admin-search-icon" />
                <input placeholder="Tìm kiếm..." />
                <span className="admin-search-shortcut">⌘K</span>
              </div>

              <div className="admin-bell-wrap">
                <Bell size={20} className="admin-bell-icon" />
                <span className="admin-bell-badge">3</span>
              </div>

              <div className="admin-profile-dropdown-wrap">
                <div className="admin-profile-trigger" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  {hasAvatar ? (
                    <img src={user.avatar} alt="Admin Avatar" className="admin-profile-avatar" />
                  ) : (
                    <div className="admin-profile-avatar admin-avatar-placeholder" style={{ width: 32, height: 32, fontSize: 13 }}>{adminInitial}</div>
                  )}
                  <div className="admin-profile-meta">
                    <span className="admin-profile-name">{adminName}</span>
                    <span className="admin-profile-role">Quản trị viên</span>
                  </div>
                  <ChevronDown size={14} className="admin-profile-chevron" />
                </div>

                {showProfileMenu && (
                  <div className="admin-dropdown-menu">
                    <Link to="/profile" className="admin-dropdown-item">Hồ sơ cá nhân</Link>
                    <Link to="/admin/settings" className="admin-dropdown-item">Cài đặt</Link>
                    <hr className="admin-dropdown-divider" />
                    <button onClick={handleLogout} className="admin-dropdown-item logout">Đăng xuất</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="admin-page-body">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
