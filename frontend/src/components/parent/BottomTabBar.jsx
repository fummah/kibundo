// src/components/parent/BottomTabBar.jsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  UserAddOutlined,
  FileTextOutlined,
  StarOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

// Use the imported spacer (and re-export for convenience)
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
    "/parent/chat",
  ],
  className = "",
  /** optional badges */
  unread = {
    news: 0,
  },
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Use the specified lime green color
  const footerBgColor = "rgb(182, 188, 0)";
  const footerBorderColor = "rgb(182, 188, 0)";

  const isHidden = hideOnRoutes?.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length || includeOnRoutes.some((r) => pathname.startsWith(r));

  if (isHidden || !isIncluded) return null;

  const base =
    "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold transition-all";
  const item = "text-white hover:text-white";
  const active = "text-white rounded-t-lg bg-white/20";

  const TABS = [
    {
      key: "home",
      to: "/parent/home",
      icon: <HomeOutlined className="text-xl" style={{ color: "white" }} />,
      label: t("parent.nav.home", "Home"),
    },
    {
      key: "addChild",
      to: "/parent/myfamily/family?add-student=1",
      icon: <UserAddOutlined className="text-xl" style={{ color: "white" }} />,
      label: t("parent.nav.addChild", "Kind anlegen"),
    },
    {
      key: "news",
      to: "/parent/communications/news",
      icon: <FileTextOutlined className="text-xl" style={{ color: "white" }} />,
      label: t("parent.nav.news", "News"),
      badge: unread?.news || 0,
    },
    {
      key: "feedback",
      to: "/parent/feedback/tickets",
      icon: <StarOutlined className="text-xl" style={{ color: "white" }} />,
      label: t("parent.nav.feedback", "Feedback"),
    },
    {
      key: "settings",
      to: "/parent/settings",
      icon: <SettingOutlined className="text-xl" style={{ color: "white" }} />,
      label: t("parent.nav.settings", "Settings"),
    },
  ];

  const TabBadge = ({ count }) =>
    !count ? null : (
      <span className="min-w-[16px] h-[16px] px-1 rounded-full text-[10px] leading-[16px] text-white bg-red-500 ml-1 inline-flex items-center justify-center">
        {count > 99 ? "99+" : count}
      </span>
    );

  const renderTabs = () => (
    <div
      className="w-full flex shadow-[0_-10px_30px_rgba(0,0,0,0.08)] rounded-none pointer-events-auto"
      style={{ 
        backgroundColor: footerBgColor,
        borderTop: `1px solid ${footerBorderColor}`,
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
      role="navigation"
      aria-label="Parent bottom navigation"
    >
      {TABS.map((tab) => {
        const classNameFn = ({ isActive }) =>
          [base, item, isActive ? active : ""].join(" ");
        const commonProps = {
          className: classNameFn,
          "aria-label": tab.label,
          "data-tab": tab.key,
          onClick: tab.onClick,
        };
        return (
          <NavLink key={tab.key} to={tab.to} {...commonProps} end={false} style={{ pointerEvents: "auto" }}>
            <div className="relative flex flex-col items-center cursor-pointer">
              {tab.icon}
              <span className="flex items-center" style={{ color: "white" }}>
                {tab.label}
                <TabBadge count={tab.badge} />
              </span>
            </div>
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile: fixed to viewport, Desktop: absolute within device frame */}
      <div
        className={[
          "z-50",
          // Mobile: fixed to viewport bottom
          "fixed bottom-0 left-0 right-0",
          // Desktop: absolute within the device frame container (stays at bottom)
          "md:absolute md:bottom-0 md:left-0 md:right-0",
          className,
        ].join(" ")}
      >
        {renderTabs()}
      </div>
    </>
  );
}
