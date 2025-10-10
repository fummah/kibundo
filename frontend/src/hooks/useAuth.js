// src/hooks/useAuth.js
// Legacy hook wrapper that proxies to the new AuthContext.
// This keeps older imports working while removing direct localStorage usage.
import { useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const ctx = useAuthContext();
  // Maintain legacy surface where possible
  return {
    user: ctx.user,
    token: ctx.token,
    isAuthenticated: ctx.isAuthenticated,
    role: ctx.role,
    login: ctx.login,
    logout: ctx.logout,
    updateUserSummary: ctx.updateUserSummary,
  };
}
