// src/components/parent/BottomTabBar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

// ✅ Use the imported spacer (and re-export for convenience)
import ParentSpaceBar from "@/components/parent/ParentSpaceBar.jsx";
export { ParentSpaceBar };
export { ParentSpaceBar as ParentTabSpacer }; // legacy alias

/**
 * BottomTabBar
 * - Shows ONLY on routes in `includeOnRoutes`
 * - Hides on any route in `hideOnRoutes`
 * - Safe-area aware on mobile, absolute inside desktop DeviceFrame/ParentShell
 * - Use <ParentSpaceBar /> on pages to keep content from being covered
 */
export default function BottomTabBar({
  includeOnRoutes = ["/parent"],
  hideOnRoutes = [
    "/parent/communications/news/preview",
    "/parent/myfamily/add-student-flow",
  ],
  className = "",
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const isHidden = hideOnRoutes?.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length || includeOnRoutes.some((r) => pathname.startsWith(r));

  if (isHidden || !isIncluded) return null;

  const base =
    "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";
  const active = "text-lime-950";

  const TABS = [
    { key: "home", to: "/parent/home", icon: <HomeOutlined className="text-xl" />, label: t("parent.nav.home") },
    { key: "addChild", to: "/parent/myfamily/family?add-student=1", icon: <PlusCircleOutlined className="text-xl" />, label: t("parent.nav.addChild") },
    { key: "news", to: "/parent/communications/news", icon: <ReadOutlined className="text-xl" />, label: t("parent.nav.news") },
    { key: "feedback", to: "/parent/feedback/tickets", icon: <MessageOutlined className="text-xl" />, label: t("parent.nav.feedback") },
    { key: "settings", to: "/parent/settings", icon: <SettingOutlined className="text-xl" />, label: t("parent.nav.settings") },
  ];

  const renderTabs = () => (
    <div
      className="mx-auto max-w-[1024px] px-2 flex bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] rounded-t-2xl pointer-events-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="Parent bottom navigation"
    >
      {TABS.map((tab) => {
        const selected = pathname === tab.to || pathname.startsWith(tab.to);
        return (
          <Link
            key={tab.key}
            to={tab.to}
            className={[base, item, selected ? active : ""].join(" ")}
            aria-current={selected ? "page" : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile: fixed full-width */}
      <div
        className={[
          "fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none",
          className,
        ].join(" ")}
      >
        {renderTabs()}
      </div>

      {/* Desktop/tablet: absolute inside DeviceFrame/ParentShell (parent must be relative) */}
      <div
        className={[
          "hidden md:block absolute inset-x-0 bottom-0 z-40 pointer-events-none",
          className,
        ].join(" ")}
      >
        {renderTabs()}
      </div>
    </>
  );
}
