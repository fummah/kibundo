// src/components/student/mobile/BackgroundShell.jsx
import React from "react";
import topBg from "@/assets/backgrounds/top.png";
import bottomBg from "@/assets/backgrounds/bottom.png";

/**
 * BackgroundShell
 * - Single element with stacked backgrounds:
 *   1) top image pinned to top
 *   2) bottom image pinned to bottom
 *   3) neutral vertical gradient filling the middle (behind both)
 * - Content always on top
 */
export default function BackgroundShell({ children, className = "" }) {
  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col overflow-auto relative ${className}`}
      style={{
        // Order matters: first is on top, last is the "base"
        backgroundImage: `
          url(${topBg}),
          url(${bottomBg}),
          linear-gradient(to bottom, #f7f2ec 0%, #f7f2ec 100%)
        `,
        backgroundRepeat: "no-repeat, no-repeat, no-repeat",
        backgroundPosition: "top center, bottom center, center",
        backgroundSize: "100% auto, 100% auto, cover",
        // Optional: ensure there's always paint (helps on some mobile GPUs)
        backgroundColor: "#f7f2ec",
      }}
    >
      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
