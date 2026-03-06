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
      window.location.href = '/login';
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
    const { token, user } = response.data;
    
    // Lưu token và user info vào localStorage
    if (token) {
      localStorage.setItem('authToken', token);
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
    return user.roles.some(role => role.name === roleName);
  },

  // Kiểm tra có ít nhất 1 trong các roles
  hasAnyRole: (roleNames) => {
    const user = authApi.getStoredUser();
    if (!user || !user.roles) return false;
    return user.roles.some(role => roleNames.includes(role.name));
  },
};

export default apiClient;
