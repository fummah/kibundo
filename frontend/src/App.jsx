// src/App.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import { ChatDockProvider } from "@/context/ChatDockContext";
import ChatDockContainer from "@/components/chats/ChatDockContainer.jsx";
import FooterChat from "@/components/student/mobile/FooterChat";
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";

import "./index.css"; // includes .scroll-y-invisible and global overflow-hidden

export default function App() {
  const { pathname } = useLocation();
  const isStudentRoute = pathname.startsWith("/student");

  return (
    <ChatDockProvider>
      {isStudentRoute && (
        <StudentAppProvider>
          <AppContent />
        </StudentAppProvider>
      )}
      {!isStudentRoute && <AppContent />}
    </ChatDockProvider>
  );
}

function AppContent() {
  const { pathname } = useLocation();
  const isStudentRoute = pathname.startsWith("/student");
  const isParentRoute = pathname.startsWith("/parent");

  return (
    <>
      {/* Responsive container for all routes */}
      <div className="min-h-screen w-full">
        {/* Student routes: full width on mobile, centered container starting from iPad */}
        {isStudentRoute ? (
          <div className="w-full min-h-screen flex flex-col">
            {/* Mobile: full width (< 768px) */}
            <div className="md:hidden w-full flex-1 relative pb-20">
              {/* Chat portal mount point for mobile */}
              <div id="chat-root" className="absolute inset-0 pointer-events-none" />
              <AppRoutes />
              
              {/* Footer chat for mobile - fixed at bottom */}
              <div className="fixed bottom-0 left-0 right-0 z-20">
                <FooterChat
                  includeOnRoutes={["/student/home", "/student/homework"]}
                  hideOnRoutes={["/student/homework/feedback"]}
                />
              </div>
            </div>
            
            {/* iPad and larger: centered container with max-width */}
            <div className="hidden md:flex md:justify-center md:min-h-screen md:bg-gray-50">
              <div className="w-full max-w-[1024px] bg-white shadow-lg flex flex-col min-h-screen relative">
                {/* Chat portal mount point for desktop - inside device frame */}
                <div id="chat-root" className="absolute inset-0 pointer-events-none" />
                <div className="flex-1 overflow-y-auto pb-20">
                  <AppRoutes />
                </div>
                
                {/* Footer chat for student routes - fixed at bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <FooterChat
                    includeOnRoutes={["/student/home", "/student/homework"]}
                    hideOnRoutes={["/student/homework/feedback"]}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : isParentRoute ? (
          // Parent routes: full width on mobile, centered container starting from iPad (same as student)
          <div className="w-full min-h-screen flex flex-col">
            {/* Mobile: full width (< 768px) */}
            <div className="md:hidden w-full flex-1 relative">
              {/* Chat portal mount point for mobile */}
              <div id="chat-root" className="absolute inset-0 pointer-events-none" />
              <AppRoutes />
            </div>
            
            {/* iPad and larger: centered container with max-width */}
            <div className="hidden md:flex md:justify-center md:min-h-screen md:bg-gray-50">
              <div className="w-full max-w-[1024px] bg-white shadow-lg flex flex-col min-h-screen relative">
                {/* Chat portal mount point for desktop - inside device frame */}
                <div id="chat-root" className="absolute inset-0 pointer-events-none" />
                <div className="flex-1 overflow-y-auto">
                  <AppRoutes />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Non-student/parent routes: full width
          <>
            {/* Chat portal mount point for other routes */}
            <div id="chat-root" className="absolute inset-0 pointer-events-none" />
            <AppRoutes />
          </>
        )}
      </div>

      {/* Global floating chat dock (student routes + parent viewing student pages, EXCLUDING routes handled by FooterChat) & toasts */}
      <ChatDockContainer 
        includeOnRoutes={["/student/*", "/parent/myfamily/student/*"]} 
        excludeOnRoutes={[
          "/student/home", 
          "/student/homework",
          "/admin/*",  // Explicitly exclude all admin routes
          "/admin/students/*",  // Explicitly exclude admin student routes
        ]} 
      />
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
    </>
  );
}
