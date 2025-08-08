// src/routes/TeacherRoutes.jsx
import { Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalLayout from "../components/layouts/GlobalLayout";

// 👨‍🏫 Teacher Pages
import Dashboard from "../pages/teacher/Dashboard";
import Courses from "../pages/teacher/Courses";
import Assignments from "../pages/teacher/Assignments";
import Students from "../pages/teacher/Students";
import TeacherClassPage from "../pages/teacher/TeacherClassPage";

export default function TeacherRoutes() {
  return (
    <>
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <GlobalLayout />
          </ProtectedRoute>
        }
      >
        {/* 🏠 Default Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* 📘 Teaching Tools */}
        <Route path="courses" element={<Courses />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="students" element={<Students />} />
        <Route path="class-overview" element={<TeacherClassPage />} />

      </Route>
    </>
  );
}