// src/components/student/mobile/FooterChat.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  hideTriggerWhenOpen = false,
  onChatOpen,
  onChatClose,
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
  
  // Check if we're on the homework LIST page (not detail pages)
  const isOnHomeworkList = useMemo(() => {
    // List page is exactly /student/homework or /student/homework/
    const normalizedPath = pathname.replace(/\/$/, ''); // Remove trailing slash
    return normalizedPath === "/student/homework";
  }, [pathname]);

  // Check if we're on the homework DOING page (scanner page)
  const isOnHomeworkDoing = useMemo(() => {
    // Doing page is exactly /student/homework/doing
    const normalizedPath = pathname.replace(/\/$/, ''); // Remove trailing slash
    return normalizedPath === "/student/homework/doing";
  }, [pathname]);

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

  const isHiddenRoute = hideOnRoutes.some((r) => pathname.startsWith(r));
  const isHidden = isHiddenRoute && !(dockState?.visible || dockState?.expanded);

  // Which component should the sheet show?
  const SheetContent = isOnHomework ? HomeworkChat : ChatLayer;

  // Close chat when on onboarding routes
  useEffect(() => {
    if (isOnOnboarding) {
      closeChat?.();
      setOpen(false);
    }
  }, [isOnOnboarding, closeChat]);

  // Close chat when navigating TO homework list page or doing page (prevent auto-opening)
  // But allow manual opening via footer button
  const prevPathnameRef = useRef(pathname);
  const justNavigatedToDoingRef = useRef(false);
  const hasAnnouncedRef = useRef(false);
  useEffect(() => {
    // Only close if we just navigated TO the list page or doing page (not if we're already there)
    const justNavigatedToList = isOnHomeworkList && prevPathnameRef.current !== pathname;
    const justNavigatedToDoing = isOnHomeworkDoing && prevPathnameRef.current !== pathname;
    
    if (justNavigatedToList || justNavigatedToDoing) {
      // Just navigated to list page or doing page - close chat to prevent auto-opening
      // The doing page will open chat explicitly if needed (e.g., when uploading a file)
      closeChat?.();
      setOpen(false);
      // Track that we just navigated to doing page (reset after a short delay)
      if (justNavigatedToDoing) {
        justNavigatedToDoingRef.current = true;
        setTimeout(() => {
          justNavigatedToDoingRef.current = false;
        }, 100);
      }
    }
    prevPathnameRef.current = pathname;
  }, [isOnHomeworkList, isOnHomeworkDoing, pathname, closeChat]);

  // Close chat when navigating to home screen (unless explicitly opened)
  useEffect(() => {
    if (isOnHome && !isOnHomework) {
      // Only close if we're on home screen (not homework routes) and chat is not explicitly opened
      // Don't close if dock is visible/expanded (user clicked footer button or opened chat)
      if ((!dockState?.task && !dockState?.visible && !dockState?.expanded)) {
        closeChat?.();
        setOpen(false);
      }
    }
  }, [isOnHome, isOnHomework, dockState?.task, dockState?.visible, dockState?.expanded, closeChat]);

  // Sync the bottom sheet with global chat dock visibility/expansion and task changes
  useEffect(() => {
    // Small delay to ensure state updates are processed
    const timeoutId = setTimeout(() => {
      // On list page: allow opening if dock is visible/expanded (either from card click or footer button)
      if (isOnHomeworkList) {
        // Allow opening if dock is visible/expanded (supports both card clicks and footer button)
        if (dockState?.visible || dockState?.expanded) {
          setOpen(true);
        } else {
          setOpen(false);
        }
        return;
      }
      
      // On doing page: only open if there's an explicit task (user uploaded a file or has task state)
      // Don't auto-open just because dock state is visible/expanded from a previous action
      // Check if we just navigated to this page - if so, don't auto-open
      if (isOnHomeworkDoing) {
        // Only open if there's a task AND dock is visible/expanded AND we didn't just navigate here
        // This prevents auto-opening when navigating to the doing page
        if (!justNavigatedToDoingRef.current && dockState?.task && (dockState?.visible || dockState?.expanded)) {
          setOpen(true);
        } else {
          setOpen(false);
        }
        return;
      }
      
      // Only open on other homework detail routes when dock is explicitly set to visible/expanded
      const shouldOpen = isOnHomework && (dockState?.visible || dockState?.expanded);
      if (shouldOpen) setOpen(true);
      if (!dockState?.visible && !dockState?.expanded) setOpen(false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isOnHomework, isOnHomeworkList, isOnHomeworkDoing, dockState?.visible, dockState?.expanded, dockState?.task?.id, dockState?.task?.updatedAt]);

  useEffect(() => {
    if (!hasAnnouncedRef.current) {
      hasAnnouncedRef.current = true;
      if (open) onChatOpen?.();
      return;
    }

    if (open) {
      onChatOpen?.();
    } else {
      onChatClose?.();
    }
  }, [open, onChatOpen, onChatClose]);

  if (isHidden && !dockState?.visible && !dockState?.expanded) return null;

  const hideTriggerStrip = hideTriggerWhenOpen && open;

  return (
    <>
      {/* Mobile trigger: fixed to viewport bottom */}
      {!hideTriggerStrip && (
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
      )}

      {/* Desktop trigger: absolute inside container with bottom offset to avoid taskbar */}
      {!hideTriggerStrip && (
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
      )}

      {/* Bottom sheet overlay */}
      {/* On mobile: fixed to viewport, On desktop: contained within shell */}
      {open && (
        <div
          className={windowWidth >= 768 ? "fixed z-40" : "fixed z-40"}
          style={{
            // On desktop, position relative to the centered container (max-w-[1024px])
            // Calculate left offset to center it within the viewport
            left: windowWidth >= 768 && windowWidth < 1024 
              ? "50%" 
              : windowWidth >= 1024
              ? `calc(50% - 512px)` // Center: 50% - half of max-width (1024px / 2)
              : "0",
            right: windowWidth >= 768 && windowWidth < 1024
              ? "auto"
              : windowWidth >= 1024
              ? "auto"
              : "0",
            width: windowWidth >= 768 && windowWidth < 1024
              ? "100%"
              : windowWidth >= 1024
              ? "1024px"
              : "100%",
            maxWidth: windowWidth >= 1024 ? "1024px" : "100%",
            top: 0,
            bottom: windowWidth >= 1024 ? "8px" : windowWidth >= 768 ? "4px" : 0, // Offset on desktop/tablet to avoid taskbar
            overscrollBehavior: "contain",
            transform: windowWidth >= 768 && windowWidth < 1024 ? "translateX(-50%)" : "none",
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
          {/* On homework pages, start below header area to avoid overlapping progress bar and mascot */}
          <div
            className="absolute left-0 right-0 flex flex-col"
            style={{
              // Responsive top offset for homework pages (accounts for header, title, progress bar, mascot)
              // Mobile: ~180-200px, Tablet: ~200-220px, Desktop: ~220-240px
              top: isOnHomework 
                ? windowWidth < 640 
                  ? "clamp(180px, 25vh, 200px)" // Small mobile: 180-200px
                  : windowWidth < 768
                  ? "clamp(190px, 26vh, 210px)" // Large mobile: 190-210px
                  : windowWidth < 1024
                  ? "clamp(200px, 28vh, 230px)" // Tablet: 200-230px
                  : "clamp(220px, 30vh, 250px)" // Desktop: 220-250px
                : undefined,
              // On home screen, use bottom positioning
              bottom: isOnHomework 
                ? undefined 
                : windowWidth >= 1024 
                  ? "8px" 
                  : windowWidth >= 768 
                  ? "4px" 
                  : "0px",
              // Responsive height calculation
              // Always use viewport height (100vh) since we're using fixed positioning
              height: isOnHomework 
                ? windowWidth < 640
                  ? `calc(100vh - clamp(180px, 25vh, 200px) - env(safe-area-inset-bottom, 0px))`
                  : windowWidth < 768
                  ? `calc(100vh - clamp(190px, 26vh, 210px) - env(safe-area-inset-bottom, 0px))`
                  : windowWidth < 1024
                  ? "calc(100vh - clamp(200px, 28vh, 230px) - 4px)"
                  : "calc(100vh - clamp(220px, 30vh, 250px) - 8px)" // Desktop: viewport height minus header
                : windowWidth < 640
                  ? `clamp(50vh, 65vh, 70vh)` // Small mobile: 50-70vh
                  : windowWidth < 768
                  ? `clamp(55vh, 68vh, 75vh)` // Large mobile: 55-75vh
                  : windowWidth < 1024
                  ? "clamp(50vh, 60vh, 70vh)" // Tablet: 50-70vh
                  : "clamp(45vh, 55vh, 65vh)", // Desktop: 45-65vh
              maxHeight: isOnHomework
                ? windowWidth < 640
                  ? `calc(100vh - clamp(180px, 25vh, 200px) - env(safe-area-inset-bottom, 0px))`
                  : windowWidth < 768
                  ? `calc(100vh - clamp(190px, 26vh, 210px) - env(safe-area-inset-bottom, 0px))`
                  : windowWidth >= 1024
                  ? "calc(100vh - clamp(220px, 30vh, 250px) - 8px)" // Desktop: viewport height
                  : "calc(100vh - clamp(200px, 28vh, 230px) - 4px)"
                : windowWidth < 640
                  ? "75vh"
                  : windowWidth < 768
                  ? "80vh"
                  : windowWidth >= 1024
                  ? "75vh" // Desktop: max height
                  : "80vh",
              minHeight: windowWidth < 640 
                ? "clamp(40vh, 50vh, 60vh)" // Small mobile: 40-60vh minimum
                : windowWidth < 768
                ? "clamp(45vh, 55vh, 65vh)" // Large mobile: 45-65vh minimum
                : "clamp(35vh, 45vh, 55vh)", // Tablet/Desktop: 35-55vh minimum
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
                readOnly={!!dockState?.readOnly}
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
