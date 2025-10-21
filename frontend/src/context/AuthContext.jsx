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

  // Check for SSO token in sessionStorage (for portal tabs)
  if (!token) {
    try {
      const ssoToken = sessionStorage.getItem("portal.token");
      const ssoUser = sessionStorage.getItem("portal.user");
      if (ssoToken) {
        token = ssoToken;
        if (ssoUser) {
          user = JSON.parse(ssoUser);
        }
        console.log("🔍 [AuthContext] Found SSO token in sessionStorage");
      }
    } catch {}
  }

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

  // Check for SSO token on mount (for portal tabs) - but don't override regular logins
  useEffect(() => {
    try {
      const ssoToken = sessionStorage.getItem("portal.token");
      const ssoUser = sessionStorage.getItem("portal.user");
      const regularToken = localStorage.getItem("kibundo_token");
      
      // Only use SSO token if no regular login token exists
      if (ssoToken && !regularToken) {
        console.log("🔍 [AuthContext] Detected SSO token on mount (no regular login detected)");
        setAxiosToken(ssoToken);
        if (ssoUser) {
          const userData = JSON.parse(ssoUser);
          console.log("🔍 [AuthContext] Switching to SSO user:", userData);
          setAuth({ token: ssoToken, user: userData });
        } else {
          console.log("🔍 [AuthContext] SSO token found but no user data");
        }
      }
    } catch (error) {
      console.error("🔍 [AuthContext] Error handling SSO token:", error);
    }
  }, []);

  // Listen for SSO token events and periodically check for SSO tokens
  useEffect(() => {
    const handleSSOToken = (event) => {
      const { token: ssoToken, user: ssoUser } = event.detail || {};
      const regularToken = localStorage.getItem("kibundo_token");
      
      // Only use SSO token if no regular login token exists
      if (ssoToken && !regularToken) {
        console.log("🔍 [AuthContext] Received SSO token event (no regular login detected)");
        setAxiosToken(ssoToken);
        if (ssoUser) {
          console.log("🔍 [AuthContext] Switching to SSO user via event:", ssoUser);
          setAuth({ token: ssoToken, user: ssoUser });
        }
      }
    };

    // Periodic check for SSO tokens (fallback) - but don't override regular logins
    const checkSSOToken = () => {
      try {
        const ssoToken = sessionStorage.getItem("portal.token");
        const ssoUser = sessionStorage.getItem("portal.user");
        const regularToken = localStorage.getItem("kibundo_token");
        
        // Only use SSO token if:
        // 1. There's an SSO token and user data
        // 2. Either no current token OR current token matches SSO token
        // 3. No regular login token exists (to avoid overriding admin login)
        if (ssoToken && ssoUser && (!token || token !== ssoToken) && !regularToken) {
          console.log("🔍 [AuthContext] Periodic check found SSO token (no regular login detected)");
          setAxiosToken(ssoToken);
          const userData = JSON.parse(ssoUser);
          setAuth({ token: ssoToken, user: userData });
        }
      } catch (error) {
        console.error("🔍 [AuthContext] Error in periodic SSO check:", error);
      }
    };

    window.addEventListener('sso-token-received', handleSSOToken);
    
    // Check every 500ms for the first 10 seconds
    const interval = setInterval(checkSSOToken, 500);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    
    return () => {
      window.removeEventListener('sso-token-received', handleSSOToken);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [token]);

  const login = (userObj, jwt) => {
    // 1) Clear old auth first
    clearAxiosAuth();
    
    // 2) Clear SSO tokens to prevent override of regular login
    try {
      sessionStorage.removeItem("portal.token");
      sessionStorage.removeItem("portal.user");
      console.log("🔍 [AuthContext] Cleared SSO tokens for regular login");
    } catch {}
    
    // 3) Token in axios + persist token (via axios helper)
    setAxiosToken(jwt);

    // 4) Tiny summary only (no giant objects)
    const summary = pickUserSummary(userObj);
    
    // Debug: Log the user data being stored
    console.log("🔍 [AuthContext] Original user data:", userObj);
    console.log("🔍 [AuthContext] Picked user summary:", summary);
    console.log("🔍 [AuthContext] First name:", summary.first_name);
    console.log("🔍 [AuthContext] Last name:", summary.last_name);
    
    safePersistSummary(summary);

    // 5) Update state
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
