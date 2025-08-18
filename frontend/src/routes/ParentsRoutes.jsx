// src/routes/ParentRoutes.jsx
import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx"; // ← change to layouts/ if that's your path

// Minimal inline screens to avoid missing-file errors.
// Replace these with real pages when you add them.
const ParentDashboard = () => (
  <div className="p-4">
    <h2 className="text-lg">Parent Dashboard</h2>
    <p className="text-gray-500">Overview of your account, children, and recent activity.</p>
  </div>
);

const ParentChildren = () => (
  <div className="p-4">
    <h2 className="text-lg">My Children</h2>
    <p className="text-gray-500">List and manage linked child profiles.</p>
  </div>
);

const ParentSettings = () => (
  <div className="p-4">
    <h2 className="text-lg">Account Settings</h2>
    <p className="text-gray-500">Update email, password, preferences, and billing details.</p>
  </div>
);

export default function ParentRoutes() {
  return (
    <Route
      path="/parent"
      element={
        <ProtectedRoute allowedRoles={[4]}>
          <GlobalLayout />
        </ProtectedRoute>
      }
    >
      {/* Default landing */}
      <Route index element={<ParentDashboard />} />
      <Route path="dashboard" element={<ParentDashboard />} />

      {/* Core parent pages */}
      <Route path="children" element={<ParentChildren />} />
      <Route path="settings" element={<ParentSettings />} />
    </Route>
  );
}
