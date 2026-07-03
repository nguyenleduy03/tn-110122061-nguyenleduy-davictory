import { useAuth } from '../context/AuthContext';
import { ROLE_RANK, normalizeRoles } from '../api/authApi';

export default function RoleBasedRoute({ children, requiredRole, allowHigher = true }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  if (!isAuthenticated()) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    return null;
  }

  if (!requiredRole) return children;

  const userRoles = normalizeRoles(user?.roles);

  if (userRoles.length === 0) {
    window.location.href = '/';
    return null;
  }

  const requiredRank = ROLE_RANK[requiredRole] ?? 999;
  const canAccess = userRoles.some(role => {
    const rank = ROLE_RANK[role] ?? -1;
    return allowHigher ? rank >= requiredRank : role === requiredRole;
  });

  if (!canAccess) {
    window.location.href = '/';
    return null;
  }

  return children;
}
