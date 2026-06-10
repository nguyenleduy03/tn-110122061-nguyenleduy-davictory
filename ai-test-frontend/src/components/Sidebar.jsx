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
    title: 'Plans',
    links: [
      { to: '/pricing', icon: CreditCard, label: 'Pricing' },
    ],
  },
  {
    title: 'Data',
    links: [
      { to: '/samples', icon: Database, label: 'Sample Essays' },
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
      <div className="sidebar-inner">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Sparkles size={22} />
          </div>
          <div className="sidebar-logo-text">
            DAVictory
            <span>AI Test Center</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title}>
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
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          DAVictory v2.0
          <span>AI-Powered Language Learning</span>
        </div>
      </div>
    </aside>
  );
}
