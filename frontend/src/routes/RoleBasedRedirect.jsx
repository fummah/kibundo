// src/routes/RoleBasedRedirect.jsx
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { ROLE_PATHS, toRoleId } from "@/utils/roleMapper";

export default function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated || !user) return <Navigate to="/signin" replace />;

  const path = ROLE_PATHS[toRoleId(user.role_id)];
  return <Navigate to={path || "/unauthorized"} replace />;
}
