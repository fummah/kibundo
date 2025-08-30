// src/routes/StudentRoutes.jsx
import { Suspense, lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx";
import { ROLES } from "@/utils/roleMapper";
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";

/* ----------------------- Lazy student pages ----------------------- */
// Onboarding
const BuddySelect = lazy(() => import("@/pages/student/onboarding/BuddySelect.jsx"));
const InterestsWizard = lazy(() => import("@/pages/student/onboarding/InterestsWizard.jsx"));
const WelcomeSuccess = lazy(() => import("@/pages/student/onboarding/WelcomeSuccess.jsx"));

// Home
const StudentHome = lazy(() => import("@/pages/student/HomeScreen.jsx"));

// Learning
const LearningScreen = lazy(() => import("@/pages/student/LearningScreen.jsx"));
const SubjectPractice = lazy(() => import("@/pages/student/learning/SubjectPractice.jsx")); // ← add .jsx

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

/* ----------------------------- Routes tree ----------------------------- */
export default function StudentRoutes() {
  return (
    <>
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
        <Route
          path="/student"
          element={
            <StudentAppProvider>
              <GlobalLayout />
            </StudentAppProvider>
          }
        >
          {/* Default → /student/home */}
          <Route index element={<Navigate to="home" replace />} />

          {/* Home */}
          <Route
            path="home"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <StudentHome />
              </Suspense>
            }
          />

          {/* Onboarding */}
          <Route
            path="onboarding/buddy"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <BuddySelect />
              </Suspense>
            }
          />
          <Route
            path="onboarding/interests"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <InterestsWizard />
              </Suspense>
            }
          />
          <Route
            path="onboarding/success"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <WelcomeSuccess />
              </Suspense>
            }
          />

          {/* Learning */}
          <Route
            path="learning"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <LearningScreen />
              </Suspense>
            }
          />
          <Route
            path="learning/subject/:subject"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <SubjectPractice />
              </Suspense>
            }
          />

          {/* Reading hub + flows */}
          <Route
            path="reading"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <ReadingScreen />
              </Suspense>
            }
          />
          <Route
            path="reading/read-aloud"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <ReadAloudFlow />
              </Suspense>
            }
          />
          <Route
            path="reading/ai-text"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <AiReadingTextFlow />
              </Suspense>
            }
          />
          <Route
            path="reading/quiz"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <ReadingQuizFlow />
              </Suspense>
            }
          />

          {/* Homework */}
          <Route
            path="homework"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <HomeworkMain />
              </Suspense>
            }
          />
          <Route
            path="homework/interaction"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <HomeworkInteraction />
              </Suspense>
            }
          />
          <Route
            path="homework/tasks"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <HomeworkTaskList />
              </Suspense>
            }
          />
          <Route
            path="homework/review"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <HomeworkReview />
              </Suspense>
            }
          />

          {/* Progress / Motivation */}
          <Route
            path="map"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <TreasureMap />
              </Suspense>
            }
          />
          <Route
            path="motivation"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <MotivationTool />
              </Suspense>
            }
          />

          {/* Settings */}
          <Route
            path="settings"
            element={
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                <StudentSettings />
              </Suspense>
            }
          />

          {/* Catch-all → home */}
          <Route path="*" element={<Navigate to="/student/home" replace />} />
        </Route>
      </Route>
    </>
  );
}
