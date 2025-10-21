// src/routes/PortalGuard.jsx
import { Navigate, useLocation } from "react-router-dom";

const ROLE_NAME_BY_ID = { 1: "student", 2: "parent", 3: "teacher" };

export default function PortalGuard({ requireRole, children }) {
  const location = useLocation();
  const raw = sessionStorage.getItem("portal.user");
  const user = raw ? JSON.parse(raw) : null;

  const roleName =
    user?.role ||
    user?.role_name ||
    ROLE_NAME_BY_ID[user?.role_id] ||
    "";

  if (!user) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }
  if (requireRole && roleName !== requireRole) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
