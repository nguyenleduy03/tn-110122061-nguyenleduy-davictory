import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, clearAuthSession, isTokenExpired } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(() => {
    const authenticated = authApi.isAuthenticated();
    if (authenticated) {
      setUser(authApi.getStoredUser());
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    syncUser();
    setLoading(false);
  }, [syncUser]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const expiryMs = authApi.getTokenExpiryMs(token);
    if (!expiryMs) return;

    const timeout = setTimeout(() => {
      clearAuthSession();
      setUser(null);
      if (!window.location.pathname.startsWith('/ai-test/login')) {
        window.location.href = '/ai-test/login';
      }
    }, Math.max(0, expiryMs - Date.now()));

    return () => clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token && isTokenExpired(token)) {
        clearAuthSession();
        setUser(null);
        if (!window.location.pathname.startsWith('/ai-test/login')) {
          window.location.href = '/ai-test/login';
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (['authToken', 'user', 'tokenExpiry'].includes(e.key)) {
        syncUser();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncUser]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  const isAuthenticated = () => authApi.isAuthenticated();
  const hasRole = (role) => authApi.hasRole(role);
  const hasAnyRole = (roles) => authApi.hasAnyRole(roles);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, isAuthenticated, hasRole, hasAnyRole, syncUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
