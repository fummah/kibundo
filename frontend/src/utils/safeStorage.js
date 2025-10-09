// src/utils/safeStorage.js
const canUse = () => {
    try {
      const t = "__probe__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch {
      return false;
    }
  };
  
  export const safeStorage = {
    get(key, fallback = null) {
      if (!canUse()) return fallback;
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, val) {
      if (!canUse()) return;
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        // If we exceed quota, try to trim known heavy keys then retry once
        try {
          localStorage.removeItem("kibundo.chat.v1");          // old chat cache
          localStorage.removeItem("kibundo.homework.tasks.v1"); // if too big
          localStorage.setItem(key, JSON.stringify(val));
        } catch {
          // Give up silently; caller can decide to ignore
        }
      }
    },
    remove(key) {
      if (!canUse()) return;
      try { localStorage.removeItem(key); } catch {}
    }
  };
  