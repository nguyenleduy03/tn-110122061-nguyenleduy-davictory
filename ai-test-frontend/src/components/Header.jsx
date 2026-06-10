import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Sun, Moon, ChevronDown, User, LogOut, Settings,
} from 'lucide-react';
import { useHeader } from '../context/HeaderContext';

const pageTitles = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/writing': 'Writing AI',
  '/speaking': 'Speaking AI',
  '/grammar': 'Grammar Checker',
  '/tests': 'Test Library',
  '/pricing': 'Pricing',
  '/admin': 'Admin Panel',
  '/console': 'API Console',
  '/evaluation': 'Evaluation',
  '/samples': 'Sample Essays',
};

export default function Header() {
  const [dark, setDark] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, activeTab, setActiveTab } = useHeader();

  const title = pageTitles[location.pathname] || 'DAVictory';
  const hasTabs = tabs && tabs.length > 0;

  return (
    <>
      <header className={`top-header ${hasTabs ? 'top-header--tabs' : ''}`}>
        <div className="top-header-row top-header-row--main">
          <div className="top-header-left">
            <div className="top-header-breadcrumb">
              <span className="top-header-title">{title}</span>
            </div>
          </div>

          <div className="top-header-right">
            <button className="top-header-btn" onClick={() => setShowSearch(!showSearch)} aria-label="Search">
              <Search size={18} />
            </button>
            <button className="top-header-btn top-header-notif" aria-label="Notifications">
              <Bell size={18} />
              <span className="top-header-dot" />
            </button>
            <button className="top-header-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="top-header-divider" />
            <div className="top-header-user-wrap">
              <button
                className="top-header-user"
                onClick={() => setShowUser(!showUser)}
                onBlur={() => setTimeout(() => setShowUser(false), 150)}
              >
                <div className="top-header-avatar">A</div>
                <div className="top-header-user-info">
                  <div className="top-header-user-name">Admin</div>
                  <div className="top-header-user-role">Administrator</div>
                </div>
                <ChevronDown size={14} />
              </button>
              {showUser && (
                <div className="top-header-dropdown">
                  <button onClick={() => { navigate('/admin'); setShowUser(false); }}>
                    <Settings size={15} /> Admin Panel
                  </button>
                  <button onClick={() => setShowUser(false)}>
                    <User size={15} /> My Account
                  </button>
                  <hr />
                  <button style={{ color: '#EF4444' }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasTabs && (
          <div className="top-header-row top-header-row--tabs">
            <nav className="top-header-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`top-header-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    tab.onClick?.();
                  }}
                >
                  {tab.icon && <tab.icon size={14} />}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {showSearch && (
        <div className="top-header-search-overlay" onClick={() => setShowSearch(false)}>
          <div className="top-header-search-box" onClick={(e) => e.stopPropagation()}>
            <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              placeholder="Search pages, features, commands..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.target.value.toLowerCase();
                  const found = Object.entries(pageTitles).find(([, t]) =>
                    t.toLowerCase().includes(val)
                  );
                  if (found) { navigate(found[0]); setShowSearch(false); }
                  setShowSearch(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
