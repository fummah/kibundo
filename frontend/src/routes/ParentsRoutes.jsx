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
import AddStudentFlow from "@/pages/parent/myfamily/AddStudentFlow";

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
import NewsArticle from "@/pages/parent/communications/NewsArticle.jsx";
import Newsletter from "@/pages/parent/communications/Newsletter.jsx";
import Notifications from "@/pages/parent/communications/Notifications.jsx";

/* Achievements */
import AchievementsPage from "@/pages/parent/AchievementsPage";

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

      {/* Open Add Student modal via query param (new + back-compat) */}
      <Route
        path="myfamily/add-student"
        element={<Navigate to="/parent/myfamily/family?add-student=1" replace />}
      />
      <Route
        path="myfamily/add"
        element={<Navigate to="/parent/myfamily/family?add-student=1" replace />}
      />
      {/* Full-screen add student flow (if you need a page, keep this) */}
      <Route path="myfamily/add-student-flow" element={<AddStudentFlow />} />

      {/* ===== Learning (Parent) ===== */}
      {/* <Route path="learning/scans" element={<Scans />} /> */}
      {FLAGS.parentResources && (
        <Route path="learning/resources" element={<Resources />} />
      )}
      {/* Legacy safety: redirect old scans URL to Activities */}
      <Route
        path="learning/scans"
        element={<Navigate to="/parent/myfamily/activity" replace />}
      />

      {/* ===== Achievements ===== */}
      {/* FIX: use relative path (no leading /parent) */}
      <Route path="achievements" element={<AchievementsPage />} />

      {/* ===== Billing ===== */}
      <Route path="billing/overview" element={<BillingOverview />} />
      <Route path="billing/subscription" element={<Subscriptions />} />
      <Route path="billing/invoices" element={<Invoices />} />
      <Route path="billing/coupons" element={<Coupons />} />

      {/* ===== Communication ===== */}
      {/* You can keep a hub page at /parent/communications if it renders an <Outlet /> or a dashboard */}
      <Route path="communications" element={<Communications />} />

      {/* News list + detail (slug or id) */}
      <Route path="communications/news">
        <Route index element={<NewsFeed />} />
        <Route path="preview/:id" element={<NewsArticle />} />
        <Route path=":slug" element={<NewsArticle />} />
      </Route>

      {/* Other comms */}
      <Route path="communications/newsletter" element={<Newsletter />} />
      <Route path="communications/notifications" element={<Notifications />} />

      {/* ===== Feedback (Helpdesk → Feedback) ===== */}
      <Route
        path="helpdesk/tasks"
        element={<Navigate to="/parent/feedback" replace />}
      />
      <Route
        path="helpdesk/tickets"
        element={<Navigate to="/parent/feedback/tickets" replace />}
      />
      <Route
        path="feedback"
        element={<Navigate to="/parent/feedback/tickets" replace />}
      />
      <Route path="feedback/tickets" element={<Tickets />} />

      {/* ===== Settings ===== */}
      <Route path="settings" element={<Settings />} />

      {/* ===== Fallback → Home ===== */}
      <Route path="*" element={<Navigate to="/parent/home" replace />} />
    </Route>
  );
}
