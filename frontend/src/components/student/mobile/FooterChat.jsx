// src/components/student/mobile/FooterChat.jsx
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Drawer } from "antd";
import { bottomChat } from "@/assets/mobile/tiles";

// import your chat layer
import ChatLayer from "@/components/student/mobile/ChatLayer";

/** Spacer so page content never hides behind footer. */
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
      <div
        className={["hidden md:block h-[72px]", className].join(" ")}
        aria-hidden
      />
    </>
  );
}

export default function FooterChat({
  includeOnRoutes = ["/student/home", "/student/homework/start"],
  hideOnRoutes = ["/student/chat"],
  className = "",
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isHidden = hideOnRoutes.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length ||
    includeOnRoutes.some((r) => pathname.startsWith(r));

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
          onClick={() => setOpen(true)}
          className="block w-full pointer-events-auto active:scale-[0.98] transition"
          aria-label="Chat öffnen"
        >
          <img
            src={bottomChat}
            alt="Chat dock"
            className="w-full h-auto select-none"
            draggable={false}
          />
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
          onClick={() => setOpen(true)}
          className="block w-full pointer-events-auto active:scale-[0.98] transition"
          aria-label="Chat öffnen"
        >
          <img
            src={bottomChat}
            alt="Chat dock"
            className="w-full h-auto select-none"
            draggable={false}
          />
        </button>
      </div>

      {/* Drawer with ChatLayer */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom"
        height="75%"
        closable={false}
        styles={{ body: {
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          overflow: "hidden",
          padding: 0,
        } }}
      >
        <ChatLayer onClose={() => setOpen(false)} />
      </Drawer>
    </>
  );
}
