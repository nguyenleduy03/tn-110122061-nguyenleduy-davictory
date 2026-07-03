import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;
const AUTH_STORAGE_KEYS = ['authToken', 'refreshToken', 'tokenExpiry', 'user'];

// Tạo axios instance với config mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeRoles = (roles) => {
  if (!roles) return [];
  const roleArray = Array.isArray(roles) ? roles : Array.from(roles);
  return roleArray.map((r) => (typeof r === 'string' ? r : (r?.name || r?.roleName || r?.authority || String(r))));
};

const decodeJwtPayload = (token) => {
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(payload);
  } catch (error) {
    console.warn('[authApi] Failed to decode JWT payload:', error);
    return null;
  }
};

const getTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  if (payload?.exp) {
    return payload.exp * 1000;
  }

  const storedExpiry = Number.parseInt(localStorage.getItem('tokenExpiry') || '', 10);
  return Number.isFinite(storedExpiry) ? storedExpiry : null;
};

const clearAuthSession = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const isTokenExpired = (token) => {
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs === null) {
    return true;
  }

  return Date.now() >= expiryMs;
};

// Interceptor để tự động thêm token vào mỗi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    
    // Kiểm tra token hết hạn trước khi gửi request
    if (token && isTokenExpired(token)) {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(new Error('Token expired'));
    }
    
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
      clearAuthSession();
      redirectToLogin();
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
      const tokenExpiry = getTokenExpiryMs(accessToken) || (Date.now() + 86400000);
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('tokenExpiry', String(tokenExpiry));
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
      clearAuthSession();
    }
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Kiểm tra đã đăng nhập chưa
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) return false;
    
    if (isTokenExpired(token)) {
      clearAuthSession();
      return false;
    }
    
    return true;
  },

  // Lấy user từ localStorage
  getStoredUser: () => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch (error) {
      console.warn('[authApi] Invalid stored user JSON, clearing cache:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  // Kiểm tra role của user
  hasRole: (roleName) => {
    const user = authApi.getStoredUser();
    if (!user || !user.roles) return false;
    return normalizeRoles(user.roles).includes(roleName);
  },

  // Kiểm tra có ít nhất 1 trong các roles
  hasAnyRole: (roleNames) => {
    const user = authApi.getStoredUser();
    if (!user || !user.roles) return false;
    const roles = normalizeRoles(user.roles);
    return roles.some(role => roleNames.includes(role));
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
  getAllUsers: async (includeDeleted = false) => {
    console.log('[authApi] getAllUsers called with includeDeleted:', includeDeleted);
    const token = localStorage.getItem('authToken');
    console.log('[authApi] Token exists:', !!token);
    
    const response = await apiClient.get('/admin/users', {
      params: { includeDeleted },
    });
    console.log('[authApi] Response status:', response.status);
    console.log('[authApi] Response data:', response.data);
    
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

  // Lấy danh sách người dùng theo trang cho trang admin
  getPaginatedUsers: async ({ includeDeleted = false, tab = 'ALL', search = '', page = 0, size = 20 } = {}) => {
    const response = await apiClient.get('/admin/users', {
      params: {
        includeDeleted,
        tab,
        search,
        page,
        size,
      },
    });
    return response.data;
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
  deleteUser: async (userId, password) => {
    const response = await apiClient.delete(`/admin/users/${userId}`, {
      data: { password },
    });
    return response.data;
  },

  clearAuthSession,
  getTokenExpiryMs,

  // Khôi phục user đã xóa
  restoreUser: async (userId) => {
    const response = await apiClient.put(`/admin/users/${userId}/restore`);
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

  // Tạo lớp (cho ADMIN + MANAGER)
  createClassForAdmin: async (payload) => {
    const response = await apiClient.post('/class-management/create', payload);
    return response.data;
  },

  // Phân công giáo viên (cho ADMIN + MANAGER)
  assignTeacherByClassCode: async ({ classCode, teacherId, role = 'MAIN_TEACHER', notes = '' }) => {
    const response = await apiClient.post('/class-management/assign-teacher', {
      classCode,
      teacherId,
      role,
      notes,
    });
    return response.data;
  },

  // Bàn giao danh sách học viên (cho ADMIN + MANAGER)
  assignStudentsByClassCode: async ({ classCode, studentCodes, notes = '' }) => {
    const response = await apiClient.post('/class-management/assign-students-by-class-code', {
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

  // API lấy lớp học cho STUDENT
  getMyClasses: async () => {
    const response = await apiClient.get('/class-management/student/my-classes');
    return response.data;
  },

  // Lấy danh sách tất cả học viên
  getAllStudents: async () => {
    const response = await apiClient.get('/users/role/STUDENT');
    return response.data;
  },

  // Thêm học viên vào lớp
  addStudentsToClass: async (payload) => {
    const response = await apiClient.post('/users/add-students-to-class', payload);
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

  // Xóa lớp (ADMIN, yêu cầu mật khẩu)
  deleteClass: async (classId, password) => {
    const response = await apiClient.delete(`/class-management/classes/${classId}`, {
      data: { password },
    });
    return response.data;
  },

  // HTTP methods cơ bản
  get: async (url, config = {}) => {
    const response = await apiClient.get(url, config);
    return response;
  },

  post: async (url, data = {}, config = {}) => {
    const response = await apiClient.post(url, data, config);
    return response;
  },

  put: async (url, data = {}, config = {}) => {
    const response = await apiClient.put(url, data, config);
    return response;
  },

  delete: async (url, config = {}) => {
    const response = await apiClient.delete(url, config);
    return response;
  },
};

export {
  clearAuthSession,
  getTokenExpiryMs,
  isTokenExpired,
};
