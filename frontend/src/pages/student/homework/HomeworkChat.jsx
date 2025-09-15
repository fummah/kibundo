import React, { useEffect, useState } from "react";
import ChatLayer from "@/components/student/mobile/ChatLayer.jsx";
import { useNavigate } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext.jsx";

const PROGRESS_KEY = "kibundo.homework.progress.v1";

export default function HomeworkChat() {
  const navigate = useNavigate();
  const { markHomeworkDone } = useChatDock() || {};
  const [open, setOpen] = useState(true); // close drawer in place

  // Keep progress at step 2 while chatting
  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 2 }));
    } catch {}
  }, []);

  const handleDone = () => {
    if (typeof markHomeworkDone === "function") {
      markHomeworkDone(); // your context handles step 3 + navigate
      return;
    }
    // Fallback if provider isn’t mounted
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 3 }));
    } catch {}
    navigate("/student/homework/feedback", { replace: true });
  };

  return (
    <div className="relative w-full h-[100dvh] bg-white">
      {open ? (
        <ChatLayer
          className="h-full"
          // Preferred: close the drawer without navigation
          onMinimise={() => setOpen(false)}
          // If your ChatLayer ignores onMinimise and requires a route,
          // uncomment this line and remove onMinimise:
          // minimiseTo="/student/homework"
        />
      ) : (
        <div className="px-4 py-6">
          <h1 className="text-lg font-semibold mb-2">Chat minimiert</h1>
          <p className="mb-4 text-[15px] text-gray-600">
            Tippe unten, um den Chat wieder zu öffnen.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-xl bg-black text-white"
            aria-label="Chat wieder öffnen"
          >
            Chat öffnen
          </button>
        </div>
      )}

      {/* Floating DONE CTA above the input area */}
      {open && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(env(safe-area-inset-bottom)+96px)] flex justify-center">
          <button
            type="button"
            onClick={handleDone}
            className="pointer-events-auto mb-3 inline-flex items-center justify-center px-6 h-11 rounded-xl font-semibold text-white shadow-lg"
            style={{ backgroundColor: "#FF7900" }}
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}
