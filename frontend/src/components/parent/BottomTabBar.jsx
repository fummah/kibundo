// src/components/parent/BottomTabBar.jsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";

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
  const { pathname } = useLocation();

  // Match the lime-green background used on ParentHome navbar
  const footerBgColor = "#BDCF56";
  const footerBorderColor = "#BDCF56";

  const isHidden = hideOnRoutes?.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length || includeOnRoutes.some((r) => pathname.startsWith(r));

  if (isHidden || !isIncluded) return null;

  const renderTabs = () => (
    <div
      className="w-full pointer-events-auto"
      role="navigation"
      aria-label="Parent bottom navigation"
    >
      <div
        style={{
          position: "relative",
          left: 0,
          bottom: 0,
          width: "100%",
          height: "88px",
          background: "#BDCF56",
          boxShadow: "0px 0px 4px rgba(0,0,0,0.5)",
          borderRadius: "16px 16px 0px 0px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "12px 24px",
          boxSizing: "border-box",
          zIndex: 2,
        }}
      >
        {[
          {
            label: "Einstellungen",
            to: "/parent/settings",
            icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.07a2 2 0 0 1-3.38 1.99l-.05-.07A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33l-.07.02a2 2 0 0 1-1.99-3.38l.07-.05A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82l-.02-.07a2 2 0 0 1 3.38-1.99l.05.07A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.39.25.73.59.98.98a1.65 1.65 0 0 0 1.82.33l.07-.02a2 2 0 0 1 1.99 3.38l-.07.05A1.65 1.65 0 0 0 19.4 15Z"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
          {
            label: "Rückmeldung",
            to: "/parent/chat",
            icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12c0 3.866-3.582 7-8 7-1.01 0-1.972-.166-2.852-.47L5 19l.8-3.2C4.705 14.7 4 13.412 4 12c0-3.866 3.582-7 8-7s9 3.134 9 7Z"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
          {
            label: "Neuigkeiten",
            to: "/parent/communications/news",
            icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="5"
                  width="16"
                  height="14"
                  rx="2"
                  stroke="#fff"
                  strokeWidth="2"
                />
                <path
                  d="M8 9h8M8 13h5"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ),
          },
          {
            label: "Kind",
            to: "/parent/myfamily/add-another-child-intro",
            icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                {/* Child avatar */}
                <circle cx="9" cy="7" r="3.5" stroke="#fff" strokeWidth="2" />
                <path
                  d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Plus sign to indicate adding a child */}
                <circle cx="18" cy="8" r="3.25" stroke="#fff" strokeWidth="2" />
                <path
                  d="M18 6.75v2.5M16.75 8h2.5"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ),
          },
          {
            label: "Startseite",
            to: "/parent/home",
            icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5Z"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
        ].map((item, idx) => (
          <NavLink
            key={idx}
            to={item.to}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontFamily: "Nunito",
                fontWeight: 800,
                fontSize: "16px",
                lineHeight: "1.364",
                letterSpacing: "2%",
                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
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