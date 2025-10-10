// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setAuthToken as setAxiosToken, clearAuth as clearAxiosAuth } from "@/api/axios";

/** Small, safe keys — do NOT use 'user' */
const USER_SUMMARY_KEY = "kibundo_user_summary";
const TOKEN_KEYS = ["kibundo_token", "token"];

/** Pick only what you need across reloads (keep it tiny) */
const pickUserSummary = (u = {}) => ({
  id: u.id ?? u._id ?? u.user_id ?? null,
  first_name: u.first_name ?? u.given_name ?? "",
  last_name: u.last_name ?? u.family_name ?? "",
  email: u.email ?? "",
  role_id: u.role_id ?? u.roleId ?? u.role?.id ?? null,
  avatar: u.avatar ?? u.photo ?? null,
});

/** Persist summary safely: localStorage → sessionStorage → memory */
function safePersistSummary(summary) {
  const json = JSON.stringify(summary ?? {});
  const size = (() => {
    try { return new TextEncoder().encode(json).length; } catch { return json.length; }
  })();
  if (size > 10_000) return "memory"; // too big, don't persist
  try {
    localStorage.setItem(USER_SUMMARY_KEY, json);
    return "local";
  } catch {
    try {
      sessionStorage.setItem(USER_SUMMARY_KEY, json);
      return "session";
    } catch {
      return "memory";
    }
  }
}

function loadInitialAuth() {
  let token = null;
  let user = null;

  // token (support legacy key names)
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) { token = v; break; }
    }
  } catch {}

  // summary (prefer local, then session)
  try {
    const raw =
      localStorage.getItem(USER_SUMMARY_KEY) ??
      sessionStorage.getItem(USER_SUMMARY_KEY);
    if (raw) user = JSON.parse(raw);
  } catch {}

  return { token, user };
}

const AuthContext = createContext({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  login: (_user, _token) => {},
  logout: () => {},
  updateUserSummary: (_partial) => {},
  account: null,
  setAccount: (_acc) => {},
});

export const AuthProvider = ({ children }) => {
  // One-time migration: remove heavy legacy key to stop quota explosions
  useEffect(() => {
    try { if (localStorage.getItem("user")) localStorage.removeItem("user"); } catch {}
  }, []);

  const [{ token, user }, setAuth] = useState(loadInitialAuth);
  const [account, setAccount] = useState(null);

  // Keep axios header in sync on mount & when token changes
  useEffect(() => {
    if (token) setAxiosToken(token);
  }, [token]);

  const login = (userObj, jwt) => {
    // 1) Token in axios + persist token (via axios helper)
    setAxiosToken(jwt);

    // 2) Tiny summary only (no giant objects)
    const summary = pickUserSummary(userObj);
    safePersistSummary(summary);

    // 3) Update state
    setAuth({ token: jwt, user: summary });
  };

  const logout = () => {
    clearAxiosAuth();
    try {
      localStorage.removeItem(USER_SUMMARY_KEY);
      sessionStorage.removeItem(USER_SUMMARY_KEY);
    } catch {}
    setAuth({ token: null, user: null });
    setAccount(null);
  };

  const updateUserSummary = (partial) => {
    const next = { ...(user || {}), ...(partial || {}) };
    safePersistSummary(next);
    setAuth((s) => ({ ...s, user: next }));
  };

  const role =
    user?.role_id ??
    null; // keep same surface; map to routes with your ROLE_PATHS

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      isAuthenticated: Boolean(token),
      login,
      logout,
      updateUserSummary,
      account,
      setAccount,
    }),
    [user, token, role, account]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
