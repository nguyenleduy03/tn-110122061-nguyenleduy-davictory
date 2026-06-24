import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import AgentChat from './AgentChat';
import ContentManager from './ContentManager';
import AgentReports from './AgentReports';
import { 
  Bot, 
  FileText, 
  BarChart3, 
  LayoutDashboard, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Settings,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

const AgentWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/agent/posts')) setActiveTab('posts');
    else if (path.includes('/agent/reports')) setActiveTab('reports');
    else setActiveTab('chat');
  }, [location]);

  const menuItems = [
    { id: 'chat', label: 'Trợ lý AI', icon: <Bot size={20} />, path: '/agent/chat', desc: 'Chat với Multi-Agent' },
    { id: 'posts', label: 'Quản lý bài viết', icon: <FileText size={20} />, path: '/agent/posts', desc: 'Duyệt và đăng bài từ AI' },
    { id: 'reports', label: 'Báo cáo thông minh', icon: <BarChart3 size={20} />, path: '/agent/reports', desc: 'Phân tích dữ liệu học tập' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'posts': return <ContentManager isEmbedded={true} />;
      case 'reports': return <AgentReports isEmbedded={true} />;
      default: return <AgentChat isEmbedded={true} />;
    }
  };

  const sidebarWidth = collapsed ? 72 : 280;

  return (
    <div style={styles.container}>
      <Navbar />
      
      <div style={styles.workspace}>
        {/* Mobile overlay */}
        {mobileOpen && <div style={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />}

        {/* Sidebar */}
        <aside style={{
          ...styles.sidebar,
          width: sidebarWidth,
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}>
          <div style={styles.sidebarHeader}>
            {!collapsed ? (
              <>
                <div style={styles.brandBadge}><Sparkles size={16} color="#fff" /></div>
                <div style={{ flex: 1 }}>
                  <h2 style={styles.sidebarTitle}>AI Workspace</h2>
                  <p style={styles.sidebarSub}>Hệ thống Multi-Agent</p>
                </div>
              </>
            ) : (
              <div style={styles.brandBadgeSmall}><Sparkles size={16} color="#fff" /></div>
            )}
            <button onClick={() => setCollapsed(!collapsed)} style={styles.collapseBtn}
              title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav style={styles.nav}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                style={{
                  ...styles.navItem,
                  ...(activeTab === item.id ? styles.navItemActive : {}),
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                title={collapsed ? item.label : undefined}
              >
                <div style={{
                  ...styles.iconBox,
                  ...(activeTab === item.id ? styles.iconBoxActive : {}),
                }}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <div style={styles.navLabelBox}>
                    <span style={styles.navLabel}>{item.label}</span>
                    <span style={styles.navDesc}>{item.desc}</span>
                  </div>
                )}
                {!collapsed && activeTab === item.id && <ChevronRight size={16} style={styles.activeArrow} />}
              </button>
            ))}
          </nav>

          {!collapsed && (
            <div style={styles.sidebarFooter}>
              <div style={styles.footerInfo}>
                <ShieldCheck size={16} color="#64748b" />
                <span>Enterprise AI Active</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main style={styles.mainContent}>
          {/* Mobile toggle */}
          <div style={styles.mobileToggle}>
            <button onClick={() => setMobileOpen(true)} style={styles.mobileMenuBtn}>
              <Menu size={20} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>AI Workspace</span>
          </div>
          <div style={styles.contentWrapper}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: { 
    height: '100vh', 
    display: 'flex', 
    flexDirection: 'column',
    background: '#f8fafc',
    overflow: 'hidden'
  },
  workspace: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  mobileOverlay: {
    display: 'none',
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99,
  },
  sidebar: {
    background: '#fff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 12px',
    zIndex: 10,
    transition: 'width 0.3s ease',
    overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
    padding: '0 4px',
  },
  brandBadge: {
    width: 40, height: 40, borderRadius: 12,
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    flexShrink: 0,
  },
  brandBadgeSmall: {
    width: 40, height: 40, borderRadius: 12,
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  },
  collapseBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: 8,
    width: 28, height: 28, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#64748b', marginLeft: 'auto',
  },
  sidebarTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 },
  sidebarSub: { fontSize: 12, color: '#64748b', margin: '2px 0 0' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px', borderRadius: 12, border: 'none',
    background: 'transparent', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.2s ease',
    width: '100%', position: 'relative',
  },
  navItemActive: { background: '#eff6ff' },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#64748b', background: '#f8fafc',
    transition: 'all 0.2s ease', flexShrink: 0,
  },
  iconBoxActive: {
    color: '#2563eb', background: '#fff',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)',
  },
  navLabelBox: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  navLabel: { fontSize: 14, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' },
  navDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  activeArrow: { marginLeft: 'auto', color: '#2563eb', flexShrink: 0 },
  sidebarFooter: { paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  footerInfo: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', fontWeight: 500 },
  mainContent: { flex: 1, overflowY: 'auto', background: '#f8fafc', position: 'relative' },
  mobileToggle: { display: 'none', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' },
  mobileMenuBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 4 },
  contentWrapper: { height: '100%', display: 'flex', flexDirection: 'column' },
};

// Inject responsive CSS
const styleTag = document.createElement('style');
styleTag.textContent = `
  @media (max-width: 768px) {
    aside { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%); z-index: 100; }
    div[style*="mobileOverlay"] { display: block !important; }
    div[style*="mobileToggle"] { display: flex !important; }
  }
  @media (min-width: 769px) {
    div[style*="mobileOverlay"] { display: none !important; }
    div[style*="mobileToggle"] { display: none !important; }
  }
`;
document.head.appendChild(styleTag);

export default AgentWorkspace;
