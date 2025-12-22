// src/components/layout/CircularBackground.jsx
import React from "react";
import cloudsImg from "@/assets/backgrounds/clouds.png";
import globalBg from "@/assets/backgrounds/global-bg.png";

export default function CircularBackground({ children }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 pt-24 pb-32 md:pb-24 lg:pb-28"
      style={{
        // Match add-student parent Figma background
        backgroundImage: `url(${globalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Big circular "floor" – tuned for iPad-like aspect ratio */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 bottom-[-96vh] h-[150vh] w-[150vh] -translate-x-1/2 rounded-full bg-[#F2E5D5] z-[1]"
      />

      {/* Foreground content */}
      <div className="relative z-10 flex w-full flex-col items-center">
        {children}
      </div>
    </div>
  );
}

