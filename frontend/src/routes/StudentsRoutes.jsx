// src/routes/StudentRoutes.jsx
import { Suspense, lazy } from "react";
import { Route, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
// import GlobalLayout from "@/components/layouts/GlobalLayout.jsx"; // ❌ removed
import { ROLES } from "@/utils/roleMapper";
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";

// 🔹 Universal mobile-first desktop frame wrapper
import MobileShell from "@/components/student/mobile/MobileShell.jsx";

/* ----------------------- Lazy student pages ----------------------- */
// Onboarding
const BuddySelect = lazy(() => import("@/pages/student/onboarding/BuddySelect.jsx"));
const InterestsWizard = lazy(() => import("@/pages/student/onboarding/InterestsWizard.jsx"));
const WelcomeSuccess = lazy(() => import("@/pages/student/onboarding/WelcomeSuccess.jsx"));

// Home
const StudentHome = lazy(() => import("@/pages/student/HomeScreen.jsx"));

// Learning
const LearningScreen = lazy(() => import("@/pages/student/LearningScreen.jsx"));
const SubjectPractice = lazy(() => import("@/pages/student/learning/SubjectPractice.jsx"));

// Reading hub + flows
const ReadingScreen = lazy(() => import("@/pages/student/ReadingScreen.jsx"));
const ReadAloudFlow = lazy(() => import("@/pages/student/reading/ReadAloudFlow.jsx"));
const AiReadingTextFlow = lazy(() => import("@/pages/student/reading/AiReadingTextFlow.jsx"));
const ReadingQuizFlow = lazy(() => import("@/pages/student/reading/ReadingQuizFlow.jsx"));

// Homework
const HomeworkMain = lazy(() => import("@/pages/student/homework/HomeworkMain.jsx"));
const HomeworkInteraction = lazy(() => import("@/pages/student/homework/HomeworkInteraction.jsx"));
const HomeworkTaskList = lazy(() => import("@/pages/student/homework/HomeworkTaskList.jsx"));
const HomeworkReview = lazy(() => import("@/pages/student/homework/HomeworkReview.jsx"));

// Progress / Motivation
const TreasureMap = lazy(() => import("@/pages/student/TreasureMap.jsx"));
const MotivationTool = lazy(() => import("@/pages/student/MotivationTool.jsx"));

// Settings
const StudentSettings = lazy(() => import("@/pages/student/StudentSettings.jsx"));

// Chat (point to actual file name)
const ChatLayer = lazy(() => import("@/pages/student/mobile/ChatLayerMobile"));

/* ----------------------------- Routes tree ----------------------------- */
export default function StudentRoutes() {
  const Fallback = <div className="p-4">Loading…</div>;

  return (
    <>
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
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

          {/* 🔹 Everything below is rendered inside MobileShell -> DeviceFrame */}
          <Route element={<MobileShell />}>
            {/* Home */}
            <Route
              path="home"
              element={
                <Suspense fallback={Fallback}>
                  <StudentHome />
                </Suspense>
              }
            />

            {/* Onboarding */}
            <Route
              path="onboarding/buddy"
              element={
                <Suspense fallback={Fallback}>
                  <BuddySelect />
                </Suspense>
              }
            />
            <Route
              path="onboarding/interests"
              element={
                <Suspense fallback={Fallback}>
                  <InterestsWizard />
                </Suspense>
              }
            />
            <Route
              path="onboarding/success"
              element={
                <Suspense fallback={Fallback}>
                  <WelcomeSuccess />
                </Suspense>
              }
            />

            {/* Learning */}
            <Route
              path="learning"
              element={
                <Suspense fallback={Fallback}>
                  <LearningScreen />
                </Suspense>
              }
            />
            <Route
              path="learning/subject/:subject"
              element={
                <Suspense fallback={Fallback}>
                  <SubjectPractice />
                </Suspense>
              }
            />

            {/* Reading hub + flows */}
            <Route
              path="reading"
              element={
                <Suspense fallback={Fallback}>
                  <ReadingScreen />
                </Suspense>
              }
            />
            <Route
              path="reading/read-aloud"
              element={
                <Suspense fallback={Fallback}>
                  <ReadAloudFlow />
                </Suspense>
              }
            />
            <Route
              path="reading/ai-text"
              element={
                <Suspense fallback={Fallback}>
                  <AiReadingTextFlow />
                </Suspense>
              }
            />
            <Route
              path="reading/quiz"
              element={
                <Suspense fallback={Fallback}>
                  <ReadingQuizFlow />
                </Suspense>
              }
            />

            {/* Homework */}
            <Route
              path="homework"
              element={
                <Suspense fallback={Fallback}>
                  <HomeworkMain />
                </Suspense>
              }
            />
            <Route
              path="homework/interaction"
              element={
                <Suspense fallback={Fallback}>
                  <HomeworkInteraction />
                </Suspense>
              }
            />
            <Route
              path="homework/tasks"
              element={
                <Suspense fallback={Fallback}>
                  <HomeworkTaskList />
                </Suspense>
              }
            />
            <Route
              path="homework/review"
              element={
                <Suspense fallback={Fallback}>
                  <HomeworkReview />
                </Suspense>
              }
            />

            {/* Progress / Motivation */}
            <Route
              path="map"
              element={
                <Suspense fallback={Fallback}>
                  <TreasureMap />
                </Suspense>
              }
            />
            <Route
              path="motivation"
              element={
                <Suspense fallback={Fallback}>
                  <MotivationTool />
                </Suspense>
              }
            />

            {/* Settings */}
            <Route
              path="settings"
              element={
                <Suspense fallback={Fallback}>
                  <StudentSettings />
                </Suspense>
              }
            />

            {/* ✅ Chat */}
            <Route
              path="chat"
              element={
                <Suspense fallback={Fallback}>
                  <ChatLayer />
                </Suspense>
              }
            />

            {/* (Optional) Legacy redirects */}
            <Route path="home-mobile" element={<Navigate to="/student/home" replace />} />
            <Route path="reading-practice" element={<Navigate to="/student/reading" replace />} />
            <Route path="homework-start" element={<Navigate to="/student/homework" replace />} />

            {/* Catch-all → home */}
            <Route path="*" element={<Navigate to="/student/home" replace />} />
          </Route>
        </Route>
      </Route>
    </>
  );
}
