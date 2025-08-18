import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx"; // change path if yours is /layouts/

// Lightweight placeholders — replace with real pages when ready.
const StudentDashboard = () => (
  <div className="p-4">
    <h2 className="text-lg">Student Dashboard</h2>
    <p className="text-gray-500">Your activities, progress, and upcoming tasks.</p>
  </div>
);
const StudentCourses = () => (
  <div className="p-4">
    <h2 className="text-lg">Courses</h2>
    <p className="text-gray-500">Browse and access your courses.</p>
  </div>
);
const StudentAssignments = () => (
  <div className="p-4">
    <h2 className="text-lg">Assignments</h2>
    <p className="text-gray-500">View and submit assignments/quizzes.</p>
  </div>
);
const StudentSettings = () => (
  <div className="p-4">
    <h2 className="text-lg">Settings</h2>
    <p className="text-gray-500">Update your profile and preferences.</p>
  </div>
);

export default function StudentRoutes() {
  return (
    <Route
      path="/student"
      element={
        <ProtectedRoute allowedRoles={[2]}>
          <GlobalLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<StudentDashboard />} />
      <Route path="dashboard" element={<StudentDashboard />} />
      <Route path="courses" element={<StudentCourses />} />
      <Route path="assignments" element={<StudentAssignments />} />
      <Route path="settings" element={<StudentSettings />} />
    </Route>
  );
}
