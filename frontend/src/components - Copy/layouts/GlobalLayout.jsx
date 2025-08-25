import React, { useState, useMemo } from "react";
import { useLocation, Link, Outlet } from "react-router-dom";
import { Layout, Spin } from "antd";
import { CloseOutlined } from "@ant-design/icons";

import Sidebar from "@/components/sidebars/Sidebar";
import GlobalNavBar from "@/components/layouts/GlobalNavBar.jsx";
import { useAuthContext } from "@/context/AuthContext";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary.jsx";

const { Content } = Layout;

// one client scoped to admin layout
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
    mutations: { retry: 0 }
  }
});

/** Map only the segments you actually use in your routes */
const LABEL_MAP = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  dashboard: "Dashboard",
  analytics: "Analytics",
  statistics: "Statistics",
  reports: "Reports",
  generate: "Generate",
  billing: "Billing",
  products: "Products",
  contracts: "Contracts",
  content: "Content",
  publish: "Publish",
  academics: "Academics",
  curricula: "Curricula",
  worksheets: "Worksheets",
  quizzes: "Quizzes",
  games: "Games",
  "ai-agent": "AI Agent",
  scans: "Homework / Scans",
  ocr: "OCR",
  parents: "Parents",
  teachers: "Teachers",
  students: "Students",
  new: "New",
  edit: "Edit",
  tickets: "Tickets",
  tasks: "Tasks",
  settings: "Settings",
  roles: "Roles",
};

const pretty = (part) => {
  if (/^\d+$/.test(part)) return `#${part}`;
  return LABEL_MAP[part] || part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function GlobalLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const roleId = user?.role_id ?? user?.role;
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.map((part, idx) => ({
      label: pretty(part),
      path: "/" + parts.slice(0, idx + 1).join("/"),
    }));
  }, [location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="w-full min-h-screen flex flex-col bg-gradient-to-tr from-[#dbeafe] via-white to-[#ede9fe] text-gray-800 dark:text-white overflow-hidden">
          {/* Top Navigation */}
          <GlobalNavBar onToggleSidebar={() => setMenuOpen((v) => !v)} />

          <div className="flex flex-1 pt-16 min-h-0">
            {/* Mobile Sidebar */}
            {isAuthenticated && (
              <div
                className={`fixed top-0 left-0 z-40 w-64 h-full bg-white dark:bg-gray-900 border-r shadow-lg transform transition-transform duration-300 ease-in-out ${
                  menuOpen ? "translate-x-0" : "-translate-x-full"
                } md:hidden`}
              >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-extrabold text-blue-600 dark:text-blue-400">Kibundo</h2>
                  <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                    <CloseOutlined className="text-gray-600 dark:text-white text-lg" />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                  <Sidebar role={roleId} onLinkClick={() => setMenuOpen(false)} />
                </nav>
              </div>
            )}

            {/* Overlay */}
            {menuOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/40 md:hidden"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
            )}

            {/* Desktop Sidebar */}
            {isAuthenticated && (
              <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r fixed top-0 left-0 h-full z-30 pt-16">
                <div className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 text-2xl border-b border-gray-200 dark:border-gray-700">
                  Kibundo
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                  <Sidebar role={roleId} />
                </nav>
              </aside>
            )}

            {/* Main Content */}
            <div
              className={`flex-1 flex min-h-0 flex-col dark:text-white dark:bg-gray-900 ${
                isAuthenticated ? "md:ml-64" : ""
              } overflow-hidden`}
            >
             
              {/* Page Outlet */}
              <Content className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4">
                <React.Suspense fallback={<div className="w-full py-10 flex justify-center"><Spin /></div>}>
                  <Outlet />
                </React.Suspense>
              </Content>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
