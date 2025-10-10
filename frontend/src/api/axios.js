// src/api/axios.js
import axios from "axios";
import { message } from "antd";

/* ----------------------------- base URL ----------------------------- */
/**
 * Strategy:
 *  - If VITE_API_BASE is set -> use it.
 *  - Else if in dev -> http://localhost:<VITE_BACKEND_PORT || 3001>/api
 *  - Else (prod) -> '/api' (same-origin, behind reverse-proxy).
 */
const DEFAULT_DEV_PORT = String(import.meta?.env?.VITE_BACKEND_PORT || "3001");

// Resolve base preference with dev safeguards
let RAW_BASE = import.meta?.env?.VITE_API_BASE;
if (!RAW_BASE) {
  RAW_BASE = import.meta?.env?.DEV
    ? `http://localhost:${DEFAULT_DEV_PORT}/api`
    : "/api";
} else if (import.meta?.env?.DEV) {
  // If developer provided a relative path (e.g., '/api') in dev, rewrite to absolute
  const trimmed = String(RAW_BASE).trim();
  if (trimmed.startsWith("/")) {
    RAW_BASE = `http://localhost:${DEFAULT_DEV_PORT}${trimmed}`;
  }
}

/** Ensures absolute origins get an '/api' path if none was provided. */
const normalizeBase = (raw) => {
  let base = (raw || "").trim();
  if (!base) return `http://localhost:${DEFAULT_DEV_PORT}/api`;

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
const AUTH_DEBUG = String(import.meta?.env?.VITE_AUTH_DEBUG || "").toLowerCase();

/* ---------------------------- axios instance ------------------------ */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  withCredentials: AUTH_MODE === "cookie",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: import.meta?.env?.VITE_XSRF_COOKIE_NAME || "XSRF-TOKEN",
  xsrfHeaderName: import.meta?.env?.VITE_XSRF_HEADER_NAME || "X-XSRF-TOKEN",
});

if (import.meta?.env?.DEV) {
  // Useful to confirm requests won’t go to Vite’s 5173 origin
  console.log("[api] baseURL =", api.defaults.baseURL);
}

/* ----------------------------- helpers ------------------------------ */
const TOKEN_KEYS = ["kibundo_token", "token"];

const isGet = (cfg) => (cfg?.method || "get").toLowerCase() === "get";
const getMeta = (cfg) => cfg?.meta || {};
const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

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
  const key = `err:${status}:${normalizePath(url)}`;
  message.open({ key, type: "error", content, duration: 3 });
};

const readToken = () => {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {}
  return null;
};

const logToken = (token, where) => {
  if (!AUTH_DEBUG) return;
  if (!token) {
    console.log(`🔑 [${where}] no token found`);
    return;
  }
  if (AUTH_DEBUG === "full") {
    console.log(`🔑 [${where}] token:`, token);
  } else {
    console.log(
      `🔑 [${where}] token: ${token.slice(0, 12)}… (${token.length} chars)`
    );
  }
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
  const t = readToken();
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
  logToken(t, "boot");
})();

/* ----------------------- request interceptor ------------------------ */
api.interceptors.request.use(
  async (config) => {
    const meta = getMeta(config);

    const useCookies =
      typeof config.withCredentials === "boolean"
        ? config.withCredentials
        : api.defaults.withCredentials;

    // Cookie mode -> ensure CSRF and avoid Authorization unless forced
    if (AUTH_MODE === "cookie" || useCookies) {
      await ensureCsrfCookie();
      if (!meta.forceAuthHeader && config.headers && "Authorization" in config.headers) {
        delete config.headers.Authorization;
      }
    }

    // Bearer mode -> attach token unless disabled
    const usingBearer =
      AUTH_MODE === "bearer" || (meta.forceAuthHeader && !meta.noAuthHeader);
    if (usingBearer && !meta.noAuthHeader) {
      const token = readToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      logToken(token, "request");
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
        message.error("Network error. Please check your connection.");
      }
      return Promise.reject(error);
    }

    // 404 from Vite without proxy often returns index.html (text/html)
    if (looksLikeHtml(error)) {
      // No toast here; let backend/consumers handle messaging
      return Promise.reject(error);
    }

    if (status === 401) {
      // No auth toast; backend handles messaging
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
      // No auth toast; backend handles messaging
      if (meta.redirectOn403) {
        setTimeout(() => {
          window.location.href =
            typeof meta.redirectOn403 === "string" ? meta.redirectOn403 : "/unauthorized";
        }, 300);
      }
      return Promise.reject(error);
    }

    if (status === 404) {
      // No toast here; let backend/consumers handle messaging
      return Promise.reject(error);
    }

    if (status >= 400 && status < 500) {
      // No generic 4xx toast for auth; let backend/callers decide
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
      logToken(token, "setAuthToken");
    } else {
      TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
      delete api.defaults.headers.common.Authorization;
      logToken(null, "setAuthToken");
    }
  } catch {}
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

export default api;