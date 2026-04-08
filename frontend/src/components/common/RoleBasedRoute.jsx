import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../../services/authApi';

const ROLE_RANK = {
    GUEST: 0,
    STUDENT: 1,
    TEACHER: 2,
    MANAGER: 3,
    ADMIN: 4,
};

function normalizeRoles(roles) {
    if (!roles) return [];
    const roleArray = Array.isArray(roles) ? roles : Array.from(roles);
    return roleArray.map((r) => (typeof r === 'string' ? r : (r?.name || r?.roleName || String(r))));
}

export default function RoleBasedRoute({ children, requiredRole, allowHigher = true }) {
    const isAuthenticated = authApi.isAuthenticated();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!requiredRole) return children;

    const user = authApi.getStoredUser();
    const userRoles = normalizeRoles(user?.roles);

    if (userRoles.length === 0) {
        return <Navigate to="/" replace />;
    }

    const requiredRank = ROLE_RANK[requiredRole] ?? 999;

    const canAccess = userRoles.some((role) => {
        const currentRank = ROLE_RANK[role] ?? -1;
        return allowHigher ? currentRank >= requiredRank : role === requiredRole;
    });

    if (!canAccess) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
