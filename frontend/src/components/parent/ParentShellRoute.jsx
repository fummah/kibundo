// src/components/parent/ParentShellRoute.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ParentShell from "./ParentShell.jsx";
import defaultBg from "@/assets/backgrounds/global-bg.png";

/**
 * ParentShellRoute
 * Wraps all parent routes so they render inside ParentShell
 * Similar to how MobileShell wraps student routes
 */
export default function ParentShellRoute() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  
  // Listen for chat open/close events from ParentHome
  useEffect(() => {
    const handleChatOpen = () => setChatOpen(true);
    const handleChatClose = () => setChatOpen(false);
    
    window.addEventListener('parent-chat:open', handleChatOpen);
    window.addEventListener('parent-chat:close', handleChatClose);
    
    return () => {
      window.removeEventListener('parent-chat:open', handleChatOpen);
      window.removeEventListener('parent-chat:close', handleChatClose);
    };
  }, []);
  
  // Routes where bottom bar should be hidden
  const hideOnRoutes = [
    "/parent/billing/checkout",
    "/parent/billing/success",
    "/parent/myfamily/add-student-flow",
    "/parent/myfamily/add-student-intro",
    "/parent/myfamily/add-another-child-intro",
    "/parent/chat"
  ];
  
  // Check if current route should hide the bottom bar
  // Also hide if chat is open on parent home (both /parent and /parent/home)
  const isOnParentHome = location.pathname === "/parent" || location.pathname === "/parent/home" || location.pathname === "/parent/";
  const shouldHideBottomBar = hideOnRoutes.some(route => location.pathname.startsWith(route)) || 
                               (isOnParentHome && chatOpen);

  // Routes that should not use ParentShell (use their own layout like CircularBackground)
  const noShellRoutes = [
    "/parent/myfamily/add-student-flow",
    "/parent/myfamily/add-student-intro",
    "/parent/myfamily/add-another-child-intro",
    "/parent/settings",
    "/parent/feedback"
  ];
  const shouldSkipShell = noShellRoutes.some(route => location.pathname.startsWith(route));

  // If route should skip ParentShell, render Outlet directly
  if (shouldSkipShell) {
    return <Outlet />;
  }

  // Routes that use their own background (like CircularBackground)
  const customBackgroundRoutes = ["/parent/myfamily/add-student-flow"];
  const hasCustomBackground = customBackgroundRoutes.some(route => location.pathname.startsWith(route));
  const bgImage = hasCustomBackground ? "none" : defaultBg;

  // BottomTabBar will use its default includeOnRoutes=["/parent"] which matches all parent routes
  // We only need to pass hideOnRoutes to control where it's hidden
  return (
    <ParentShell
      bgImage={bgImage}
      hideBottomBar={shouldHideBottomBar}
      hideOnRoutes={hideOnRoutes}
      includeOnRoutes={["/parent"]}
    >
      <Outlet />
    </ParentShell>
  );
}

