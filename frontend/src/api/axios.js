import axios from "axios";
import { message } from "antd";

// Use env override in prod if you want: VITE_API_BASE
const BASE_URL = import.meta?.env?.VITE_API_BASE || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // If your API needs cookies/sessions, uncomment:
  // withCredentials: true,
});

// ---------- Helpers ----------
const isGet = (cfg) => (cfg?.method || "get").toLowerCase() === "get";
const getMeta = (cfg) => cfg?.meta || {}; // custom per-request controls

/**
 * Per-request controls (examples):
 *   api.get('/tasks', { meta: { silent: true } })         // no toasts at all
 *   api.get('/tasks', { meta: { toast404: true } })       // force toast on 404
 *   api.get('/tasks', { meta: { toastNetwork: false } })  // silence network error toast
 */

// ---------- Request interceptor ----------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- Response interceptor ----------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error.config || {};
    const meta = getMeta(cfg);
    const status = error?.response?.status;

    // If caller asked to be silent, never toast here
    if (meta.silent) return Promise.reject(error);

    // Network / CORS / server unreachable (no response)
    if (!error.response) {
      if (meta.toastNetwork !== false) {
        message.error("Network error. Please check your connection.");
      }
      return Promise.reject(error);
    }

    // Auth
    if (status === 401) {
      message.error("Session expired. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setTimeout(() => (window.location.href = "/signin"), 600);
      return Promise.reject(error);
    }

    // Not found:
    // - By default we DON'T toast 404 for GET (lists/details) to keep UI quiet.
    // - If you want a toast for a specific request, pass meta.toast404 = true.
    if (status === 404) {
      if (!isGet(cfg) || meta.toast404) {
        message.error("Requested resource not found (404).");
      }
      return Promise.reject(error);
    }

    // Validation / client errors (422/400/etc.)
    if (status >= 400 && status < 500) {
      if (meta.toast4xx !== false) {
        message.error(error?.response?.data?.message || "Request error.");
      }
      return Promise.reject(error);
    }

    // 5xx
    if (status >= 500) {
      if (meta.toast5xx !== false) {
        message.error("Server error. Please try again later.");
      }
      return Promise.reject(error);
    }

    // Fallback
    return Promise.reject(error);
  }
);

export default api;
