import axios from 'axios';

const AUTH_KEYS = ['authToken', 'tokenExpiry', 'user'];

const decodeJwtPayload = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

const getTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  if (payload?.exp) return payload.exp * 1000;
  const stored = parseInt(localStorage.getItem('tokenExpiry') || '', 10);
  return isFinite(stored) ? stored : null;
};

const isTokenExpired = (token) => {
  const expiry = getTokenExpiryMs(token);
  return expiry === null || Date.now() >= expiry;
};

const clearAuthSession = () => {
  AUTH_KEYS.forEach(key => localStorage.removeItem(key));
};

const redirectToLogin = () => {
  if (!window.location.pathname.startsWith('/ai-test/login')) {
    window.location.href = '/ai-test/login';
  }
};

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
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
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    const { accessToken, user } = res.data;
    if (accessToken) {
      const expiry = getTokenExpiryMs(accessToken) || (Date.now() + 86400000);
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('tokenExpiry', String(expiry));
    }
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    if (isTokenExpired(token)) {
      clearAuthSession();
      return false;
    }
    return true;
  },

  getStoredUser: () => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

  hasRole: (roleName) => {
    const user = authApi.getStoredUser();
    if (!user?.roles) return false;
    return normalizeRoles(user.roles).includes(roleName);
  },

  hasAnyRole: (roleNames) => {
    const user = authApi.getStoredUser();
    if (!user?.roles) return false;
    const roles = normalizeRoles(user.roles);
    return roleNames.some(r => roles.includes(r));
  },

  getUserRoleRank: () => {
    const user = authApi.getStoredUser();
    if (!user?.roles) return 0;
    const ranks = normalizeRoles(user.roles).map(r => ROLE_RANK[r] ?? -1);
    return Math.max(...ranks, 0);
  },

  clearAuthSession,
  getTokenExpiryMs,
};

const ROLE_RANK = { GUEST: 0, STUDENT: 1, TEACHER: 2, MANAGER: 3, ADMIN: 4 };

const normalizeRoles = (roles) => {
  if (!roles) return [];
  const arr = Array.isArray(roles) ? roles : Array.from(roles);
  return arr.map(r => typeof r === 'string' ? r : (r?.name || r?.roleName || r?.authority || String(r)));
};

export { clearAuthSession, isTokenExpired, getTokenExpiryMs, ROLE_RANK, normalizeRoles };
