// src/components/chats/ChatDockContainer.jsx
import { useEffect, useMemo, useState, useRef } from "react";
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
  const isUnmountingRef = useRef(false);
  const containerRef = useRef(null);

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
  
  // Debug logging removed for production
  // useEffect(() => {
  //   if (!shouldRenderComponent) {
  //     console.log("🚫 ChatDockContainer: Not rendering on route:", pathname);
  //   }
  // }, [shouldRenderComponent, pathname]);

  // Cleanup: Close chat when route changes or component unmounts
  useEffect(() => {
    // Close chat when route changes to prevent portal conflicts
    if (!shouldRenderComponent) {
      try {
        closeChat?.();
        minimizeChat?.();
      } catch (error) {
        // Silently ignore cleanup errors
      }
    }
    
    return () => {
      isUnmountingRef.current = true;
      // Close chat on unmount to prevent portal cleanup errors
      try {
        closeChat?.();
        minimizeChat?.();
      } catch (error) {
        // Silently ignore cleanup errors
      }
    };
  }, [shouldRenderComponent, closeChat, minimizeChat]);

  // pick host: prefer #chat-root (clipped inside the framed shell)
  useEffect(() => {
    if (!shouldRenderComponent) {
      // Close chat before clearing container
      try {
        closeChat?.();
        minimizeChat?.();
      } catch {}
      // Use requestAnimationFrame to ensure DOM is settled before clearing
      const rafId = requestAnimationFrame(() => {
        if (!shouldRenderComponent) {
          setContainer(null);
          containerRef.current = null;
          setMounted(false);
        }
      });
      return () => {
        cancelAnimationFrame(rafId);
      };
    }
    
    // Use requestAnimationFrame to ensure DOM is ready and settled
    let rafId = requestAnimationFrame(() => {
      if (isUnmountingRef.current || !shouldRenderComponent) return; // Don't set up if unmounting or route changed
      
      try {
        const inShell =
          document.getElementById("chat-root") ||
          document.querySelector("#parent-shell, .ParentShell, .DeviceFrame");
        const targetContainer = inShell || document.body;
        
        // Verify container is still in the DOM before using it
        if (targetContainer && (targetContainer === document.body || document.body.contains(targetContainer))) {
          // Double-check container is still connected using isConnected
          if (targetContainer.isConnected !== false) {
            setContainer(targetContainer);
            containerRef.current = targetContainer;
            setMounted(true);
          } else {
            // Fallback to body if container is disconnected
            setContainer(document.body);
            containerRef.current = document.body;
            setMounted(true);
          }
        } else {
          // Fallback to body if container is not in DOM
          setContainer(document.body);
          containerRef.current = document.body;
          setMounted(true);
        }
      } catch (error) {
        console.warn("ChatDockContainer: Error setting up container:", error);
        // Always fallback to body on error
        setContainer(document.body);
        containerRef.current = document.body;
        setMounted(true);
      }
    });
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [shouldRenderComponent, pathname, closeChat, minimizeChat]); // 🔥 Re-run if shouldRenderComponent or pathname changes

  // mount/unmount with a small delay to let CSS transitions play
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!shouldRenderComponent) {
      // Ensure we clean up when component is excluded
      setVisible(false);
      setShouldRender(false);
      return; // 🔥 Don't process visibility if excluded
    }
    
    if (isUnmountingRef.current) {
      // Don't update state if unmounting
      return;
    }
    
    if (state?.visible) {
      setShouldRender(true);
      // let next tick apply "visible" class so transition runs
      const id = requestAnimationFrame(() => {
        if (!isUnmountingRef.current) {
          setVisible(true);
        }
      });
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        if (!isUnmountingRef.current) {
          setShouldRender(false);
        }
      }, animationMs);
      return () => clearTimeout(t);
    }
  }, [state?.visible, animationMs, shouldRenderComponent]); // 🔥 Added shouldRenderComponent

  // Calculate responsive bottom offset to prevent taskbar overlap
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    // Also listen to orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Responsive breakpoints
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Bottom offset: desktop (8px), tablet (4px), mobile (0px with safe area)
  const bottomOffset = isDesktop ? "8px" : isTablet ? "4px" : "0px";
  const safeAreaBottom = isMobile ? "env(safe-area-inset-bottom, 0px)" : "0px";

  // Responsive default sheet heights
  const responsiveDefaultHeight = useMemo(() => {
    if (isMobile) return "85vh"; // Mobile: taller for better usability
    if (isTablet) return "75vh"; // Tablet: medium height
    return defaultSheetHeight; // Desktop: use prop or default
  }, [isMobile, isTablet, defaultSheetHeight]);

  const sheetHeight = useMemo(
    () => (state?.expanded ? "100%" : responsiveDefaultHeight),
    [state?.expanded, responsiveDefaultHeight]
  );

  // Calculate sheet height with offset and max height constraints
  const sheetHeightWithOffset = useMemo(() => {
    if (state?.expanded) {
      // When expanded, account for bottom offset
      if (isDesktop) return "calc(100vh - 8px)";
      if (isTablet) return "calc(100vh - 4px)";
      return "calc(100vh - env(safe-area-inset-bottom, 0px))";
    }
    // When not expanded, use the responsive default height
    return sheetHeight;
  }, [state?.expanded, sheetHeight, isDesktop, isTablet, isMobile]);

  // Max height to prevent overflow
  const maxHeight = useMemo(() => {
    if (isDesktop) return "calc(100vh - 8px)";
    if (isTablet) return "calc(100vh - 4px)";
    return "calc(100vh - env(safe-area-inset-bottom, 0px))";
  }, [isDesktop, isTablet, isMobile]);

  // 🔥 Return null if route is excluded OR if not ready to render
  if (!shouldRenderComponent || !mounted || !container || !shouldRender) return null;

  // Don't render if unmounting
  if (isUnmountingRef.current) {
    return null;
  }

  // Verify container is still valid before creating portal
  let validContainer = container;
  try {
    if (!container || (typeof document !== 'undefined' && !document.body.contains(container))) {
      // Use ref as fallback
      validContainer = containerRef.current;
      if (!validContainer || (typeof document !== 'undefined' && !document.body.contains(validContainer))) {
        return null;
      }
    }
    
    // Final validation: ensure container is actually in the DOM
    if (validContainer && typeof document !== 'undefined') {
      // Check if container is still connected to the DOM
      if (validContainer !== document.body) {
        if (!document.body.contains(validContainer)) {
          return null;
        }
        // Also check isConnected property (more reliable)
        if (validContainer.isConnected === false) {
          return null;
        }
      }
    }
  } catch (error) {
    console.warn("ChatDockContainer: Error checking container:", error);
    // Try ref as last resort
    validContainer = containerRef.current;
    if (!validContainer) {
      return null;
    }
  }

  // If we're in the body, use fixed; inside #chat-root/shell, absolute is fine
  const isBody = validContainer === document.body;
  const positionClass = isBody ? "fixed" : "absolute";

  // Double-check container is still valid right before portal creation
  if (!validContainer || isUnmountingRef.current) {
    return null;
  }

  // Final safety check before creating portal
  if (typeof document !== 'undefined') {
    try {
      if (!document.body.contains(validContainer) && validContainer !== document.body) {
        return null;
      }
    } catch (e) {
      // If we can't verify, don't render
      return null;
    }
  }

  // Wrap portal creation in a safe error handler
  try {
    // One final check: ensure container is still valid
    if (typeof document !== 'undefined') {
      try {
        // Check if container is still connected
        if (validContainer !== document.body && validContainer.isConnected === false) {
          return null;
        }
      } catch (e) {
        // If check fails, don't render
        return null;
      }
    }

    return createPortal(
      <div
        className={`${positionClass} inset-x-0 z-[60] pointer-events-none`}
        style={{ 
          bottom: bottomOffset,
          paddingBottom: safeAreaBottom !== "0px" ? safeAreaBottom : undefined
        }}
        role="presentation"
      >
        {/* Backdrop (click to close) */}
        <button
          type="button"
          aria-label="Schließen"
          onClick={() => {
            if (isUnmountingRef.current) return;
            try {
              minimizeChat?.();
              closeChat?.();
            } catch {}
          }}
          className={`pointer-events-auto ${isBody ? "fixed inset-0" : "absolute inset-0"} bg-black/40 transition-opacity`}
          style={{ 
            opacity: visible ? 1 : 0,
            bottom: bottomOffset
          }}
        />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={state?.mode === "homework" ? "Hausaufgaben-Chat" : "Chat"}
        className={`pointer-events-auto ${isBody ? "fixed" : "absolute"} left-0 right-0 transition-transform transition-opacity duration-200`}
        style={{
          bottom: bottomOffset,
          height: sheetHeightWithOffset,
          maxHeight: maxHeight,
          minHeight: isMobile ? "50vh" : isTablet ? "40vh" : "30vh", // Minimum heights for usability
          borderTopLeftRadius: isMobile ? "1.5rem" : "1rem", // Larger radius on mobile
          borderTopRightRadius: isMobile ? "1.5rem" : "1rem",
          overflow: "hidden",
          background: "white",
          // slide up / fade with responsive transform
          transform: visible 
            ? "translateY(0)" 
            : isMobile 
            ? "translateY(10%)" 
            : "translateY(8%)",
          opacity: visible ? 1 : 0.98,
          // Smooth transitions
          transition: "transform 200ms ease-out, opacity 200ms ease-out",
        }}
      >
        {state?.mode === "homework" ? (
          <HomeworkChat
            key={`homework-${state?.task?.id ?? "chat"}`}
            onClose={() => {
              if (isUnmountingRef.current) return;
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
              if (isUnmountingRef.current) return;
              try {
                minimizeChat?.();
                closeChat?.();
              } catch {}
            }}
          />
        )}
      </div>
    </div>,
    validContainer
    );
  } catch (error) {
    // Silently handle portal creation errors - they're usually due to DOM timing issues
    // This can happen when React tries to unmount a portal while the DOM is being modified
    if (process.env.NODE_ENV === 'development') {
      console.warn("ChatDockContainer: Error creating portal (this is usually safe to ignore):", error.message);
    }
    return null;
  }
}
