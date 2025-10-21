// src/routes/StudentsRoutes.jsx
import { Suspense, lazy, useEffect } from "react";
import { Route, Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { ROLES } from "@/utils/roleMapper";
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";
import MobileShell from "@/components/student/mobile/MobileShell.jsx";
import IntroGate from "@/routes/IntroGate.jsx";
import { hasSeenIntro, hasDoneTour } from "@/pages/student/onboarding/introFlags";

// --- Optional helpers from api (safe if missing) ---
let setPortalTokenFn = null;
try {
  // available if you used the axios update I gave you
  const mod = await import("@/api/axios");
  setPortalTokenFn = mod.setPortalToken || null;
} catch { /* noop: handle with direct sessionStorage below */ }

// --- Lazy student pages ---
// Onboarding
const WelcomeIntro      = lazy(() => import("@/pages/student/onboarding/WelcomeIntro.jsx"));
const WelcomeTour       = lazy(() => import("@/pages/student/onboarding/WelcomeTour.jsx"));
const BuddySelect       = lazy(() => import("@/pages/student/onboarding/BuddySelect.jsx"));
const InterestsWizard   = lazy(() => import("@/pages/student/onboarding/InterestsWizard.jsx"));
const WelcomeSuccess    = lazy(() => import("@/pages/student/onboarding/WelcomeSuccess.jsx"));

// Home
const StudentHome       = lazy(() => import("@/pages/student/HomeScreen.jsx"));

// Learning
const LearningScreen    = lazy(() => import("@/pages/student/LearningScreen.jsx"));
const SubjectPractice   = lazy(() => import("@/pages/student/learning/SubjectPractice.jsx"));

// Reading hub + flows
const ReadingScreen     = lazy(() => import("@/pages/student/ReadingScreen.jsx"));
const ReadAloudFlow     = lazy(() => import("@/pages/student/reading/ReadAloudFlow.jsx"));
const AiReadingTextFlow = lazy(() => import("@/pages/student/reading/AiReadingTextFlow.jsx"));
const ReadingQuizFlow   = lazy(() => import("@/pages/student/reading/ReadingQuizFlow.jsx"));

// Homework (new structure)
import HomeworkLayout from "@/pages/student/homework/HomeworkLayout.jsx";
const HomeworkList       = lazy(() => import("@/pages/student/homework/HomeworkList.jsx"));
const HomeworkDoing      = lazy(() => import("@/pages/student/homework/HomeworkDoing.jsx"));
const HomeworkFeedback   = lazy(() => import("@/pages/student/homework/HomeworkFeedback.jsx"));

// Progress / Motivation
const TreasureMap       = lazy(() => import("@/pages/student/TreasureMap.jsx"));
const MotivationTool    = lazy(() => import("@/pages/student/MotivationTool.jsx"));

// Settings
const StudentSettings   = lazy(() => import("@/pages/student/StudentSettings.jsx"));

// --- Helpers ---
const Fallback = <div className="p-4">Loading…</div>;

// Onboarding gate (for /student/home)
function HomeGate() {
  if (!hasSeenIntro()) return <Navigate to="/student/onboarding/welcome-intro" replace />;
  if (!hasDoneTour())  return <Navigate to="/student/onboarding/welcome-tour" replace />;
  return <StudentHome />;
}

/**
 * StudentAccessGate
 * Allows access if a portal token exists in sessionStorage (SSO tab),
 * otherwise falls back to your regular ProtectedRoute.
 */
function StudentAccessGate({ allowedRoles }) {
  const hasPortalToken =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem("portal.token");

  if (hasPortalToken) {
    // Allow straight in (token will be picked by axios on /student/*)
    return <Outlet />;
  }
  // Fallback to your normal auth/roles flow
  return <ProtectedRoute allowedRoles={allowedRoles} />;
}

/**
 * SsoReceiver
 * Usage (admin opens student tab):
 *   /student/sso?token=<JWT>&user=<base64(json)>
 * Stores token (and optional user) in sessionStorage then redirects.
 */
function SsoReceiver({ redirectTo = "/student/home" }) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const userB64 = params.get("user") || ""; // optional

  useEffect(() => {
    try {
      if (token) {
        // Prefer helper if present, else set directly
        if (typeof setPortalTokenFn === "function") setPortalTokenFn(token);
        else sessionStorage.setItem("portal.token", token);
      }
      if (userB64) {
        try {
          const json = atob(userB64);
          const obj = JSON.parse(json);
          sessionStorage.setItem("portal.user", JSON.stringify(obj));
        } catch {
          // ignore malformed user payload
        }
      }
    } catch {
      // no-op
    }
  }, [token, userB64]);

  // If no token came in, send to student sign-in (or home to let guards handle)
  if (!token) return <Navigate to="/signin" replace />;

  // Clean URL after storing (optional: could also pushState)
  return <Navigate to={redirectTo} replace />;
}

export default function StudentRoutes() {
  // Allow legacy student role id 3 during transition
  const STUDENT_ROLES = [ROLES.STUDENT, 3];

  return (
    <>
      {/* SSO receiver must be reachable WITHOUT auth */}
      <Route path="/student/sso" element={<SsoReceiver redirectTo="/student/home" />} />

      {/* For everything else under /student, allow portal token OR ProtectedRoute */}
      <Route element={<StudentAccessGate allowedRoles={STUDENT_ROLES} />}>
        <Route
          path="/student"
          element={
            <StudentAppProvider>
              <Outlet />
            </StudentAppProvider>
          }
        >
          {/* Default → /student/home */}
          <Route index element={<Navigate to="home" replace />} />

          {/* Mobile layout shell */}
          <Route element={<MobileShell />}>
            <Route
              element={
                <Suspense fallback={Fallback}>
                  <Outlet />
                </Suspense>
              }
            >
              {/* Home (guarded by onboarding flags) */}
              <Route path="home" element={<HomeGate />} />

              {/* Onboarding */}
              <Route
                path="onboarding/welcome-intro"
                element={
                  <IntroGate>
                    <WelcomeIntro />
                  </IntroGate>
                }
              />
              <Route path="onboarding/welcome-tour" element={<WelcomeTour />} />
              <Route path="onboarding/buddy"        element={<BuddySelect />} />
              <Route path="onboarding/interests"    element={<InterestsWizard />} />
              <Route path="onboarding/success"      element={<WelcomeSuccess />} />

              {/* Learning */}
              <Route path="learning" element={<LearningScreen />} />
              <Route path="learning/subject/:subject" element={<SubjectPractice />} />

              {/* Reading */}
              <Route path="reading"            element={<ReadingScreen />} />
              <Route path="reading/read-aloud" element={<ReadAloudFlow />} />
              <Route path="reading/ai-text"    element={<AiReadingTextFlow />} />
              <Route path="reading/quiz"       element={<ReadingQuizFlow />} />

              {/* Homework Flow */}
              <Route path="homework" element={<HomeworkLayout />}>
                <Route index element={<HomeworkList />} />
                <Route path="doing"      element={<HomeworkDoing />} />
                <Route path="chat"       element={<Navigate to="/student/homework/doing" replace />} />
                <Route path="feedback"   element={<HomeworkFeedback />} />

                {/* Legacy fallback routes */}
                <Route path="interaction"       element={<Navigate to="doing" replace />} />
                <Route path="done"              element={<Navigate to="feedback" replace />} />
                <Route path="chat/:taskId"      element={<Navigate to="chat" replace />} />
                <Route path="feedback/:taskId"  element={<Navigate to="feedback" replace />} />
              </Route>

              {/* Progress / Motivation */}
              <Route path="map"         element={<TreasureMap />} />
              <Route path="motivation"  element={<MotivationTool />} />

              {/* Settings */}
              <Route path="settings"    element={<StudentSettings />} />

              {/* Legacy chat route fallback */}
              <Route path="chat" element={<Navigate to="/student/home" replace />} />

              {/* Legacy intro redirect */}
              <Route path="onboarding/intro" element={<Navigate to="/student/onboarding/welcome-intro" replace />} />

              {/* Catch-all → student/home */}
              <Route path="*" element={<Navigate to="/student/home" replace />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </>
  );
}
