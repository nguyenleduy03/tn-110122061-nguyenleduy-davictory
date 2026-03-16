import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/authApi';
import '../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Hiển thị thông báo từ trang đăng ký
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Xóa message sau 5 giây
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.login(formData);
      
      console.log('Đăng nhập thành công:', result);
      
      // Chuyển hướng theo role của user
      let targetPath = '/';
      const userRoles = result.user?.roles || [];
      
      if (location.state?.from?.pathname) {
        targetPath = location.state.from.pathname;
      } else if (userRoles.includes('ADMIN')) {
        targetPath = '/admin';
      } else if (userRoles.includes('TEACHER') || userRoles.includes('MANAGER')) {
        targetPath = '/lms/teacher';
      } else if (userRoles.includes('STUDENT')) {
        targetPath = '/';
      }

      navigate(targetPath, { replace: true });
      
      // Reload để cập nhật navbar
      window.location.reload();
      
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <div className="auth-logo-mark">DA</div>
              <span className="auth-logo-text">DAVictory.com</span>
            </Link>
            <h1 className="auth-title">Đăng nhập</h1>
            <p className="auth-subtitle">Chào mừng bạn quay trở lại! 👋</p>
          </div>

          {successMessage && (
            <div className="auth-success-message">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="auth-error">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Tên đăng nhập
              </label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-input"
                placeholder="Nhập tên đăng nhập"
                value={formData.username}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mật khẩu
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-footer">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <Link to="/forgot-password" className="link-primary">
                Quên mật khẩu?
              </Link>
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-divider">
            <span>hoặc đăng nhập với</span>
          </div>

          <div className="auth-social">
            <button className="btn-social">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.879V12.89h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.989C16.343 19.129 20 14.99 20 10c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
              </svg>
              Facebook
            </button>
            <button className="btn-social">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" fill="#4285F4"/>
                <path d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z" fill="#34A853"/>
                <path d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z" fill="#FBBC05"/>
                <path d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          <p className="auth-footer-text">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="link-primary">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
