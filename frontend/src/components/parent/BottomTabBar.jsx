// src/components/parent/BottomTabBar.jsx
import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useChatDock } from "@/context/ChatDockContext";

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
  /** open the global chat dock inline instead of navigating to /parent/chat */
  openChatInline = true,
  /** optional badges */
  unread = {
    news: 0,
    chat: 0,
    feedback: 0,
  },
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { openChat, expandChat } = useChatDock();

  const isHidden = hideOnRoutes?.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length || includeOnRoutes.some((r) => pathname.startsWith(r));

  if (isHidden || !isIncluded) return null;

  const base =
    "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";
  const active = "text-lime-950";

  const TABS = [
    {
      key: "home",
      to: "/parent/home",
      icon: <HomeOutlined className="text-xl" />,
      label: t("parent.nav.home", "Home"),
    },
    {
      key: "addChild",
      to: "/parent/myfamily/family?add-student=1",
      icon: <PlusCircleOutlined className="text-xl" />,
      label: t("parent.nav.addChild", "Add child"),
    },
    {
      key: "news",
      to: "/parent/communications/news",
      icon: <ReadOutlined className="text-xl" />,
      label: t("parent.nav.news", "News"),
      badge: unread?.news || 0,
    },
    // Chat for real-time messaging
    {
      key: "chat",
      to: "/parent/chat",
      icon: <CustomerServiceOutlined className="text-xl" />,
      label: t("parent.nav.chat", "Chat"),
      badge: unread?.chat || 0,
      onClick: (e) => {
        if (!openChatInline) return; // fall back to normal route nav
        e.preventDefault();
        try {
          openChat({ mode: "general" });
          expandChat();
        } catch {
          // if context not ready, gracefully navigate
          navigate("/parent/chat");
        }
      },
    },
    // Feedback for tickets/support
    {
      key: "feedback",
      to: "/parent/feedback/tickets",
      icon: <MessageOutlined className="text-xl" />,
      label: t("parent.nav.feedback", "Feedback"),
      badge: unread?.feedback || 0,
    },
    {
      key: "settings",
      to: "/parent/settings",
      icon: <SettingOutlined className="text-xl" />,
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
      className="w-full flex bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] rounded-none pointer-events-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
          <NavLink key={tab.key} to={tab.to} {...commonProps} end={false}>
            <div className="relative flex flex-col items-center">
              {tab.icon}
              <span className="flex items-center">
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
      {/* Mobile: fixed full-width */}
      <div
        className={[
          "fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none",
          className,
        ].join(" ")}
      >
        {renderTabs()}
      </div>

      {/* Desktop/tablet: sticky inside the framed screen */}
      <div
        className={[
          "hidden md:block sticky bottom-0 left-0 right-0 w-full z-40 pointer-events-none",
          className,
        ].join(" ")}
        style={{ marginBottom: "-1px" }}
      >
        {renderTabs()}
      </div>
    </>
  );
}
