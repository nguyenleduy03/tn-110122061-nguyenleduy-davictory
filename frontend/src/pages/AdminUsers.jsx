import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Filter,
  MoreVertical,
  ArrowLeft,
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
  ClipboardList,
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { authApi } from '../services/authApi';

const ROLES = {
  ADMIN: { label: 'Quản trị viên', color: '#dc2626', bg: '#fef2f2', icon: Shield },
  MANAGER: { label: 'Quản lý', color: '#d97706', bg: '#fef3c7', icon: Target },
  TEACHER: { label: 'Giáo viên', color: '#059669', bg: '#ecfdf5', icon: GraduationCap },
  STUDENT: { label: 'Học viên', color: '#2563eb', bg: '#eff6ff', icon: BookOpen }
};

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
  const [managementLoading, setManagementLoading] = useState(false);
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

  // Lấy thông tin user hiện tại
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

  // Kiểm tra quyền truy cập
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
      console.log('[AdminUsers] Fetching paginated users...');
      
      // Kiểm tra token trước
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

      console.log('[AdminUsers] Received page:', data);
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
      console.error('[AdminUsers] Error response:', error.response);
      
      let errorMsg = 'Không thể tải danh sách người dùng.';
      if (error.response?.status === 401) {
        errorMsg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMsg = 'Bạn không có quyền ADMIN để truy cập trang này.';
      } else if (error.message) {
        errorMsg = error.message;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
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

  const parseStudentCodes = (rawText) => {
    return (rawText || '')
      .split(/[,\n;\t\s]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const parseCodesFromCsv = (csvText) => {
    const cleanText = String(csvText || '').replace(/^\uFEFF/, '');
    const lines = cleanText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const parseRow = (line) => line
      .split(',')
      .map((cell) => cell.trim().replace(/^"|"$/g, ''));

    const firstRow = parseRow(lines[0]);
    const normalizedHeader = firstRow.map((h) => h.toLowerCase());
    const codeColIndex = normalizedHeader.findIndex((h) =>
      ['studentcode', 'student_code', 'username', 'code', 'mahv', 'mshv'].includes(h)
    );

    const dataStartIndex = codeColIndex >= 0 ? 1 : 0;
    const extracted = [];

    for (let i = dataStartIndex; i < lines.length; i += 1) {
      const row = parseRow(lines[i]);
      if (row.length === 0) continue;

      const rawCode = codeColIndex >= 0
        ? row[codeColIndex]
        : row[0];

      if (rawCode && rawCode.trim()) {
        extracted.push(rawCode.trim());
      }
    }

    return [...new Set(extracted)];
  };

  const handleCsvUploadForHandover = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvParseError('');
    setCsvFileName(file.name || '');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvPreviewCodes([]);
      setCsvParseError('Chỉ chấp nhận file .csv');
      return;
    }

    try {
      const text = await file.text();
      const parsedCodes = parseCodesFromCsv(text);

      if (parsedCodes.length === 0) {
        setCsvPreviewCodes([]);
        setCsvParseError('Không đọc được mã học viên từ file CSV. Hãy kiểm tra cột username/studentCode.');
        return;
      }

      setCsvPreviewCodes(parsedCodes);
    } catch (error) {
      setCsvPreviewCodes([]);
      setCsvParseError('Không thể đọc file CSV. Vui lòng thử lại.');
    }
  };

  const clearCsvPreview = () => {
    setCsvPreviewCodes([]);
    setCsvFileName('');
    setCsvParseError('');
    if (csvInputRef.current) {
      csvInputRef.current.value = '';
    }
  };

  const handleAssignTeacherByClassCode = async () => {
    if (!assignTeacherForm.classCode.trim()) {
      notify('warning', 'Thiếu mã lớp', 'Vui lòng nhập mã lớp.');
      return;
    }
    if (!assignTeacherForm.teacherId) {
      notify('warning', 'Thiếu giảng viên', 'Vui lòng chọn giảng viên.');
      return;
    }

    try {
      await authApi.assignTeacherByClassCode({
        classCode: assignTeacherForm.classCode.trim(),
        teacherId: Number(assignTeacherForm.teacherId),
        role: assignTeacherForm.role,
        notes: assignTeacherForm.notes,
      });
      notify('success', 'Phân công thành công', 'Đã phân công giảng viên quản lý lớp thành công.');
      setAssignTeacherForm((prev) => ({ ...prev, notes: '' }));
      fetchManagementData();
    } catch (error) {
      notify('error', 'Phân công thất bại', error?.response?.data?.message || 'Không thể phân công giảng viên.');
    }
  };

  const handleCreateClassAndAssignTeacher = async () => {
    const classCode = createClassForm.classCode.trim();
    const className = createClassForm.className.trim();

    if (!classCode) {
      notify('warning', 'Thiếu mã lớp', 'Vui lòng nhập mã lớp.');
      return;
    }
    if (!className) {
      notify('warning', 'Thiếu tên lớp', 'Vui lòng nhập tên lớp.');
      return;
    }

    try {
      setCreateClassLoading(true);

      const createdClass = await authApi.createClassForAdmin({
        classCode,
        className,
        startDate: createClassForm.startDate || undefined,
        notes: createClassForm.notes || undefined,
      });

      if (createClassForm.teacherId) {
        await authApi.assignTeacherByClassCode({
          classCode,
          teacherId: Number(createClassForm.teacherId),
          role: createClassForm.teacherRole,
          notes: 'Auto-assign từ form tạo lớp'
        });
      }

      setAssignTeacherForm((prev) => ({
        ...prev,
        classCode,
        teacherId: createClassForm.teacherId || prev.teacherId,
        role: createClassForm.teacherRole || prev.role,
      }));

      setHandoverForm((prev) => ({
        ...prev,
        classCode,
      }));

      setCreateClassForm({
        classCode: '',
        className: '',
        startDate: '',
        teacherId: '',
        teacherRole: 'MAIN_TEACHER',
        notes: ''
      });

      await fetchManagementData();

      notify(
        'success',
        'Tạo lớp thành công',
        createClassForm.teacherId
          ? `Đã tạo lớp ${createdClass?.code || classCode} và gán giảng viên thành công.`
          : `Đã tạo lớp ${createdClass?.code || classCode} thành công. Bạn có thể tải danh sách học viên ngay ở khung bên dưới.`
      );
    } catch (error) {
      notify('error', 'Tạo lớp thất bại', error?.response?.data?.message || 'Không thể tạo lớp.');
    } finally {
      setCreateClassLoading(false);
    }
  };

  const handleAssignStudentsByClassCode = async () => {
    if (!handoverForm.classCode.trim()) {
      notify('warning', 'Thiếu mã lớp', 'Vui lòng nhập mã lớp.');
      return;
    }

    const manualCodes = parseStudentCodes(handoverForm.studentCodesText);
    const studentCodes = [...new Set([...(manualCodes || []), ...(csvPreviewCodes || [])])];

    if (studentCodes.length === 0) {
      notify('warning', 'Chưa có học viên', 'Vui lòng nhập mã học viên thủ công hoặc upload CSV trước khi bàn giao.');
      return;
    }

    try {
      const result = await authApi.assignStudentsByClassCode({
        classCode: handoverForm.classCode.trim(),
        studentCodes,
        notes: handoverForm.notes,
      });

      const failed = Number(result?.failed || 0);
      if (failed > 0) {
        notify('warning', 'Bàn giao một phần', `Đã bàn giao ${result?.success || 0} học viên, thất bại ${failed}. Vui lòng kiểm tra mã học viên.`);
      } else {
        notify('success', 'Bàn giao thành công', `Đã bàn giao thành công ${result?.success || 0} học viên vào lớp ${result?.classCode || handoverForm.classCode}.`);
      }

      setHandoverForm((prev) => ({ ...prev, studentCodesText: '', notes: '' }));
      clearCsvPreview();
      fetchManagementData();
    } catch (error) {
      notify('error', 'Bàn giao thất bại', error?.response?.data?.message || 'Không thể bàn giao danh sách học viên.');
    }
  };

  const handleRequestDeleteClass = (clazz) => {
    if (!clazz) return;
    setDeleteClassTarget(clazz);
    setDeleteClassPassword('');
  };

  const handleDeleteClass = async () => {
    if (!deleteClassTarget) return;
    if (!deleteClassPassword.trim()) {
      notify('warning', 'Thiếu mật khẩu', 'Vui lòng nhập mật khẩu admin để xác nhận.');
      return;
    }

    try {
      setDeletingClass(true);
      const result = await authApi.deleteClass(deleteClassTarget.id, deleteClassPassword.trim());
      notify(
        'success',
        'Xóa lớp thành công',
        `Đã xóa lớp ${result?.code || deleteClassTarget.code || ''}${result?.name ? ` - ${result.name}` : ''}.`
      );
      setDeleteClassTarget(null);
      setDeleteClassPassword('');
      await fetchManagementData();
    } catch (error) {
      notify('error', 'Xóa lớp thất bại', error?.response?.data?.message || error?.message || 'Không thể xóa lớp.');
    } finally {
      setDeletingClass(false);
    }
  };

  const isDeletedUser = (user) => Boolean(user?.deletedAt);

  const filteredUsers = users;

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
    // Không cho phép sửa chính mình
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
    // Kiểm tra không được phép tạo thêm Admin
    if (editForm.roles.includes('ADMIN') && !selectedUser.roles.includes('ADMIN')) {
      notify('warning', 'Không được phép nâng cấp', 'Không được phép nâng cấp tài khoản lên ADMIN!');
      return;
    }

    // Kiểm tra không được hạ cấp Admin cuối cùng
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
    // Không cho phép xóa chính mình
    if (userId === currentUser?.id) {
      notify('warning', 'Không thể xóa', 'Bạn không thể xóa chính mình.');
      return;
    }

    const userToDelete = users.find(u => u.id === userId);

    // Đảm bảo dữ liệu quản lý lớp đã được tải trước khi kiểm tra
    if (managementLoading) {
      await fetchManagementData();
    }

    const activeTeacherClasses = getActiveTeacherAssignments(userId);

    // Nếu là giảng viên đang quản lý lớp thì bắt buộc bàn giao trước khi xóa
    if (userToDelete?.roles.includes('TEACHER') && activeTeacherClasses.length > 0) {
      setHandoverWarning({
        user: userToDelete,
        classes: activeTeacherClasses,
      });
      return;
    }

    // Không cho phép xóa Admin cuối cùng
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
      notify('success', 'Khôi phục thành công', 'User đã được khôi phục');
      fetchUsers();
    } catch (error) {
      notify('error', 'Khôi phục thất bại', error?.response?.data?.message || 'Không thể khôi phục user');
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
      const deletedData = deleted && typeof deleted === 'object' ? deleted : {};
      const deletedAtValue = deleted?.deletedAt || new Date().toISOString();
      setUsers((prev) => prev.map((user) => (
        user.id === deleteTarget.id
          ? {
              ...user,
              ...deletedData,
              deletedAt: deletedAtValue,
              isActive: deleted?.isActive ?? false,
            }
          : user
      )));
      notify('success', 'Xóa người dùng thành công', `Đã xóa ${deleteTarget.fullName || deleteTarget.username || 'người dùng'} thành công.`);
      setDeleteTarget(null);
      setDeletePassword('');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      notify('error', 'Xóa người dùng thất bại', errorMessage);
    }
  };

  return (
    <AdminLayout
      title="Quản trị người dùng"
      subtitle="Quản lý tài khoản và phân quyền người dùng"
    >
      {notification && (
        <div className={`admin-toast admin-toast-${notification.type}`} key={notification.id}>
          <div className="admin-toast-icon">
            {notification.type === 'success' ? (
              <CheckCircle size={18} />
            ) : notification.type === 'error' ? (
              <XCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
          </div>
          <div className="admin-toast-body">
            <div className="admin-toast-title">{notification.title}</div>
            <div className="admin-toast-message">{notification.message}</div>
          </div>
          <button className="admin-toast-close" onClick={() => setNotification(null)} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link to="/admin" style={{ 
            display: 'flex', alignItems: 'center', gap: 8, 
            color: '#0056d2', textDecoration: 'none', fontSize: 14,
            padding: '8px 16px', borderRadius: 8, background: 'rgba(0, 86, 210, 0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(0, 86, 210, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(0, 86, 210, 0.1)'}
          >
            <ArrowLeft size={16} />
            Quay lại Admin
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ 
              fontSize: 32, fontWeight: 800, color: '#111827', margin: 0,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <Users size={32} style={{ color: '#0056d2' }} />
              <span style={{
                background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent'
              }}>
                Quản lý người dùng
              </span>
            </h1>
            <p style={{ color: '#6b7280', marginTop: 8, fontSize: 16 }}>
              Tổng cộng <strong>{summaryCounts.totalUsers}</strong> người dùng • {summaryCounts.activeUsers} đang hoạt động
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', 
              background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)', 
              color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer',
                fontWeight: 600, fontSize: 14, 
                boxShadow: '0 4px 15px rgba(0, 86, 210, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Plus size={18} />
                Thêm người dùng
              </button>
              
              <button style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', background: 'white', color: '#374151',
                border: '2px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', 
                fontWeight: 600, fontSize: 14, transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#0056d2';
                e.target.style.color = '#0056d2';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#374151';
              }}
              >
                <BarChart3 size={18} />
                Thống kê
              </button>
            </div>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', gap: 4, marginBottom: 24,
          background: 'white', padding: 8, borderRadius: 16,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          {[
            { key: 'ALL', label: 'Tất cả', icon: Users, count: summaryCounts.totalUsers },
            { key: 'ADMIN', label: 'Quản trị viên', icon: Shield, count: summaryCounts.adminCount },
            { key: 'MANAGER', label: 'Quản lý', icon: Target, count: summaryCounts.managerCount },
            { key: 'TEACHER', label: 'Giáo viên', icon: GraduationCap, count: summaryCounts.teacherCount },
            { key: 'STUDENT', label: 'Học viên', icon: BookOpen, count: summaryCounts.studentCount },
            { key: 'DELETED', label: 'Đã xóa', icon: XCircle, count: summaryCounts.deletedUsers }
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPagination((prev) => ({ ...prev, page: 0 }));
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 12, border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #0056d2 0%, #003380 100%)' : 'transparent',
                  color: isActive ? 'white' : '#6b7280',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.background = '#f8fafc';
                    e.target.style.color = '#0056d2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#6b7280';
                  }
                }}
              >
                <IconComponent size={16} />
                {tab.label}
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                  color: isActive ? 'white' : '#6b7280',
                  padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ 
          background: 'white', padding: 24, borderRadius: 16, 
          border: '1px solid #f1f5f9', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex', gap: 20, alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ 
              position: 'absolute', left: 16, top: '50%', 
              transform: 'translateY(-50%)', color: '#9ca3af' 
            }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination((prev) => ({ ...prev, page: 0 }));
              }}
              style={{
                width: '100%', padding: '14px 20px 14px 50px', 
                border: '2px solid #f1f5f9', borderRadius: 12, fontSize: 15,
                transition: 'all 0.3s ease', background: '#fafbfc'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0056d2';
                e.target.style.background = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 86, 210, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f1f5f9';
                e.target.style.background = '#fafbfc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div style={{ 
            padding: '12px 16px', background: '#f8fafc', borderRadius: 10,
            border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#475569',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <BarChart3 size={16} />
            {pagination.totalElements} kết quả
          </div>
        </div>


      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.62)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          backdropFilter: 'blur(10px)',
          padding: 20,
        }} onClick={() => setDeleteTarget(null)}>
          <div style={{
            width: '100%',
            maxWidth: 520,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 24,
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(255,255,255,0.6)',
            overflow: 'hidden',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '22px 24px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trash2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Xác nhận xóa người dùng</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Hành động này không thể hoàn tác</div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 16,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                marginBottom: 18,
              }}>
                <AlertCircle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 14, lineHeight: 1.6, width: '100%' }}>
                  Bạn sắp xóa <strong>{deleteTarget.fullName || deleteTarget.username}</strong>.
                  {deleteTarget.roles?.includes('TEACHER') && (
                    <>
                      <br />Giảng viên phải bàn giao lớp trước khi xóa.
                    </>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Nhập mật khẩu admin để xác nhận"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #fca5a5',
                        outline: 'none',
                        fontSize: 14,
                        background: 'white'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
                fontSize: 13,
                color: '#475569',
              }}>
                <div style={{ padding: 14, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>Username</div>
                  <strong>{deleteTarget.username}</strong>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>Vai trò</div>
                  <strong>{(deleteTarget.roles || []).join(', ')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: '12px 18px',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDeleteUser}
                  style={{
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    cursor: 'pointer',
                    fontWeight: 800,
                    boxShadow: '0 12px 24px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  Xóa ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        {loadError && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: 14,
            fontWeight: 500
          }}>
            {loadError}
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div style={{ 
            background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: 60, textAlign: 'center', color: '#6b7280'
          }}>
            Đang tải dữ liệu người dùng...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: 42,
            textAlign: 'center',
            color: '#64748b'
          }}>
            Không có dữ liệu người dùng phù hợp.
          </div>
        ) : (
          <div style={{ 
            background: 'white', borderRadius: 16, border: '1px solid #f1f5f9', 
            overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <tr>
                <th style={{ 
                  padding: 20, textAlign: 'left', fontWeight: 700, color: '#1e293b',
                  fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} />
                    Người dùng
                  </div>
                </th>
                <th style={{ 
                  padding: 20, textAlign: 'left', fontWeight: 700, color: '#1e293b',
                  fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} />
                    Vai trò
                  </div>
                </th>
                {activeTab !== 'DELETED' && (
                <th style={{ 
                  padding: 20, textAlign: 'left', fontWeight: 700, color: '#1e293b',
                  fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16} />
                    Trạng thái
                  </div>
                </th>
                )}
                <th style={{ 
                  padding: 20, textAlign: 'left', fontWeight: 700, color: '#1e293b',
                  fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} />
                    Hoạt động cuối
                  </div>
                </th>
                <th style={{ 
                  padding: 20, textAlign: 'center', fontWeight: 700, color: '#1e293b',
                  fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <MoreVertical size={16} />
                    Thao tác
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} style={{ 
                  borderTop: index > 0 ? '1px solid #f1f5f9' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${ROLES[user.roles[0]]?.color || '#6b7280'} 0%, ${ROLES[user.roles[0]]?.color || '#6b7280'}80 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 700, color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>
                          {user.fullName}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          @{user.username}
                        </div>
                        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 1 }}>
                          <Mail size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 20 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {user.roles.map(role => {
                        const IconComponent = ROLES[role]?.icon || Shield;
                        return (
                          <span key={role} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: ROLES[role]?.bg || '#f3f4f6', 
                            color: ROLES[role]?.color || '#6b7280',
                            border: `1px solid ${ROLES[role]?.color}20`
                          }}>
                            <IconComponent size={12} />
                            {ROLES[role]?.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  {activeTab !== 'DELETED' && (
                  <td style={{ padding: 20 }}>
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', borderRadius: 25, border: 'none',
                        background: user.isActive 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        boxShadow: user.isActive 
                          ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
                          : '0 4px 12px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      {user.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {user.isActive ? 'Hoạt động' : 'Tạm khóa'}
                    </button>
                  </td>
                  )}
                  <td style={{ padding: 20, fontSize: 13, color: '#6b7280' }}>
                    {user.lastLogin ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} />
                        {new Date(user.lastLogin).toLocaleDateString('vi-VN')}
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa đăng nhập</span>
                    )}
                  </td>
                  <td style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {/* Nút Đổi mật khẩu - ẩn khi ở tab Đã xóa */}
                      {activeTab !== 'DELETED' && (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowModal('password');
                        }}
                        style={{
                          padding: 10, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                          border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                          transition: 'all 0.3s ease'
                        }}
                        title="Đổi mật khẩu"
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        <Key size={16} />
                      </button>
                      )}
                      
                      {/* Nút Chỉnh sửa - ẩn khi ở tab Đã xóa hoặc là chính mình */}
                      {activeTab !== 'DELETED' && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleEditUser(user)}
                          style={{
                            padding: 10, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
                            border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white',
                            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
                            transition: 'all 0.3s ease'
                          }}
                          title="Chỉnh sửa"
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      
                      {/* Nút Khôi phục cho user đã xóa, nút Xóa cho user active */}
                      {user.deletedAt ? (
                        <button
                          onClick={() => handleRestoreUser(user.id)}
                          style={{
                            padding: 10, background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', 
                            border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white',
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M3 21v-5h5"/>
                          </svg>
                        </button>
                      ) : (
                        user.id !== currentUser?.id && !(user.roles.includes('ADMIN') && users.filter(u => u.roles.includes('ADMIN')).length <= 1) && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            style={{
                              padding: 10, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                              border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                              transition: 'all 0.3s ease'
                            }}
                          title="Xóa"
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          <Trash2 size={16} />
                        </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderTop: '1px solid #f1f5f9',
            background: '#fcfdff',
          }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Trang <strong>{pagination.page + 1}</strong> / <strong>{Math.max(pagination.totalPages, 1)}</strong>
              {' '}• {filteredUsers.length} bản ghi trên trang
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={pagination.size}
                onChange={(e) => setPagination((prev) => ({ ...prev, size: Number(e.target.value), page: 0 }))}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #dbe4f0',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 600,
                }}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>Hiển thị {size}</option>
                ))}
              </select>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 0) }))}
                disabled={pagination.page <= 0}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #dbe4f0',
                  background: pagination.page <= 0 ? '#f8fafc' : '#fff',
                  color: '#334155',
                  fontWeight: 700,
                  cursor: pagination.page <= 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Trước
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.page + 1, Math.max(prev.totalPages - 1, 0)) }))}
                disabled={pagination.page >= pagination.totalPages - 1}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #dbe4f0',
                  background: pagination.page >= pagination.totalPages - 1 ? '#f8fafc' : '#fff',
                  color: '#334155',
                  fontWeight: 700,
                  cursor: pagination.page >= pagination.totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
        )}

      {/* Edit User Modal */}
      {showModal === 'edit' && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 32, width: 500,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255,255,255,0.2)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', boxShadow: '0 8px 25px rgba(0, 86, 210, 0.3)'
              }}>
                <Edit size={28} color="white" />
              </div>
              <h3 style={{ 
                margin: 0, fontSize: 20, fontWeight: 700, color: '#111827',
                marginBottom: 8
              }}>
                Chỉnh sửa thông tin
              </h3>
              <p style={{ 
                margin: 0, color: '#6b7280', fontSize: 14,
                fontWeight: 500
              }}>
                Cập nhật thông tin cho <strong>{selectedUser?.fullName}</strong>
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', fontSize: 14, fontWeight: 600, 
                color: '#374151', marginBottom: 8 
              }}>
                Họ và tên
              </label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid #f1f5f9',
                  borderRadius: 12, fontSize: 14, background: '#fafbfc',
                  transition: 'all 0.3s ease', outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0056d2';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 86, 210, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f1f5f9';
                  e.target.style.background = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', fontSize: 14, fontWeight: 600, 
                color: '#374151', marginBottom: 8 
              }}>
                Email
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid #f1f5f9',
                  borderRadius: 12, fontSize: 14, background: '#fafbfc',
                  transition: 'all 0.3s ease', outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0056d2';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 86, 210, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f1f5f9';
                  e.target.style.background = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', fontSize: 14, fontWeight: 600, 
                color: '#374151', marginBottom: 12 
              }}>
                Vai trò
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {['MANAGER', 'TEACHER', 'STUDENT'].map(role => {
                  const roleData = ROLES[role];
                  const IconComponent = roleData?.icon || Shield;
                  const isSelected = editForm.roles.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        if (isSelected) {
                          setEditForm({
                            ...editForm,
                            roles: editForm.roles.filter(r => r !== role)
                          });
                        } else {
                          setEditForm({
                            ...editForm,
                            roles: [...editForm.roles, role]
                          });
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 12, border: '2px solid',
                        borderColor: isSelected ? '#0056d2' : '#e5e7eb',
                        background: isSelected ? 'rgba(0, 86, 210, 0.1)' : 'white',
                        color: isSelected ? '#0056d2' : '#6b7280',
                        cursor: 'pointer', fontSize: 14, fontWeight: 600,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.target.style.borderColor = '#0056d2';
                          e.target.style.color = '#0056d2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.color = '#6b7280';
                        }
                      }}
                    >
                      <IconComponent size={14} />
                      {roleData?.label || role}
                    </button>
                  );
                })}
              </div>
              <div style={{ 
                fontSize: 12, color: '#dc2626', 
                background: '#fef2f2', padding: '8px 12px', borderRadius: 8,
                border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Shield size={14} />
                Không thể chỉnh sửa quyền ADMIN vì lý do bảo mật
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowModal(null)}
                style={{
                  flex: 1, padding: '14px 20px', background: '#f8fafc', 
                  border: '2px solid #e5e7eb', borderRadius: 12, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#6b7280',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  flex: 1, padding: '14px 20px', 
                  background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                  color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(0, 86, 210, 0.4)'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showModal === 'password' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 32, width: 450,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255,255,255,0.2)',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', boxShadow: '0 8px 25px rgba(0, 86, 210, 0.3)'
              }}>
                <Key size={28} color="white" />
              </div>
              <h3 style={{ 
                margin: 0, fontSize: 20, fontWeight: 700, color: '#111827',
                marginBottom: 8
              }}>
                Đổi mật khẩu
              </h3>
              <p style={{ 
                margin: 0, color: '#6b7280', fontSize: 14,
                fontWeight: 500
              }}>
                Tạo mật khẩu mới cho <strong>{selectedUser?.fullName}</strong>
              </p>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block', fontSize: 14, fontWeight: 600, 
                color: '#374151', marginBottom: 8 
              }}>
                Mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid #f1f5f9',
                  borderRadius: 12, fontSize: 14, background: '#fafbfc',
                  transition: 'all 0.3s ease', outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0056d2';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 86, 210, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f1f5f9';
                  e.target.style.background = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowModal(null)}
                style={{
                  flex: 1, padding: '14px 20px', background: '#f8fafc', 
                  border: '2px solid #e5e7eb', borderRadius: 12, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#6b7280',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleChangePassword}
                disabled={newPassword.length < 6}
                style={{
                  flex: 1, padding: '14px 20px', 
                  background: newPassword.length >= 6 
                    ? 'linear-gradient(135deg, #0056d2 0%, #003380 100%)' 
                    : '#e5e7eb',
                  color: newPassword.length >= 6 ? 'white' : '#9ca3af',
                  border: 'none', borderRadius: 12, cursor: newPassword.length >= 6 ? 'pointer' : 'not-allowed',
                  fontSize: 14, fontWeight: 600, transition: 'all 0.3s ease',
                  boxShadow: newPassword.length >= 6 ? '0 4px 15px rgba(0, 86, 210, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (newPassword.length >= 6) {
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Handover Warning Modal */}
      {handoverWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.68)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          backdropFilter: 'blur(10px)',
          padding: 20,
        }} onClick={closeHandoverWarning}>
          <div style={{
            width: '100%',
            maxWidth: 620,
            background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)',
            borderRadius: 24,
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.30)',
            border: '1px solid rgba(253, 230, 138, 0.85)',
            overflow: 'hidden',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '22px 24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Giảng viên đang quản lý lớp</div>
                <div style={{ fontSize: 13, opacity: 0.92 }}>Cần bàn giao hoặc gỡ phân công trước khi xóa</div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{
                padding: '14px 16px',
                borderRadius: 16,
                background: '#fff7ed',
                border: '1px solid #fdba74',
                color: '#9a3412',
                marginBottom: 18,
                lineHeight: 1.6,
              }}>
                <strong>{handoverWarning.user?.fullName || handoverWarning.user?.username}</strong>
                {' '}đang quản lý <strong>{handoverWarning.classes.length}</strong> lớp học.
                Vui lòng bàn giao hết lớp hoặc gỡ phân công giảng viên trước khi xóa.
              </div>

              <div style={{
                display: 'grid',
                gap: 10,
                marginBottom: 18,
                maxHeight: 220,
                overflow: 'auto',
              }}>
                {handoverWarning.classes.map((clazz) => (
                  <div key={`${clazz.id}-${clazz.code}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'white',
                    border: '1px solid #fde68a',
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#111827' }}>{clazz.code || '—'} </div>
                      <div style={{ fontSize: 13, color: '#475569' }}>{clazz.name || 'Không có tên lớp'}</div>
                    </div>
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: '#fef3c7',
                      color: '#92400e',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      Đang quản lý
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Link
                  to="/admin/teacher-class"
                  onClick={closeHandoverWarning}
                  style={{
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                    color: 'white',
                    borderRadius: 14,
                    textDecoration: 'none',
                    fontWeight: 800,
                    boxShadow: '0 12px 24px rgba(0, 86, 210, 0.22)',
                  }}
                >
                  Đi tới quản lý lớp
                </Link>
                <button
                  onClick={closeHandoverWarning}
                  style={{
                    padding: '12px 18px',
                    background: 'white',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {deleteClassTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
          backdropFilter: 'blur(10px)',
          padding: 20,
        }} onClick={() => !deletingClass && setDeleteClassTarget(null)}>
          <div style={{
            width: '100%',
            maxWidth: 560,
            background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)',
            borderRadius: 24,
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.35)',
            border: '1px solid rgba(253, 186, 116, 0.8)',
            overflow: 'hidden',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '22px 24px',
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trash2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Xác nhận xóa lớp</div>
                <div style={{ fontSize: 13, opacity: 0.92 }}>Cần nhập mật khẩu admin để xác nhận thao tác</div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{
                padding: '14px 16px',
                borderRadius: 16,
                background: '#fff7ed',
                border: '1px solid #fdba74',
                color: '#9a3412',
                marginBottom: 18,
                lineHeight: 1.65,
              }}>
                Bạn sắp xóa lớp <strong>{deleteClassTarget.code}</strong>
                {deleteClassTarget.name ? ` - ${deleteClassTarget.name}` : ''}.<br />
                Hệ thống sẽ ngắt phân công giáo viên và đánh dấu học viên của lớp là đã rời lớp.
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>Mật khẩu admin xác nhận</div>
                <input
                  type="password"
                  value={deleteClassPassword}
                  onChange={(e) => setDeleteClassPassword(e.target.value)}
                  placeholder="Nhập mật khẩu admin"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    border: '1.5px solid #fdba74',
                    borderRadius: 12,
                    outline: 'none',
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setDeleteClassTarget(null)}
                  disabled={deletingClass}
                  style={{
                    padding: '12px 18px',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeleteClass}
                  disabled={deletingClass}
                  style={{
                    padding: '12px 18px',
                    background: deletingClass ? '#ef4444aa' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    cursor: deletingClass ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    boxShadow: '0 12px 24px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  {deletingClass ? 'Đang xóa...' : 'Xóa lớp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
