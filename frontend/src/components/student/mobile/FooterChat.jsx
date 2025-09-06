// src/components/student/mobile/FooterChat.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { bottomChat } from "@/assets/mobile/tiles";

/** Use at the bottom of long pages so content never hides behind the footer. */
export function ChatStripSpacer({ className = "" }) {
  return (
    <>
      {/* Mobile spacer (safe-area aware) */}
      <div
        className={["block md:hidden h-[72px]", className].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden
      />
      {/* Desktop spacer for framed layout */}
      <div className={["hidden md:block h-[72px]", className].join(" ")} aria-hidden />
    </>
  );
}

/**
 * FooterChat
 * - Shows ONLY on routes in `includeOnRoutes`
 * - Hides on any route in `hideOnRoutes`
 * - Safe-area aware on mobile, absolute inside desktop device frame
 */
export default function FooterChat({
  to = "/student/chat",
  includeOnRoutes = ["/student/home", "/student/homework/start"],
  hideOnRoutes = ["/student/chat"],
  className = "",
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isHidden = hideOnRoutes.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length || includeOnRoutes.some((r) => pathname.startsWith(r));

  if (isHidden || !isIncluded) return null;

  return (
    <>
      {/* Mobile: fixed full-width */}
      <div
        className={[
          "fixed bottom-0 left-0 right-0 z-30 md:hidden pointer-events-none",
          className,
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={() => navigate(to)}
          className="block w-full pointer-events-auto active:scale-[0.98] transition"
          aria-label="Chat öffnen"
        >
          <img src={bottomChat} alt="Chat dock" className="w-full h-auto select-none" draggable={false} />
        </button>
      </div>

      {/* Desktop: absolute inside BackgroundShell / DeviceFrame */}
      <div
        className={[
          "hidden md:block absolute inset-x-0 bottom-0 z-20 pointer-events-none",
          className,
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => navigate(to)}
          className="block w-full pointer-events-auto active:scale-[0.98] transition"
          aria-label="Chat öffnen"
        >
          <img src={bottomChat} alt="Chat dock" className="w-full h-auto select-none" draggable={false} />
        </button>
      </div>
    </>
  );
}
