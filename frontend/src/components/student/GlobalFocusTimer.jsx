import MotivationTimer from "@/components/student/MotivationTimer.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

const ACCENT = {
  indigo: "#4f46e5",
  emerald: "#10b981",
  sky: "#0ea5e9",
  orange: "#f59e0b",
  pink: "#ec4899",
};

export default function GlobalFocusTimer() {
  const { state } = useStudentApp();
  const tone = state?.colorTheme || state?.profile?.theme || state?.buddy?.theme || "indigo";
  const accent = ACCENT[tone] || ACCENT.indigo;

  return (
    <div className="fixed right-4 bottom-4 z-[2000] hidden md:block">
      {/* Compact chip; persists/runs across pages */}
      <MotivationTimer variant="chip" accent={accent} />
    </div>
  );
}
