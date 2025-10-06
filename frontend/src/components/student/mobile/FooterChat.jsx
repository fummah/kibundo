// src/components/student/mobile/FooterChat.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { bottomChat } from "@/assets/mobile/tiles";
import ChatLayer from "@/components/student/mobile/ChatLayer.jsx";
import { useChatDock } from "@/context/ChatDockContext.jsx";

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
  includeOnRoutes = ["/student/home", "/student/homework"],
  hideOnRoutes = ["/student/chat"],
  className = "",
  sheetHeight = "75%", // bottom sheet height
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { state: dockState } = useChatDock?.() ?? {};
  const isDockOpen = !!dockState?.visible;

  // If the global dock opens, ensure the local footer sheet is closed
  useEffect(() => {
    if (isDockOpen && open) setOpen(false);
  }, [isDockOpen, open]);

  const isHidden = hideOnRoutes.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length ||
    includeOnRoutes.some((r) => pathname.startsWith(r));

  // Hide the footer trigger whenever the global chat dock is visible
  if (isHidden || !isIncluded || isDockOpen) return null;

  return (
    <>
      {/* Mobile trigger: absolute inside shell (NOT fixed to viewport) */}
      <div
        className={[
          "absolute bottom-0 left-0 right-0 z-20 md:hidden pointer-events-none",
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

      {/* Desktop trigger: absolute inside shell */}
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

      {/* In-shell bottom sheet (absolute; clipped by #parent-shell overflow) */}
      {open && (
        <div
          className="absolute inset-0 z-40"
          aria-modal="true"
          role="dialog"
          aria-label="Chat"
          // contain scroll within the shell
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Mask */}
          <button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Sheet panel */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: sheetHeight,
              // Rounded top corners and clipping for inner content
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: "1rem",
              overflow: "hidden",
              background: "white",
            }}
          >
            <ChatLayer onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
