// src/components/layout/CircularBackground.jsx
import React from "react";
import cloudsImg from "@/assets/backgrounds/clouds.png";

export default function CircularBackground({ children }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 pt-24 pb-32 md:pb-24 lg:pb-28"
      style={{
        background:
          "linear-gradient(185deg, #F4BE9B 0%, #F2D6B1 45%,rgba(250, 240, 219, 0.81) 100%)",
      }}
    >
      {/* Big circular "floor" – tuned for iPad-like aspect ratio */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 bottom-[-96vh] h-[150vh] w-[150vh] -translate-x-1/2 rounded-full bg-[#F2E5D5] z-[1]"
      />

      {/* Clouds overlay with animation - top half only */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-[3]"
        style={{
          height: "50%",
          backgroundImage: `url(${cloudsImg})`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "0px top",
          backgroundSize: "auto 100%",
          animation: "kib-clouds 60s linear infinite",
          opacity: 0.8,
        }}
        aria-hidden
      />

      {/* Foreground content */}
      <div className="relative z-10 flex w-full flex-col items-center">
        {children}
      </div>

      {/* Cloud animation keyframes */}
      <style>{`
        @keyframes kib-clouds {
          from { background-position: 0px top; }
          to { background-position: 2000px top; }
        }
      `}</style>
    </div>
  );
}

