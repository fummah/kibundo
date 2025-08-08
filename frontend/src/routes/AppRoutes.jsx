import { Routes, Route } from "react-router-dom";

// 📄 Auth Pages
import SignIn from "../pages/auth/SignIn";
import SignUp from "../pages/auth/SignUp";
import ForgotPassword from "../pages/auth/ForgotPassword";

// 🌐 Public Pages
import AuthLanding from "../pages/auth/AuthLanding";
import NotFound from "../components/NotFound";

// 🔁 Smart Role Redirect
import RoleBasedRedirect from "./RoleBasedRedirect";

// 🛡 Role-Specific Route Groups (functions that return <Route>)
import AdminRoutes from "./AdminRoutes";
import TeacherRoutes from "./TeacherRoutes";
import StudentRoutes from "./StudentRoutes";
import ParentRoutes from "./ParentRoutes";

export default function AppRoutes() {
  return (
    <Routes>
      {/* 🌐 Public Routes */}
      <Route path="/" element={<AuthLanding />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

      {/* 🔁 Smart Dashboard Redirect */}
      <Route path="/dashboard" element={<RoleBasedRedirect />} />

      {/* 🔐 Role Routes */}
      {AdminRoutes()}
      {TeacherRoutes()}
      {StudentRoutes()}
      {ParentRoutes()}

      {/* 🛑 Fallback Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
