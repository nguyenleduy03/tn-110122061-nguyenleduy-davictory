import { NavLink } from 'react-router-dom';
import {
  Home, LayoutDashboard, Pencil, Mic, Settings, Terminal, BarChart3,
  Database, Languages, BookOpen, CreditCard, Sparkles,
} from 'lucide-react';

const sections = [
  {
    title: 'Overview',
    links: [
      { to: '/', icon: Home, label: 'Home' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'Features',
    links: [
      { to: '/writing', icon: Pencil, label: 'Writing AI' },
      { to: '/speaking', icon: Mic, label: 'Speaking AI' },
      { to: '/grammar', icon: Languages, label: 'Grammar Checker' },
      { to: '/tests', icon: BookOpen, label: 'Test Library' },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/admin', icon: Settings, label: 'Admin Panel' },
      { to: '/console', icon: Terminal, label: 'API Console' },
      { to: '/evaluation', icon: BarChart3, label: 'Evaluation' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Sparkles size={20} />
        </div>
        <div className="sidebar-logo-text">
          DAVictory
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: '24px' }}>
            <div className="sidebar-section">{section.title}</div>
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <link.icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '20px', borderTop: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div>DAVictory v3.0</div>
        <div style={{ marginTop: '4px' }}>AI Test Center</div>
      </div>
    </aside>
  );
}
