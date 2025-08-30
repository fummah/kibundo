// src/components/BottomTabBarDE.jsx
import { Link, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
} from "@ant-design/icons";

export default function BottomTabBarDE() {
  const location = useLocation();

  const base =
    "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item =
    "text-lime-900/80 hover:text-lime-950 transition-colors duration-200";

  const tabs = [
    { to: "/parent", label: "Home", icon: <HomeOutlined className="text-xl" /> },
    {
      to: "/parent/myfamily/family?add=1",
      label: "Kind anlegen",
      icon: <PlusCircleOutlined className="text-xl" />,
    },
    {
      to: "/parent/communications/news",
      label: "News",
      icon: <ReadOutlined className="text-xl" />,
    },
    {
      to: "/parent/communications/newsletter",
      label: "Feedback",
      icon: <MessageOutlined className="text-xl" />,
    },
    {
      to: "/parent/settings",
      label: "Settings",
      icon: <SettingOutlined className="text-xl" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] bottom-tabs">
      <div className="mx-auto max-w-[720px] px-2 flex">
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.to.split("?")[0]);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`${base} ${item} ${
                active ? "text-lime-950 font-bold" : ""
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
