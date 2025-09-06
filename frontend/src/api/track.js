// src/api/track.js

/**
 * Core tracker (you can later wire this to Mixpanel/GA/your API).
 */
export function track(event, payload = {}) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[track]", event, payload);
  }
  return Promise.resolve({ ok: true });
}

/**
 * Back-compat shim for callers expecting `logTaskEvent(...)`.
 * Keep both exports so older code keeps working.
 */
export function logTaskEvent(event, payload = {}) {
  return track(event, payload);
}

/**
 * Optional convenience alias some codebases use.
 */
export const trackEvent = logTaskEvent;

export default track;
