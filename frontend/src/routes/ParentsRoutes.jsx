// src/routes/ParentRoutes.jsx
import React from "react";
import { Route, Navigate, Outlet, useSearchParams } from "react-router-dom";
import { ROLES } from "@/utils/roleMapper";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { FLAGS } from "@/config/featureFlags.js";

import ParentAppProvider from "@/context/ParentAppProvider.jsx";

/* Pages */
import ParentHome from "@/pages/parent/ParentHome.jsx";
import MyFamily from "@/pages/parent/myfamily/MyFamily.jsx";
import Activity from "@/pages/parent/myfamily/Activity.jsx";
import ParentStudentDetail from "@/pages/parent/myfamily/ParentStudentDetail.jsx";
import AddStudentFlow from "@/pages/parent/myfamily/AddStudentFlow";
import AddStudentIntro from "@/pages/parent/myfamily/AddStudentIntro";
import AddAnotherChildIntro from "@/pages/parent/myfamily/AddAnotherChildIntro";
import Resources from "@/pages/parent/learning/Resources.jsx";
import BillingOverview from "@/pages/parent/billing/BillingOverview.jsx";
import Subscriptions from "@/pages/parent/billing/Subscriptions.jsx";
import Invoices from "@/pages/parent/billing/Invoices.jsx";
import Coupons from "@/pages/parent/billing/Coupons.jsx";
import Checkout from "@/pages/parent/billing/Checkout.jsx";
import Success from "@/pages/parent/billing/Success.jsx";
import NewsFeed from "@/pages/parent/communications/NewsFeed.jsx";
import NewsArticle from "@/pages/parent/communications/NewsArticle.jsx";
import Newsletter from "@/pages/parent/communications/Newsletter.jsx";
import Notifications from "@/pages/parent/communications/Notifications.jsx";
import AchievementsPage from "@/pages/parent/AchievementsPage";
import ParentChat from "@/pages/parent/chat/ParentChat.jsx";
import Tickets from "@/pages/parent/helpdesk/Tickets.jsx";
import Settings from "@/pages/parent/Settings.jsx";
import AccountSelect from "@/components/parent/account/AccountSelect.jsx";

/* ------------------------------------------------------------------ *
 * Gate: allow access if this tab has a portal token; otherwise require
 * a normal auth session with parent roles.
 * ------------------------------------------------------------------ */
function ParentAccessGate({ allowedRoles, children }) {
  const hasPortalToken =
    typeof window !== "undefined" && !!sessionStorage.getItem("portal.token");

  if (hasPortalToken) {
    // If used as a wrapper (has children), render children; otherwise use Outlet
    return children || <Outlet />;
  }
  // If used as a wrapper, wrap children in ProtectedRoute; otherwise use ProtectedRoute as route element
  return children ? (
    <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>
  ) : (
    <ProtectedRoute allowedRoles={allowedRoles} />
  );
}

/* ------------------------------------------------------------------ *
 * /parent/sso receiver
 * Accepts:
 *   ?token=<JWT>&user=<base64(JSON)>   (user is optional)
 * Stores in sessionStorage (tab-scoped) then redirects to /parent/home.
 * ------------------------------------------------------------------ */
function ParentSsoReceiver({ redirectTo = "/parent/home" }) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const userB64 = params.get("user") || "";

  if (!token) return <Navigate to="/signin" replace />;

  try {
    sessionStorage.setItem("portal.token", token);
    sessionStorage.setItem("portal.role", "parent");
    if (userB64) {
      try {
        const json = atob(userB64);
        const obj = JSON.parse(json);
        sessionStorage.setItem("portal.user", JSON.stringify(obj));
      } catch {
        // ignore malformed user payload
      }
    }
  } catch {
    // ignore storage errors
  }

  return <Navigate to={redirectTo} replace />;
}

export default function ParentRoutes() {
  // Allow legacy parent role id 4 during transition, remove after migration
  // Parent role is 2
  const PARENT_ROLES = [ROLES.PARENT];

  return (
    <>
      {/* Public SSO landing — no guard */}
      <Route path="/parent/sso" element={<ParentSsoReceiver redirectTo="/parent/home" />} />
      
      {/* Public success page - Stripe redirects here directly */}
      <Route 
        path="/parent/billing/success" 
        element={
          <ParentAppProvider>
            <Success />
          </ParentAppProvider>
        } 
      />

      {/* Add student flows - no ParentShell wrapper */}
      <Route 
        path="/parent/myfamily/add-student-flow" 
        element={
          <ParentAccessGate allowedRoles={PARENT_ROLES}>
            <ParentAppProvider>
              <AddStudentFlow />
            </ParentAppProvider>
          </ParentAccessGate>
        } 
      />
      <Route 
        path="/parent/myfamily/add-student-intro" 
        element={
          <ParentAccessGate allowedRoles={PARENT_ROLES}>
            <ParentAppProvider>
              <AddStudentIntro />
            </ParentAppProvider>
          </ParentAccessGate>
        } 
      />
      <Route 
        path="/parent/myfamily/add-another-child-intro" 
        element={
          <ParentAccessGate allowedRoles={PARENT_ROLES}>
            <ParentAppProvider>
              <AddAnotherChildIntro />
            </ParentAppProvider>
          </ParentAccessGate>
        } 
      />

      {/* Parent tree: allow via portal token OR via normal auth + roles */}
      <Route element={<ParentAccessGate allowedRoles={PARENT_ROLES} />}>
        <Route
          path="/parent"
          element={
            <ParentAppProvider>
              <Outlet />
            </ParentAppProvider>
          }
        >
          {/* Home */}
          <Route index element={<ParentHome />} />
          <Route path="home" element={<ParentHome />} />
          <Route path="overview" element={<Navigate to="/parent/home" replace />} />

          {/* My Family */}
          <Route path="myfamily/family" element={<MyFamily />} />
          <Route path="myfamily/activity" element={<Activity />} />
          <Route path="myfamily/student/:id" element={<ParentStudentDetail />} />
          <Route
            path="myfamily/add-student"
            element={<Navigate to="/parent/myfamily/family?add=1" replace />}
          />
          <Route
            path="myfamily/add"
            element={<Navigate to="/parent/myfamily/family?add=1" replace />}
          />

          {/* Learning (Parent) */}
          <Route
            path="learning/scans"
            element={<Navigate to="/parent/myfamily/activity" replace />}
          />
          {FLAGS.parentResources && (
            <Route path="learning/resources" element={<Resources />} />
          )}

          {/* Achievements */}
          <Route path="achievements" element={<AchievementsPage />} />

          {/* Billing */}
          <Route path="billing/overview" element={<BillingOverview />} />
          <Route path="billing/subscription" element={<Subscriptions />} />
          <Route path="billing/checkout" element={<Checkout />} />
          {/* Success route is handled above as public route */}
          <Route path="billing/invoices" element={<Invoices />} />
          <Route path="billing/coupons" element={<Coupons />} />

          {/* Communications */}
          <Route
            path="communications"
            element={<Navigate to="/parent/communications/news" replace />}
          />
          <Route path="communications/news">
            <Route index element={<NewsFeed />} />
            <Route path="preview/:id" element={<NewsArticle />} />
            <Route path=":slug" element={<NewsArticle />} />
          </Route>
          <Route path="communications/newsletter" element={<Newsletter />} />
          <Route path="communications/notifications" element={<Notifications />} />

          {/* Chat */}
          <Route path="chat" element={<ParentChat />} />

          {/* Parent Chat (replaces Feedback) */}
          <Route path="feedback" element={<Navigate to="/parent/chat" replace />} />
          <Route path="feedback/tickets" element={<Navigate to="/parent/chat" replace />} />

          {/* Account */}
          <Route path="settings" element={<Settings />} />
          <Route path="account" element={<AccountSelect />} />

          {/* Fallback inside /parent */}
          <Route path="*" element={<Navigate to="/parent/home" replace />} />
        </Route>
      </Route>
    </>
  );
}