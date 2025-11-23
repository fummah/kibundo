// src/lib/voice/useASR.js
import { useRef, useState, useCallback } from "react";

/**
 * Web Speech API ASR hook for voice input
 * Uses browser's built-in speech recognition (Chrome, Edge, Safari)
 */
export default function useASR({ lang = "de-DE", onTranscript, onError } = {}) {
  const [listening, setListening] = useState(false);
  const transcriptRef = useRef("");
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setListening(true);
      finalTranscriptRef.current = "";
      transcriptRef.current = "";
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
        transcriptRef.current = finalTranscriptRef.current;
        if (onTranscript) {
          onTranscript(finalTranscriptRef.current.trim());
        }
      } else {
        transcriptRef.current = finalTranscriptRef.current + interimTranscript;
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
      if (onError) {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    return recognition;
  }, [lang, onTranscript, onError]);

  const start = useCallback(() => {
    if (listening) return;
    
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setListening(false);
      }
    } else {
      console.warn("Speech recognition not available");
      if (onError) {
        onError("not_supported");
      }
    }
  }, [listening, initRecognition, onError]);

  const stop = useCallback(async () => {
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop recognition:", err);
      }
    }
    setListening(false);
    const t = finalTranscriptRef.current || transcriptRef.current || "";
    finalTranscriptRef.current = "";
    transcriptRef.current = "";
    return t.trim();
  }, [listening]);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    finalTranscriptRef.current = "";
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setListening(false);
  }, [listening]);

  return { listening, start, stop, reset, transcript: transcriptRef.current };
}
