// src/pages/student/onboarding/Congratulations.jsx
// Based on fortai_app/src/pages/onboarding/Congratulations.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { markIntroSeen, markTourDone } from "./introFlags";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";
import { useStudentId } from "@/hooks/useStudentId.js";
import api from "@/api/axios";
import { App } from "antd";
import { saveStudentPreferences } from "@/utils/saveStudentPreferences.js";
import ConfettiRibbons from "@/components/student/onboarding/ConfettiRibbons";
import CurvedBackgroundLayer from "@/components/student/onboarding/CurvedBackgroundLayer";
import ResponsiveOnboardingContainer from "@/components/student/onboarding/ResponsiveOnboardingContainer.jsx";

const Congratulations = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { ttsEnabled, buddy, profile, theme, setInterests } = useStudentApp();
  
  // Helper to get safe buddy image (filter out character data)
  const getSafeBuddyImage = () => {
    if (!buddy) return "/images/img_kibundo_congratulations.svg";
    // Check if buddy has character data
    const isCharacter = 
      buddy.name?.toLowerCase().includes("character") ||
      (typeof buddy.id === "number" && buddy.id >= 1 && buddy.id <= 6) ||
      (typeof buddy.id === "string" && /^[1-6]$/.test(buddy.id)) ||
      buddy.img?.includes("img_rectangle_20") ||
      buddy.avatar?.includes("img_rectangle_20");
    if (isCharacter) {
      // Return default kibundo buddy image
      return "/images/img_kibundo_congratulations.svg";
    }
    return buddy.img || buddy.avatar || "/images/img_kibundo_congratulations.svg";
  };
  const { user, account } = useAuthContext();
  const { i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const [saving, setSaving] = useState(false);
  const hasSavedRef = useRef(false);

  // Get the effective student ID using the hook
  const studentId = useStudentId();
  const effectiveUserId = studentId; // Alias for compatibility

  // Collect all preferences from location.state and save them
  useEffect(() => {
    const savePreferences = async () => {
      if (!location.state || saving || hasSavedRef.current) return;

      // Extract preferences and prompts from location.state
      // Preferences are all keys except 'prompts' and 'selectedCharacterId'
      const { prompts: statePrompts = {}, selectedCharacterId, ...statePreferences } = location.state || {};
      const preferences = statePreferences;
      const prompts = statePrompts;
      
      if (!preferences || Object.keys(preferences).length === 0) return; // No preferences to save

      // Check if studentId is available
      if (!effectiveUserId) {
        console.warn("Cannot save preferences: studentId is missing");
        // Still save to localStorage as fallback
        try {
          const interestsArray = Object.entries(preferences)
            .filter(([_, value]) => value != null && value !== undefined)
            .map(([key, value]) => ({ 
              id: key, 
              value,
              prompt: prompts[key] || null
            }));
          localStorage.setItem("kibundo_interests", JSON.stringify(interestsArray));
          // Update context even if we can't save to server
          const interestsArrayForContext = Object.entries(preferences)
            .filter(([_, value]) => value != null && value !== undefined)
            .map(([key, value]) => ({ id: key, value }));
          setInterests(interestsArrayForContext);
          hasSavedRef.current = true;
          message.warning?.({
            content: "Interessen wurden lokal gespeichert. Bitte melde dich an, um sie auf dem Server zu speichern.",
            key: "preferences-saved-local",
            duration: 5
          });
        } catch (err) {
          console.error("Failed to save to localStorage:", err);
        }
        return;
      }

      setSaving(true);
      try {
        // Save to localStorage first as backup
        try {
          const interestsArray = Object.entries(preferences)
            .filter(([_, value]) => value != null && value !== undefined)
            .map(([key, value]) => ({ 
              id: key, 
              value,
              prompt: prompts[key] || null
            }));
          localStorage.setItem("kibundo_interests", JSON.stringify(interestsArray));
        } catch (err) {
          console.error("Failed to save to localStorage:", err);
        }

        // Map color preference to theme if available
        const colorToThemeMap = {
          "Rot": "rose",
          "Blau": "sky",
          "Grün": "emerald",
          "Gelb": "amber",
        };
        const colorPreference = preferences?.colorPreference;
        const mappedTheme = colorPreference ? (colorToThemeMap[colorPreference] || theme || "indigo") : (theme || "indigo");
        
        // Save to API using utility function with prompts
        // Note: characterSelection is saved as a preference only, NOT as buddy
        // Convert preferences to array format for context (do this before API call)
        const interestsArray = Object.entries(preferences)
          .filter(([_, value]) => value != null && value !== undefined)
          .map(([key, value]) => ({ id: key, value }));
        
        // Always update context first (so UI works even if API fails)
        setInterests(interestsArray);
        
        // Try to save to API (but don't show errors if user is not authenticated during onboarding)
        try {
          const success = await saveStudentPreferences({
            studentId: effectiveUserId,
            preferences: preferences,
            prompts: prompts,
            buddy: buddy || null, // Use existing buddy, do NOT create from characterSelection
            profile: {
              ...(profile || {}),
              name: profile?.name || "",
              ttsEnabled: ttsEnabled,
              theme: mappedTheme, // Use theme from color preference
            },
          });

          if (success) {
            hasSavedRef.current = true;
            // Only show success message if we actually saved to server
            message.success?.({
              content: "Interessen erfolgreich gespeichert!",
              key: "preferences-saved",
              duration: 3
            });
          } else {
            // API save failed (likely 401 - not authenticated)
            // This is normal during onboarding, so we silently save locally
            hasSavedRef.current = true;
            // Don't show error message - preferences are saved locally and in context
          }
        } catch (apiError) {
          // API error (likely 401 during onboarding)
          // This is expected - preferences are already saved locally and in context
          hasSavedRef.current = true;
          // Don't show error - silently continue
        }
      } catch (error) {
        // Unexpected error - still update context
        try {
          const interestsArray = Object.entries(preferences)
            .filter(([_, value]) => value != null && value !== undefined)
            .map(([key, value]) => ({ id: key, value }));
          setInterests(interestsArray);
          hasSavedRef.current = true;
        } catch {}
        // Don't show error message - preferences are saved locally
      } finally {
        setSaving(false);
      }
    };

    if (ready && location.state && !hasSavedRef.current && !saving) {
      savePreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, location.state, effectiveUserId]);

  useEffect(() => {
    if (studentId) {
      markIntroSeen(studentId);
      markTourDone(studentId);
    }
  }, [studentId]);

  useEffect(() => {
    if (ttsEnabled && ready) {
      const timer = setTimeout(() => {
        try {
          const message = "Glückwunsch! Du hast den ersten Schritt gemacht.";
          const u = new SpeechSynthesisUtterance(message);
          u.lang = "de-DE";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch {}
      }, 500);

      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [ttsEnabled, ready]);

  const handleStartClick = () => {
    // Navigate to the child home screen after onboarding completion
    navigate('/student/home', {
      state: location.state
    });
  };

  const handleBackClick = () => {
    navigate('/student/onboarding/creative-activity-preference', {
      state: location.state
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <App>
      <Helmet>
        <title>Congratulations | Kibundo</title>
        <meta name="description" content="Congratulations! You've completed the preference selection. Start your learning journey with Kibundo." />
        <meta property="og:title" content="Congratulations | Kibundo" />
        <meta property="og:description" content="Congratulations! You've completed the preference selection. Start your learning journey with Kibundo." />
      </Helmet>
      <ResponsiveOnboardingContainer>
        <main
          className="relative overflow-hidden"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            zIndex: 1,
            boxSizing: 'border-box',
            paddingTop: 'clamp(24px, 3vh, 48px)',
            paddingLeft: 'clamp(24px, 3vw, 48px)',
            paddingRight: 'clamp(24px, 3vw, 48px)'
          }}
        >

        {/* Background Layer - F4EDE6 at y:370, height:560 with smooth top arch from center */}
        <CurvedBackgroundLayer />

        {/* Clouds Background Component - centered and responsive */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(12px, 1.5vh, 24px)',
            width: 'clamp(400px, 50vw, 800px)',
            height: 'clamp(150px, 25vh, 300px)',
            opacity: 0.3
          }}
        >
          <img
            src="/images/img_component_4.svg"
            alt="Clouds"
            className="w-full h-full object-contain opacity-30"
          />
        </div>

        {/* Confetti Ribbons - Splash effect from top, fade at buddy's feet (480px), centered */}
        <ConfettiRibbons
          count={3}
          duration={16}
          fadeAt={480}
          leftPosition={null}
        />

        {/* Erfolgreich Title - centered */}
        <h1
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(24px, 3vh, 75px)',
            width: 'clamp(200px, 21.875vw, 280px)',
            height: 'auto',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(32px, 3.91vw, 50px)',
            lineHeight: 'clamp(44px, 5.31vh, 68px)',
            letterSpacing: '2%',
            textAlign: 'center',
            color: '#544C3B'
          }}
        >
          Erfolgreich
        </h1>

        {/* Left Character - responsive */}
        <img
          src="/images/img_ebene_1.png"
          alt="Left character"
          className="absolute left-0 hidden md:block"
          style={{
            top: 'clamp(30px, 3.125vw, 40px)',
            width: 'clamp(200px, 33.67vw, 431px)',
            height: 'auto',
            aspectRatio: '431 / 447.12',
            objectFit: 'cover'
          }}
        />

        {/* Right Character - responsive */}
        <img
          src="/images/img_ebene_1_446x260.png"
          alt="Right character"
          className="absolute right-0 hidden md:block"
          style={{
            top: 'clamp(30px, 3.125vw, 40px)',
            width: 'clamp(150px, 25.86vw, 331px)',
            height: 'auto',
            aspectRatio: '331 / 447.12',
            objectFit: 'cover'
          }}
        />

        {/* Back Button - 48x48 at x:48, y:48 */}
        <button
          onClick={handleBackClick}
          className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
          style={{
            left: '48px',
            top: '48px',
            width: '48px',
            height: '48px',
            backgroundColor: '#D9D9D9'
          }}
          aria-label="Go back"
        >
          <img
            src="/images/img_vector_gray_800.svg"
            alt="Back arrow"
            style={{
              width: '18px',
              height: '30px'
            }}
          />
        </button>

        {/* Kibundo Character - centered */}
        <img
          src={getSafeBuddyImage()}
          alt="Kibundo mascot"
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(120px, 15vh, 180px)',
            width: 'clamp(115px, 11.95vw, 153px)',
            height: 'auto',
            aspectRatio: '153 / 300',
            objectFit: 'contain'
          }}
        />

        {/* Glückwunsch Subtitle - centered */}
        <h2
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(400px, 50vh, 502px)',
            width: 'clamp(180px, 17.58vw, 225px)',
            height: 'auto',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(28px, 2.73vw, 35px)',
            lineHeight: 'clamp(38px, 4.69vh, 48px)',
            textAlign: 'center',
            color: '#BDCF56'
          }}
        >
          Glückwunsch
        </h2>

        {/* Description Text - centered */}
        <p
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(460px, 57.5vh, 568px)',
            width: 'clamp(320px, 37.19vw, 476px)',
            maxWidth: '90%',
            height: 'auto',
            minHeight: 'clamp(60px, 7.5vh, 88px)',
            fontFamily: 'Nunito',
            fontWeight: 400,
            fontSize: 'clamp(14px, 1.41vw, 18px)',
            lineHeight: 'clamp(19px, 2.45vh, 24.5px)',
            textAlign: 'center',
            color: '#000000'
          }}
        >
          Du hast den ersten Schritt gemacht, damit Hausaufgaben{'\n'}
          wieder Spaß machen. Kibundo begleitet Dich ganz individuell auf Deiner Lernreise voller Abendteuer.
        </p>

        {/* Start Button - centered */}
        <button
          onClick={handleStartClick}
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center hover:opacity-90 transition-opacity"
          style={{
            top: 'clamp(580px, 72.5vh, 680px)',
            width: 'clamp(220px, 21.48vw, 275px)',
            height: 'clamp(52px, 6.5vh, 65px)',
            borderRadius: '16px',
            backgroundColor: '#EF7C2E',
            boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
          }}
          aria-label="Start"
        >
          <span
            style={{
              fontFamily: 'Nunito',
              fontWeight: 900,
              fontSize: 'clamp(20px, 1.95vw, 25px)',
              lineHeight: 'clamp(27px, 3.4vh, 34px)',
              letterSpacing: '2%',
              textAlign: 'center',
              color: '#FFFFFF'
            }}
          >
            Weiter
          </span>
        </button>
        </main>
      </ResponsiveOnboardingContainer>
    </App>
  );
};

export default Congratulations;

