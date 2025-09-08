// src/routes/IntroGate.jsx
import { Navigate } from "react-router-dom";
import { hasSeenIntro } from "@/pages/student/onboarding/WelcomeIntro.jsx";

export default function IntroGate({ children }) {
  // If intro already seen, send to next step; else show intro
  if (hasSeenIntro()) return <Navigate to="/student/onboarding/buddy" replace />;
  return children;
}
