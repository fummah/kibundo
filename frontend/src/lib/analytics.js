// src/lib/analytics.js
export function track(event, props = {}) {
  // no-op tracker; replace with your real analytics later
  if (import.meta.env.DEV) {
    // Keep this quiet if you like
    console.debug("[track]", event, props);
  }
}
