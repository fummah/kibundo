// src/hooks/useStudentId.js
import { useAuthContext } from "@/context/AuthContext";

/**
 * Hook to get the effective student ID
 * - If parent has selected a child account (Netflix-style), returns the child's user ID
 * - If user is a student, returns the student's user ID
 * - Otherwise returns null
 */
export function useStudentId() {
  const { user, account } = useAuthContext();

  // If parent has selected a child account (Netflix-style), use that child's ID
  if (account?.type === "child" && account?.userId) {
    return account.userId;
  }

  // If user is a student, use their own ID
  const roleId = Number(user?.role_id ?? user?.roleId ?? user?.role?.id ?? NaN);
  const isStudent = roleId === 3 || roleId === 4; // ROLES.STUDENT or legacy role 3

  if (isStudent) {
    return user?.id || user?.user_id || null;
  }

  return null;
}

/**
 * Hook to get the effective student ID and account info
 * Returns both the student ID and whether we're in parent-viewing-child mode
 */
export function useStudentContext() {
  const { user, account } = useAuthContext();
  const studentId = useStudentId();
  const isParentViewingChild = account?.type === "child" && account?.userId;

  return {
    studentId,
    isParentViewingChild,
    account,
    user,
  };
}

