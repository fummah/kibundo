// src/routes/ParentRoutes.jsx
import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx";

// Feature flags (Phase 1: hide Resources for Parent)
import { FLAGS } from "@/config/featureFlags.js";

/* Home (Dashboard → Home) */
import ParentHome from "@/pages/parent/ParentHome.jsx";

/* My Family */
import MyFamily from "@/pages/parent/myfamily/MyFamily.jsx";
import Activity from "@/pages/parent/myfamily/Activity.jsx";
import ParentStudentDetail from "@/pages/parent/myfamily/ParentStudentDetail.jsx";

/* Learning (Scans removed per spec; Resources behind flag) */
// import Scans from "@/pages/parent/learning/Scans.jsx";
import Resources from "@/pages/parent/learning/Resources.jsx";

/* Billing */
import BillingOverview from "@/pages/parent/billing/BillingOverview.jsx";
import Subscriptions from "@/pages/parent/billing/Subscriptions.jsx";
import Invoices from "@/pages/parent/billing/Invoices.jsx";
import Coupons from "@/pages/parent/billing/Coupons.jsx";

/* Communication */
import Communications from "@/pages/parent/communications/Communications.jsx";
import NewsFeed from "@/pages/parent/communications/NewsFeed.jsx";
import Newsletter from "@/pages/parent/communications/Newsletter.jsx";
import Notifications from "@/pages/parent/communications/Notifications.jsx";
import AchievementsPage from "@/pages/parent/AchievementsPage";
import AddStudentFlow from "@/pages/parent/myfamily/AddStudentFlow";

/* Feedback (Helpdesk → Feedback) */
// import Tasks from "@/pages/parent/helpdesk/Tasks.jsx";
import Tickets from "@/pages/parent/helpdesk/Tickets.jsx";

/* Account */
import Settings from "@/pages/parent/Settings.jsx";

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
      {/* ===== Home ===== */}
      <Route index element={<ParentHome />} />
      <Route path="overview" element={<Navigate to="/parent/home" replace />} />
      <Route path="home" element={<ParentHome />} />

      {/* ===== My Family ===== */}
      <Route path="myfamily/family" element={<MyFamily />} />
      <Route path="myfamily/activity" element={<Activity />} />
      <Route path="myfamily/student/:id" element={<ParentStudentDetail />} />

      {/* New clean route → open AddStudentModal via query param */}
      <Route
        path="myfamily/add-student"
        element={<Navigate to="/parent/myfamily/family?add-student=1" replace />}
      />
      {/* Back-compat: /add → modal */}
      <Route
        path="myfamily/add"
        element={<Navigate to="/parent/myfamily/family?add-student=1" replace />}
      />

      {/* ===== Learning (Parent) ===== */}
      {/* Scans removed entirely for Parent */}
      {/* <Route path="learning/scans" element={<Scans />} /> */}
      {/* Resources hidden in Phase 1 via feature flag */}
      {FLAGS.parentResources && (
        <Route path="learning/resources" element={<Resources />} />
      )}
      {/* Legacy safety: redirect old scans URL to Activities */}
      <Route
        path="learning/scans"
        element={<Navigate to="/parent/myfamily/activity" replace />}
      />
<Route path="/parent/achievements" element={<AchievementsPage />} />
<Route path="/parent/myfamily/add-student" element={<AddStudentFlow />} />

      {/* ===== Billing ===== */}
      <Route path="billing/overview" element={<BillingOverview />} />
      <Route path="billing/subscription" element={<Subscriptions />} />
      <Route path="billing/invoices" element={<Invoices />} />
      <Route path="billing/coupons" element={<Coupons />} />

      {/* ===== Communication ===== */}
      <Route path="communications" element={<Communications />} />
      <Route path="communications/news" element={<NewsFeed />} />
      <Route path="communications/newsletter" element={<Newsletter />} />
      <Route path="communications/notifications" element={<Notifications />} />

      {/* ===== Feedback (Helpdesk → Feedback) ===== */}
      {/* Old Helpdesk routes redirect to new Feedback paths */}
      <Route
        path="helpdesk/tasks"
        element={<Navigate to="/parent/feedback" replace />}
      />
      
      <Route
        path="helpdesk/tickets"
        element={<Navigate to="/parent/feedback/tickets" replace />}
      />

      {/* Feedback entry (no Tasks in this version) */}
      <Route path="feedback" element={<Navigate to="/parent/feedback/tickets" replace />} />
      <Route path="feedback/tickets" element={<Tickets />} />

      {/* ===== Settings ===== */}
      <Route path="settings" element={<Settings />} />

      {/* ===== Fallback → Home ===== */}
      <Route path="*" element={<Navigate to="/parent/home" replace />} />
    </Route>
  );
}


