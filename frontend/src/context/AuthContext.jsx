// src/context/AuthContext.js
import { createContext, useContext, useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // from your existing auth hook
  const auth = useAuth(); // { user, login, logout, isAuthenticated, role }

  // NEW: account selection (e.g. Parent vs Child profile)
  const [account, setAccount] = useState(null);

  // Memoize the value so it doesn’t recreate on every render
  const value = useMemo(
    () => ({
      ...auth,       // keep login/logout/user/role
      account,       // currently selected account
      setAccount,    // function to change account
    }),
    [auth, account]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
