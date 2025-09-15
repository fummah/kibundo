// src/lib/homeworkProgress.js
export const PROGRESS_KEY = "kibundo.homework.progress.v1";

export function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeProgress(step) {
  try {
    // step: 0|1|2|3  (0 = no active resume)
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ step }));
  } catch {}
}

export function clearProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {}
}

/** Returns a route string if resumable, or null if nothing to resume */
export function computeResumeRoute() {
  const { step } = readProgress();
  switch (step) {
    case 1:
      return "/student/homework/doing";
    case 2:
      return "/student/homework/chat";
    case 3:
      return "/student/homework/feedback";
    default:
      return null; // 0 or unknown -> not resumable
  }
}

/** Convenience: boolean for UI */
export function hasResume() {
  return !!computeResumeRoute();
}
