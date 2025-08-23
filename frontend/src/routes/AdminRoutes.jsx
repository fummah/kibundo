import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import GlobalLayout from "@/components/layouts/GlobalLayout.jsx";

/* Dashboards (standalone items) */
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";
import AnalyticsDashboard from "@/pages/analytics/AnalyticsDashboard.jsx";
import StatisticsDashboard from "@/pages/statistics/StatisticsDashboard.jsx";

/* Reports */
import ReportsOverview from "@/pages/reports/ReportsOverview.jsx";
import GenerateReports from "@/pages/reports/GenerateReports.jsx";

/* Billing */
import BillingOverview from "@/pages/billing/BillingOverview.jsx";
import Product from "@/pages/billing/Product.jsx";
import Contract from "@/pages/billing/Contract.jsx";
import Subscription from "@/pages/billing/Subscription.jsx";
import Invoices from "@/pages/billing/Invoices.jsx";
import Coupons from "@/pages/billing/Coupons.jsx";

/* Content */
import ContentOverview from "@/pages/content/ContentOverview.jsx";
import PublishBlogPost from "@/pages/content/PublishBlogPost.jsx";

/* Newsletter */
import Newsletter from "@/pages/newsletter/Newsletter.jsx";

/* Academics */
import AcademicsOverview from "@/pages/academics/AcademicsOverview.jsx";
import Game from "@/pages/academics/Game.jsx";
import Quiz from "@/pages/academics/Quiz.jsx";
import Curricula from "@/pages/academics/Curricula.jsx";
import Worksheet from "@/pages/academics/Worksheet.jsx";
import AIAgent from "@/pages/academics/AIAgent.jsx";


/* Subjects (under Academics) */
import SubjectsList from "@/pages/academics/subjects/SubjectsList.jsx";
import SubjectForm from "@/pages/academics/subjects/SubjectForm.jsx";
import SubjectDetail from "@/pages/academics/subjects/SubjectDetail.jsx";

/* Scans (moved under Academics) */
import ScansOverview from "@/pages/ocr/ScansOverview.jsx";

/* Parents */
import ParentsList from "@/pages/parents/ParentsList.jsx";
import ParentForm from "@/pages/parents/ParentForm.jsx";
import ParentDetail from "@/pages/parents/ParentDetail.jsx";

/* Teachers */
import TeachersList from "@/pages/teachers/TeachersList.jsx";
import TeacherForm from "@/pages/teachers/TeacherForm.jsx";
import TeacherDetail from "@/pages/teachers/TeacherDetail.jsx";

/* Students */
import StudentsList from "@/pages/students/StudentsList.jsx";
import StudentForm from "@/pages/students/StudentForm.jsx";
import StudentDetail from "@/pages/students/StudentDetail.jsx";

/* Settings & Roles */
import SettingsOverview from "@/pages/settings/SettingsOverview.jsx";
import RolesList from "@/pages/roles/RolesList.jsx";
import RoleDetail from "@/pages/roles/RoleDetail.jsx";
import RoleForm from "@/pages/roles/RoleForm.jsx";

/* Tickets */
import TicketsList from "@/pages/tickets/TicketsList.jsx";
import TicketDetail from "@/pages/tickets/TicketDetail.jsx";
import TicketForm from "@/pages/tickets/TicketForm.jsx";

/* Tasks */
import TasksList from "@/pages/tasks/TasksList.jsx";
import TaskDetail from "@/pages/tasks/TaskDetail.jsx";
import TaskForm from "@/pages/tasks/TaskForm.jsx";

/* Philosophy & Database */
import PhilosophyOverview from "@/pages/philosophy/PhilosophyOverview.jsx";
import DatabaseOverview from "@/pages/database/DatabaseOverview.jsx";
import DatabaseManagement from "@/pages/database/DatabaseManagement.jsx";

export default function AdminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={[1]}>
          <GlobalLayout />
        </ProtectedRoute>
      }
    >
      {/* Dashboards (standalone) */}
      <Route index element={<AdminDashboard />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="analytics" element={<AnalyticsDashboard />} />
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
      </Route>

      {/* Newsletter */}
      <Route path="newsletter">
        <Route index element={<Newsletter />} />
      </Route>

      {/* Academics (now contains Scans) */}
      <Route path="academics">
        <Route index element={<AcademicsOverview />} />
        <Route path="curricula" element={<Curricula />} />
        <Route path="worksheet" element={<Worksheet />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="game" element={<Game />} />
        

        {/* ✅ New canonical route name */}
        <Route path="kibundo" element={<AIAgent />} />
        {/* 🔁 Back-compat redirect from old path */}
        <Route path="ai-agent" element={<Navigate to="/admin/academics/kibundo" replace />} />

        {/* Subjects */}
        <Route path="subjects">
          <Route index element={<SubjectsList />} />
          <Route path="new" element={<SubjectForm />} />
          <Route path=":id" element={<SubjectDetail />} />
          <Route path=":id/edit" element={<SubjectForm />} />
        </Route>

        {/* Scans nested under Academics */}
        <Route path="scans">
          <Route index element={<ScansOverview />} />
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

      {/* Philosophy */}
      <Route path="philosophy">
        <Route index element={<PhilosophyOverview />} />
      </Route>

      {/* Database */}
      <Route path="database">
        <Route index element={<DatabaseOverview />} />
        <Route path="management" element={<DatabaseManagement />} />
      </Route>
    </Route>
  );
}
