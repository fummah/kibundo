// src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";

// 🌐 Public/Auth Pages
import AuthLanding from "@/pages/auth/AuthLanding.jsx";
import SignIn from "@/pages/auth/SignIn.jsx";
import SignUp from "@/pages/auth/SignUp.jsx";
import ForgotPassword from "@/pages/auth/ForgotPassword.jsx";
import NotFound from "@/components/NotFound.jsx";

// 🔁 Smart role redirect
import RoleBasedRedirect from "@/routes/RoleBasedRedirect.jsx";

// 🔐 Role Routes
import AdminRoutes from "@/routes/AdminRoutes.jsx";
import TeachersRoutes from "@/routes/TeachersRoutes.jsx";
import StudentsRoutes from "@/routes/StudentsRoutes.jsx";
import ParentsRoutes from "@/routes/ParentsRoutes.jsx";

// 🆕 SSO Receiver
import SSOReceiver from "@/pages/sso/SSOReceiver.jsx";

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <Routes>
        {/* 🌐 Public Routes */}
        <Route path="/" element={<AuthLanding />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

        {/* 🆕 Public SSO intake */}
        <Route path="/sso" element={<SSOReceiver />} />

        {/* 🔁 Dashboard Redirect */}
        <Route path="/dashboard" element={<RoleBasedRedirect />} />

        {/* 🔐 Role-based Routes */}
        <Route>{AdminRoutes()}</Route>
        <Route>{TeachersRoutes()}</Route>
        <Route>{StudentsRoutes()}</Route>
        <Route>{ParentsRoutes()}</Route>

        {/* 🛑 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
