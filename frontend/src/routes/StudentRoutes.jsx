// src/routes/StudentRoutes.jsx
import { Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalLayout from "../components/layouts/GlobalLayout";

// 🎓 Student Pages
import Dashboard from "../pages/student/Dashboard";
import Courses from "../pages/student/Courses";
import Assignments from "../pages/student/Assignments";

export default function StudentRoutes() {
  return (
    <>
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={[3]}>
            <GlobalLayout />
          </ProtectedRoute>
        }
      >
        {/* 🏠 Default Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* 📘 Learning Tools */}
        <Route path="courses" element={<Courses />} />
        <Route path="assignments" element={<Assignments />} />
      </Route>
    </>
  );
}