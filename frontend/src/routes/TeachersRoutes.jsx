import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx"; // change path if yours is /layouts/

// Lightweight placeholders — replace with real pages when ready.
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

export default function TeacherRoutes() {
  return (
    <Route
      path="/teacher"
      element={
        <ProtectedRoute allowedRoles={[3]}>
          <GlobalLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<TeacherDashboard />} />
      <Route path="dashboard" element={<TeacherDashboard />} />
      <Route path="courses" element={<TeacherCourses />} />
      <Route path="assignments" element={<TeacherAssignments />} />
      <Route path="students" element={<TeacherStudents />} />
      <Route path="settings" element={<TeacherSettings />} />
    </Route>
  );
}
