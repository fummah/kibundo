// src/lib/voice/useASR.js
import { useRef, useState } from "react";

/**
 * Minimal stub of an ASR hook.
 * Replace with a real implementation (Web Speech API, Vosk, server ASR, etc.)
 */
export default function useASR({ lang = "de-DE" } = {}) {
  const [listening, setListening] = useState(false);
  const transcriptRef = useRef("");

  const start = () => {
    setListening(true);
    // simulate capture if you want:
    // transcriptRef.current = "";
  };

  const stop = async () => {
    setListening(false);
    // return whatever was "captured"
    const t = transcriptRef.current || "";
    transcriptRef.current = "";
    return t;
  };

  const reset = () => {
    transcriptRef.current = "";
  };

  return { listening, start, stop, reset };
}
