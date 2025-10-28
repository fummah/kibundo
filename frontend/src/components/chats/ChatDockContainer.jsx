// src/components/chats/ChatDockContainer.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom"; // 🔥 Added for route checking
import { useChatDock } from "@/context/ChatDockContext";
import ChatLayer from "@/components/student/mobile/ChatLayer";
import HomeworkChat from "@/components/student/mobile/HomeworkChat";

export default function ChatDockContainer({
  // optional route gating handled by parent; this component just renders the dock
  includeOnRoutes = [],
  excludeOnRoutes = [], // 🔥 New prop to exclude specific routes
  defaultSheetHeight = "75%",
  animationMs = 200,
}) {
  const { pathname } = useLocation(); // 🔥 Get current route
  const { state, minimizeChat, closeChat } = useChatDock();
  const [container, setContainer] = useState(null);
  const [mounted, setMounted] = useState(false);

  // 🔥 Check if current route should be included
  const isIncluded = useMemo(() => {
    if (!includeOnRoutes.length) return true; // No restrictions if empty
    return includeOnRoutes.some(route => {
      // Handle wildcard routes like "/student/*"
      const cleanRoute = route.replace('/*', '');
      return pathname.startsWith(cleanRoute);
    });
  }, [pathname, includeOnRoutes]);

  // 🔥 Check if current route should be excluded
  const isExcluded = useMemo(() => {
    return excludeOnRoutes.some(route => {
      // Remove wildcard for startsWith check
      const cleanRoute = route.replace('/*', '');
      return pathname.startsWith(cleanRoute);
    });
  }, [pathname, excludeOnRoutes]);

  // 🔥 Early return BEFORE any effects or state initialization if route is excluded
  const shouldRenderComponent = isIncluded && !isExcluded;
  
  useEffect(() => {
    if (!shouldRenderComponent) {
      console.log("🚫 ChatDockContainer: Not rendering on route:", pathname);
    }
  }, [shouldRenderComponent, pathname]);

  // pick host: prefer #chat-root (clipped inside the framed shell)
  useEffect(() => {
    if (!shouldRenderComponent) return; // 🔥 Don't set up container if excluded
    const inShell =
      document.getElementById("chat-root") ||
      document.querySelector("#parent-shell, .ParentShell, .DeviceFrame");
    setContainer(inShell || document.body);
    setMounted(true);
  }, [shouldRenderComponent]); // 🔥 Re-run if shouldRenderComponent changes

  // mount/unmount with a small delay to let CSS transitions play
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!shouldRenderComponent) return; // 🔥 Don't process visibility if excluded
    
    if (state?.visible) {
      setShouldRender(true);
      // let next tick apply "visible" class so transition runs
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => setShouldRender(false), animationMs);
      return () => clearTimeout(t);
    }
  }, [state?.visible, animationMs, shouldRenderComponent]); // 🔥 Added shouldRenderComponent

  const sheetHeight = useMemo(
    () => (state?.expanded ? "100%" : defaultSheetHeight),
    [state?.expanded, defaultSheetHeight]
  );

  // 🔥 Return null if route is excluded OR if not ready to render
  if (!shouldRenderComponent || !mounted || !container || !shouldRender) return null;

  // If we’re in the body, use fixed; inside #chat-root/shell, absolute is fine
  const isBody = container === document.body;
  const positionClass = isBody ? "fixed" : "absolute";

  return createPortal(
    <div
      className={`${positionClass} inset-x-0 bottom-0 z-[60] pointer-events-none`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="presentation"
    >
      {/* Backdrop (click to close) */}
      <button
        type="button"
        aria-label="Schließen"
        onClick={() => {
          try {
            minimizeChat?.();
            closeChat?.();
          } catch {}
        }}
        className={`pointer-events-auto ${isBody ? "fixed inset-0" : "absolute inset-0"} bg-black/40 transition-opacity`}
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={state?.mode === "homework" ? "Hausaufgaben-Chat" : "Chat"}
        className={`pointer-events-auto ${isBody ? "fixed" : "absolute"} left-0 right-0 bottom-0 transition-transform transition-opacity duration-200`}
        style={{
          height: sheetHeight,
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          overflow: "hidden",
          background: "white",
          // slide up / fade
          transform: visible ? "translateY(0)" : "translateY(8%)",
          opacity: visible ? 1 : 0.98,
        }}
      >
        {state?.mode === "homework" ? (
          <HomeworkChat
            key={`homework-${state?.task?.id ?? "chat"}`}
            onClose={() => {
              try {
                minimizeChat?.();
                closeChat?.();
              } catch {}
            }}
          />
        ) : (
          <ChatLayer
            key={state?.mode ?? "chat"}
            onClose={() => {
              try {
                minimizeChat?.();
                closeChat?.();
              } catch {}
            }}
          />
        )}
      </div>
    </div>,
    container
  );
}
