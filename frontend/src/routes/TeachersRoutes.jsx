// src/routes/TeacherRoutes.jsx
import { Route, Navigate, Outlet, useSearchParams } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx";
import { ROLES } from "@/utils/roleMapper";

/* ------------------------------------------------------------------ *
 * Lightweight placeholders — replace with your real teacher pages
 * ------------------------------------------------------------------ */
const TeacherDashboard = () => (
  <div className="p-4">
    <h2 className="text-lg">Teacher Dashboard</h2>
    <p className="text-gray-500">Quick overview of classes, assignments, and recent activity.</p>
  </div>
);
const TeacherCourses = () => (
  <div className="p-4">
    <h2 className="text-lg">Courses</h2>
    <p className="text-gray-500">Manage courses and curricula.</p>
  </div>
);
const TeacherAssignments = () => (
  <div className="p-4">
    <h2 className="text-lg">Assignments</h2>
    <p className="text-gray-500">Create and review assignments/quizzes.</p>
  </div>
);
const TeacherStudents = () => (
  <div className="p-4">
    <h2 className="text-lg">Students</h2>
    <p className="text-gray-500">View and support enrolled students.</p>
  </div>
);
const TeacherSettings = () => (
  <div className="p-4">
    <h2 className="text-lg">Settings</h2>
    <p className="text-gray-500">Profile and preferences.</p>
  </div>
);

/* ------------------------------------------------------------------ *
 * TeacherAccessGate
 * - If a portal token exists in *this tab's* sessionStorage, let them in.
 * - Otherwise, fall back to your normal ProtectedRoute (teacher roles).
 * ------------------------------------------------------------------ */
function TeacherAccessGate({ allowedRoles }) {
  const hasPortalToken =
    typeof window !== "undefined" && !!sessionStorage.getItem("portal.token");

  if (hasPortalToken) {
    return <Outlet />; // allow access using the portal token stored by SSO
  }
  return <ProtectedRoute allowedRoles={allowedRoles} />;
}

/* ------------------------------------------------------------------ *
 * SsoReceiver (/teacher/sso)
 * - Accepts ?token=<JWT>&user=<base64(JSON)> (user is optional)
 * - Stores them in sessionStorage for THIS TAB only, then redirects
 *   to /teacher/dashboard by default.
 * ------------------------------------------------------------------ */
function TeacherSsoReceiver({ redirectTo = "/teacher/dashboard" }) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const userB64 = params.get("user") || "";

  // No token? bounce to sign-in (or choose a different fallback)
  if (!token) return <Navigate to="/signin" replace />;

  try {
    // Store a portal token for this tab only
    sessionStorage.setItem("portal.token", token);
    sessionStorage.setItem("portal.role", "teacher");

    if (userB64) {
      try {
        const json = atob(userB64);
        const obj = JSON.parse(json);
        sessionStorage.setItem("portal.user", JSON.stringify(obj));
      } catch {
        // ignore malformed optional user payload
      }
    }
  } catch {
    // ignore storage failures
  }

  return <Navigate to={redirectTo} replace />;
}

export default function TeacherRoutes() {
  // Teacher role is 3
  const TEACHER_ROLES = [ROLES.TEACHER];

  return (
    <>
      {/* Public SSO endpoint (no auth guard) */}
      <Route path="/teacher/sso" element={<TeacherSsoReceiver redirectTo="/teacher/dashboard" />} />

      {/* Everything else under /teacher: allow via portal token OR auth roles */}
      <Route element={<TeacherAccessGate allowedRoles={TEACHER_ROLES} />}>
        <Route path="/teacher" element={<GlobalLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="settings" element={<TeacherSettings />} />
          {/* Catch-all inside /teacher → dashboard */}
          <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
        </Route>
      </Route>
    </>
  );
}
