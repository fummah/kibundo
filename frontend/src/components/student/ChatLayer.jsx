import React, { useEffect, useRef } from "react";
import { Button } from "antd";
import { Volume2 } from "lucide-react";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

/**
 * ChatLayer
 * - Simple coach bubble with buddy avatar
 * - Optional TTS via Web Speech API (controlled by `tts` AND user's setting)
 */
export default function ChatLayer({
  message = "Hi! I’m your study buddy — let’s start together.",
  tts = false,
  className = "",
}) {
  const { state } = useStudentApp?.() ?? { state: {} };
  const avatar = state?.buddy?.avatar;
  const ttsEnabled = state?.ttsEnabled ?? false;
  const utteranceRef = useRef(null);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    if (tts && ttsEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      speak(message);
    }
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts, ttsEnabled, message]);

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt="Buddy"
            className="w-12 h-12 rounded-full object-cover shadow"
          />
        ) : (
          <div className="w-12 h-12 rounded-full grid place-items-center bg-indigo-100 text-xl shadow">
            🤖
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="inline-block max-w-full rounded-2xl bg-white shadow px-4 py-3">
          <p className="text-sm text-neutral-800 leading-6">{message}</p>
        </div>
        <div className="mt-2">
          <Button
            size="small"
            icon={<Volume2 className="w-4 h-4" />}
            onClick={() => speak(message)}
          >
            Play voice
          </Button>
        </div>
      </div>
    </div>
  );
}
