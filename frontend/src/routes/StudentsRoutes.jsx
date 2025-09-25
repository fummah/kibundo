import { Suspense, lazy } from "react";
import { Route, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { ROLES } from "@/utils/roleMapper";
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";

// Mobile frame wrapper
import MobileShell from "@/components/student/mobile/MobileShell.jsx";

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
const HomeworkList       = lazy(() => import("@/pages/student/homework/HomeworkList.jsx"));       // step 0
const HomeworkDoing      = lazy(() => import("@/pages/student/homework/HomeworkDoing.jsx"));      // step 1
const HomeworkChat       = lazy(() => import("@/pages/student/homework/HomeworkChat.jsx"));       // step 2
const HomeworkFeedback   = lazy(() => import("@/pages/student/homework/HomeworkFeedback.jsx"));   // step 3

// Progress / Motivation
const TreasureMap       = lazy(() => import("@/pages/student/TreasureMap.jsx"));
const MotivationTool    = lazy(() => import("@/pages/student/MotivationTool.jsx"));

// Settings
const StudentSettings   = lazy(() => import("@/pages/student/StudentSettings.jsx"));

// Chat layer
const ChatLayer         = lazy(() => import("@/components/student/mobile/ChatLayer.jsx"));

// Gate helper
import IntroGate from "@/routes/IntroGate.jsx";
import { hasSeenIntro, hasDoneTour } from "@/pages/student/onboarding/introFlags";

// --- Helpers ---
const Fallback = <div className="p-4">Loading…</div>;

// Onboarding gate (for /student/home)
function HomeGate() {
  if (!hasSeenIntro()) return <Navigate to="/student/onboarding/welcome-intro" replace />;
  if (!hasDoneTour())  return <Navigate to="/student/onboarding/welcome-tour" replace />;
  return <StudentHome />;
}

export default function StudentRoutes() {
  // Allow legacy student role id 3 during transition
  const STUDENT_ROLES = [ROLES.STUDENT, 3];

  return (
    <>
      <Route element={<ProtectedRoute allowedRoles={STUDENT_ROLES} />} >
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
              {/* Home (guarded) */}
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
                <Route path="chat"       element={<HomeworkChat />} />
                <Route path="feedback"   element={<HomeworkFeedback />} />

                {/* Legacy fallback routes */}
                <Route path="interaction" element={<Navigate to="doing" replace />} />
                <Route path="done"        element={<Navigate to="feedback" replace />} />
                <Route path="chat/:taskId" element={<Navigate to="chat" replace />} />
                <Route path="feedback/:taskId" element={<Navigate to="feedback" replace />} />
              </Route>

              {/* Progress / Motivation */}
              <Route path="map"         element={<TreasureMap />} />
              <Route path="motivation"  element={<MotivationTool />} />

              {/* Settings */}
              <Route path="settings"    element={<StudentSettings />} />

              {/* Chat layer (outside homework) */}
              <Route path="chat"        element={<ChatLayer />} />

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
