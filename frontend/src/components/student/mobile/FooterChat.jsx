// src/components/student/mobile/FooterChat.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { bottomChat } from "@/assets/mobile/tiles";
import ChatLayer from "@/components/student/mobile/ChatLayer.jsx";
import HomeworkChat from "@/components/student/mobile/HomeworkChat.jsx";
import { useChatDock } from "@/context/ChatDockContext";

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
  hideOnRoutes = ["/student/homework/feedback"],
  className = "",
  sheetHeight = "75%", // bottom sheet height (fallback)
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const { state: dockState, closeChat, expandChat } = useChatDock();

  // Track window width for responsive sheet height
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Route helpers
  const isOnHomework = useMemo(
    () => pathname.startsWith("/student/homework"),
    [pathname]
  );
  const isOnHome = useMemo(
    () => pathname.startsWith("/student/home"),
    [pathname]
  );
  const isOnOnboarding = useMemo(
    () => pathname.startsWith("/student/onboarding"),
    [pathname]
  );

  // Extract taskId from common homework routes:
  // /student/homework/doing/:taskId
  // /student/homework/interaction/:taskId
  // /student/homework/overview/:taskId
  // /student/homework/:taskId  (fallback)
  const taskId = useMemo(() => {
    const m =
      pathname.match(/\/student\/homework\/(?:doing|interaction|overview)\/(\d+)/) ||
      pathname.match(/\/student\/homework\/(\d+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const isHidden = hideOnRoutes.some((r) => pathname.startsWith(r));
  const isIncluded =
    !includeOnRoutes?.length ||
    includeOnRoutes.some((r) => pathname.startsWith(r));

  // Which component should the sheet show?
  const SheetContent = isOnHomework ? HomeworkChat : ChatLayer;

  // Close chat when on onboarding routes
  useEffect(() => {
    if (isOnOnboarding) {
      closeChat?.();
      setOpen(false);
    }
  }, [isOnOnboarding, closeChat]);

  // Close chat when navigating to home screen (unless explicitly opened with task)
  useEffect(() => {
    if (isOnHome && !isOnHomework) {
      // Only close if we're on home screen (not homework routes) and there's no active task
      if (!dockState?.task || !dockState?.visible) {
        closeChat?.();
        setOpen(false);
      }
    }
  }, [isOnHome, isOnHomework, dockState?.task, dockState?.visible, closeChat]);

  // Sync the bottom sheet with global chat dock visibility/expansion and task changes
  useEffect(() => {
    // Only open on homework routes when dock is explicitly set to visible/expanded
    const shouldOpen = isOnHomework && (dockState?.visible || dockState?.expanded);
    if (shouldOpen) setOpen(true);
    if (!dockState?.visible && !dockState?.expanded) setOpen(false);
  }, [isOnHomework, dockState?.visible, dockState?.expanded, dockState?.task?.id, dockState?.task?.updatedAt]);

  // Hide the footer trigger if not included or explicitly hidden
  if (isHidden || !isIncluded) return null;

  return (
    <>
      {/* Mobile trigger: fixed to viewport bottom */}
      <div
        className={[
          "fixed bottom-0 left-0 right-0 z-20 md:hidden pointer-events-none",
          className,
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            expandChat?.();
          }}
          className="block w-full pointer-events-auto active:scale-[0.98] transition"
          aria-label="Open chat"
        >
          <img
            src={bottomChat}
            alt="Chat dock"
            className="w-full h-auto select-none"
            draggable={false}
          />
        </button>
      </div>

      {/* Desktop trigger: absolute inside container with bottom offset to avoid taskbar */}
      <div
        className={[
          "hidden md:block absolute left-0 right-0 z-20 pointer-events-none",
          className,
        ].join(" ")}
        style={{
          bottom: windowWidth >= 1024 ? "8px" : "4px", // Small offset on desktop to avoid taskbar overlap
        }}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            expandChat?.();
          }}
          className="block w-full pointer-events-auto active:scale-[0.98] transition dd"
          aria-label="Open chat"
        >
          <img
            src={bottomChat}
            alt="Chat dock"
            className="w-full h-auto select-none"
            draggable={false}
          />
        </button>
      </div>

      {/* Bottom sheet overlay (fixed to viewport) */}
      {open && (
        <div
          className="fixed z-40"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: windowWidth >= 1024 ? "8px" : windowWidth >= 768 ? "4px" : 0, // Offset on desktop/tablet to avoid taskbar
            overscrollBehavior: "contain",
          }}
          aria-modal="true"
          role="dialog"
          aria-label="Chat"
        >
          {/* Mask */}
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setOpen(false);
              closeChat?.();
            }}
          />

          {/* Sheet panel - responsive height with bottom offset to avoid taskbar */}
          <div
            className="absolute left-0 right-0 flex flex-col"
            style={{
              bottom: windowWidth >= 1024 ? "8px" : windowWidth >= 768 ? "4px" : "0px", // Offset on desktop/tablet to avoid taskbar
              height: windowWidth < 768 
                ? `calc(85vh - env(safe-area-inset-bottom, 0px))` // Mobile: 85% minus safe area
                : windowWidth < 1024
                ? "calc(75vh - 4px)" // Tablet/iPad: 75% minus offset
                : "calc(70vh - 8px)", // Desktop: 70% minus offset
              maxHeight: windowWidth < 768 
                ? `calc(90vh - env(safe-area-inset-bottom, 0px))`
                : windowWidth >= 1024
                ? "calc(90vh - 8px)" // Desktop: subtract offset
                : "calc(90vh - 4px)", // Tablet: subtract offset
              minHeight: windowWidth < 768 ? "50vh" : "40vh", // Minimum height for usability
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: "1rem",
              overflow: "hidden",
              background: "white",
              paddingBottom: windowWidth < 768 ? "env(safe-area-inset-bottom, 0px)" : "0px",
            }}
          >
            {/* IMPORTANT:
                - On homework routes we mount HomeworkChat and pass taskId so it
                  uses its own storageKey (e.g., kibundo.chat.hw.<taskId>.v1).
                - On home routes we mount ChatLayer which uses its own storageKey
                  (e.g., kibundo.chat.home.v1).
                - Closing the sheet fully unmounts the chat to avoid scanner lockups.
            */}
            {isOnHomework ? (
              <SheetContent
                taskId={taskId}
                onClose={() => {
                  setOpen(false);
                  closeChat?.();
                }}
                onDone={setOpen}
              />
            ) : (
              <SheetContent
                onClose={() => {
                  setOpen(false);
                  closeChat?.();
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
