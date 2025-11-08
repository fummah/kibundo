// src/routes/IntroGate.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { hasSeenIntro } from "@/pages/student/onboarding/introFlags";

export default function IntroGate({ children }) {
  // Get user ID from auth context
  const { user } = useAuthContext();
  const studentId = user?.id || user?.user_id || null;
  const location = useLocation();
  const allowReturn = Boolean(location.state?.allowIntroReturn);
  
  // If intro already seen, send to the next step (Welcome Tour)
  if (hasSeenIntro(studentId) && !allowReturn) {
    return <Navigate to="/student/onboarding/welcome-tour" replace />;
  }
  // Otherwise, render the Intro screen
  return children ?? null;
}
