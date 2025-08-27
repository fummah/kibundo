// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { isAllowed, toRoleId } from "@/utils/roleMapper";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, user } = useAuthContext();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const roleId = toRoleId(user.role_id);
  if (allowedRoles.length && !isAllowed(roleId, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
}
