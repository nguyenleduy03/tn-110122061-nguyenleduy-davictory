import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, clearAuthSession, getTokenExpiryMs } from '../services/authApi';

export const useTokenExpiry = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const syncAuthState = () => {
      const token = localStorage.getItem('authToken');

      if (!token) {
        return null;
      }

      const expiryMs = getTokenExpiryMs(token);
      if (!expiryMs) {
        clearAuthSession();
        navigate('/login', { replace: true });
        return null;
      }

      const remainingMs = expiryMs - Date.now();
      if (remainingMs <= 0 || !authApi.isAuthenticated()) {
        clearAuthSession();
        navigate('/login', { replace: true });
        return null;
      }

      return remainingMs;
    };

    const remainingMs = syncAuthState();
    if (remainingMs === null) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      clearAuthSession();
      navigate('/login', { replace: true });
    }, remainingMs);

    const intervalId = window.setInterval(syncAuthState, 30000);

    const handleStorageChange = (event) => {
      if (event.key === 'authToken' || event.key === 'tokenExpiry' || event.key === 'user') {
        syncAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);
};
