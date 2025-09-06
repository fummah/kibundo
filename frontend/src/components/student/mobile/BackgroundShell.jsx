// src/components/student/mobile/BackgroundShell.jsx
import React from "react";
import topBg from "@/assets/backgrounds/top.png";
import bottomBg from "@/assets/backgrounds/bottom.png";
import globalBg from "@/assets/backgrounds/global-bg.png";

/**
 * BackgroundShell
 * - Full-height flex column
 * - Acts as the scroll container (overflow-auto)
 * - Stacks top/bottom/global background images
 */
export default function BackgroundShell({ children, className = "" }) {
  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col overflow-auto ${className}`}
      style={{
        backgroundImage: `url(${topBg}), url(${bottomBg}), url(${globalBg})`,
        backgroundPosition: "top center, bottom center, center center",
        backgroundRepeat: "no-repeat, no-repeat, no-repeat",
        backgroundSize: "100% auto, 100% auto, cover",
      }}
    >
      {children}
    </div>
  );
}
