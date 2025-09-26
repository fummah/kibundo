// src/api/axios.js
import axios from "axios";
import { message } from "antd";

const normalizeBase = (raw) => {
  if (!raw) return "http://localhost:8080/api";
  let base = String(raw).trim();

  if (base === "/" || base === "") return "http://localhost:8080/api";
  base = base.replace(/\/+$/, "");

  if (/^https?:\/\/[^/]+$/i.test(base)) return `${base}/api`;
  return base;
};

const BASE_URL = normalizeBase(import.meta?.env?.VITE_API_BASE || "/api");

/**
 * Auth mode:
 *  - 'bearer'  -> attach Authorization: Bearer <token> from localStorage
 *  - 'cookie'  -> use session cookies (e.g., Laravel Sanctum) + CSRF
 */
const AUTH_MODE = (import.meta?.env?.VITE_AUTH_MODE || "bearer").toLowerCase();

/** Debug logging for tokens:
 *  '' (default)  -> off
 *  'on'          -> masked logs (first 12 chars)
 *  'full'        -> full token logs (dev only)
 */
const AUTH_DEBUG = String(import.meta?.env?.VITE_AUTH_DEBUG || "").toLowerCase();

/**
 * CSRF endpoints (for cookie mode, e.g., Laravel Sanctum).
 */
const CSRF_URL = import.meta?.env?.VITE_CSRF_URL || "/sanctum/csrf-cookie";
const XSRF_COOKIE_NAME =
  import.meta?.env?.VITE_XSRF_COOKIE_NAME || "XSRF-TOKEN";
const XSRF_HEADER_NAME =
  import.meta?.env?.VITE_XSRF_HEADER_NAME || "X-XSRF-TOKEN";

/** Create a single Axios instance used across the app */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  withCredentials: AUTH_MODE === "cookie",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
});

/* ----------------------------- helpers ----------------------------- */
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
    // still useful to know we tried
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

/**
 * For cookie mode: ensure we have the CSRF cookie set once.
 * We memoize the request to avoid duplicate calls.
 */
let csrfBootPromise = null;
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

/* ------------------------------ boot -------------------------------- */
// Attach token at startup if present (helps non-intercepted libs, too)
(() => {
  const t = readToken();
  if (t) {
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
  }
  logToken(t, "boot");
})();

/* ------------------------ request interceptor ----------------------- */
api.interceptors.request.use(
  async (config) => {
    const meta = getMeta(config);

    const useCookies =
      typeof config.withCredentials === "boolean"
        ? config.withCredentials
        : api.defaults.withCredentials;

    // COOKIE mode: ensure CSRF cookie
    if (AUTH_MODE === "cookie" || useCookies) {
      await ensureCsrfCookie();
      if (!meta.forceAuthHeader) {
        if (config.headers && "Authorization" in config.headers) {
          delete config.headers.Authorization;
        }
      }
    }

    // BEARER mode: attach token unless explicitly disabled
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

/* ------------------------ response interceptor ---------------------- */
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

    if (looksLikeHtml(error)) {
      // This is often a 404 from a missing API route that falls back to the index.html.
      // We don't want to show a big error for this, especially for non-critical fetches
      // like comments on a detail page. We'll just reject silently.
      return Promise.reject(error);
    }

    if (status === 401) {
      if (meta.toast401 !== false) {
        message.error("Session expired. Please log in again.");
      }
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
      if (meta.toast403 !== false) {
        message.warning(
          "Forbidden: you don’t have permission to perform this action."
        );
      }
      if (meta.redirectOn403) {
        setTimeout(() => {
          window.location.href =
            typeof meta.redirectOn403 === "string"
              ? meta.redirectOn403
              : "/unauthorized";
        }, 300);
      }
      return Promise.reject(error);
    }

    if (status === 404) {
      if (!isGet(cfg) || meta.toast404 === true) {
        message.error("Requested resource not found (404).");
      }
      return Promise.reject(error);
    }

    if (status >= 400 && status < 500) {
      if (meta.toast4xx !== false) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Request error.";
        message.error(msg);
      }
      return Promise.reject(error);
    }

    if (status >= 500) {
      if (meta.toast5xx !== false) {
        message.error("Server error. Please try again later.");
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/* ----------------------------- utilities ---------------------------- */
api.isCancel = isCanceled;

/** Runtime helpers */
export const setAuthToken = (token) => {
  try {
    if (token) {
      // Write to both keys for compatibility
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
