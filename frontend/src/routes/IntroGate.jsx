// src/routes/IntroGate.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { hasSeenIntro } from "@/pages/student/onboarding/introFlags";

export default function IntroGate({ children }) {
  // Get user ID from auth context - use selected child account if parent is viewing child
  const { user, account } = useAuthContext();
  
  // If parent has selected a child account (Netflix-style), use that child's ID
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);
  
  const location = useLocation();
  const allowReturn = Boolean(location.state?.allowIntroReturn);
  
  // If intro already seen, send to the next step (Buddy Selection)
  if (hasSeenIntro(studentId) && !allowReturn) {
    return <Navigate to="/student/onboarding/buddy" replace />;
  }
  // Otherwise, render the Intro screen
  return children ?? null;
}
