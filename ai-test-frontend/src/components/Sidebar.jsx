import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, Pencil, Mic, Languages, BookOpen, Zap,
  FileText, Terminal, Wrench, Sparkles, ChevronDown, LogIn, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_RANK } from '../api/authApi';

const LINKS = [
  {
    title: 'TỔNG QUAN',
    minRank: 0,
    links: [
      { to: '/', icon: Home, label: 'Trang chủ', minRank: 0 },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', minRank: ROLE_RANK.MANAGER },
    ],
  },
  {
    title: 'AI FEATURES',
    minRank: ROLE_RANK.STUDENT,
    links: [
      { to: '/writing', icon: Pencil, label: 'IELTS Writing AI', minRank: ROLE_RANK.STUDENT },
      { to: '/speaking', icon: Mic, label: 'IELTS Speaking AI', minRank: ROLE_RANK.STUDENT },
      { to: '/grammar', icon: Languages, label: 'Grammar Checker', minRank: ROLE_RANK.STUDENT },
      { to: '/tests', icon: BookOpen, label: 'Test Library', minRank: ROLE_RANK.STUDENT },
      { to: '/evaluation', icon: Zap, label: 'Instant Evaluation', minRank: ROLE_RANK.MANAGER },
    ],
  },
  {
    title: 'QUẢN LÝ',
    minRank: ROLE_RANK.TEACHER,
    links: [
      { to: '/samples', icon: FileText, label: 'Đề thi của tôi', minRank: ROLE_RANK.TEACHER },
    ],
  },
  {
    title: 'HỆ THỐNG',
    minRank: ROLE_RANK.MANAGER,
    links: [
      { to: '/console', icon: Terminal, label: 'API Console', minRank: ROLE_RANK.MANAGER },
      { to: '/admin', icon: Wrench, label: 'Cài đặt', minRank: ROLE_RANK.ADMIN },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const userRank = (() => {
    if (!isAuthenticated() || !user?.roles) return 0;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return Math.max(...roles.map(r => {
      const name = typeof r === 'string' ? r : (r?.name || r?.roleName || '');
      return ROLE_RANK[name] ?? -1;
    }), 0);
  })();

  const avatarLetter = user?.fullName?.charAt(0)?.toUpperCase()
    || user?.username?.charAt(0)?.toUpperCase()
    || '?';

  const displayName = user?.fullName || user?.username || 'Khách';
  const displayEmail = user?.email || '';

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-logo" style={{ flexShrink: 0 }}>
        <div className="sidebar-logo-icon" style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
        }}>
          <Sparkles size={18} />
        </div>
        <div className="sidebar-logo-text" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
          DAVictory
        </div>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, padding: '16px 12px 8px', overflowY: 'auto' }}>
        {LINKS.map((section) => {
          const visibleLinks = section.links.filter(l => userRank >= l.minRank);
          if (visibleLinks.length === 0) return null;
          return (
            <div key={section.title} style={{ marginBottom: '18px' }}>
              <div className="sidebar-section" style={{
                fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                letterSpacing: '0.06em', margin: '8px 12px 6px'
              }}>
                {section.title}
              </div>
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '9px 12px', fontSize: '13.5px', borderRadius: '10px',
                    fontWeight: 600, transition: 'all 0.2s'
                  }}
                >
                  <link.icon size={16} />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}

        {!isAuthenticated() && (
          <div style={{ marginBottom: '18px' }}>
            <div className="sidebar-section" style={{
              fontSize: '11px', fontWeight: 700, color: '#94a3b8',
              letterSpacing: '0.06em', margin: '8px 12px 6px'
            }}>
              TÀI KHOẢN
            </div>
            <a
              href="/login?redirect=/ai-test/"
              className="sidebar-link"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '9px 12px', fontSize: '13.5px', borderRadius: '10px',
                fontWeight: 600, transition: 'all 0.2s', textDecoration: 'none',
                color: 'inherit', cursor: 'pointer'
              }}
            >
              <LogIn size={16} />
              <span>Đăng nhập</span>
            </a>
          </div>
        )}
      </nav>

      <div style={{ padding: '0 14px', flexShrink: 0, marginBottom: '12px' }}>
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
          padding: '16px 14px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
        }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%', background: '#eef2ff',
            color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <Sparkles size={13} style={{ fill: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
            Nâng cấp gói Pro
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, marginBottom: 12 }}>
            Mở khóa toàn bộ tính năng và trải nghiệm không giới hạn.
          </div>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff', border: 'none', fontSize: '11.5px', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 8px rgba(79, 70, 229, 0.15)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>

      <div style={{
        padding: '14px 16px', borderTop: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: isAuthenticated()
              ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
            color: '#ffffff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '13px', fontWeight: 700
          }}>
            {isAuthenticated() ? avatarLetter : '?'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {displayName}
            </span>
            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 500 }}>
              {isAuthenticated() ? displayEmail : 'Chưa đăng nhập'}
            </span>
          </div>
        </div>
        {isAuthenticated() ? (
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
            title="Đăng xuất"
          >
            <LogOut size={15} />
          </button>
        ) : (
          <a
            href="/login?redirect=/ai-test/"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, textDecoration: 'none', display: 'inline-flex' }}
            title="Đăng nhập"
          >
            <LogIn size={15} />
          </a>
        )}
      </div>
    </aside>
  );
}
