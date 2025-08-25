// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext"; // keep the alias here too

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, user } = useAuthContext();
  const role = user?.role_id;

  // not logged in
  if (!isAuthenticated || !user) return <Navigate to="/signin" replace />;

  // role not permitted
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
}
