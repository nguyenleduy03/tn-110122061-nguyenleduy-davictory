import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, Pencil, Mic, Languages, BookOpen, Zap,
  FileText, Terminal, Wrench, Sparkles, ChevronDown
} from 'lucide-react';

const sections = [
  {
    title: 'TỔNG QUAN',
    links: [
      { to: '/', icon: Home, label: 'Trang chủ' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'AI FEATURES',
    links: [
      { to: '/writing', icon: Pencil, label: 'IELTS Writing AI' },
      { to: '/speaking', icon: Mic, label: 'IELTS Speaking AI' },
      { to: '/grammar', icon: Languages, label: 'Grammar Checker' },
      { to: '/tests', icon: BookOpen, label: 'Test Library' },
      { to: '/evaluation', icon: Zap, label: 'Instant Evaluation' },
    ],
  },
  {
    title: 'QUẢN LÝ',
    links: [
      { to: '/samples', icon: FileText, label: 'Đề thi của tôi' },
    ],
  },
  {
    title: 'HỆ THỐNG',
    links: [
      { to: '/console', icon: Terminal, label: 'API Console' },
      { to: '/admin#settings', icon: Wrench, label: 'Cài đặt' },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Brand Logo Header */}
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

      {/* Nav List Area */}
      <nav className="sidebar-nav" style={{ flex: 1, padding: '16px 12px 8px', overflowY: 'auto' }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: '18px' }}>
            <div className="sidebar-section" style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              margin: '8px 12px 6px'
            }}>{section.title}</div>
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                <link.icon size={16} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Sidebar Promo Box (Upgrade to Pro) */}
      <div style={{ padding: '0 14px', flexShrink: 0, marginBottom: '12px' }}>
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 14px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
        }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#eef2ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(79, 70, 229, 0.15)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>

      {/* Admin Profile bottom Capsule */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700
          }}>
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Admin</span>
            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 500 }}>admin@davictory.ai</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin')}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
        >
          <ChevronDown size={15} />
        </button>
      </div>
    </aside>
  );
}
