// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { isAllowed, toRoleId, ROLE_PATHS } from "@/utils/roleMapper";

/**
 * ProtectedRoute
 * - If not authenticated → redirect to /signin with return state
 * - If allowedRoles provided → check current user's role id against it
 * - Supports user role coming as role_id | roleId | role.id
 * - Supports either a single role or an array for `allowedRoles`
 * - Optional: pass `redirectTo` to customize unauthorized redirect (default: role home or /unauthorized)
 */
export default function ProtectedRoute({ allowedRoles = [], redirectTo = "/unauthorized", children }) {
  const { isAuthenticated, user, loading } = useAuthContext?.() || {};
  const location = useLocation();

  // While auth context is still hydrating, avoid flicker
  if (loading) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Normalize role id from several shapes
  const roleId = toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id);

  // Normalize allowedRoles to an array of numbers
  const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (rolesList.length && !isAllowed(roleId, rolesList)) {
    // Prefer sending the user to their home based on role
    const roleHome = ROLE_PATHS?.[roleId] || redirectTo || "/";
    return <Navigate to={roleHome} replace />;
  }

  return children || <Outlet />;
}
