// src/App.jsx
import React from "react";
import AppRoutes from "./routes/AppRoutes";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { ChatDockProvider } from "@/context/ChatDockContext";
import ChatDockContainer from "@/components/chats/ChatDockContainer.jsx";
import FooterChat from "@/components/student/mobile/FooterChat";

import "./index.css"; // includes .scroll-y-invisible and global overflow-hidden

export default function App() {
  const { pathname } = useLocation();
  const isFramed = pathname.startsWith("/student") || pathname.startsWith("/parent");

  const AppContent = () => (
    <>
      {/* Chat portal mount point (fills the framed screen and stays clipped) */}
      <div id="chat-root" className="absolute inset-0 pointer-events-none" />
      <AppRoutes />
    </>
  );

  return (
    <ChatDockProvider>
      {isFramed ? (
        // Tablet-style frame for student and parent routes
        <div className="w-full min-h-dvh flex justify-center bg-[#eef1f5] overflow-hidden">
          <div
            className="
              w-full md:max-w-[834px] lg:max-w-[1024px]
              mx-auto md:my-6
              md:h-[90svh] lg:h-[88svh]
              md:rounded-[1.25rem] md:border md:border-neutral-800
              md:p-3 md:bg-black md:shadow-2xl
              relative overflow-hidden
            "
          >
            {/* Screen area (scrolls only when needed, invisible scrollbar) */}
            <div className="relative w-full h-full bg-white md:rounded-[0.875rem] scroll-y-invisible">
              <AppContent />
            </div>

            {/* Footer chat pinned to frame shell bottom (sticky within frame) */}
            <FooterChat
              includeOnRoutes={["/student/home", "/student/homework"]}
              hideOnRoutes={["/student/homework/feedback"]}
            />
          </div>
        </div>
      ) : (
        // Plain layout for non-student/parent routes (e.g., admin)
        <AppRoutes />
      )}

      {/* Global floating chat dock (student routes only, EXCLUDING routes handled by FooterChat) & toasts */}
      <ChatDockContainer 
        includeOnRoutes={["/student/*"]} 
        excludeOnRoutes={["/student/home", "/student/homework"]} 
      />
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
    </ChatDockProvider>
  );
}
