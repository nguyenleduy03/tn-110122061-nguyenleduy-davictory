import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import { authApi } from '../../services/authApi';
import './AdminHeader.css';

const AdminHeader = () => {
  const navigate = useNavigate();
  const user = authApi.getStoredUser();

  const handleLogout = () => {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      authApi.logout();
      navigate('/login');
    }
  };

  const handleSwitchAccount = () => {
    if (confirm('Bạn có muốn đăng nhập tài khoản khác?')) {
      authApi.logout();
      navigate('/login');
    }
  };

  return (
    <div className="admin-header">
      <div className="admin-header-left">
        <h1>Quản trị hệ thống</h1>
      </div>
      
      <div className="admin-header-right">
        <div className="user-info">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-details">
            <div className="user-name">{user?.fullName || user?.username}</div>
            <div className="user-role">{user?.roles?.[0] || 'Admin'}</div>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="header-btn" onClick={handleSwitchAccount} title="Đổi tài khoản">
            <Settings size={18} />
          </button>
          <button className="header-btn logout-btn" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
