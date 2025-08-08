import { Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalLayout from "../components/layouts/GlobalLayout";

// 🏠 Admin Dashboard
import Dashboard from "../pages/admin/Dashboard";

// 📊 Core Insights
import AnalyticsDashboard from "../pages/admin/AnalyticsDashboard";
import StatisticsDashboard from "../pages/admin/StatisticsDashboard";
import AnalyticsPage from "../pages/admin/AnalyticsPage";
import GenerateReports from "../pages/admin/GenerateReports";
import Reports from "../pages/admin/Reports";
import ReportsSummary from "../pages/admin/ReportsSummary";

// 🏫 School Dashboard Pages
import SchoolLayout from "../pages/admin/school/SchoolLayout";
import SchoolSelector from "../pages/admin/school/SchoolSelector";
import SchoolDashboard from "../pages/admin/school/SchoolDashboard";
import SchoolTeachers from "../pages/admin/school/SchoolTeachers";
import SchoolStudents from "../pages/admin/school/SchoolStudents";
import SchoolReports from "../pages/admin/school/SchoolReports";
import SchoolSettings from "../pages/admin/school/SchoolSettings";

// 👥 User Management
import Users from "../pages/admin/Users";
import Roles from "../pages/admin/Roles";
import NewApplicants from "../pages/admin/NewApplicants";
import StudentEnrolment from "../pages/admin/StudentEnrolment";
import TeacherEnrolment from "../pages/admin/TeacherEnrolment";

// 📘 Academic Tools
import Subjects from "../pages/admin/Subjects";
import Assignments from "../pages/admin/Assignments";

// 🛠️ Admin Tools
import Database from "../pages/admin/Database";
import Philosophy from "../pages/admin/Philosophy";
import Contracts from "../pages/admin/Contracts";
import Tickets from "../pages/admin/Tickets";
import Settings from "../pages/admin/Settings";

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
      {/* 🏠 Dashboard */}
      <Route index element={<Dashboard />} />
      <Route path="dashboard" element={<Dashboard />} />

      {/* 📊 Core Insights */}
      <Route path="analytics-dashboard" element={<AnalyticsDashboard />} />
      <Route path="statistics" element={<StatisticsDashboard />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="generate-reports" element={<GenerateReports />} />
      <Route path="reports" element={<Reports />} />
      <Route path="reports-summary" element={<ReportsSummary />} />

      {/* 🏫 School Management */}
      <Route path="schools">
        <Route index element={<SchoolSelector />} />
        <Route path=":schoolSlug" element={<SchoolLayout />}>
          <Route index element={<SchoolDashboard />} />
          <Route path="dashboard" element={<SchoolDashboard />} />
          <Route path="teachers" element={<SchoolTeachers />} />
          <Route path="students" element={<SchoolStudents />} />
          <Route path="reports" element={<SchoolReports />} />
          <Route path="settings" element={<SchoolSettings />} />
        </Route>
      </Route>

      {/* 👥 User Management */}
      <Route path="users" element={<Users />} />
      <Route path="roles" element={<Roles />} />
      <Route path="new-applicants" element={<NewApplicants />} />
      <Route path="student-enrolment" element={<StudentEnrolment />} />
      <Route path="teacher-enrolment" element={<TeacherEnrolment />} />

      {/* 📘 Academic Tools */}
      <Route path="subjects" element={<Subjects />} />
      <Route path="assignments" element={<Assignments />} />

      {/* 🛠️ Configuration */}
      <Route path="database" element={<Database />} />
      <Route path="philosophy" element={<Philosophy />} />
      <Route path="contracts" element={<Contracts />} />
      <Route path="tickets" element={<Tickets />} />
      <Route path="settings" element={<Settings />} />
    </Route>
  );
}
