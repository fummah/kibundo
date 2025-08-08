// src/routes/ParentRoutes.jsx
import { Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalLayout from "../components/layouts/GlobalLayout";

// 👨‍👩‍👧‍👦 Parent Pages
import Dashboard from "../pages/parent/Dashboard";
import Children from "../pages/parent/Children";
import Settings from "../pages/parent/Settings";

export default function ParentRoutes() {
  return (
    <>
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={[4]}>
            <GlobalLayout />
          </ProtectedRoute>
        }
      >
        {/* 🏠 Default Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* 👨‍👧 Children & Settings */}
        <Route path="children" element={<Children />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </>
  );
}