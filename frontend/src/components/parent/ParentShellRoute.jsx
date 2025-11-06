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
    "/parent/chat"
  ];
  
  // Check if current route should hide the bottom bar
  // Also hide if chat is open on parent home (both /parent and /parent/home)
  const isOnParentHome = location.pathname === "/parent" || location.pathname === "/parent/home" || location.pathname === "/parent/";
  const shouldHideBottomBar = hideOnRoutes.some(route => location.pathname.startsWith(route)) || 
                               (isOnParentHome && chatOpen);

  // BottomTabBar will use its default includeOnRoutes=["/parent"] which matches all parent routes
  // We only need to pass hideOnRoutes to control where it's hidden
  return (
    <ParentShell
      bgImage={defaultBg}
      hideBottomBar={shouldHideBottomBar}
      hideOnRoutes={hideOnRoutes}
      includeOnRoutes={["/parent"]}
    >
      <Outlet />
    </ParentShell>
  );
}

