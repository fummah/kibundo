// src/lib/voice/useTTS.js
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
  const audioRef = useRef(null);
  const abortControllerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio context for iOS compatibility
  useEffect(() => {
    // iOS requires user interaction to initialize audio context
    // We'll create it lazily on first speak
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Helper to initialize audio context (required for iOS)
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS && !audioContextRef.current) {
      try {
        // Create AudioContext for iOS compatibility
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      } catch (e) {
        console.warn("⚠️ Could not create AudioContext:", e);
      }
    }
  }, []);

  const speak = useCallback(
    async (text) => {
      if (!text || !enabled) return;

      // Stop any current speech
      stop();

      try {
        setLoading(true);
        setSpeaking(true);

        // Initialize audio context for iOS
        initAudioContext();

        // Try OpenAI TTS API first
        try {
          const response = await api.post(
            "/tts/speak",
            { text, lang },
            { responseType: "blob" }
          );

          if (response.data instanceof Blob) {
            const audioUrl = URL.createObjectURL(response.data);
            const audio = new Audio(audioUrl);
            
            // iOS-specific: Ensure audio context is resumed
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }

            // Set up event handlers
            audio.onended = () => {
              setSpeaking(false);
              setLoading(false);
              URL.revokeObjectURL(audioUrl);
            };
            
            audio.onerror = (e) => {
              console.error("❌ Audio playback error:", e);
              setSpeaking(false);
              setLoading(false);
              URL.revokeObjectURL(audioUrl);
              // Fallback to browser TTS
              fallbackToBrowserTTS(text);
            };

            // iOS requires user interaction for autoplay
            // Try to play, if it fails, fallback to browser TTS
            try {
              await audio.play();
              audioRef.current = audio;
              return;
            } catch (playError) {
              console.warn("⚠️ Autoplay blocked (likely iOS), falling back to browser TTS:", playError);
              URL.revokeObjectURL(audioUrl);
              // Fallback to browser TTS
              fallbackToBrowserTTS(text);
            }
          }
        } catch (apiError) {
          console.warn("⚠️ OpenAI TTS API failed, falling back to browser TTS:", apiError);
          // Fallback to browser TTS
          fallbackToBrowserTTS(text);
        }
      } catch (error) {
        console.error("❌ TTS error:", error);
        setSpeaking(false);
        setLoading(false);
        // Final fallback to browser TTS
        fallbackToBrowserTTS(text);
      }
    },
    [lang, enabled, initAudioContext]
  );

  const fallbackToBrowserTTS = (text) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Wait a bit for cancellation to complete (iOS needs this)
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        
        // iOS-specific: Use a German voice if available
        if (lang.startsWith('de')) {
          const voices = window.speechSynthesis.getVoices();
          const germanVoice = voices.find(v => 
            v.lang.startsWith('de') || 
            v.name.toLowerCase().includes('german') ||
            v.name.toLowerCase().includes('deutsch')
          );
          if (germanVoice) {
            utterance.voice = germanVoice;
          }
        }
        
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
          setSpeaking(false);
          setLoading(false);
        };
        
        utterance.onerror = (e) => {
          console.error("❌ SpeechSynthesis error:", e);
          setSpeaking(false);
          setLoading(false);
        };
        
        // iOS: Load voices if not already loaded
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            window.speechSynthesis.speak(utterance);
          }, { once: true });
        } else {
          window.speechSynthesis.speak(utterance);
        }
      }, 100);
    } catch (error) {
      console.error("❌ Browser TTS also failed:", error);
      setSpeaking(false);
      setLoading(false);
    }
  };

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setLoading(false);
  }, []);

  return { speak, stop, speaking, loading };
}
