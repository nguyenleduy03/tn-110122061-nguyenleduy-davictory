import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Tạo axios instance với config mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để tự động thêm token vào mỗi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý lỗi 401 (Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Chỉ redirect nếu không phải đang ở trang login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== AUTH APIs =====

export const authApi = {
  // Đăng ký tài khoản mới
  register: async (registerData) => {
    const response = await apiClient.post('/auth/register', registerData);
    return response.data;
  },

  // Đăng nhập
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    // Backend trả về: { accessToken, refreshToken, tokenType, user }
    const { accessToken, user } = response.data;

    // Lưu token và user info vào localStorage
    if (accessToken) {
      localStorage.setItem('authToken', accessToken);
    }
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return response.data;
  },

  // Đăng xuất
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Kiểm tra đã đăng nhập chưa
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // Lấy user từ localStorage
  getStoredUser: () => {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },

  // Kiểm tra role của user
  hasRole: (roleName) => {
    const user = authApi.getStoredUser();
    if (!user || !user.roles) return false;
    // roles là Set<String> từ backend: ["ADMIN", "STUDENT", ...]
    return user.roles.includes(roleName);
  },

  // Kiểm tra có ít nhất 1 trong các roles
  hasAnyRole: (roleNames) => {
    const user = authApi.getStoredUser();
    if (!user || !user.roles) return false;
    return user.roles.some(role => roleNames.includes(role));
  },

  // Cập nhật thông tin profile
  updateProfile: async (userId, data) => {
    const response = await apiClient.put(`/users/me`, data);
    // Cập nhật lại user trong localStorage
    const stored = authApi.getStoredUser();
    if (stored) {
      localStorage.setItem('user', JSON.stringify({ ...stored, ...response.data }));
      window.dispatchEvent(new Event('profileUpdated'));
    }
    return response.data;
  },

  // Import học viên từ CSV
  importStudentsFromCSV: async (csvFile) => {
    const formData = new FormData();
    formData.append('file', csvFile);
    
    const response = await apiClient.post('/admin/users/import-students', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Lấy tất cả người dùng (chỉ Admin)
  getAllUsers: async () => {
    const response = await apiClient.get('/admin/users');
    const payload = response.data;

    // Hỗ trợ nhiều format backend: [] | {content: []} | {data: []}
    const rawUsers = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    return rawUsers.map((u) => {
      const rawRoles = Array.isArray(u?.roles) ? u.roles : [];
      const normalizedRoles = rawRoles.map((r) => {
        if (typeof r === 'string') return r;
        return r?.name || r?.roleName || r?.authority || String(r);
      });

      return {
        ...u,
        roles: normalizedRoles,
        isActive: typeof u?.isActive === 'boolean' ? u.isActive : (typeof u?.active === 'boolean' ? u.active : true),
        fullName: u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || 'Unknown',
        email: u?.email || '',
      };
    });
  },

  // Cập nhật trạng thái active của user
  toggleUserActive: async (userId) => {
    const response = await apiClient.put(`/admin/users/${userId}/toggle-active`);
    return response.data;
  },

  // Đổi mật khẩu user (Admin)
  adminChangePassword: async (userId, newPassword) => {
    const response = await apiClient.put(`/admin/users/${userId}/admin-change-password`, {
      newPassword
    });
    return response.data;
  },

  // Cập nhật thông tin user (Admin)
  updateUser: async (userId, userData) => {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  // Xóa user (Admin)
  deleteUser: async (userId) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Tải template CSV
  downloadCSVTemplate: () => {
    const csvContent = `username,firstname,lastname,email,password,cohort1
VIC009999,Nguyễn Văn,An,VIC009999@gmail.com,@VIC009999,VIC260312IE45A
VIC009998,Trần Thị,Bình,VIC009998@gmail.com,@VIC009998,VIC260312IE45A`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Lấy dữ liệu quản lý giảng viên/lớp cho admin
  getTeacherClassManagement: async () => {
    const response = await apiClient.get('/admin/users/teacher-class-management');
    return response.data;
  },

  // Tạo lớp nhanh từ màn quản lý admin
  createClassForAdmin: async (payload) => {
    const response = await apiClient.post('/admin/users/create-class', payload);
    return response.data;
  },

  // Phân công giáo viên quản lý lớp theo mã lớp
  assignTeacherByClassCode: async ({ classCode, teacherId, role = 'MAIN_TEACHER', notes = '' }) => {
    const response = await apiClient.post('/admin/users/assign-teacher-by-class-code', {
      classCode,
      teacherId,
      role,
      notes,
    });
    return response.data;
  },

  // Bàn giao danh sách học viên vào lớp theo mã lớp
  assignStudentsByClassCode: async ({ classCode, studentCodes, notes = '' }) => {
    const response = await apiClient.post('/admin/users/assign-students-by-class-code', {
      classCode,
      studentCodes,
      notes,
    });
    return response.data;
  },

  // API quản lý lớp dùng chung cho ADMIN/TEACHER
  getMyClassManagement: async () => {
    const response = await apiClient.get('/class-management/my');
    return response.data;
  },

  // Tạo lớp học mới
  createClass: async (classData) => {
    const response = await apiClient.post('/class-management/create', classData);
    return response.data;
  },

  assignStudentsByClassCodeScoped: async ({ classCode, studentCodes, notes = '' }) => {
    const response = await apiClient.post('/class-management/assign-students-by-class-code', {
      classCode,
      studentCodes,
      notes,
    });
    return response.data;
  },

  updateClassInfo: async (classId, payload) => {
    const response = await apiClient.put(`/class-management/classes/${classId}`, payload);
    return response.data;
  },

  // Xóa học viên khỏi lớp
  removeStudentFromClass: async (classId, studentId) => {
    const response = await apiClient.delete(`/class-management/classes/${classId}/students/${studentId}`);
    return response.data;
  },

  // Cập nhật giảng viên cho lớp
  updateClassTeacher: async (classId, teacherId) => {
    const response = await apiClient.put(`/class-management/classes/${classId}/teacher`, { teacherId });
    return response.data;
  },
};
