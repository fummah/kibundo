import React, { useState, useMemo, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Layout, Spin } from "antd";
import { CloseOutlined } from "@ant-design/icons";

import Sidebar from "@/components/sidebars/Sidebar";
import GlobalNavBar from "@/components/layouts/GlobalNavBar.jsx";
import { useAuthContext } from "@/context/AuthContext";
import { ROLES } from "@/utils/roleMapper";               // ✅ needed to show student-only chip
import GlobalFocusTimer from "@/components/student/GlobalFocusTimer.jsx"; // ✅ floating timer chip

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary.jsx";

const { Content } = Layout;

/* ==================== Student Desktop Theme ==================== */
const DESKTOP_BG = {
  // layered bubbles + soft vertical blend (pine/sky/peach vibe)
  background: `
    radial-gradient(1000px 500px at -10% -10%, #eaf5ff 0%, rgba(234,245,255,0) 60%),
    radial-gradient(1000px 500px at 110% -10%, #fff0e2 0%, rgba(255,240,226,0) 60%),
    linear-gradient(180deg, #f6f9ff 0%, #ffffff 35%, #fff7ef 100%)
  `,
};

// simple desktop breakpoint hook
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, []);
  return isDesktop;
}

// one client scoped to app layout
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
    mutations: { retry: 0 },
  },
});

export default function GlobalLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const roleId = user?.role_id ?? user?.role;
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isDesktop = useIsDesktop();

  // show student background only on /student/* routes and desktop
  const showStudentDesktopBg = useMemo(
    () => isDesktop && location.pathname.startsWith("/student"),
    [isDesktop, location.pathname]
  );

  const isStudent = Number(roleId) === ROLES.STUDENT;

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="w-full min-h-screen flex flex-col bg-gradient-to-tr from-[#dbeafe] via-white to-[#ede9fe] text-gray-800 dark:text-white overflow-hidden">
          {/* Fixed Top Navigation — stays above modals/sidebars */}
          <header className="global-header fixed top-0 left-0 right-0 z-[3000]">
            <GlobalNavBar onToggleSidebar={() => setMenuOpen((v) => !v)} />
          </header>

          <div className="flex flex-1 pt-16 min-h-0">
            {/* Mobile Sidebar (below header) */}
            {isAuthenticated && (
              <div
                className={`fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r shadow-lg transform transition-transform duration-300 ease-in-out ${
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

            {/* Dim overlay for mobile sidebar (does NOT cover header) */}
            {menuOpen && (
              <div
                className="fixed left-0 right-0 top-16 bottom-0 z-30 bg-black/40 md:hidden"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
            )}

            {/* Desktop Sidebar (below header) */}
            {isAuthenticated && (
              <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r fixed top-16 left-0 h-[calc(100vh-4rem)] z-30">
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
              className={`relative flex-1 flex min-h-0 flex-col dark:text-white dark:bg-gray-900 ${
                isAuthenticated ? "md:ml-64" : ""
              } overflow-hidden`}
            >
              {/* >>> Student desktop background layer <<< */}
              {showStudentDesktopBg && (
                <div
                  className="hidden md:block absolute inset-0 -z-10"
                  style={DESKTOP_BG}
                  aria-hidden
                />
              )}

              <Content className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4">
                <React.Suspense
                  fallback={
                    <div className="w-full py-10 flex justify-center">
                      <Spin />
                    </div>
                  }
                >
                  <Outlet />
                </React.Suspense>

                {/* Global focus timer chip (student-only, desktop by default) */}
                {isStudent && <GlobalFocusTimer />}
              </Content>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
