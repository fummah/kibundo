// src/pages/student/homework/HomeworkLayout.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";
import { TASKS_KEY } from "@/context/ChatDockContext";

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
  const { state: dockState } = useChatDock();
  const { user: authUser, account } = useAuthContext();
  const [localTaskState, setLocalTaskState] = useState({ hasScanId: false, isDone: false });

  // Check localStorage for task state (as fallback when dockState doesn't have task)
  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const effectiveUserId = account?.type === "child" && account?.userId 
          ? account.userId 
          : (authUser?.id ?? "anon");
        const directStudentId = account?.type === "child" ? account.id : null;
        const storageKey = directStudentId ?? effectiveUserId;
        const TASKS_KEY_USER = `${TASKS_KEY}::u:${storageKey}`;
        const tasksRaw = localStorage.getItem(TASKS_KEY_USER);
        if (tasksRaw) {
          const tasks = JSON.parse(tasksRaw);
          const latestTask = Array.isArray(tasks) && tasks.length > 0 
            ? tasks.find(t => t?.scanId) || tasks[0] 
            : null;
          if (latestTask) {
            setLocalTaskState({
              hasScanId: Boolean(latestTask?.scanId),
              isDone: Boolean(latestTask?.done || latestTask?.completedAt)
            });
            return;
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      setLocalTaskState({ hasScanId: false, isDone: false });
    };

    // Check localStorage when pathname changes or when dockState doesn't have task
    if (!dockState?.task && pathname.endsWith("/doing")) {
      checkLocalStorage();
    }
  }, [pathname, dockState?.task, authUser?.id, account]);

  // Read progress from localStorage
  const [storedProgress, setStoredProgress] = useState(null);
  
  useEffect(() => {
    const readProgress = () => {
      try {
        const effectiveUserId = account?.type === "child" && account?.userId 
          ? account.userId 
          : (authUser?.id ?? "anon");
        const directStudentId = account?.type === "child" ? account.id : null;
        const storageKey = directStudentId ?? effectiveUserId;
        const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${storageKey}`;
        const progressRaw = localStorage.getItem(PROGRESS_KEY_USER);
        if (progressRaw) {
          const progress = JSON.parse(progressRaw);
          setStoredProgress(progress);
          return;
        }
      } catch (e) {
        // Ignore errors
      }
      setStoredProgress(null);
    };

    readProgress();
    
    // Listen for progress updates
    const handleStorage = (e) => {
      if (e?.key?.includes(PROGRESS_KEY)) {
        readProgress();
      }
    };
    
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kibundo:tasks-updated", readProgress);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kibundo:tasks-updated", readProgress);
    };
  }, [pathname, authUser?.id, account, PROGRESS_KEY]);

  // Determine current step based on route, task state, and stored progress
  const current = useMemo(() => {
    const isOnDoing = pathname.endsWith("/doing");
    const isOnChat = pathname.includes("/chat");
    const isOnFeedback = pathname.includes("/feedback");
    
    // Get task from dockState first, then use localStorage state as fallback
    const task = dockState?.task;
    const isTaskDone = task?.done || task?.completedAt 
      ? true 
      : (task ? false : localTaskState.isDone);
    
    // Priority 1: Use stored progress if available (most accurate)
    if (storedProgress?.step !== undefined && storedProgress?.step !== null) {
      const storedStep = storedProgress.step;
      // Map progress steps (0-3) to ProgressBar steps (0-2)
      // 0 = collect, 1 = do, 2 = chat, 3 = feedback → map to 0, 1, 2
      if (storedStep === 0) return 0;
      if (storedStep === 1 || storedStep === 2) return 1; // doing or chat = step 1
      if (storedStep === 3) return 2; // feedback = step 2
    }
    
    // Priority 2: Use route and task state as fallback
    // Step 2: Feedback page or task is completed
    if (isOnFeedback || isTaskDone) {
      return 2;
    }
    
    // Step 1: On doing page (always, even before upload) OR on chat page
    if (isOnDoing || isOnChat) {
      return 1;
    }
    
    // Step 0: Only on list page or other routes (not on /doing)
    return 0;
  }, [pathname, dockState?.task, localTaskState, storedProgress]);

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
      <div className="w-full mx-auto px-4 sm:px-6 mt-6 overflow-visible">
        <ProgressBar current={current} />
        <div className="w-full flex items-center justify-center mt-4 md:mt-6">
          <img
            src={mascotSrc}
            alt={mascotAlt}
            draggable={false}
            className="w-[100px] sm:w-[120px] md:w-[140px] h-auto select-none drop-shadow-[0_10px_18px_rgba(0,0,0,.18)]"
          />
        </div>
      </div>

      {/* MAIN — content area */}
      <main className="relative mt-2">
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
