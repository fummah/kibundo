// src/routes/GuestRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "../pages/auth/SignIn";
import SignUp from "../pages/auth/SignUp";
import RoleSelector from "../pages/auth/ChooseRole";
import AuthLanding from "../pages/auth/AuthLanding";
import { useAuthContext } from "../context/AuthContext";

export default function GuestRoutes() {
  const { isAuthenticated } = useAuthContext();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <Routes>
      <Route path="/" element={<AuthLanding />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/choose-role" element={<RoleSelector />} />
    </Routes>
  );
}
