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
import '../../styles/lms.css';

const NAV_ITEMS = [
  { label: 'Tong quan', path: '/lms/teacher', icon: LayoutDashboard },
  { label: 'Lop hoc', path: '/lms/teacher/classes', icon: Users, badge: '6' },
  { label: 'De thi', path: '/lms/teacher/tests', icon: FolderOpen },
  { label: 'Bai tap', path: '/lms/teacher/assignments', icon: ClipboardList },
  { label: 'Bai nop', path: '/lms/teacher/submissions', icon: FileText, badge: '12' },
  { label: 'Bao cao', path: '/lms/teacher/analytics', icon: BarChart3 },
  { label: 'Cai dat', path: '/lms/teacher/settings', icon: Settings },
];

export default function LmsLayout({ title, subtitle, children }) {
  const location = useLocation();

  return (
    <div className="lms-root">
      <div className="lms-shell">
        <aside className="lms-sidebar">
          <div className="lms-brand">
            <div className="lms-brand-mark">VL</div>
            <div className="lms-brand-title">
              Victory LMS
              <span className="lms-brand-sub">Teacher workspace</span>
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
              <input placeholder="Search in LMS" />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
