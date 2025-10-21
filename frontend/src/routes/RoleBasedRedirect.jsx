// src/routes/RoleBasedRedirect.jsx
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { ROLE_PATHS, toRoleId } from "@/utils/roleMapper";

export default function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated || !user) return <Navigate to="/signin" replace />;

  const roleId = toRoleId(user.role_id);
  const path = ROLE_PATHS[roleId];
  
  return <Navigate to={path || "/unauthorized"} replace />;
}
