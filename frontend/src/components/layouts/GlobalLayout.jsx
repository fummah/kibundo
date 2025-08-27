// src/layouts/GlobalLayout.jsx
import React, { useState, useMemo, useEffect, createContext, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Layout, Spin } from "antd";

import Sidebar from "@/components/sidebars/Sidebar.jsx";
import GlobalNavBar from "@/components/layouts/GlobalNavBar.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import GradientShell from "@/components/GradientShell.jsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary.jsx";

const { Content } = Layout;

/* ---------------- Topbar Context ---------------- */
const TopbarContext = createContext(null);
export const useTopbar = () => useContext(TopbarContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
    mutations: { retry: 0 },
  },
});

export default function GlobalLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const roleId = Number(user?.role_id ?? user?.role ?? 0);
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    if (menuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Topbar state
  const [title, setTitle] = useState("Dashboard");
  const [subtitle, setSubtitle] = useState();
  const [tagCount, setTagCount] = useState();
  const [rightExtra, setRightExtra] = useState();
  const [onRefresh, setOnRefresh] = useState(() => () => {});

  const topbarCtx = useMemo(
    () => ({
      setTopbar: ({ title, subtitle, tagCount, rightExtra, onRefresh }) => {
        if (title !== undefined) setTitle(title);
        if (subtitle !== undefined) setSubtitle(subtitle);
        if (tagCount !== undefined) setTagCount(tagCount);
        if (rightExtra !== undefined) setRightExtra(rightExtra);
        if (onRefresh !== undefined) setOnRefresh(() => onRefresh);
      },
      resetTopbar: () => {
        setTitle("Dashboard");
        setSubtitle(undefined);
        setTagCount(undefined);
        setRightExtra(undefined);
        setOnRefresh(() => () => {});
      },
    }),
    []
  );

  const contentMarginClass =
    isAuthenticated ? (collapsed ? "md:ml-20" : "md:ml-64") : "";

  /* ---------------- Shared inner layout ---------------- */
  const InnerLayout = (
    <>
      {/* Topbar */}
      <header className="global-header fixed top-0 left-0 right-0 z-[3000]">
        <GlobalNavBar
          onToggleSidebar={() => setMenuOpen((v) => !v)}
          title={title}
          subtitle={subtitle}
          tagCount={tagCount}
          rightExtra={rightExtra}
          onRefresh={onRefresh}
        />
      </header>

      <div className="flex flex-1 pt-16 min-h-0">
        {isAuthenticated && (
          <Sidebar
            roleId={roleId}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            menuOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
          />
        )}

        <div
          className={[
            "flex-1 flex min-h-0 flex-col dark:text-white dark:bg-gray-900 overflow-hidden",
            contentMarginClass,
          ].join(" ")}
        >
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
          </Content>
        </div>
      </div>
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TopbarContext.Provider value={topbarCtx}>
          {/* ✅ Mobile (< md): wrap in GradientShell */}
          <div className="md:hidden min-h-screen flex flex-col">
            <GradientShell className="flex flex-col min-h-screen">
              {InnerLayout}
            </GradientShell>
          </div>

          {/* ✅ Desktop (>= md): plain layout */}
          <div className="hidden md:flex min-h-screen flex-col">
            {InnerLayout}
          </div>
        </TopbarContext.Provider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
