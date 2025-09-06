// src/components/student/mobile/DeviceFrame.jsx
import React from "react";
import FooterChat from "@/components/student/mobile/FooterChat";

/**
 * DeviceFrame
 * - Renders children as-is on mobile & tablet
 * - On desktop (lg+), wraps the children inside a phone-like frame
 * - Optional chat strip footer (mobile + desktop-frame) via `showFooterChat`
 */
export default function DeviceFrame({
  children,
  className = "",
  showFooterChat = true,        // ⬅️ enable/disable footer strip
  footerTo = "/student/chat",   // ⬅️ where the strip navigates
}) {
  return (
    <div className={["min-h-svh w-full", className].join(" ")}>
      {/* Desktop: show phone frame */}
      <div className="hidden lg:flex items-center justify-center min-h-svh bg-neutral-100">
        <div
          className="relative rounded-[42px] shadow-2xl border border-black/5 bg-white"
          style={{ width: 420, height: 860 }}
        >
          {/* notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 h-6 w-40 rounded-full bg-black/10" />
          {/* content area */}
          <div className="absolute inset-0 overflow-hidden rounded-[42px]">
            {children}
            {showFooterChat && <FooterChat to={footerTo} />}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet: raw content + footer chat strip */}
      <div className="lg:hidden min-h-svh relative">
        {children}
        {showFooterChat && <FooterChat to={footerTo} />}
      </div>
    </div>
  );
}
