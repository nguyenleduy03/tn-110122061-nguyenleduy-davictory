import { useState, useEffect } from 'react';
import { authApi } from '../services/authApi';

export default function AuthDebug() {
  const [authInfo, setAuthInfo] = useState({});

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const user = authApi.getStoredUser();
      const isAuth = authApi.isAuthenticated();
      const hasAdmin = authApi.hasRole('ADMIN');
      
      setAuthInfo({
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        user: user,
        isAuthenticated: isAuth,
        hasAdminRole: hasAdmin,
        timestamp: new Date().toLocaleTimeString()
      });
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: '#f0f0f0', 
      padding: 10, 
      border: '1px solid #ccc',
      borderRadius: 5,
      fontSize: 12,
      zIndex: 9999,
      maxWidth: 300
    }}>
      <h4>🔍 Auth Debug</h4>
      <div><strong>Has Token:</strong> {authInfo.hasToken ? '✅' : '❌'}</div>
      <div><strong>Token Length:</strong> {authInfo.tokenLength}</div>
      <div><strong>Is Authenticated:</strong> {authInfo.isAuthenticated ? '✅' : '❌'}</div>
      <div><strong>Has ADMIN Role:</strong> {authInfo.hasAdminRole ? '✅' : '❌'}</div>
      <div><strong>User:</strong> {authInfo.user?.username || 'None'}</div>
      <div><strong>Roles:</strong> {authInfo.user?.roles?.join(', ') || 'None'}</div>
      <div><strong>Updated:</strong> {authInfo.timestamp}</div>
    </div>
  );
}
