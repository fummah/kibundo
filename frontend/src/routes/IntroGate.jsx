// src/routes/IntroGate.jsx
import { Navigate } from "react-router-dom";
import { hasSeenIntro } from "@/pages/student/onboarding/introFlags";

export default function IntroGate({ children }) {
  // If intro already seen, send to the next step (Welcome Tour)
  if (hasSeenIntro()) {
    return <Navigate to="/student/onboarding/welcome-tour" replace />;
  }
  // Otherwise, render the Intro screen
  return children ?? null;
}
