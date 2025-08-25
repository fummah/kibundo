// src/routes/ParentRoutes.jsx
import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx";

/* Dashboard / Home */
import ParentHome from "@/pages/parent/ParentHome.jsx";

/* My Family */
import MyFamily from "@/pages/parent/myfamily/MyFamily.jsx";
import Activity from "@/pages/parent/myfamily/Activity.jsx";

/* Learning */
import Scans from "@/pages/parent/learning/Scans.jsx";
import Resources from "@/pages/parent/learning/Resources.jsx";

/* Billing */
import BillingOverview from "@/pages/parent/billing/BillingOverview.jsx";
import Subscriptions from "@/pages/parent/billing/Subscriptions.jsx";
import Invoices from "@/pages/parent/billing/Invoices.jsx";
import Coupons from "@/pages/parent/billing/Coupons.jsx";

/* Communications */
import Communications from "@/pages/parent/communications/Communications.jsx";
import NewsFeed from "@/pages/parent/communications/NewsFeed.jsx";
import Newsletter from "@/pages/parent/communications/Newsletter.jsx";
import Notifications from "@/pages/parent/communications/Notifications.jsx";

/* Helpdesk */
import Tasks from "@/pages/parent/helpdesk/Tasks.jsx";
import Tickets from "@/pages/parent/helpdesk/Tickets.jsx";

/* Student onboarding (optional, keep from before) */
import OnboardingAddStudent from "@/pages/parent/OnboardingAddStudent.jsx";
import OnboardingAddMoreStudent from "@/pages/parent/OnboardingAddMoreStudent.jsx";
import SignupSuccess from "@/pages/parent/SignupSuccess.jsx";
import ChooseAccount from "@/pages/parent/ChooseAccount.jsx";

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
      {/* Dashboard */}
      <Route index element={<ParentHome />} />
      <Route path="dashboard" element={<ParentHome />} />

      {/* My Family */}
      <Route path="myfamily" element={<MyFamily />} />
      <Route path="myfamily/activity" element={<Activity />} />

      {/* Learning */}
      <Route path="learning/scans" element={<Scans />} />
      <Route path="learning/resources" element={<Resources />} />

      {/* Billing */}
      <Route path="billing/overview" element={<BillingOverview />} />
      <Route path="billing/subscription" element={<Subscriptions />} />
      <Route path="billing/invoices" element={<Invoices />} />
      <Route path="billing/coupons" element={<Coupons />} />

      {/* Communications */}
      <Route path="communications" element={<Communications />} />
      <Route path="communications/news" element={<NewsFeed />} />
      <Route path="communications/newsletter" element={<Newsletter />} />
      <Route path="communications/notifications" element={<Notifications />} />

      {/* Helpdesk */}
      <Route path="helpdesk/tasks" element={<Tasks />} />
      <Route path="helpdesk/tickets" element={<Tickets />} />

      {/* Student management / onboarding */}
      <Route path="students/add" element={<OnboardingAddStudent />} />
      <Route path="students/add-more" element={<OnboardingAddMoreStudent />} />
      <Route path="students/choose" element={<ChooseAccount />} />
      <Route path="students/success" element={<SignupSuccess />} />

      {/* Backward compatibility redirects */}
      <Route path="children/add" element={<Navigate to="../students/add" replace />} />
      <Route path="children/add-more" element={<Navigate to="../students/add-more" replace />} />
      <Route path="children/choose" element={<Navigate to="../students/choose" replace />} />
      <Route path="children/success" element={<Navigate to="../students/success" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>
  );
}
