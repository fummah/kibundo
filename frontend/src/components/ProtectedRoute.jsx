// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuthContext();
  const role = user?.role_id;

  // 🔐 Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" replace />;
  }

  // 🚫 Role not permitted
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ Access granted
  return children || <Outlet />;
}
