// src/App.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
// ChatDockProvider removed - not used in homework flow
// ChatDockContainer removed - homework flow uses HomeworkCollectChat directly
import { StudentAppProvider } from "@/context/StudentAppContext.jsx";
import { HelmetProvider } from "react-helmet-async";

import "./index.css"; // includes .scroll-y-invisible and global overflow-hidden

export default function App() {
  const { pathname } = useLocation();
  const isStudentRoute = pathname.startsWith("/student");

  return (
    <HelmetProvider>
      {isStudentRoute && (
        <StudentAppProvider>
          <AppContent />
        </StudentAppProvider>
      )}
      {!isStudentRoute && <AppContent />}
    </HelmetProvider>
  );
}

function AppContent() {
  const { pathname } = useLocation();
  const isStudentRoute = pathname.startsWith("/student");
  const isParentRoute = pathname.startsWith("/parent");
  const isStudentOnboarding = isStudentRoute && pathname.includes("/student/onboarding");

  return (
    <>
      {/* Responsive container for all routes */}
      <div className="min-h-screen w-full">
        {/* Student routes: full width on mobile, centered container starting from iPad */}
        {isStudentRoute ? (
          <div className="w-full min-h-screen flex flex-col">
            {/* Mobile: full width (< 768px) */}
            <div className="md:hidden w-full flex-1 relative">
              {/* Chat portal mount point for mobile */}
              <div id="chat-root" className="absolute inset-0 pointer-events-none" />
              <AppRoutes />
            </div>
            
            {/* iPad and larger: full width container */}
            <div className={`hidden md:flex md:min-h-screen w-full ${isStudentOnboarding ? "md:bg-transparent" : "md:bg-gray-50"}`}>
              <div
                className={`w-full ${isStudentOnboarding ? "bg-transparent shadow-none" : "bg-white shadow-lg"} flex flex-col min-h-screen relative`}
              >
                {/* Chat portal mount point for desktop - inside device frame */}
                <div id="chat-root" className="absolute inset-0 pointer-events-none" />
             
                  <AppRoutes />
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

      {/* Chat functionality handled by individual page components (e.g., HomeworkCollectChat for homework flow) */}
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
    </>
  );
}
