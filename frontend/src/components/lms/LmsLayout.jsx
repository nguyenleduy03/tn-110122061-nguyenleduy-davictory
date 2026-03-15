import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  ClipboardList,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import Navbar from '../layout/Navbar';
import '../../styles/lms.css';

const NAV_ITEMS = [
  { label: 'Tổng quan', path: '/lms/teacher', icon: LayoutDashboard },
  { label: 'Lớp học', path: '/lms/teacher/classes', icon: Users, badge: '6' },
  { label: 'Đề thi', path: '/lms/teacher/tests', icon: FolderOpen },
  { label: 'Bài tập', path: '/lms/teacher/assignments', icon: ClipboardList },
  { label: 'Bài nộp', path: '/lms/teacher/submissions', icon: FileText, badge: '12' },
  { label: 'Báo cáo', path: '/lms/teacher/analytics', icon: BarChart3 },
  { label: 'Cài đặt', path: '/lms/teacher/settings', icon: Settings },
];

export default function LmsLayout({ title, subtitle, children }) {
  const location = useLocation();

  return (
    <div className="lms-root">
      <Navbar />
      <div className="lms-shell">
        <aside className="lms-sidebar">
          <div className="lms-brand">
            <div className="lms-brand-mark">DA</div>
            <div className="lms-brand-title">
              DAVictory LMS
              <span className="lms-brand-sub">Không gian giảng viên</span>
            </div>
          </div>
          <nav className="lms-nav">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path} className={`lms-nav-item${active ? ' active' : ''}`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && <span className="lms-nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="lms-content">
          <div className="lms-topbar">
            <div>
              <h1 className="lms-title">{title}</h1>
              {subtitle && <p className="lms-subtitle">{subtitle}</p>}
            </div>
            <div className="lms-search">
              <span>🔍</span>
              <input placeholder="Tìm kiếm trong LMS" />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
