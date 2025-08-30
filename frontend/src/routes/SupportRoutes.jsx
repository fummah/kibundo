// src/routes/SupportRoutes.jsx
import { Route, Navigate } from "react-router-dom";

/* Pages used by Support Central */
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";         // support dashboard / overview
import ParentsList from "@/pages/parents/ParentsList.jsx";            // "customers"
import Product from "@/pages/billing/Product.jsx";
import Invoices from "@/pages/billing/Invoices.jsx";
import Subscription from "@/pages/billing/Subscription.jsx";
import Coupons from "@/pages/billing/Coupons.jsx";
import AnalyticsDashboard from "@/pages/analytics/AnalyticsDashboard.jsx";
import ContentOverview from "@/pages/content/ContentOverview.jsx";     // help/knowledge base

export default function SupportRoutes() {
  return (
    <Route path="support">
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="customers" element={<ParentsList />} />
      <Route path="products" element={<Product />} />
      <Route path="orders" element={<Invoices />} />
      <Route path="subscriptions" element={<Subscription />} />
      <Route path="discounts" element={<Coupons />} />
      <Route path="analytics" element={<AnalyticsDashboard />} />
      <Route path="help" element={<ContentOverview />} />
      <Route index element={<Navigate to="/admin/hub/support/dashboard" replace />} />
    </Route>
  );
}
