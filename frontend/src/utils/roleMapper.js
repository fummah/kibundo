// src/utils/roleMapper.js
export const ROLES = Object.freeze({
  ADMIN: 1,      // change if your backend differs
  TEACHER: 2,
  STUDENT: 3,
  PARENT: 4,
});

// Normalize anything ("3", 3, null) → number or NaN
export const toRoleId = (v) => Number(v);

// Map role → base path
export const ROLE_PATHS = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.TEACHER]: "/teacher",
  [ROLES.STUDENT]: "/student",
  [ROLES.PARENT]: "/parent",
};

// Helper for guards
export const isAllowed = (currentRole, allowedRoles = []) =>
  allowedRoles.map(Number).includes(toRoleId(currentRole));
