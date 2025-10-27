// src/pages/sso/SSOReceiver.jsx
import { useEffect } from "react";
import { Spin } from "antd";
import api from "@/api/axios";

const STORAGE = {
  token: "portal.token",
  user: "portal.user",
};

function parseHash() {
  const h = (window.location.hash || "").replace(/^#/, "");
  const p = new URLSearchParams(h);
  return {
    token: p.get("token") || "",
    redirect: p.get("redirect") || "/",
  };
}

export default function SSOReceiver() {
  useEffect(() => {
    let done = false;

    async function handleToken(token, redirect) {
      try {
        console.log("🔍 [SSO] Handling token:", token ? "YES" : "NO");
        console.log("🔍 [SSO] Redirect to:", redirect);

        // Set the token in axios first for immediate use
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        api.defaults.headers.Authorization = `Bearer ${token}`;
        api.defaults.headers.authorization = `Bearer ${token}`;

        // store token just for THIS TAB
        sessionStorage.setItem(STORAGE.token, token);

        // hydrate the portal user (so guards/menus know the role)
        let user = null;
        try {
          const { data } = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          user = data?.user || data;
          console.log("🔍 [SSO] User data from /auth/me:", user);
        } catch (error) {
          console.error("🔍 [SSO] Error fetching user data:", error);
          // If /auth/me fails, try to decode the token to get user info
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            user = {
              id: payload.id,
              first_name: payload.first_name || '',
              last_name: payload.last_name || '',
              email: payload.email || '',
              role_id: payload.role_id,
              avatar: null
            };
            console.log("🔍 [SSO] User data from token:", user);
          } catch (decodeError) {
            console.error("🔍 [SSO] Error decoding token:", decodeError);
          }
        }
        
        if (user) {
          sessionStorage.setItem(STORAGE.user, JSON.stringify(user));
          console.log("🔍 [SSO] Stored user in sessionStorage");
        } else {
          console.error("🔍 [SSO] No user data available");
        }

        // Also store in localStorage for the main auth context
        localStorage.setItem("kibundo_token", token);
        localStorage.setItem("kibundo_user_summary", JSON.stringify({
          id: user?.id,
          first_name: user?.first_name,
          last_name: user?.last_name,
          email: user?.email,
          role_id: user?.role_id,
          avatar: user?.avatar
        }));

        console.log("🔍 [SSO] Stored token and user data, redirecting to:", redirect);
        
        // Trigger a custom event to notify the auth context
        window.dispatchEvent(new CustomEvent('sso-token-received', {
          detail: { token, user }
        }));
        
        // Force a page reload to ensure the auth context picks up the new token
        setTimeout(() => {
          window.location.replace(redirect || "/");
        }, 200);
      } catch (err) {
        console.error("🔍 [SSO] Error:", err);
        // worst case, just go home
        window.location.replace("/");
      }
    }

    // 1) Hash-based (from url: /sso#token=...&redirect=...)
    const { token: hashToken, redirect } = parseHash();
    if (hashToken) {
      done = true;
      handleToken(hashToken, redirect);
    }

    // 2) postMessage fallback
    function onMsg(e) {
      const data = e.data || {};
      if (data?.type !== "KIBUNDO_SSO") return;
      if (!data?.token) return;
      if (done) return;
      done = true;
      handleToken(data.token, data.redirect || "/");
    }

    window.addEventListener("message", onMsg, false);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="w-full h-[60vh] grid place-items-center">
      <Spin size="large" tip="Preparing your portal..." />
    </div>
  );
}
