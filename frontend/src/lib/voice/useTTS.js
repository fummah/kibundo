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
  const initAudioContext = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS && !audioContextRef.current) {
      try {
        // Create AudioContext for iOS compatibility
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // iOS requires user interaction to resume audio context
        // Resume it if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
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
            if (audioContextRef.current) {
              if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
              }
              // Connect audio element to audio context for better iOS compatibility
              const source = audioContextRef.current.createMediaElementSource(audio);
              source.connect(audioContextRef.current.destination);
            }

            // Set up event handlers
            audio.onended = () => {
              setSpeaking(false);
              setLoading(false);
              URL.revokeObjectURL(audioUrl);
              if (audioRef.current === audio) {
                audioRef.current = null;
              }
            };
            
            audio.onerror = (e) => {
              console.error("❌ Audio playback error:", e);
              setSpeaking(false);
              setLoading(false);
              URL.revokeObjectURL(audioUrl);
              if (audioRef.current === audio) {
                audioRef.current = null;
              }
              // Fallback to browser TTS
              fallbackToBrowserTTS(text);
            };

            // iOS requires user interaction for autoplay
            // Set volume to 1.0 explicitly for iOS
            audio.volume = 1.0;
            
            // Preload audio for iOS
            audio.preload = 'auto';
            
            // Try to play, if it fails, fallback to browser TTS
            try {
              const playPromise = audio.play();
              
              // Handle promise-based play() return value
              if (playPromise !== undefined) {
                await playPromise;
              }
              
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
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // iOS-specific: Use a German voice if available
        const selectVoiceAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          if (lang.startsWith('de')) {
            // Prefer German voices
            const germanVoice = voices.find(v => 
              v.lang.startsWith('de') || 
              v.name.toLowerCase().includes('german') ||
              v.name.toLowerCase().includes('deutsch')
            );
            if (germanVoice) {
              utterance.voice = germanVoice;
            }
          }
          // Fallback to any available voice if no German voice found
          if (!utterance.voice && voices.length > 0) {
            utterance.voice = voices[0];
          }
          
          // Speak after voice is selected
          window.speechSynthesis.speak(utterance);
        };
        
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
            selectVoiceAndSpeak();
          }, { once: true });
        } else {
          selectVoiceAndSpeak();
        }
      }, 150); // Increased delay for iOS
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
