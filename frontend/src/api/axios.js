// src/api/axios.js
import axios from "axios";

/* ----------------------------- base URL ----------------------------- */
/**
 * Strategy:
 *  - If VITE_API_BASE is set -> use it.
 *  - Else if in dev -> http://localhost:<VITE_BACKEND_PORT || 8080>/api
 *  - Else (prod) -> '/api' (same-origin, behind reverse-proxy).
 */
const DEFAULT_DEV_PORT = String(import.meta?.env?.VITE_BACKEND_PORT || "8080");

// Resolve base preference with dev safeguards
let RAW_BASE = import.meta?.env?.VITE_API_BASE;
if (!RAW_BASE) {
  // In dev mode, use relative URL to go through Vite proxy
  RAW_BASE = "/api";
} else if (import.meta?.env?.DEV) {
  // If developer provided a relative path (e.g., '/api') in dev, keep it relative
  const trimmed = String(RAW_BASE).trim();
  if (trimmed.startsWith("/")) {
    RAW_BASE = trimmed; // Keep relative for Vite proxy
  }
}

/** Ensures absolute origins get an '/api' path if none was provided. */
const normalizeBase = (raw) => {
  let base = (raw || "").trim();
  if (!base) return "/api"; // Default to relative URL for Vite proxy

  // strip trailing slashes
  base = base.replace(/\/+$/, "");

  // absolute origin with no path -> add '/api'
  if (/^https?:\/\/[^/]+$/i.test(base)) return `${base}/api`;

  // otherwise keep as given (supports '/api', '/v1', 'https://x.y/api', etc.)
  return base;
};

const BASE_URL = normalizeBase(RAW_BASE);

/* ------------------------------ auth mode --------------------------- */
/**
 * AUTH_MODE:
 *  - 'bearer'  -> attach Authorization: Bearer <token> from localStorage
 *  - 'cookie'  -> use session cookies + CSRF (e.g., Laravel Sanctum)
 */
const AUTH_MODE = (import.meta?.env?.VITE_AUTH_MODE || "bearer").toLowerCase();

/** Debug logging for tokens:
 *  '' (default)  -> off
 *  'on'          -> masked logs (first 12 chars)
 *  'full'        -> full token logs (dev only)
 */
const AUTH_DEBUG = String(import.meta?.env?.VITE_AUTH_DEBUG || "on").toLowerCase();

/* ---------------------------- axios instance ------------------------ */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Increased to 60 seconds for uploads
  withCredentials: true, // Always use credentials for proper authentication
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: import.meta?.env?.VITE_XSRF_COOKIE_NAME || "XSRF-TOKEN",
  xsrfHeaderName: import.meta?.env?.VITE_XSRF_HEADER_NAME || "X-XSRF-TOKEN",
});


/* ----------------------------- helpers ------------------------------ */
const TOKEN_KEYS = ["kibundo_token", "token"]; // admin/app token keys (localStorage)
const PORTAL_TOKEN_KEY = "portal.token";       // portal token key (sessionStorage)
const PORTAL_USER_KEY = "portal.user";

const isGet = (cfg) => (cfg?.method || "get").toLowerCase() === "get";
const getMeta = (cfg) => cfg?.meta || {};
const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

const isPortalPath = (pathname) =>
  /^\/(student|parent|teacher)\b/i.test(String(pathname || ""));

const getCookie = (name) => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(
    new RegExp("(^|; )" + encodeURIComponent(name) + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[2]) : "";
};

const looksLikeHtml = (error) => {
  const ct = error?.response?.headers?.["content-type"] || "";
  return ct.includes("text/html");
};

// Single-toast helper: normalize URL and use a keyed message to avoid duplicates
const normalizePath = (u = "") => {
  try {
    const url = new URL(u, window.location.origin);
    return `${url.origin}${url.pathname}`; // drop query/hash
  } catch {
    // relative or invalid: best-effort strip query/hash
    const s = String(u || "");
    return s.split("?")[0].split("#")[0];
  }
};

const toastOnce = (status, url, content) => {
  // Toast functionality removed - let components handle their own messages
  console.warn(`API Error ${status}: ${content}`);
};

const readAdminToken = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {}
  return null;
};

const readPortalToken = () => {
  try {
    return sessionStorage.getItem(PORTAL_TOKEN_KEY);
  } catch {}
  return null;
};

const logToken = (token, where, label = "token") => {
  // Debug logging removed
};

/* --------------------------- CSRF bootstrap ------------------------- */
let csrfBootPromise = null;
const CSRF_URL = import.meta?.env?.VITE_CSRF_URL || "/sanctum/csrf-cookie";
const XSRF_COOKIE_NAME =
  import.meta?.env?.VITE_XSRF_COOKIE_NAME || "XSRF-TOKEN";
const XSRF_HEADER_NAME =
  import.meta?.env?.VITE_XSRF_HEADER_NAME || "X-XSRF-TOKEN";

const ensureCsrfCookie = () => {
  if (AUTH_MODE !== "cookie") return Promise.resolve();
  if (getCookie(XSRF_COOKIE_NAME)) return Promise.resolve();

  if (!csrfBootPromise) {
    const csrfBase = BASE_URL.replace(/\/api\/?$/, "");
    const raw = axios.create({
      baseURL: csrfBase || "",
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      xsrfCookieName: XSRF_COOKIE_NAME,
      xsrfHeaderName: XSRF_HEADER_NAME,
      timeout: 15000,
    });

    csrfBootPromise = raw.get(CSRF_URL).catch(() => {
      // swallow; backend may not need it or proxy might not be set yet
    });
  }
  return csrfBootPromise;
};

/* ------------------------------- boot ------------------------------- */
(() => {
  const t = readAdminToken();
  if (t) {
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
    // Also ensure it's set for all requests
    api.defaults.headers['Authorization'] = `Bearer ${t}`;
  }
})();

/* ----------------------- request interceptor ------------------------ */
api.interceptors.request.use(
  async (config) => {
    // Always try to attach token from localStorage
    const adminToken = readAdminToken();
    if (adminToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${adminToken}`;
      config.headers.authorization = `Bearer ${adminToken}`;
    } else {
    }

    const meta = getMeta(config);
    const here = window?.location?.pathname || "/";
    const inPortalTab = isPortalPath(here);
    const portalToken = readPortalToken();
    const hasExplicitAuth =
      !!(config.headers && Object.prototype.hasOwnProperty.call(config.headers, "Authorization"));


    // When in cookie mode, ensure CSRF (but do NOT strip Authorization in portal tabs).
    const useCookies =
      typeof config.withCredentials === "boolean"
        ? config.withCredentials
        : api.defaults.withCredentials;

    if (AUTH_MODE === "cookie" || useCookies) {
      await ensureCsrfCookie();

      // Only strip Authorization automatically if:
      // - not forced by meta
      // - NOT in a portal tab (portal tab should keep explicit/portal header)
      if (
        !inPortalTab &&
        !meta.forceAuthHeader &&
        config.headers &&
        "Authorization" in config.headers
      ) {
        delete config.headers.Authorization;
      }
    }

    // If caller explicitly set Authorization, we respect it (portal or not).
    if (hasExplicitAuth) {
      return config;
    }

    // Priority 1: In a portal tab, use the portal token (if present)
    if (inPortalTab && portalToken && !meta.noAuthHeader) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${portalToken}`;
      return config;
    }

    // Priority 2: Bearer mode or forced header -> attach admin token (unless disabled)
    const usingBearer =
      AUTH_MODE === "bearer" || (meta.forceAuthHeader && !meta.noAuthHeader);
    if (usingBearer && !meta.noAuthHeader) {
      const adminToken = readAdminToken();
      if (adminToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${adminToken}`;
        config.headers.authorization = `Bearer ${adminToken}`; // lowercase too
      }
    }

    // Fallback: Always try to attach token if not already present
    if (!config.headers?.Authorization && !config.headers?.authorization) {
      const adminToken = readAdminToken();
      if (adminToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${adminToken}`;
        config.headers.authorization = `Bearer ${adminToken}`;
      }
    }


    return config;
  },
  (error) => Promise.reject(error)
);

/* ----------------------- response interceptor ----------------------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error?.config || {};
    const meta = getMeta(cfg);
    const status = error?.response?.status;

    if (isCanceled(error)) return Promise.reject(error);

    if (!error.response) {
      if (meta.toastNetwork !== false) {
        console.warn("Network error. Please check your connection.");
      }
      return Promise.reject(error);
    }

    // 404 from Vite without proxy often returns index.html (text/html)
    if (looksLikeHtml(error)) {
      // No toast here; let backend/consumers handle messaging
      return Promise.reject(error);
    }

    if (status === 401) {
      // Clear admin tokens only (do not touch the portal sessionStorage here)
      try {
        TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem("user");
      } catch {}
      if (meta.redirectOn401 !== false) {
        setTimeout(() => {
          if (window?.location?.pathname !== "/signin") {
            window.location.href = "/signin";
          }
        }, 600);
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      if (meta.redirectOn403) {
        setTimeout(() => {
          window.location.href =
            typeof meta.redirectOn403 === "string" ? meta.redirectOn403 : "/unauthorized";
        }, 300);
      }
      return Promise.reject(error);
    }

    if (status === 404) {
      return Promise.reject(error);
    }

    if (status >= 400 && status < 500) {
      return Promise.reject(error);
    }

    if (status >= 500) {
      if (meta.toast5xx !== false) {
        // message.error("Server error. Please try again later.");
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/* ----------------------------- utilities ---------------------------- */
api.isCancel = isCanceled;

export const setAuthToken = (token) => {
  try {
    if (token) {
      TOKEN_KEYS.forEach((k) => localStorage.setItem(k, token));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      api.defaults.headers.Authorization = `Bearer ${token}`;
      api.defaults.headers.authorization = `Bearer ${token}`;
    } else {
      TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
      delete api.defaults.headers.common.Authorization;
      delete api.defaults.headers.Authorization;
      delete api.defaults.headers.authorization;
    }
  } catch (error) {
    // Error logging removed
  }
};

export const clearAuth = () => {
  try {
    TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("user");
    delete api.defaults.headers.common.Authorization;
  } catch {}
};

export const setBaseURL = (nextBase) => {
  api.defaults.baseURL = normalizeBase(nextBase);
};

/* Optional helpers for portal (not required, but handy) */
export const setPortalToken = (token) => {
  try {
    if (token) sessionStorage.setItem(PORTAL_TOKEN_KEY, String(token));
    else sessionStorage.removeItem(PORTAL_TOKEN_KEY);
  } catch {}
};
export const getPortalUser = () => {
  try {
    const raw = sessionStorage.getItem(PORTAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default api;
