// src/api/axios.js
import axios from "axios";
import { message } from "antd";

const normalizeBase = (raw) => {
  if (!raw) return "/api";
  let base = String(raw).trim();

  // If it's just "/" or empty, fallback to /api
  if (base === "/" || base === "") return "/api";

  // Remove trailing slash
  base = base.replace(/\/+$/, "");

  // If it's an absolute origin without a path, append /api
  // e.g. https://api.example.com  -> https://api.example.com/api
  if (/^https?:\/\/[^/]+$/i.test(base)) return `${base}/api`;

  return base;
};

const BASE_URL = normalizeBase(import.meta?.env?.VITE_API_BASE || "/api");

/**
 * Auth mode:
 *  - 'bearer'  -> attach Authorization: Bearer <token> from localStorage('token')
 *  - 'cookie'  -> use session cookies (e.g., Laravel Sanctum) + CSRF
 *
 * Configure via VITE_AUTH_MODE= bearer | cookie   (default: bearer)
 */
const AUTH_MODE = (import.meta?.env?.VITE_AUTH_MODE || "bearer").toLowerCase();

/**
 * CSRF endpoints (for cookie mode, e.g., Laravel Sanctum).
 * IMPORTANT: Make sure your Vite proxy forwards `/sanctum/*` to your backend too.
 */
const CSRF_URL = import.meta?.env?.VITE_CSRF_URL || "/sanctum/csrf-cookie";
const XSRF_COOKIE_NAME =
  import.meta?.env?.VITE_XSRF_COOKIE_NAME || "XSRF-TOKEN";
const XSRF_HEADER_NAME =
  import.meta?.env?.VITE_XSRF_HEADER_NAME || "X-XSRF-TOKEN";

/** Create a single Axios instance used across the app */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000, // 20s defensive timeout
  withCredentials: AUTH_MODE === "cookie", // send cookies automatically in cookie mode
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
});

/* ----------------------------- helpers ----------------------------- */
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

/** Quick detector: is this an HTML response likely from Vite (proxy missing)? */
const looksLikeHtml = (error) => {
  const ct = error?.response?.headers?.["content-type"] || "";
  return ct.includes("text/html");
};

/**
 * For cookie mode: ensure we have the CSRF cookie set once.
 * We memoize the request to avoid duplicate calls.
 */
let csrfBootPromise = null;
const ensureCsrfCookie = () => {
  if (AUTH_MODE !== "cookie") return Promise.resolve();
  // if cookie already present, nothing to do
  if (getCookie(XSRF_COOKIE_NAME)) return Promise.resolve();

  if (!csrfBootPromise) {
    // Use a raw axios call to avoid interceptor loops
    // Sanctum usually lives outside `/api`, so strip a trailing /api for the CSRF origin
    const csrfBase = BASE_URL.replace(/\/api\/?$/, "");
    const raw = axios.create({
      baseURL: csrfBase || "",
      withCredentials: true,
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
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

/* ------------------------ request interceptor ----------------------- */
api.interceptors.request.use(
  async (config) => {
    const meta = getMeta(config);

    // Per-request override of withCredentials if caller passes it
    const useCookies =
      typeof config.withCredentials === "boolean"
        ? config.withCredentials
        : api.defaults.withCredentials;

    // COOKIE mode: make sure CSRF cookie exists (Laravel Sanctum style)
    if (AUTH_MODE === "cookie" || useCookies) {
      await ensureCsrfCookie();
      // In cookie mode, avoid adding Authorization header (unless explicitly forced)
      if (!meta.forceAuthHeader) {
        if (config.headers && "Authorization" in config.headers) {
          delete config.headers.Authorization;
        }
      }
    }

    // BEARER mode (or explicitly forced): attach token unless explicitly disabled
    const usingBearer =
      AUTH_MODE === "bearer" || (meta.forceAuthHeader && !meta.noAuthHeader);

    if (usingBearer && !meta.noAuthHeader) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
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

    // Silently ignore cancellations (common during unmount/refresh)
    if (isCanceled(error)) return Promise.reject(error);

    // Network / CORS / HTTPS mismatch / server unreachable
    if (!error.response) {
      if (meta.toastNetwork !== false) {
        message.error("Network error. Please check your connection.");
      }
      return Promise.reject(error);
    }

    // Catch the “Vite served HTML” scenario (proxy/base misconfig)
    if (looksLikeHtml(error)) {
      const url = `${cfg?.baseURL || ""}${cfg?.url || ""}`;
      const hint =
        "HTML response received – likely from the Vite dev server. " +
        "Check your Vite proxy or VITE_API_BASE so /api/* hits the backend.";
      if (meta.toastHtml !== false) {
        message.error(`Endpoint returned HTML (probably proxy issue): ${url}`);
      }
      // Wrap as 404 for consistency if backend wasn’t reached
      return Promise.reject(
        Object.assign(error, {
          __hint: hint,
        })
      );
    }

    if (status === 401) {
      if (meta.toast401 !== false) {
        message.error("Session expired. Please log in again.");
      }
      try {
        localStorage.removeItem("token");
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
        message.warning("Forbidden: you don’t have permission to perform this action.");
      }
      // Optional: redirect to an "Unauthorized" page
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
      // If a GET hits a 404, suppress toast by default; for POST/PUT/DELETE, show it.
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
/** Allow callers to check for cancellation without importing axios directly. */
api.isCancel = isCanceled;

/** Runtime helpers */
export const setAuthToken = (token) => {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
};
export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

/** If you need to change baseURL at runtime (e.g., tenant switch) */
export const setBaseURL = (nextBase) => {
  api.defaults.baseURL = normalizeBase(nextBase);
};

export default api;
