import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Database,
} from 'lucide-react';
import Navbar from '../layout/Navbar';
import '../../styles/adminDashboard.css';

const NAV_ITEMS = [
  { label: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
  { label: 'Người dùng & lớp', path: '/admin/users', icon: Users },
  { label: 'Hệ thống', path: '/debug', icon: Database },
  { label: 'Cài đặt', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ title, subtitle, children }) {
  const location = useLocation();

  return (
    <div className="admin-layout-root">
      <Navbar />
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand-mark">DA</div>
            <div className="admin-brand-title">
              DAVictory Admin
              <span className="admin-brand-sub">Không gian quản trị</span>
            </div>
          </div>

          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path || (item.path === '/admin' && location.pathname.startsWith('/admin') && location.pathname !== '/admin/users');
              return (
                <Link key={item.path} to={item.path} className={`admin-nav-item${active ? ' active' : ''}`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="admin-content">
          <div className="admin-topbar">
            <div>
              <h1 className="admin-title">{title}</h1>
              {subtitle && <p className="admin-subtitle">{subtitle}</p>}
            </div>
            <div className="admin-search">
              <span>🔎</span>
              <input placeholder="Tìm kiếm trong quản trị" />
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
