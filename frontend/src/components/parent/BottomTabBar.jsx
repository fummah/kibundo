// src/components/parent/BottomTabBar.jsx
import { Link } from "react-router-dom";
import {
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

/** 
 * Spacer so page content never hides behind the bottom tab bar. 
 * - Mobile: safe-area aware
 * - Desktop: fixed height inside device frame
 */
export function ParentTabSpacer({ className = "" }) {
  return (
    <>
      {/* Mobile spacer */}
      <div
        className={`block md:hidden h-[72px] ${className}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden
      />
      {/* Desktop spacer for framed mockup */}
      <div className={`hidden md:block h-[72px] ${className}`} aria-hidden />
    </>
  );
}

export default function BottomTabBar() {
  const { t } = useTranslation();

  const base =
    "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";

  const TABS = [
    {
      key: "home",
      to: "/parent/home",
      icon: <HomeOutlined className="text-xl" />,
      label: t("parent.nav.home"),
    },
    {
      key: "addChild",
      to: "/parent/myfamily/family?add=1",
      icon: <PlusCircleOutlined className="text-xl" />,
      label: t("parent.nav.addChild"),
    },
    {
      key: "news",
      to: "/parent/communications/news",
      icon: <ReadOutlined className="text-xl" />,
      label: t("parent.nav.news"),
    },
    {
      key: "feedback",
      to: "/parent/feedback/tickets",
      icon: <MessageOutlined className="text-xl" />,
      label: t("parent.nav.feedback"),
    },
    {
      key: "settings",
      to: "/parent/settings",
      icon: <SettingOutlined className="text-xl" />,
      label: t("parent.nav.settings"),
    },
  ];

  return (
    <nav className="fixed md:absolute bottom-0 left-0 right-0 z-40 bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] bottom-tabs pointer-events-none">
      <div className="mx-auto max-w-[720px] px-2 flex pointer-events-auto">
        {TABS.map((tab) => (
          <Link key={tab.key} to={tab.to} className={`${base} ${item}`}>
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
