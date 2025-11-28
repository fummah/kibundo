import { useState, useRef, useCallback, useEffect } from "react";
import api from "@/api/axios";

/**
 * Text-to-Speech hook using OpenAI TTS API
 * Falls back to browser SpeechSynthesis if API fails
 * iOS-compatible with proper audio context handling
 */
export default function useTTS({ lang = "de-DE", enabled = true } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const audioContextRef = useRef(null); // AudioContext for playback
  const audioElementRef = useRef(null); // fallback HTMLAudioElement (kept for safety)
  const bufferSourceRef = useRef(null); // for AudioBufferSourceNode playback
  const abortControllerRef = useRef(null);
  const voicesChangedHandlerRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      try {
        // Stop any speech synthesis
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          if (voicesChangedHandlerRef.current) {
            window.speechSynthesis.removeEventListener("voiceschanged", voicesChangedHandlerRef.current);
            voicesChangedHandlerRef.current = null;
          }
        }
      } catch (e) {}

      if (bufferSourceRef.current) {
        try {
          bufferSourceRef.current.stop();
        } catch (e) {}
        bufferSourceRef.current.disconnect();
        bufferSourceRef.current = null;
      }

      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
          audioElementRef.current.src = "";
        } catch (e) {}
        audioElementRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Initialize AudioContext (lazily). Throws on blocked / failed resume.
  const initAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      throw new Error("Window is undefined");
    }

    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }

      // If not running, attempt to resume. If blocked, throw.
      if (audioContextRef.current.state !== "running") {
        const resumePromise = audioContextRef.current.resume();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Resume timeout")), 150));
        await Promise.race([resumePromise, timeout]);
        // little delay to allow state propagation
        await new Promise((r) => setTimeout(r, 30));

        if (audioContextRef.current.state !== "running") {
          throw new Error("AudioContext blocked by autoplay policy");
        }
      }
      return true;
    } catch (e) {
      // AudioContext init/resume failed (expected for autoplay policy)
      throw e;
    }
  }, []);

  // Browser SpeechSynthesis fallback
  const fallbackToBrowserTTS = useCallback(
    (text) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setSpeaking(false);
        setLoading(false);
        return;
      }

      // Falling back to browser SpeechSynthesis
      try {
        window.speechSynthesis.cancel();

        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang;
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          const selectVoiceAndSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            if (lang && lang.startsWith("de")) {
              const germanVoice = voices.find(
                (v) => v.lang && v.lang.startsWith("de") || (v.name && /german|deutsch/i.test(v.name))
              );
              if (germanVoice) utterance.voice = germanVoice;
            }
            if (!utterance.voice && voices.length > 0) utterance.voice = voices[0];

            utterance.onstart = () => {
              setSpeaking(true);
              setLoading(false);
              console.log("✅ [useTTS] Browser TTS started");
            };
            utterance.onend = () => {
              setSpeaking(false);
              setLoading(false);
              // Browser TTS ended
            };
            utterance.onerror = (err) => {
              // Handle 'not-allowed' errors (browser autoplay policy)
              if (err.error === 'not-allowed') {
                // SpeechSynthesis blocked by browser autoplay policy - TTS will work after user interaction
              } else {
                console.error("❌ [useTTS] SpeechSynthesis error:", err);
              }
              setSpeaking(false);
              setLoading(false);
            };

            try {
              window.speechSynthesis.speak(utterance);
            } catch (speakErr) {
              console.warn("⚠️ [useTTS] speechSynthesis.speak() threw:", speakErr);
              setSpeaking(false);
              setLoading(false);
            }
          };

          if (window.speechSynthesis.getVoices().length === 0) {
            // voices not loaded yet (esp. iOS); wait once
            voicesChangedHandlerRef.current = () => {
              selectVoiceAndSpeak();
            };
            window.speechSynthesis.addEventListener("voiceschanged", voicesChangedHandlerRef.current, { once: true });
          } else {
            selectVoiceAndSpeak();
          }
        }, 150); // allow cancellation and iOS timing
      } catch (err) {
        console.error("❌ Browser TTS failed:", err);
        setSpeaking(false);
        setLoading(false);
      }
    },
    [lang]
  );

  // Stop playback (both AudioContext buffer source and HTMLAudio fallback)
  const stop = useCallback(() => {
    if (bufferSourceRef.current) {
      try {
        bufferSourceRef.current.stop(0);
      } catch (e) {}
      try {
        bufferSourceRef.current.disconnect();
      } catch (e) {}
      bufferSourceRef.current = null;
    }

    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.src = "";
      } catch (e) {}
      audioElementRef.current = null;
    }

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {}
      abortControllerRef.current = null;
    }

    // Cancel any browser TTS
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}

    setSpeaking(false);
    setLoading(false);
  }, []);

  // Main speak function
  const speak = useCallback(
    async (text) => {
      if (!text || !enabled) return;
      stop();

      setLoading(true);
      setSpeaking(true);

      // Try to get AudioContext running — if it fails, fallback to browser TTS
      let audioContextReady = false;
      try {
        await initAudioContext();
        // Double-check state after init
        if (audioContextRef.current) {
          // If still suspended, try one more resume attempt (user might have interacted)
          if (audioContextRef.current.state === "suspended") {
            try {
              await audioContextRef.current.resume();
              await new Promise((r) => setTimeout(r, 50)); // Wait for state update
            } catch (resumeErr) {
              // Resume failed, will fallback
            }
          }
          audioContextReady = audioContextRef.current.state === "running";
        }
      } catch (e) {
        audioContextReady = false;
      }

      if (!audioContextReady) {
        // AudioContext not ready — using browser TTS fallback
        fallbackToBrowserTTS(text);
        return;
      }

      // Prepare abort controller for API call
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Request TTS as an arraybuffer so we can decode into the AudioContext
        const response = await api.post(
          "/tts/speak",
          { text, lang },
          { responseType: "arraybuffer", signal: controller.signal }
        );

        const arrayBuffer = response.data;
        if (!arrayBuffer) throw new Error("No audio data returned");

        // Decode and play through AudioContext (better iOS behavior)
        const ctx = audioContextRef.current;
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Create a buffer source and start it
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        source.onended = () => {
          setSpeaking(false);
          setLoading(false);
          bufferSourceRef.current = null;
        };

        bufferSourceRef.current = source;
        source.start(0);
        return;
      } catch (err) {
        // If API or decode failed, log and fall back to HTMLAudioElement or SpeechSynthesis fallback
        console.warn("⚠️ OpenAI TTS API / playback failed - falling back. Error:", err?.message ?? err);

        // As a second-tier fallback try HTMLAudio element playback (if we got a blob-like response)
        try {
          // If response came as arraybuffer but decode failed above, try blob -> audio element
          if (typeof Blob !== "undefined" && abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
            // Attempt to re-request as blob (best-effort)
            try {
              const blobResp = await api.post("/tts/speak", { text, lang }, { responseType: "blob", signal: abortControllerRef.current.signal });
              if (blobResp?.data instanceof Blob) {
                const audioUrl = URL.createObjectURL(blobResp.data);
                const audio = new Audio(audioUrl);
                audio.preload = "auto";
                audio.volume = 1.0;

                audio.onended = () => {
                  setSpeaking(false);
                  setLoading(false);
                  if (audioElementRef.current === audio) audioElementRef.current = null;
                  URL.revokeObjectURL(audioUrl);
                };
                audio.onerror = (e) => {
                  console.error("❌ Audio element playback error:", e);
                  if (audioElementRef.current === audio) audioElementRef.current = null;
                  URL.revokeObjectURL(audioUrl);
                  fallbackToBrowserTTS(text);
                };

                // Play (may be blocked, will throw)
                await audio.play();
                audioElementRef.current = audio;
                return;
              }
            } catch (nestedErr) {
              // ignore and fallback to speech synthesis next
              console.warn("⚠️ Blob fallback failed:", nestedErr?.message ?? nestedErr);
            }
          }
        } catch (ignored) {}

        // Final fallback: browser SpeechSynthesis
        fallbackToBrowserTTS(text);
      } finally {
        setLoading(false);
      }
    },
    [enabled, initAudioContext, fallbackToBrowserTTS, lang, stop]
  );

  return { speak, stop, speaking, loading };
}
