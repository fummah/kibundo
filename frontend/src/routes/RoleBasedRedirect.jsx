import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { ROLE_PATHS } from "../utils/roleMapper";

export default function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthContext();

  // 🔒 If user is not logged in, redirect to signin
  if (!isAuthenticated || !user) return <Navigate to="/signin" replace />;

  // ✅ Redirect based on role_id using ROLE_PATHS map
  const path = ROLE_PATHS[user.role_id];

  // 🚫 If role is unknown, go to unauthorized
  return <Navigate to={path || "/unauthorized"} replace />;
}
