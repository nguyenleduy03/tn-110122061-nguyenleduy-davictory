import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Settings, FilePlus, Menu, X } from 'lucide-react';
import { authApi } from '../../services/authApi';
import logoImage from '../../../logo.png';

const NAV_ITEMS = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Thư viện đề thi', path: '/exam-library' },
  { label: 'IELTS Tips', path: '/tips' },
  { label: 'IELTS Prep', path: '/prep' },
  { label: 'Khóa học IELTS', path: '/courses' },
  { label: 'Học trực tiếp', path: '/live' },
];

const normalizeRoles = (roles) => {
  if (!roles) return [];
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return rolesArray.map((r) => (typeof r === 'string' ? r : (r?.name || r?.roleName || String(r))));
};

const isTeacherOrAbove = (roles) => {
  const rolesArray = normalizeRoles(roles);
  return ['ADMIN', 'MANAGER', 'TEACHER'].some((r) => rolesArray.includes(r));
};

const getWorkspaceLabel = (isAdmin, isManager) => {
  if (isAdmin) return 'Quản trị';
  if (isManager) return 'Bảng quản lý';
  return 'LMS giảng viên';
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRoles = normalizeRoles(user?.roles);
  const isAdmin = userRoles.includes('ADMIN');
  const isManager = userRoles.includes('MANAGER');

  useEffect(() => {
    // Lấy thông tin user từ localStorage
    const storedUser = authApi.getStoredUser();
    setUser(storedUser);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    }
  };

  const getRoleName = (roles) => {
    if (!roles || roles.length === 0) return 'Khách';

    const roleMap = {
      'ADMIN': 'Quản trị viên',
      'MANAGER': 'Quản lý',
      'TEACHER': 'Giáo viên',
      'STUDENT': 'Học viên',
      'GUEST': 'Khách',
    };

    // roles là Set<String> từ backend: ["ADMIN", "STUDENT", ...]
    // Ưu tiên theo thứ tự: ADMIN > MANAGER > TEACHER > STUDENT > GUEST
    const priority = ['ADMIN', 'MANAGER', 'TEACHER', 'STUDENT', 'GUEST'];
    const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
    for (const p of priority) {
      if (rolesArray.includes(p)) return roleMap[p];
    }
    return roleMap[rolesArray[0]] || 'Học viên';
  };

  const getUserInitial = (fullName) => {
    if (!fullName) return 'U';
    return fullName.charAt(0).toUpperCase();
  };

  return (
    <nav className="site-navbar">
      <div className="site-navbar-inner">
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/" className="site-logo">
          <img src={logoImage} alt="DAVictory" className="site-logo-image" />
        </Link>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay">
            <div className="mobile-nav-links">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-link${location.pathname === item.path ? ' active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {user && isTeacherOrAbove(user.roles) && (
                <Link
                  to={isAdmin ? '/admin' : (isManager ? '/manager' : '/lms/teacher')}
                  className={`mobile-nav-link${(isAdmin && location.pathname.startsWith('/admin')) ||
                      (isManager && location.pathname.startsWith('/manager')) ||
                      (!isAdmin && !isManager && location.pathname.startsWith('/lms/teacher'))
                      ? ' active'
                      : ''
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {getWorkspaceLabel(isAdmin, isManager)}
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link${location.pathname === item.path ? ' nav-link-active' : ''}`}
            >
              {item.label}
              <ChevronDown size={13} />
            </Link>
          ))}
          {user && isTeacherOrAbove(user.roles) && (
            <Link
              to={isAdmin ? '/admin' : (isManager ? '/manager' : '/lms/teacher')}
              className={`nav-link${(isAdmin && location.pathname.startsWith('/admin')) ||
                  (isManager && location.pathname.startsWith('/manager')) ||
                  (!isAdmin && location.pathname.startsWith('/lms/teacher'))
                  ? ' nav-link-active' : ''
                }`}
            >
              {getWorkspaceLabel(isAdmin, isManager)}
              <ChevronDown size={13} />
            </Link>
          )}
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <button className="nav-icon-btn" aria-label="Thông báo">
                <Bell size={20} />
              </button>

              <div className="nav-user-dropdown">
                <button
                  className="nav-user-btn"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <div className="user-avatar">{getUserInitial(user.fullName)}</div>
                  <span>{user.fullName || user.username}</span>
                  <ChevronDown size={13} />
                </button>

                {showDropdown && (
                  <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                      <div className="user-avatar-large">{getUserInitial(user.fullName)}</div>
                      <div>
                        <div className="user-dropdown-name">{user.fullName || user.username}</div>
                        <div className="user-dropdown-role">{getRoleName(user.roles)}</div>
                      </div>
                    </div>
                    <div className="user-dropdown-divider"></div>
                    <Link to="/profile" className="user-dropdown-item">
                      <User size={16} />
                      <span>Thông tin cá nhân</span>
                    </Link>

                    {isTeacherOrAbove(user.roles) && (
                      <Link to={isAdmin ? '/admin' : (isManager ? '/manager' : '/lms/teacher')} className="user-dropdown-item">
                        <FilePlus size={16} />
                        <span>{isAdmin ? 'Quản trị hệ thống' : getWorkspaceLabel(isAdmin, isManager)}</span>
                      </Link>
                    )}

                    <Link to="/settings" className="user-dropdown-item">
                      <Settings size={16} />
                      <span>Cài đặt</span>
                    </Link>
                    <div className="user-dropdown-divider"></div>
                    <button className="user-dropdown-item" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="nav-auth-buttons">
              <Link to="/login" className="btn-login">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn-register">
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
