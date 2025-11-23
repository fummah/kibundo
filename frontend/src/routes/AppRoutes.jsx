// src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";

// 🌐 Public/Auth Pages
import AuthLanding from "@/pages/auth/AuthLanding.jsx";
import SignIn from "@/pages/auth/SignIn.jsx";
import StudentLogin from "@/pages/auth/StudentLogin.jsx";
import SignUp from "@/pages/auth/SignUp.jsx";
import SignUpSuccess from "@/pages/auth/SignUpSuccess.jsx";
import SignUpAddChild from "@/pages/auth/SignUpAddChild.jsx";
import SignUpAddAnotherChild from "@/pages/auth/SignUpAddAnotherChild.jsx";
import SubscriptionChoice from "@/pages/auth/SubscriptionChoice.jsx";
import ForgotPassword from "@/pages/auth/ForgotPassword.jsx";
import NotFound from "@/components/NotFound.jsx";
import SplashScreen from "@/pages/common/SplashScreen.jsx";

// 🔁 Smart role redirect
import RoleBasedRedirect from "@/routes/RoleBasedRedirect.jsx";

// 🔐 Role Routes
import AdminRoutes from "@/routes/AdminRoutes.jsx";
import TeachersRoutes from "@/routes/TeachersRoutes.jsx";
import StudentsRoutes from "@/routes/StudentsRoutes.jsx";
import ParentsRoutes from "@/routes/ParentsRoutes.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { ROLES } from "@/utils/roleMapper";

// 🆕 SSO Receiver
import SSOReceiver from "@/pages/sso/SSOReceiver.jsx";

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <Routes>
        {/* 🌐 Public Routes */}
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/" element={<AuthLanding />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/signup/success"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
              <SignUpSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup/add-child"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
              <SignUpAddChild />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup/add-child/another"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
              <SignUpAddAnotherChild />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup/choose-subscription"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
              <SubscriptionChoice />
            </ProtectedRoute>
          }
        />
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
