import { Navigate, useLocation } from 'react-router-dom';

/**
 * Bảo vệ route: nếu chưa đăng nhập (không có authToken) → redirect /login
 * Sau khi login xong sẽ redirect lại trang ban đầu (via state.from)
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
