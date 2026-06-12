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
  const [showUser, setShowUser] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, activeTab, setActiveTab } = useHeader();

  const title = pageTitles[location.pathname] || 'DAVictory';
  const hasTabs = tabs && tabs.length > 0;

  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {hasTabs && (
          <nav style={{ display: 'flex', gap: '4px', marginRight: '16px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  tab.onClick?.();
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === tab.key ? 'var(--primary-light)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-outline" style={{ padding: '8px', borderRadius: '50%', border: 'none' }}>
            <Search size={18} />
          </button>
          <button className="btn-outline" style={{ padding: '8px', borderRadius: '50%', border: 'none' }}>
            <Bell size={18} />
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUser(!showUser)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}>A</div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showUser && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '200px',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '8px',
              zIndex: 100
            }}>
              <button onClick={() => navigate('/admin')} style={{ width: '100%', textAlign: 'left', padding: '8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>Admin Panel</button>
              <button style={{ width: '100%', textAlign: 'left', padding: '8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
