// src/hooks/useAuth.js
import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const isAuthenticated = !!user;

  const login = (userData, token) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  // Optional: auto-logout on token expiration
  useEffect(() => {
    // You can add token expiration logic here if needed
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    role: user?.role_id || null,
    login,
    logout,
  };
}
