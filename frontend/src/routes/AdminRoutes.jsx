// src/routes/AdminRoutes.jsx
import React, { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx";
import { ROLES } from "@/utils/roleMapper";

/* Dashboards */
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";
import AnalyticsDashboard from "@/pages/admin/analytics/AnalyticsDashboard.jsx";
import StatisticsDashboard from "@/pages/admin/statistics/StatisticsDashboard.jsx";

/* Reports */
import ReportsOverview from "@/pages/admin/reports/ReportsOverview.jsx";
import GenerateReports from "@/pages/admin/reports/GenerateReports.jsx";

/* Billing */
import BillingOverview from "@/pages/admin/billing/BillingOverview.jsx";
import Product from "@/pages/admin/billing/Product.jsx";
import Contract from "@/pages/admin/billing/Contract.jsx";
import Subscription from "@/pages/admin/billing/Subscription.jsx";
import Invoices from "@/pages/admin/billing/Invoices.jsx";
import Coupons from "@/pages/admin/billing/Coupons.jsx";

/* Content */
import ContentOverview from "@/pages/admin/content/ContentOverview.jsx";
import PublishBlogPost from "@/pages/admin/content/PublishBlogPost.jsx";
import BlogPostEdit from "@/pages/admin/content/BlogPostEdit.jsx";
import BlogPreviewPage from "@/pages/admin/content/BlogPreviewPage.jsx";

/* Newsletter */
import Newsletter from "@/pages/admin/newsletter/Newsletter.jsx";

/* Academics */
import AcademicsOverview from "@/pages/admin/academics/AcademicsOverview.jsx";
import Game from "@/pages/admin/academics/Game.jsx";
import Curricula from "@/pages/admin/academics/Curricula.jsx";
import Worksheet from "@/pages/admin/academics/Worksheet.jsx";
import AIAgent from "@/pages/admin/academics/AIAgent.jsx";

/* Academics → Subjects */
import SubjectsList from "@/pages/admin/academics/subjects/SubjectsList.jsx";
import SubjectForm from "@/pages/admin/academics/subjects/SubjectForm.jsx";
import SubjectDetail from "@/pages/admin/academics/subjects/SubjectDetail.jsx";

/* Academics → Grades */
import GradesList from "@/pages/admin/academics/grades/GradesList.jsx";
import GradeForm from "@/pages/admin/academics/grades/GradeForm.jsx";
import GradeDetail from "@/pages/admin/academics/grades/GradeDetail.jsx";

/* Academics → Quizzes (new structure) */
import QuizPage from "@/pages/admin/academics/quizzes/quiz.jsx";

/* Parents */
import ParentsList from "@/pages/admin/parents/ParentsList.jsx";
import ParentForm from "@/pages/admin/parents/ParentForm.jsx";
import ParentDetail from "@/pages/admin/parents/ParentDetail.jsx";

/* Teachers */
import TeachersList from "@/pages/admin/teachers/TeachersList.jsx";
import TeacherForm from "@/pages/admin/teachers/TeacherForm.jsx";
import TeacherDetail from "@/pages/admin/teachers/TeacherDetail.jsx";

/* Students */
import StudentsList from "@/pages/admin/students/StudentsList.jsx";
import StudentForm from "@/pages/admin/students/StudentForm.jsx";
import StudentDetail from "@/pages/admin/students/StudentDetail.jsx";

/* Settings & Roles */
import SettingsOverview from "@/pages/admin/settings/SettingsOverview.jsx";
import RolesList from "@/pages/admin/roles/RolesList.jsx";
import RoleDetail from "@/pages/admin/roles/RoleDetail.jsx";
import RoleForm from "@/pages/admin/roles/RoleForm.jsx";

/* Tickets */
import TicketsList from "@/pages/admin/tickets/TicketsList.jsx";
import TicketDetail from "@/pages/admin/tickets/TicketDetail.jsx";
import TicketForm from "@/pages/admin/tickets/TicketForm.jsx";

/* Tasks */
import TasksList from "@/pages/admin/tasks/TasksList.jsx";
import TaskDetail from "@/pages/admin/tasks/TaskDetail.jsx";
import TaskForm from "@/pages/admin/tasks/TaskForm.jsx";

/* Database */
import DatabaseOverview from "@/pages/admin/database/DatabaseOverview.jsx";
import DatabaseManagement from "@/pages/admin/database/DatabaseManagement.jsx";

/* Lazy pages */
const StudentAnalytics = lazy(() =>
  import("@/pages/admin/analytics/StudentAnalytics.jsx")
);

// Local fallback for lazies
const Fallback = <div className="p-4">Loading…</div>;

export default function AdminRoutes() {
  return (
    <>
      {/* Entire admin tree is protected by ADMIN role */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/admin" element={<GlobalLayout />}>
          {/* Dashboards */}
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Analytics */}
          <Route path="analytics">
            <Route index element={<AnalyticsDashboard />} />
            <Route
              path="students"
              element={
                <Suspense fallback={Fallback}>
                  <StudentAnalytics />
                </Suspense>
              }
            />
          </Route>

          <Route path="statistics" element={<StatisticsDashboard />} />

          {/* Reports */}
          <Route path="reports">
            <Route index element={<ReportsOverview />} />
            <Route path="generate" element={<GenerateReports />} />
          </Route>

          {/* Billing */}
          <Route path="billing">
            <Route index element={<BillingOverview />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="product" element={<Product />} />
            <Route path="product/:id" element={<Product />} />
            <Route path="contract" element={<Contract />} />
            <Route path="contract/:id" element={<Contract />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="coupons" element={<Coupons />} />
          </Route>

          {/* Content */}
          <Route path="content">
            <Route index element={<ContentOverview />} />
            <Route path="publish" element={<PublishBlogPost />} />
            <Route path="publish/:id" element={<PublishBlogPost />} />
            <Route path="new" element={<PublishBlogPost />} />
            <Route path="blog/preview/:id" element={<BlogPreviewPage />} />
            <Route path="edit/:id" element={<BlogPostEdit />} />
          </Route>

          {/* Newsletter */}
          <Route path="newsletter" element={<Newsletter />} />

          {/* Academics */}
          <Route path="academics">
            <Route index element={<AcademicsOverview />} />
            <Route path="curricula" element={<Curricula />} />
            <Route path="worksheet" element={<Worksheet />} />
            <Route path="game" element={<Game />} />

            {/* New quizzes page (plural) */}
            <Route path="quizzes" element={<QuizPage />} />

            {/* Back-compat: singular → plural */}
            <Route
              path="quiz"
              element={<Navigate to="/admin/academics/quizzes" replace />}
            />

            {/* AI Agent */}
            <Route path="kibundo" element={<AIAgent />} />
            <Route
              path="ai-agent"
              element={<Navigate to="/admin/academics/kibundo" replace />}
            />

            {/* Subjects */}
            <Route path="subjects">
              <Route index element={<SubjectsList />} />
              <Route path="new" element={<SubjectForm />} />
              <Route path=":id" element={<SubjectDetail />} />
              <Route path=":id/edit" element={<SubjectForm />} />
            </Route>

            {/* Grades */}
            <Route path="grades">
              <Route index element={<GradesList />} />
              <Route path="new" element={<GradeForm />} />
              <Route path=":id" element={<GradeDetail />} />
              <Route path=":id/edit" element={<GradeForm />} />
            </Route>
          </Route>

          {/* Parents */}
          <Route path="parents">
            <Route index element={<ParentsList />} />
            <Route path="new" element={<ParentForm />} />
            <Route path=":id" element={<ParentDetail />} />
            <Route path=":id/edit" element={<ParentForm />} />
          </Route>

          {/* Teachers */}
          <Route path="teachers">
            <Route index element={<TeachersList />} />
            <Route path="new" element={<TeacherForm />} />
            <Route path=":id" element={<TeacherDetail />} />
            <Route path=":id/edit" element={<TeacherForm />} />
          </Route>

          {/* Students */}
          <Route path="students">
            <Route index element={<StudentsList />} />
            <Route path="new" element={<StudentForm />} />
            <Route path=":id" element={<StudentDetail />} />
            <Route path=":id/edit" element={<StudentForm />} />
          </Route>

          {/* Tickets */}
          <Route path="tickets">
            <Route index element={<TicketsList />} />
            <Route path="new" element={<TicketForm />} />
            <Route path=":id" element={<TicketDetail />} />
            <Route path=":id/edit" element={<TicketForm />} />
          </Route>

          {/* Tasks */}
          <Route path="tasks">
            <Route index element={<TasksList />} />
            <Route path="new" element={<TaskForm />} />
            <Route path=":id" element={<TaskDetail />} />
            <Route path=":id/edit" element={<TaskForm />} />
          </Route>

          {/* Settings */}
          <Route path="settings" element={<SettingsOverview />} />

          {/* Roles */}
          <Route path="roles">
            <Route index element={<RolesList />} />
            <Route path="new" element={<RoleForm />} />
            <Route path=":id" element={<RoleDetail />} />
            <Route path=":id/edit" element={<RoleForm />} />
          </Route>

          {/* Database */}
          <Route path="database">
            <Route index element={<DatabaseOverview />} />
            <Route path="management" element={<DatabaseManagement />} />
          </Route>

          {/* Back-compat for any legacy nested quizzes paths */}
          <Route
            path="quizzes/*"
            element={<Navigate to="/admin/academics/quizzes" replace />}
          />

          {/* Catch-all inside /admin → dashboard */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>

      {/*
        NOTE: Student/Parent/Teacher SSO landing routes live in their own route files:
          - /student/sso  → StudentRoutes.jsx
          - /parent/sso   → ParentRoutes.jsx
          - /teacher/sso  → TeacherRoutes.jsx
        The admin “Login as …” action should open one of those URLs in a new tab.
      */}
    </>
  );
}
