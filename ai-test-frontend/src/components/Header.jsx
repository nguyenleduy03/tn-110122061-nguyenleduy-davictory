import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Bell, ChevronDown, Settings, Wrench, LogOut, User, LayoutDashboard, Shield
} from 'lucide-react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { ROLE_RANK } from '../api/authApi';

const pageTitles = {
  '/': '',
  '/login': 'Đăng nhập',
  '/dashboard': 'Dashboard',
  '/writing': 'IELTS Writing AI',
  '/speaking': 'IELTS Speaking AI',
  '/grammar': 'Grammar Checker',
  '/tests': 'Test Library',
  '/pricing': 'Pricing',
  '/admin': 'Admin Panel',
  '/console': 'API Console',
  '/evaluation': 'Evaluation',
  '/samples': 'Sample Essays',
};

export default function Header() {
  const [showUser, setShowUser] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, activeTab, setActiveTab } = useHeader();
  const { isAuthenticated, user } = useAuth();

  const title = pageTitles[location.pathname] || '';
  const hasTabs = tabs && tabs.length > 0;

  const userRank = (() => {
    if (!isAuthenticated() || !user?.roles) return 0;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return Math.max(...roles.map(r => {
      const name = typeof r === 'string' ? r : (r?.name || r?.roleName || '');
      return ROLE_RANK[name] ?? -1;
    }), 0);
  })();

  const displayName = user?.fullName || user?.username || 'Khách';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header className="top-header" style={{
      background: '#ffffff', borderBottom: '1px solid #e2e8f0',
      padding: '0 32px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', height: '64px',
      position: 'sticky', top: 0, zIndex: 90
    }}>
      <div className="header-left">
        {title ? (
          <h1 className="header-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            {title}
          </h1>
        ) : (
          <div style={{ width: 1 }} />
        )}
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {hasTabs && (
          <nav style={{ display: 'flex', gap: '4px', marginRight: '16px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); tab.onClick?.(); }}
                style={{
                  padding: '6px 14px', fontSize: '0.825rem', fontWeight: 700,
                  borderRadius: '8px', border: 'none',
                  background: activeTab === tab.key ? '#f5f3ff' : 'transparent',
                  color: activeTab === tab.key ? '#4f46e5' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={{
            padding: '8px', borderRadius: '50%', border: 'none', background: 'none',
            color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Search size={18} />
          </button>

          <button style={{
            padding: '8px', borderRadius: '50%', border: 'none', background: 'none',
            color: '#64748b', cursor: 'pointer', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: '4px', right: '4px', background: '#ef4444',
              color: '#ffffff', fontSize: '9px', fontWeight: 800, width: '13px',
              height: '13px', borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 0 0 2px #ffffff'
            }}>
              2
            </span>
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUser(!showUser)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', border: 'none',
              background: 'none', cursor: 'pointer', padding: '4px',
              borderRadius: '8px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: '12px'
            }}>
              {avatarLetter}
            </div>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              {displayName}
            </span>
            <ChevronDown size={14} color="#64748b" style={{
              transform: showUser ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} />
          </button>

          {showUser && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              width: '200px', background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
              padding: '6px', zIndex: 100
            }}>
              {!isAuthenticated() && (
                <a
                  href="/login?redirect=/ai-test/"
                  style={{
                    display: 'flex', width: '100%', textAlign: 'left', padding: '8px 12px',
                    border: 'none', background: 'none', cursor: 'pointer', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 600, color: '#475569',
                    textDecoration: 'none', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <User size={14} />
                  Đăng nhập
                </a>
              )}

              {isAuthenticated() && (
                <>
                  <div style={{
                    padding: '8px 12px', borderBottom: '1px solid #e2e8f0', marginBottom: 4
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                      {user?.email || ''}
                    </div>
                  </div>

                  {userRank >= ROLE_RANK.MANAGER && (
                    <button
                      onClick={() => { setShowUser(false); navigate('/dashboard'); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                        background: 'none', cursor: 'pointer', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, color: '#475569',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LayoutDashboard size={14} />
                      Dashboard
                    </button>
                  )}

                  {userRank >= ROLE_RANK.ADMIN && (
                    <button
                      onClick={() => { setShowUser(false); navigate('/admin'); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                        background: 'none', cursor: 'pointer', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, color: '#475569',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Shield size={14} />
                      Quản trị
                    </button>
                  )}

                  <button
                    onClick={() => { setShowUser(false); navigate('/pricing'); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                      background: 'none', cursor: 'pointer', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 600, color: '#475569',
                      display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Wrench size={14} />
                    Nâng cấp
                  </button>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 6px' }} />

                  <button
                    onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                      background: 'none', cursor: 'pointer', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 600, color: '#ef4444',
                      display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
