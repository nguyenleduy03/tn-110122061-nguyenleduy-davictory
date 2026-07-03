import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Key,
  UserCheck,
  UserX,
  Filter,
  MoreVertical,
  Shield,
  Target,
  GraduationCap,
  BookOpen,
  Clock,
  BarChart3,
  CheckCircle,
  XCircle,
  Mail,
  School,
  UserPlus,
  X,
  Loader2
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { authApi } from '../services/authApi';
import { API_CONFIG } from '../config/api';

const ROLES = {
  ADMIN: { label: 'Quản trị viên', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', icon: Shield },
  MANAGER: { label: 'Quản lý', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', icon: Target },
  TEACHER: { label: 'Giáo viên', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', icon: GraduationCap },
  STUDENT: { label: 'Học viên', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', icon: BookOpen }
};

const TABS = [
  { key: 'ALL', label: 'Tất cả', icon: Users },
  { key: 'ADMIN', label: 'Quản trị viên', icon: Shield },
  { key: 'MANAGER', label: 'Quản lý', icon: Target },
  { key: 'TEACHER', label: 'Giáo viên', icon: GraduationCap },
  { key: 'STUDENT', label: 'Học viên', icon: BookOpen },
  { key: 'DELETED', label: 'Đã xóa', icon: XCircle }
];

const hasAdminRole = (roles) => {
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => (typeof r === 'string' ? r === 'ADMIN' : (r?.name === 'ADMIN' || r?.roleName === 'ADMIN')));
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [showModal, setShowModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    roles: []
  });
  const [notification, setNotification] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [handoverWarning, setHandoverWarning] = useState(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState(null);
  const [deleteClassPassword, setDeleteClassPassword] = useState('');
  const [deletingClass, setDeletingClass] = useState(false);
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementError, setManagementError] = useState('');
  const [managementData, setManagementData] = useState({ classes: [], teachers: [] });
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  const [summaryCounts, setSummaryCounts] = useState({
    totalUsers: 0,
    activeUsers: 0,
    deletedUsers: 0,
    adminCount: 0,
    managerCount: 0,
    teacherCount: 0,
    studentCount: 0,
  });
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  // Current logged in user info
  const currentUser = authApi.getStoredUser();
  const isCurrentUserAdmin = hasAdminRole(currentUser?.roles);

  const notify = useCallback((type, title, message) => {
    setNotification({
      id: Date.now(),
      type,
      title,
      message,
    });
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setNotification(null), 4200);
    return () => clearTimeout(timer);
  }, [notification]);

  // Check access permissions
  useEffect(() => {
    if (!isCurrentUserAdmin) {
      notify('error', 'Không có quyền truy cập', 'Bạn không có quyền truy cập trang này.');
      window.location.href = '/';
      return;
    }
  }, [isCurrentUserAdmin]);

  useEffect(() => {
    fetchManagementData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.size, searchTerm, activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
      }
      
      const data = await authApi.getPaginatedUsers({
        includeDeleted: activeTab === 'DELETED',
        tab: activeTab,
        search: searchTerm,
        page: pagination.page,
        size: pagination.size,
      });

      setUsers(Array.isArray(data?.content) ? data.content : []);
      setSummaryCounts((prev) => ({ ...prev, ...(data?.summary || {}) }));
      setPagination((prev) => ({
        ...prev,
        page: Number.isFinite(Number(data?.page)) ? Number(data.page) : prev.page,
        size: Number.isFinite(Number(data?.size)) ? Number(data.size) : prev.size,
        totalElements: Number.isFinite(Number(data?.totalElements)) ? Number(data.totalElements) : prev.totalElements,
        totalPages: Number.isFinite(Number(data?.totalPages)) ? Number(data.totalPages) : prev.totalPages,
      }));
    } catch (error) {
      console.error('[AdminUsers] Error fetching users:', error);
      let errorMsg = 'Không thể tải danh sách người dùng.';
      if (error.response?.status === 401) {
        errorMsg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMsg = 'Bạn không có quyền ADMIN để truy cập trang này.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      setLoadError(errorMsg);
      setUsers([]);
      setSummaryCounts((prev) => ({ ...prev, totalUsers: 0, activeUsers: 0, deletedUsers: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const fetchManagementData = async () => {
    try {
      setManagementLoading(true);
      setManagementError('');
      const data = await authApi.getTeacherClassManagement();
      setManagementData({
        teachers: Array.isArray(data?.teachers) ? data.teachers : [],
        classes: Array.isArray(data?.classes) ? data.classes : [],
      });
    } catch (error) {
      setManagementError(error?.response?.data?.message || 'Không thể tải dữ liệu quản lý giảng viên/lớp.');
      setManagementData({ teachers: [], classes: [] });
    } finally {
      setManagementLoading(false);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await authApi.toggleUserActive(userId);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !user.isActive } : user
      ));
      fetchUsers();
    } catch (error) {
      notify('error', 'Đổi trạng thái thất bại', error?.message || 'Không thể thay đổi trạng thái.');
    }
  };

  const getActiveTeacherAssignments = (userId) => {
    const fromTeachers = (managementData.teachers || []).find((item) => Number(item.id) === Number(userId));
    const teacherClasses = Array.isArray(fromTeachers?.classes) ? fromTeachers.classes : [];

    const fromClasses = (managementData.classes || [])
      .filter((clazz) => Array.isArray(clazz?.teachers) && clazz.teachers.some((teacher) => Number(teacher.id) === Number(userId)))
      .map((clazz) => ({
        id: clazz.id,
        code: clazz.code,
        name: clazz.name,
      }));

    const merged = [...teacherClasses, ...fromClasses];
    const seen = new Set();

    return merged.filter((item) => {
      const key = `${item.id || ''}-${item.code || ''}-${item.name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      notify('warning', 'Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    try {
      await authApi.adminChangePassword(selectedUser.id, newPassword);
      notify('success', 'Đổi mật khẩu thành công', `Đã đổi mật khẩu cho ${selectedUser.fullName}.`);
      setShowModal(null);
      setNewPassword('');
    } catch (error) {
      notify('error', 'Đổi mật khẩu thất bại', error?.message || 'Không thể đổi mật khẩu.');
    }
  };

  const handleEditUser = (user) => {
    if (user.id === currentUser?.id) {
      notify('warning', 'Không thể chỉnh sửa', 'Bạn không thể chỉnh sửa thông tin của chính mình tại đây.');
      return;
    }

    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      roles: user.roles
    });
    setShowModal('edit');
  };

  const handleSaveEdit = async () => {
    if (editForm.roles.includes('ADMIN') && !selectedUser.roles.includes('ADMIN')) {
      notify('warning', 'Không được phép nâng cấp', 'Không được phép nâng cấp tài khoản lên ADMIN!');
      return;
    }

    const adminUsers = users.filter(u => u.roles.includes('ADMIN'));
    if (selectedUser.roles.includes('ADMIN') && !editForm.roles.includes('ADMIN') && adminUsers.length <= 1) {
      notify('warning', 'Giữ lại Admin cuối cùng', 'Không thể hạ cấp Admin cuối cùng trong hệ thống!');
      return;
    }

    try {
      await authApi.updateUser(selectedUser.id, editForm);
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...editForm }
          : user
      ));
      setShowModal(null);
      notify('success', 'Cập nhật thành công', 'Đã cập nhật thông tin thành công.');
      fetchUsers();
    } catch (error) {
      notify('error', 'Cập nhật thất bại', error?.message || 'Không thể cập nhật thông tin.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser?.id) {
      notify('warning', 'Không thể xóa', 'Bạn không thể xóa chính mình.');
      return;
    }

    const userToDelete = users.find(u => u.id === userId);

    if (managementLoading) {
      await fetchManagementData();
    }

    const activeTeacherClasses = getActiveTeacherAssignments(userId);

    if (userToDelete?.roles.includes('TEACHER') && activeTeacherClasses.length > 0) {
      setHandoverWarning({
        user: userToDelete,
        classes: activeTeacherClasses,
      });
      return;
    }

    const adminUsers = users.filter(u => u.roles.includes('ADMIN'));
    if (userToDelete?.roles.includes('ADMIN') && adminUsers.length <= 1) {
      alert('Không thể xóa Admin cuối cùng trong hệ thống');
      return;
    }

    setDeleteTarget(userToDelete);
    setDeletePassword('');
  };

  const handleRestoreUser = async (userId) => {
    try {
      await authApi.restoreUser(userId);
      notify('success', 'Khôi phục thành công', 'Tài khoản đã được khôi phục.');
      fetchUsers();
    } catch (error) {
      notify('error', 'Khôi phục thất bại', error?.response?.data?.message || 'Không thể khôi phục tài khoản.');
    }
  };

  const closeHandoverWarning = () => setHandoverWarning(null);

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    if (!deletePassword.trim()) {
      notify('warning', 'Thiếu mật khẩu', 'Vui lòng nhập mật khẩu admin để xác nhận xóa.');
      return;
    }

    try {
      const deleted = await authApi.deleteUser(deleteTarget.id, deletePassword.trim());
      notify('success', 'Xóa thành công', `Đã xóa ${deleteTarget.fullName || deleteTarget.username} thành công.`);
      setDeleteTarget(null);
      setDeletePassword('');
      fetchUsers();
    } catch (error) {
      notify('error', 'Xóa thất bại', error.response?.data?.error || error.message);
    }
  };

  useEffect(() => {
    if (!openActionMenuId) return;
    const handleMouseDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpenActionMenuId(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionMenuId]);

  return (
    <AdminLayout
      title="Users"
      subtitle="Quản lý tài khoản và phân quyền người dùng"
    >
      {/* Dynamic Notifications */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '350px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: notification.type === 'success' ? '#d1fae5' : '#fdf2f2',
            color: notification.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {notification.type === 'success' ? '✓' : '!'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{notification.title}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{notification.message}</div>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Row 1: 3 Stats Card panel */}
      <section className="admin-dashboard-stats-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Tổng số người dùng</span>
            <span className="admin-stat-card-value">{summaryCounts.totalUsers.toLocaleString()}</span>
            <span className="admin-stat-card-trend" style={{ color: '#4f46e5' }}>Tổng tài khoản hệ thống</span>
          </div>
          <div className="admin-stat-card-icon-wrap blue">
            <Users size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Đang hoạt động</span>
            <span className="admin-stat-card-value">{summaryCounts.activeUsers.toLocaleString()}</span>
            <span className="admin-stat-card-trend" style={{ color: '#10b981' }}>Tài khoản active</span>
          </div>
          <div className="admin-stat-card-icon-wrap green">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Tài khoản lưu trữ/đã xóa</span>
            <span className="admin-stat-card-value">{summaryCounts.deletedUsers.toLocaleString()}</span>
            <span className="admin-stat-card-trend" style={{ color: '#ef4444' }}>Đã xóa mềm</span>
          </div>
          <div className="admin-stat-card-icon-wrap pink">
            <UserX size={22} />
          </div>
        </div>
      </section>

      {/* Row 2: Horizontal Filter Tabs & Add Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '10px 20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            // Get proper count from summary counts
            let count = summaryCounts.totalUsers;
            if (tab.key === 'ADMIN') count = summaryCounts.adminCount;
            else if (tab.key === 'MANAGER') count = summaryCounts.managerCount;
            else if (tab.key === 'TEACHER') count = summaryCounts.teacherCount;
            else if (tab.key === 'STUDENT') count = summaryCounts.studentCount;
            else if (tab.key === 'DELETED') count = summaryCounts.deletedUsers;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPagination((prev) => ({ ...prev, page: 0 }));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 4px',
                  fontSize: '14px',
                  fontWeight: active ? '600' : '500',
                  color: active ? '#4f46e5' : '#64748b',
                  borderBottom: active ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: active ? '#4f46e5' : '#e2e8f0',
                  color: active ? '#ffffff' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '12px',
                  minWidth: '18px'
                }}>
                  {count ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowModal('add')}
          style={{
            padding: '8px 14px',
            background: '#4f46e5',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={14} />
          Thêm người dùng
        </button>
      </div>

      {/* Search Input bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '6px 12px'
        }}>
          <Search size={14} style={{ color: '#64748b', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, username, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: '#0f172a'
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#475569',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px'
        }}>
          {pagination.totalElements} kết quả
        </div>
      </div>

      {loadError && (
        <div className="admin-alert admin-alert-danger" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>{loadError}</span>
        </div>
      )}

      {/* Main Users Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            <Loader2 size={18} className="spin" />
            Đang tải dữ liệu người dùng...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <Users size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>Không có người dùng phù hợp</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>Thử thay đổi bộ lọc hoặc thêm tài khoản để bắt đầu.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    {activeTab !== 'DELETED' && <th>Trạng thái</th>}
                    <th>Hoạt động cuối</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: ROLES[user.roles[0]]?.bg || '#f1f5f9',
                            color: ROLES[user.roles[0]]?.color || '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px'
                          }}>
                            {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{user.fullName}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>@{user.username}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {user.roles.map(role => (
                            <span key={role} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: ROLES[role]?.bg || '#f1f5f9',
                              color: ROLES[role]?.color || '#64748b'
                            }}>
                              {ROLES[role]?.label || role}
                            </span>
                          ))}
                        </div>
                      </td>
                      {activeTab !== 'DELETED' && (
                        <td>
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            style={{
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: user.isActive ? '#e6f4ea' : '#fce8e6',
                              color: user.isActive ? '#137333' : '#c5221f'
                            }}
                          >
                            {user.isActive ? 'Hoạt động' : 'Tạm khóa'}
                          </button>
                        </td>
                      )}
                      <td>
                        {user.lastLogin ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                            <Clock size={12} />
                            <span>{new Date(user.lastLogin).toLocaleDateString('vi-VN')}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Chưa đăng nhập</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-action-wrap" ref={openActionMenuId === user.id ? actionMenuRef : null} style={{ display: 'inline-block' }}>
                          <button
                            type="button"
                            className="admin-action-trigger"
                            onClick={() => setOpenActionMenuId((prev) => (prev === user.id ? null : user.id))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openActionMenuId === user.id && (
                            <div className="admin-action-menu" style={{
                              position: 'absolute',
                              right: 0,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                              width: '160px',
                              padding: '6px',
                              zIndex: 100,
                              textAlign: 'left'
                            }}>
                              {user.deletedAt ? (
                                <>
                                  {canRestoreTest(user) && (
                                    <button
                                      onClick={() => { setOpenActionMenuId(null); handleRestoreUser(user.id); }}
                                      className="admin-dropdown-item"
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                                    >
                                      <RefreshCw size={14} /> Khôi phục
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setOpenActionMenuId(null); setSelectedUser(user); setShowModal('password'); }}
                                    className="admin-dropdown-item"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                                  >
                                    <Key size={14} /> Đổi mật khẩu
                                  </button>

                                  {user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => { setOpenActionMenuId(null); handleEditUser(user); }}
                                      className="admin-dropdown-item"
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                                    >
                                      <Edit size={14} /> Chỉnh sửa
                                    </button>
                                  )}

                                  {user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => { setOpenActionMenuId(null); handleDeleteUser(user.id); }}
                                      className="admin-dropdown-item logout"
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                                    >
                                      <Trash2 size={14} /> Xóa tài khoản
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="admin-pagination" style={{ marginTop: '24px' }}>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }))}
                  disabled={pagination.page <= 0}
                  className="admin-btn ghost small"
                >
                  Trước
                </button>
                <span className="admin-pagination-info">
                  Trang {pagination.page + 1} / {pagination.totalPages} ({pagination.totalElements} tài khoản)
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.totalPages - 1) }))}
                  disabled={pagination.page >= pagination.totalPages - 1}
                  className="admin-btn ghost small"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals are overlayed with consistent backdrop filters */}

      {/* Add User Modal */}
      {showModal === 'add' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.62)',
          display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '90%', maxWidth: '500px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Thêm tài khoản người dùng</h3>
            <AddUserForm onClose={() => setShowModal(null)} onSuccess={() => { setShowModal(null); fetchUsers(); notify('success', 'Thành công', 'Đã thêm tài khoản mới.'); }} />
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showModal === 'edit' && selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.62)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '90%', maxWidth: '500px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Chỉnh sửa thông tin</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Cập nhật thông tin cho <strong>{selectedUser.fullName}</strong></p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Họ và tên</label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Vai trò</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {['MANAGER', 'TEACHER', 'STUDENT'].map(role => {
                  const isSelected = editForm.roles.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        if (isSelected) {
                          setEditForm({ ...editForm, roles: editForm.roles.filter(r => r !== role) });
                        } else {
                          setEditForm({ ...editForm, roles: [...editForm.roles, role] });
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid',
                        borderColor: isSelected ? '#4f46e5' : '#cbd5e1',
                        background: isSelected ? '#f5f3ff' : '#ffffff',
                        color: isSelected ? '#4f46e5' : '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {ROLES[role]?.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: '8px' }}>
                * Quyền ADMIN không thể thay đổi vì lý do bảo mật.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(null)} className="admin-btn ghost small">Hủy bỏ</button>
              <button onClick={handleSaveEdit} className="admin-btn primary small">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showModal === 'password' && selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.62)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '90%', maxWidth: '450px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Đổi mật khẩu</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Tạo mật khẩu mới cho <strong>{selectedUser.fullName}</strong></p>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowModal(null); setNewPassword(''); }} className="admin-btn ghost small">Hủy</button>
              <button onClick={handleChangePassword} disabled={newPassword.length < 6} className="admin-btn primary small">Cập nhật</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.62)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '90%', maxWidth: '480px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#9b1c1c' }}>Xác nhận xóa tài khoản</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Hành động này sẽ xóa mềm tài khoản <strong>{deleteTarget.fullName}</strong> khỏi danh sách active.</p>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Nhập mật khẩu admin của bạn để xác nhận"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #fca5a5', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} className="admin-btn ghost small">Hủy bỏ</button>
              <button onClick={confirmDeleteUser} className="admin-btn danger small" style={{ background: '#dc2626' }}>Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Warning Modal */}
      {handoverWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.62)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '90%', maxWidth: '520px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 700, color: '#b45309' }}>Giảng viên đang quản lý lớp</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Giảng viên <strong>{handoverWarning.user?.fullName}</strong> đang được phân công giảng dạy cho <strong>{handoverWarning.classes.length}</strong> lớp học.
              Vui lòng bàn giao lớp hoặc gỡ phân công trước khi thực hiện xóa.
            </p>

            <div style={{ display: 'grid', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '20px' }}>
              {handoverWarning.classes.map((clazz) => (
                <div key={clazz.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '13px' }}>
                  <strong>{clazz.code}</strong>
                  <span style={{ color: '#b45309' }}>{clazz.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Link to="/admin/teacher-class" onClick={closeHandoverWarning} className="admin-btn primary small" style={{ background: '#4f46e5', textDecoration: 'none', color: '#ffffff' }}>
                Bàn giao ngay
              </Link>
              <button onClick={closeHandoverWarning} className="admin-btn ghost small">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Embedded clean Form to add user
function AddUserForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    roles: ['STUDENT']
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      // Save User API
      await authApi.register(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi tạo người dùng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && (
        <div style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Username</label>
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="Ví dụ: hocvien01"
          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Họ và tên</label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          placeholder="Ví dụ: Nguyễn Văn A"
          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Ví dụ: a@ieltsmanager.com"
          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Mật khẩu</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Mật khẩu tối thiểu 6 ký tự"
          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Vai trò</label>
        <select
          value={form.roles[0]}
          onChange={(e) => setForm({ ...form, roles: [e.target.value] })}
          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff', cursor: 'pointer' }}
        >
          <option value="STUDENT">Học viên (Student)</option>
          <option value="TEACHER">Giáo viên (Teacher)</option>
          <option value="MANAGER">Quản lý (Manager)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button type="button" onClick={onClose} className="admin-btn ghost small">Đóng</button>
        <button type="submit" disabled={loading} className="admin-btn primary small">
          {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
        </button>
      </div>
    </form>
  );
}
