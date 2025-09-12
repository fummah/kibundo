// src/pages/student/homework/HomeworkChat.jsx
import React, { useEffect } from "react";
import ChatLayer from "@/components/student/mobile/ChatLayer.jsx";

const PROGRESS_KEY = "kibundo.homework.progress.v1";

export default function HomeworkChat() {
  // keep progress at step 1 while chatting
  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 1 }));
    } catch {}
  }, []);

  return (
    // ChatLayer expects to fill its container; give it full viewport height.
    <div className="w-full h-[100dvh] bg-white">
      <ChatLayer
        minimiseTo="/student/homework"   // back to list when minimized
        className="h-full"
      />
    </div>
  );
}
