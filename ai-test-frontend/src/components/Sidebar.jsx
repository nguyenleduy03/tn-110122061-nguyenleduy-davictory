import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Pencil, Mic, Settings, Terminal, BarChart3,
} from 'lucide-react';

const sections = [
  {
    title: 'Main',
    links: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'Services',
    links: [
      { to: '/writing', icon: Pencil, label: 'Writing AI' },
      { to: '/speaking', icon: Mic, label: 'Speaking AI' },
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
        <Terminal size={28} />
        <div>
          DAVictory<br /><span>AI Test Center</span>
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
        DAVictory v1.0
        <span>AI Test Dashboard</span>
      </div>
    </aside>
  );
}
