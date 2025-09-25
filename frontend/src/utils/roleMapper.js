// src/utils/roleMapper.js
export const ROLES = Object.freeze({
  STUDENT: 1,
  PARENT: 2,
  TEACHER: 3,
  SCHOOL: 4,
  PARTNER: 5,
  ADMIN: 10, // backend: admin=10
});

// Normalize anything ("3", 3, null) → number or NaN
export const toRoleId = (v) => Number(v);

// Map role → base path
export const ROLE_PATHS = {
  [ROLES.STUDENT]: "/student",
  [ROLES.PARENT]: "/parent",
  [ROLES.TEACHER]: "/teacher",
  [ROLES.SCHOOL]: "/school",
  [ROLES.PARTNER]: "/partner",
  [ROLES.ADMIN]: "/admin",
};

// Helper for guards
export const isAllowed = (currentRole, allowedRoles = []) =>
  allowedRoles.map(Number).includes(toRoleId(currentRole));
