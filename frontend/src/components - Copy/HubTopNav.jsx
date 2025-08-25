// src/components/HubTopNav.jsx
import { useLocation, Link } from "react-router-dom";
import { HUB_MENUS, getHubFromPath } from "@/config/hubs";
import { Typography } from "antd";

export default function HubTopNav() {
  const { pathname } = useLocation();
  const hub = getHubFromPath(pathname);
  if (!hub) return null;

  const items = HUB_MENUS[hub] ?? [];
  const brand = hub === "support" ? "Support Central" : "EduPlatform";

  return (
    <div className="w-full border-b bg-white">
      <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between">
        <Typography.Text strong className="text-base">{brand}</Typography.Text>
        <nav className="flex gap-5">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            return (
              <Link
                key={it.key}
                to={it.to}
                className={`text-sm ${active ? "font-semibold" : "text-gray-600 hover:text-gray-900"}`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
