// src/pages/student/homework/HomeworkLayout.jsx
import React, { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";

import ProgressBar from "@/components/homework/ProgressBar";
import HomeRibbon from "@/components/student/mobile/HomeRibbon";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import successMascot from "@/assets/buddies/kibundo-buddy-success.png";

import globalBg from "@/assets/backgrounds/global-bg.png";
import bottomBg from "@/assets/backgrounds/bottom.png";

const PROGRESS_KEY = "kibundo.homework.progress.v1";

export default function HomeworkLayout() {
  const { pathname } = useLocation();

  // Prefer persisted step from localStorage; fall back to route heuristics
  const current = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      if (Number.isInteger(saved.step)) return Math.max(0, Math.min(2, saved.step));
    } catch {}
    return pathname.endsWith("/doing")
      ? 1
      : pathname.includes("/chat")
      ? 1
      : pathname.includes("/feedback")
      ? 2
      : 0;
  }, [pathname]);

  // Mascot: success on step 2; normal buddy otherwise
  const mascotSrc = current === 2 ? successMascot : buddyMascot;
  const mascotAlt = current === 2 ? "Erfolg" : "Buddy";

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden"
      style={{
        backgroundImage: `
          radial-gradient(120% 80% at 50% 0%, #eaf5ef 0%, #f7f2ec 48%, #f7f2ec 100%),
          url(${globalBg})
        `,
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "cover, cover",
        backgroundPosition: "center top, center top",
      }}
    >
      {/* STICKY RIBBONS (topmost) */}
      <div className="sticky top-0 z-50 px-3 pt-[env(safe-area-inset-top)] pointer-events-none">
        <div className="w-full flex items-start justify-between">
          <div className="pointer-events-auto">
            <HomeRibbon />
          </div>
          <div className="pointer-events-auto">
            <SettingsRibbon />
          </div>
        </div>
      </div>



      {/* TITLE */}
      <div className="w-full mx-auto px-3 mt-9">
        <h1 className="text-center text-[22px] md:text-[24px] font-extrabold tracking-wide text-[#1f6c61]">
          Hausaufgaben
        </h1>
      </div>

      {/* PROGRESS + MASCOT */}
      <div className="w-full mx-auto px-6 mt-6">
        <ProgressBar current={current} />
        <div className="w-full flex items-center justify-center mt-3">
          <img
            src={mascotSrc}
            alt={mascotAlt}
            draggable={false}
            className="w-[120px] h-auto select-none drop-shadow-[0_10px_18px_rgba(0,0,0,.18)]"
          />
        </div>
      </div>

      {/* MAIN — curved bottom background behind content */}
      <main
        className="relative mt-2"
        style={{
          backgroundImage: `url(${bottomBg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          backgroundPosition: "top center",
        }}
      >
        {/* Extra bottom padding to clear the docked chat when minimized */}
        <section className="w-full mx-auto px-4 pt-6 pb-[calc(var(--chat-dock-h,96px)+env(safe-area-inset-bottom)+24px)]">
          {/* Only show the subtitle on non-success steps */}
          {current !== 2 && (
            <h2 className="text-center text-[18px] md:text-[19px] font-bold text-[#2b6a5b] mb-3">
              Deine Aufgaben:
            </h2>
          )}

          <div className="w-full">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}
