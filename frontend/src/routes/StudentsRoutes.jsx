// src/routes/StudentsRoutes.jsx
import React, { Suspense, lazy, useEffect } from "react";
import { Route, Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { ROLES, toRoleId } from "@/utils/roleMapper";
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";
// MobileShell removed - using direct routing
import IntroGate from "@/routes/IntroGate.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { hasSeenIntro, hasSeenHomeworkTutorial } from "@/pages/student/onboarding/introFlags";

// --- Optional helpers from api (safe if missing) ---
let setPortalTokenFn = null;
try {
  // available if you used the axios update I gave you
  const mod = await import("@/api/axios");
  setPortalTokenFn = mod.setPortalToken || null;
} catch { /* noop: handle with direct sessionStorage below */ }

const lazyDefault = (importer, name) =>
  lazy(() =>
    importer().then((mod) => {
      if (!mod || !mod.default) {
        throw new Error(`Lazy import missing default export: ${name}`);
      }
      return { default: mod.default };
    })
  );

// --- Lazy student pages ---
// Onboarding
const LoadingScreen     = lazyDefault(() => import("@/pages/student/onboarding/LoadingScreen.jsx"), "LoadingScreen");
const CharacterSelection = lazyDefault(() => import("@/pages/student/onboarding/CharacterSelection.jsx"), "CharacterSelection");
const RobotVsMagic      = lazyDefault(() => import("@/pages/student/onboarding/RobotVsMagic.jsx"), "RobotVsMagic");
const DinosaursVsUnicorns = lazyDefault(() => import("@/pages/student/onboarding/DinosaursVsUnicorns.jsx"), "DinosaursVsUnicorns");
const TreeHouseVsCastle = lazyDefault(() => import("@/pages/student/onboarding/TreeHouseVsCastle.jsx"), "TreeHouseVsCastle");
const LearningPreference = lazyDefault(() => import("@/pages/student/onboarding/LearningPreference.jsx"), "LearningPreference");
const AnimalPreference  = lazyDefault(() => import("@/pages/student/onboarding/AnimalPreference.jsx"), "AnimalPreference");
const ActivityPreference = lazyDefault(() => import("@/pages/student/onboarding/ActivityPreference.jsx"), "ActivityPreference");
const ColorPreference   = lazyDefault(() => import("@/pages/student/onboarding/ColorPreference.jsx"), "ColorPreference");
const CreativeActivityPreference = lazyDefault(() => import("@/pages/student/onboarding/CreativeActivityPreference.jsx"), "CreativeActivityPreference");
const Congratulations   = lazyDefault(() => import("@/pages/student/onboarding/Congratulations.jsx"), "Congratulations");

// Home
const StudentHome       = lazyDefault(() => import("@/pages/student/ChildHomeScreen.jsx"), "StudentHome");

// Learning
const LearningScreen    = lazyDefault(() => import("@/pages/student/LearningScreen.jsx"), "LearningScreen");
const SubjectPractice   = lazyDefault(() => import("@/pages/student/learning/SubjectPractice.jsx"), "SubjectPractice");

// Reading hub + flows
const ReadingScreen     = lazyDefault(() => import("@/pages/student/ReadingScreen.jsx"), "ReadingScreen");
const ReadAloudFlow     = lazyDefault(() => import("@/pages/student/reading/ReadAloudFlow.jsx"), "ReadAloudFlow");
const AiReadingTextFlow = lazyDefault(() => import("@/pages/student/reading/AiReadingTextFlow.jsx"), "AiReadingTextFlow");
const ReadingQuizFlow   = lazyDefault(() => import("@/pages/student/reading/ReadingQuizFlow.jsx"), "ReadingQuizFlow");


// Homework
const HomeworkTutorial  = lazyDefault(() => import("@/pages/student/HomeworkExplainer.jsx"), "HomeworkTutorial");
const HomeworkHome       = lazyDefault(() => import("@/pages/student/homework/HomeworkHome.jsx"), "HomeworkHome");
const HomeworkCollectChat = lazyDefault(() => import("@/pages/student/homework/HomeworkCollectChat.jsx"), "HomeworkCollectChat");

// Progress / Motivation
const TreasureMap       = lazyDefault(() => import("@/pages/student/TreasureMap.jsx"), "TreasureMap");
const MotivationTool    = lazyDefault(() => import("@/pages/student/MotivationTool.jsx"), "MotivationTool");

// Settings
const StudentSettings   = lazyDefault(() => import("@/pages/student/StudentSettings.jsx"), "StudentSettings");

// --- Helpers ---
const Fallback = <div className="p-4">Loading…</div>;

// Shared layout wrapper for all student screens (same frame as parents)
const StudentLayout = () => {
  // Detect if we're on desktop (PC) - show as tablet window
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex justify-center bg-gray-100 overflow-hidden min-h-screen w-full relative">
      {/* Tablet window container for desktop/PC */}
      <div
        className="relative"
        style={{
          width: isDesktop ? "100%" : "100%",
          maxWidth: isDesktop ? "100%" : "100%",
          minHeight: "100vh",
          margin: isDesktop ? "0 auto" : "0",
          background: "#FFFFFF",
          boxSizing: "border-box",
          boxShadow: isDesktop ? "0 0 20px rgba(0, 0, 0, 0.1)" : "none",
          position: isDesktop ? "relative" : "static",
        }}
      >
      {/* Background layers exactly like Figma node 1-292 */}
      <div className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
        {/* 1. Main background image - Figma node 1-293 (full 1280x800) */}
        <img
          src="/images/img_background.png"
          alt="Background"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      {/* Content */}
      <div className="relative z-10 w-full h-full">
        <StudentAppProvider>
          <Outlet />
        </StudentAppProvider>
      </div>
      </div>
    </div>
  );
};

// Onboarding gate (for /student/home)
function HomeGate() {
  // Get user ID from auth context - use selected child account if parent is viewing child
  const { user, account } = useAuthContext();
  
  // If parent has selected a child account (Netflix-style), use that child's ID
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);
  
  if (!hasSeenIntro(studentId)) return <Navigate to="/student/onboarding/welcome-intro" replace />;
  return <StudentHome />;
}

function HomeworkTutorialGate() {
  // Get user ID from auth context - use selected child account if parent is viewing child
  const { user, account } = useAuthContext();
  
  // If parent has selected a child account (Netflix-style), use that child's ID
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);
  
  // If tutorial already seen, redirect to homework home
  if (hasSeenHomeworkTutorial(studentId)) {
    return <Navigate to="/student/homework" replace />;
  }
  
  // Otherwise, show the tutorial
  return <HomeworkTutorial />;
}

/**
 * StudentAccessGate
 * Allows access if:
 * 1. Portal token exists in sessionStorage (SSO tab), OR
 * 2. Parent has selected a child account (Netflix-style), OR
 * 3. User has student role (normal flow)
 */
function StudentAccessGate({ allowedRoles }) {
  const { isAuthenticated, user, account } = useAuthContext?.() || {};
  const hasPortalToken =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem("portal.token");

  // Allow portal token access (SSO)
  if (hasPortalToken) {
    return <Outlet />;
  }

  // Allow parent with selected child account (Netflix-style)
  if (isAuthenticated && user && account) {
    const roleId = toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id);
    const isParent = roleId === ROLES.PARENT;
    const hasChildAccount = account?.type === "child" && account?.userId;
    
    if (isParent && hasChildAccount) {
      // Parent accessing child's account - allow it
      return <Outlet />;
    }
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
        <Route path="/student" element={<StudentLayout />}>
          {/* Default → /student/home */}
          <Route index element={<Navigate to="home" replace />} />

          {/* Student routes */}
          <Route>
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
                    <LoadingScreen />
                  </IntroGate>
                }
              />
              <Route path="onboarding/buddy"        element={<CharacterSelection />} />
              <Route path="onboarding/robot-vs-magic" element={<RobotVsMagic />} />
              <Route path="onboarding/dinosaurs-vs-unicorns" element={<DinosaursVsUnicorns />} />
              <Route path="onboarding/treehouse-vs-castle" element={<TreeHouseVsCastle />} />
              <Route path="onboarding/learning-preference" element={<LearningPreference />} />
              <Route path="onboarding/animal-preference" element={<AnimalPreference />} />
              <Route path="onboarding/activity-preference" element={<ActivityPreference />} />
              <Route path="onboarding/color-preference" element={<ColorPreference />} />
              <Route path="onboarding/creative-activity-preference" element={<CreativeActivityPreference />} />
              <Route path="onboarding/success"      element={<Congratulations />} />

              {/* Learning */}
              <Route path="learning" element={<LearningScreen />} />
              <Route path="learning/subject/:subject" element={<SubjectPractice />} />

              {/* Reading */}
              <Route path="reading"            element={<ReadingScreen />} />
              <Route path="reading/read-aloud" element={<ReadAloudFlow />} />
              <Route path="reading/ai-text"    element={<AiReadingTextFlow />} />
              <Route path="reading/quiz"       element={<ReadingQuizFlow />} />

              {/* Homework Flow */}
              <Route path="homework-tutorial" element={<HomeworkTutorialGate />} />
              <Route path="homework" element={<HomeworkHome />} />
              <Route path="homework/collect" element={<HomeworkCollectChat />} />

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

