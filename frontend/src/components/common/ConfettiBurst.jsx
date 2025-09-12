import React, { useEffect } from "react";

// localStorage keys
const PROGRESS_KEY = "kibundo.homework.progress.v1";
const CONFETTI_KEY = "kibundo.confetti.shown.v1";

/**
 * Fires a short canvas-confetti burst ONCE per taskId.
 * If no taskId is supplied, it still fires once per session (page load).
 */
export default function ConfettiBurst({ taskId }) {
  useEffect(() => {
    let cancelled = false;

    const shown = (() => {
      try { return JSON.parse(localStorage.getItem(CONFETTI_KEY) || "{}"); }
      catch { return {}; }
    })();

    const key = taskId || "__no_task__";
    if (shown[key]) return; // already shown for this task

    // Mark as shown immediately to avoid duplicates if user re-renders
    try {
      localStorage.setItem(CONFETTI_KEY, JSON.stringify({ ...shown, [key]: true }));
    } catch {}

    (async () => {
      const mod = await import("canvas-confetti").catch(() => null);
      if (!mod || cancelled) return;
      const confetti = mod.default || mod;

      // Two quick bursts
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
      setTimeout(() => !cancelled && confetti({ particleCount: 90, spread: 100, origin: { y: 0.6 } }), 250);
    })();

    return () => { cancelled = true; };
  }, [taskId]);

  return null;
}

/** Helper to read taskId from progress if needed elsewhere */
export function readCurrentTaskId() {
  try {
    const { taskId } = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return taskId || null;
  } catch {
    return null;
  }
}
