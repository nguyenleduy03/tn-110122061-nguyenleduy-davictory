import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
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
  const location = useLocation();
  const isTeacherClassPage = location.pathname.startsWith('/admin/teacher-class');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, ADMIN, MANAGER, TEACHER, STUDENT
  const [showModal, setShowModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    roles: []
  });
  const [adminMainTab, setAdminMainTab] = useState(isTeacherClassPage ? 'TEACHER_CLASS' : 'USERS'); // USERS, TEACHER_CLASS
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementError, setManagementError] = useState('');
  const [managementData, setManagementData] = useState({ teachers: [], classes: [] });
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [createClassForm, setCreateClassForm] = useState({
    classCode: '',
    className: '',
    startDate: '',
    teacherId: '',
    teacherRole: 'MAIN_TEACHER',
    notes: ''
  });
  const [assignTeacherForm, setAssignTeacherForm] = useState({
    classCode: '',
    teacherId: '',
    role: 'MAIN_TEACHER',
    notes: ''
  });
  const [handoverForm, setHandoverForm] = useState({
    classCode: '',
    studentCodesText: '',
    notes: ''
  });
  const [csvPreviewCodes, setCsvPreviewCodes] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvParseError, setCsvParseError] = useState('');
  const csvInputRef = useRef(null);

  // Lấy thông tin user hiện tại
  const currentUser = authApi.getStoredUser();
  const isCurrentUserAdmin = hasAdminRole(currentUser?.roles);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    if (!isCurrentUserAdmin) {
      alert('Bạn không có quyền truy cập trang này!');
      window.location.href = '/';
      return;
    }
  }, [isCurrentUserAdmin]);

  useEffect(() => {
    fetchUsers();
    fetchManagementData();
  }, []);

  useEffect(() => {
    setAdminMainTab(isTeacherClassPage ? 'TEACHER_CLASS' : 'USERS');
  }, [isTeacherClassPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await authApi.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoadError(error?.response?.data?.message || 'Không thể tải danh sách người dùng. Vui lòng kiểm tra quyền ADMIN hoặc API backend.');
      setUsers([]);
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
      alert('Vui lòng nhập mã lớp');
      return;
    }
    if (!assignTeacherForm.teacherId) {
      alert('Vui lòng chọn giảng viên');
      return;
    }

    try {
      await authApi.assignTeacherByClassCode({
        classCode: assignTeacherForm.classCode.trim(),
        teacherId: Number(assignTeacherForm.teacherId),
        role: assignTeacherForm.role,
        notes: assignTeacherForm.notes,
      });
      alert('Đã phân công giảng viên quản lý lớp thành công');
      setAssignTeacherForm((prev) => ({ ...prev, notes: '' }));
      fetchManagementData();
    } catch (error) {
      alert(error?.response?.data?.message || 'Phân công giảng viên thất bại');
    }
  };

  const handleCreateClassAndAssignTeacher = async () => {
    const classCode = createClassForm.classCode.trim();
    const className = createClassForm.className.trim();

    if (!classCode) {
      alert('Vui lòng nhập mã lớp');
      return;
    }
    if (!className) {
      alert('Vui lòng nhập tên lớp');
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

      alert(
        createClassForm.teacherId
          ? `Đã tạo lớp ${createdClass?.code || classCode} và gán giảng viên thành công.`
          : `Đã tạo lớp ${createdClass?.code || classCode} thành công. Bạn có thể tải danh sách học viên ngay ở khung bên dưới.`
      );
    } catch (error) {
      alert(error?.response?.data?.message || 'Tạo lớp thất bại');
    } finally {
      setCreateClassLoading(false);
    }
  };

  const handleAssignStudentsByClassCode = async () => {
    if (!handoverForm.classCode.trim()) {
      alert('Vui lòng nhập mã lớp');
      return;
    }

    const manualCodes = parseStudentCodes(handoverForm.studentCodesText);
    const studentCodes = [...new Set([...(manualCodes || []), ...(csvPreviewCodes || [])])];

    if (studentCodes.length === 0) {
      alert('Vui lòng nhập mã học viên thủ công hoặc upload CSV trước khi bàn giao');
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
        alert(`Đã bàn giao ${result?.success || 0} học viên, thất bại ${failed}. Vui lòng kiểm tra mã học viên.`);
      } else {
        alert(`Đã bàn giao thành công ${result?.success || 0} học viên vào lớp ${result?.classCode || handoverForm.classCode}.`);
      }

      setHandoverForm((prev) => ({ ...prev, studentCodesText: '', notes: '' }));
      clearCsvPreview();
      fetchManagementData();
    } catch (error) {
      alert(error?.response?.data?.message || 'Bàn giao danh sách học viên thất bại');
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = (user.fullName || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = fullName.includes(query) || username.includes(query) || email.includes(query);
    
    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && Array.isArray(user.roles) && user.roles.includes(activeTab);
  });

  const handleToggleActive = async (userId) => {
    try {
      await authApi.toggleUserActive(userId);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !user.isActive } : user
      ));
    } catch (error) {
      alert('Lỗi khi thay đổi trạng thái: ' + error.message);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    try {
      await authApi.adminChangePassword(selectedUser.id, newPassword);
      alert(`Đã đổi mật khẩu cho ${selectedUser.fullName}`);
      setShowModal(null);
      setNewPassword('');
    } catch (error) {
      alert('Lỗi khi đổi mật khẩu: ' + error.message);
    }
  };

  const handleEditUser = (user) => {
    // Không cho phép sửa chính mình
    if (user.id === currentUser?.id) {
      alert('Bạn không thể chỉnh sửa thông tin của chính mình tại đây!');
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
      alert('Không được phép nâng cấp tài khoản lên ADMIN!');
      return;
    }

    // Kiểm tra không được hạ cấp Admin cuối cùng
    const adminUsers = users.filter(u => u.roles.includes('ADMIN'));
    if (selectedUser.roles.includes('ADMIN') && !editForm.roles.includes('ADMIN') && adminUsers.length <= 1) {
      alert('Không thể hạ cấp Admin cuối cùng trong hệ thống!');
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
      alert('Đã cập nhật thông tin thành công');
    } catch (error) {
      alert('Lỗi khi cập nhật: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    // Không cho phép xóa chính mình
    if (userId === currentUser?.id) {
      alert('Bạn không thể xóa chính mình!');
      return;
    }

    // Không cho phép xóa Admin cuối cùng
    const userToDelete = users.find(u => u.id === userId);
    const adminUsers = users.filter(u => u.roles.includes('ADMIN'));
    if (userToDelete?.roles.includes('ADMIN') && adminUsers.length <= 1) {
      alert('Không thể xóa Admin cuối cùng trong hệ thống!');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await authApi.deleteUser(userId);
        setUsers(users.filter(user => user.id !== userId));
        alert('Đã xóa người dùng thành công');
      } catch (error) {
        console.error('Delete user error:', error);
        console.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.error || error.message;
        alert('Lỗi khi xóa người dùng: ' + errorMessage);
      }
    }
  };

  return (
    <AdminLayout
      title={adminMainTab === 'USERS' ? 'Quản trị người dùng' : 'Quản trị giảng viên & lớp'}
      subtitle={adminMainTab === 'USERS'
        ? 'Quản lý tài khoản và phân quyền người dùng'
        : 'Phân công giảng viên, tạo lớp và bàn giao học viên'}
    >
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
              {adminMainTab === 'USERS' ? (
                <Users size={32} style={{ color: '#0056d2' }} />
              ) : (
                <School size={32} style={{ color: '#0056d2' }} />
              )}
              <span style={{
                background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent'
              }}>
                {adminMainTab === 'USERS' ? 'Quản lý người dùng' : 'Quản lý giảng viên & lớp'}
              </span>
            </h1>
            <p style={{ color: '#6b7280', marginTop: 8, fontSize: 16 }}>
              {adminMainTab === 'USERS'
                ? (
                  <>
                    Tổng cộng <strong>{users.length}</strong> người dùng • {users.filter(u => u.isActive).length} đang hoạt động
                  </>
                )
                : (
                  <>
                    <strong>{managementData.teachers.length}</strong> giảng viên • <strong>{managementData.classes.length}</strong> lớp học
                  </>
                )}
            </p>
          </div>
          
          {adminMainTab === 'USERS' && (
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
          )}
        </div>

        {adminMainTab === 'USERS' ? (
        <React.Fragment>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', gap: 4, marginBottom: 24,
          background: 'white', padding: 8, borderRadius: 16,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          {[
            { key: 'ALL', label: 'Tất cả', icon: Users, count: users.length },
            { key: 'ADMIN', label: 'Quản trị viên', icon: Shield, count: users.filter(u => u.roles.includes('ADMIN')).length },
            { key: 'MANAGER', label: 'Quản lý', icon: Target, count: users.filter(u => u.roles.includes('MANAGER')).length },
            { key: 'TEACHER', label: 'Giáo viên', icon: GraduationCap, count: users.filter(u => u.roles.includes('TEACHER')).length },
            { key: 'STUDENT', label: 'Học viên', icon: BookOpen, count: users.filter(u => u.roles.includes('STUDENT')).length }
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
            {filteredUsers.length} kết quả
          </div>
        </div>

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
                <th style={{ 
                  padding: 20, textAlign: 'left', fontWeight: 700, color: '#1e293b',
                  fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16} />
                    Trạng thái
                  </div>
                </th>
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
                      
                      {/* Chỉ hiển thị nút Edit nếu không phải chính mình */}
                      {user.id !== currentUser?.id && (
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
                      
                      {/* Chỉ hiển thị nút Delete nếu không phải chính mình và không phải Admin cuối */}
                      {user.id !== currentUser?.id && !(user.roles.includes('ADMIN') && users.filter(u => u.roles.includes('ADMIN')).length <= 1) && (
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
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </React.Fragment>
        ) : (
          <div>
            {managementError && (
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
                {managementError}
              </div>
            )}

            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 18,
              marginBottom: 16
            }}>
              <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                <School size={18} />
                Tạo lớp nhanh và gán giảng viên
              </h3>
              <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13 }}>
                Sau khi tạo lớp, mã lớp sẽ tự điền vào phần phân công và bàn giao học viên ngay bên dưới.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr 1fr 1fr', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Mã lớp (VD: IELTS-A1-2026)"
                  value={createClassForm.classCode}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, classCode: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                />

                <input
                  type="text"
                  placeholder="Tên lớp"
                  value={createClassForm.className}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, className: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                />

                <input
                  type="date"
                  value={createClassForm.startDate}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                />

                <select
                  value={createClassForm.teacherId}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                >
                  <option value="">(Tuỳ chọn) Chọn giảng viên</option>
                  {managementData.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName} {teacher.teacherCode ? `(${teacher.teacherCode})` : ''}
                    </option>
                  ))}
                </select>

                <select
                  value={createClassForm.teacherRole}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, teacherRole: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  disabled={!createClassForm.teacherId}
                >
                  <option value="MAIN_TEACHER">Giảng viên chính</option>
                  <option value="ASSISTANT">Trợ giảng</option>
                  <option value="SUBSTITUTE">Giảng viên thay thế</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Ghi chú lớp (tuỳ chọn)"
                  value={createClassForm.notes}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                />

                <button
                  onClick={handleCreateClassAndAssignTeacher}
                  disabled={createClassLoading || managementLoading}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: 'white',
                    fontWeight: 700,
                    padding: '11px 16px',
                    cursor: 'pointer',
                    minWidth: 190
                  }}
                >
                  {createClassLoading ? 'Đang tạo lớp...' : 'Tạo lớp / gán GV'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
                <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                  <UserPlus size={18} />
                  Phân công giảng viên quản lý lớp theo mã
                </h3>

                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Mã lớp (VD: IELTS-A1-2026)"
                    value={assignTeacherForm.classCode}
                    onChange={(e) => setAssignTeacherForm((prev) => ({ ...prev, classCode: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  />

                  <select
                    value={assignTeacherForm.teacherId}
                    onChange={(e) => setAssignTeacherForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  >
                    <option value="">Chọn giảng viên</option>
                    {managementData.teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName} {teacher.teacherCode ? `(${teacher.teacherCode})` : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    value={assignTeacherForm.role}
                    onChange={(e) => setAssignTeacherForm((prev) => ({ ...prev, role: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  >
                    <option value="MAIN_TEACHER">Giảng viên chính (MAIN_TEACHER)</option>
                    <option value="ASSISTANT">Trợ giảng (ASSISTANT)</option>
                    <option value="SUBSTITUTE">Giảng viên thay thế (SUBSTITUTE)</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Ghi chú phân công (tuỳ chọn)"
                    value={assignTeacherForm.notes}
                    onChange={(e) => setAssignTeacherForm((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  />

                  <button
                    onClick={handleAssignTeacherByClassCode}
                    disabled={managementLoading}
                    style={{
                      border: 'none',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #0056d2 0%, #003380 100%)',
                      color: 'white',
                      fontWeight: 700,
                      padding: '11px 14px',
                      cursor: 'pointer'
                    }}
                  >
                    Phân công giảng viên
                  </button>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
                <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                  <ClipboardList size={18} />
                  Bàn giao danh sách học viên theo mã lớp
                </h3>

                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Mã lớp (VD: IELTS-A1-2026)"
                    value={handoverForm.classCode}
                    onChange={(e) => setHandoverForm((prev) => ({ ...prev, classCode: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  />

                  <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Upload CSV để xem trước danh sách học viên
                    </div>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvUploadForHandover}
                      style={{ width: '100%' }}
                    />

                    {csvParseError && (
                      <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' }}>
                        {csvParseError}
                      </div>
                    )}

                    {csvPreviewCodes.length > 0 && (
                      <div style={{ border: '1px solid #bfdbfe', borderRadius: 8, background: '#eff6ff', padding: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 700 }}>
                            Xem trước từ file: {csvFileName || 'CSV'} • {csvPreviewCodes.length} mã học viên
                          </div>
                          <button
                            type="button"
                            onClick={clearCsvPreview}
                            style={{ border: '1px solid #93c5fd', background: 'white', color: '#1d4ed8', borderRadius: 6, fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
                          >
                            Xóa file
                          </button>
                        </div>
                        <div style={{ maxHeight: 130, overflowY: 'auto', fontSize: 12, color: '#1e293b', display: 'grid', gap: 4 }}>
                          {csvPreviewCodes.slice(0, 150).map((code) => (
                            <div key={code} style={{ fontFamily: 'monospace' }}>{code}</div>
                          ))}
                          {csvPreviewCodes.length > 150 && (
                            <div style={{ color: '#64748b' }}>... và {csvPreviewCodes.length - 150} mã khác</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <textarea
                    rows={6}
                    placeholder="Thêm thủ công: nhập mã học viên / username\nMỗi dòng 1 mã hoặc phân tách bằng dấu phẩy"
                    value={handoverForm.studentCodesText}
                    onChange={(e) => setHandoverForm((prev) => ({ ...prev, studentCodesText: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10, resize: 'vertical' }}
                  />

                  <input
                    type="text"
                    placeholder="Ghi chú bàn giao (tuỳ chọn)"
                    value={handoverForm.notes}
                    onChange={(e) => setHandoverForm((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10 }}
                  />

                  <button
                    onClick={handleAssignStudentsByClassCode}
                    disabled={managementLoading}
                    style={{
                      border: 'none',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                      color: 'white',
                      fontWeight: 700,
                      padding: '11px 14px',
                      cursor: 'pointer'
                    }}
                  >
                    Bàn giao danh sách
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
                <h4 style={{ margin: '0 0 12px', color: '#0f172a' }}>
                  Danh sách giảng viên ({managementData.teachers.length})
                </h4>
                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                  {managementData.teachers.map((teacher) => (
                    <div key={teacher.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{teacher.fullName}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {teacher.teacherCode ? `Mã GV: ${teacher.teacherCode}` : 'Chưa có mã GV'} • {teacher.classCount || 0} lớp đang quản lý
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
                <h4 style={{ margin: '0 0 12px', color: '#0f172a' }}>
                  Danh sách lớp ({managementData.classes.length})
                </h4>
                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                  {managementData.classes.map((clazz) => (
                    <div key={clazz.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{clazz.code} - {clazz.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {clazz.teacherCount || 0} GV • {clazz.activeStudentCount || 0} học viên active
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
    </AdminLayout>
  );
};
