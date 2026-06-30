import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force password change on first login/reset
  if (user?.changePasswordNextLogin && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Prevent accessing change-password page if not required
  if (!user?.changePasswordNextLogin && location.pathname === '/change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but does not have the required role
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
