// src/auth/permissions.js
export const can = (user, perm) => !!user?.permissions?.includes(perm);
