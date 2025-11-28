// src/utils/homework/homeworkHelpers.js

/**
 * Generate a unique task ID
 */
export const makeId = () =>
  "task_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * Format a chat message
 */
export const fmt = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  sender: from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

/**
 * Quota-safe save with progressive fallback
 */
export const trySaveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

