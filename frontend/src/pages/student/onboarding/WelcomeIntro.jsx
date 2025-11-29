// src/pages/student/onboarding/WelcomeIntro.jsx
import { useEffect, useState, useRef } from "react";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { markIntroSeen, markTourDone, hasSeenIntro } from "./introFlags";

import bgGlobal from "@/assets/backgrounds/global-bg.png";
import bgClouds from "@/assets/backgrounds/clouds.png";
import bgTrees from "@/assets/backgrounds/trees.png";
import bgBottom from "@/assets/backgrounds/bottom.png";

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";

/* PNG icons */
import speakerIcon from "@/assets/mobile/icons/speaker.png";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";

const { Text } = Typography;

export default function WelcomeIntro() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();
  const { user, account } = useAuthContext();
  const { i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const hasSpokenRef = useRef(false); // Prevent double TTS
  const [childFirstName, setChildFirstName] = useState("");
  
  // If parent has selected a child account (Netflix-style), use that child's ID
  // Otherwise, use the logged-in student's ID
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);

  // Simple browser TTS helper (match InterestsWizard behavior)
  const speakBrowser = (text) => {
    if (!text) return;
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const isFirstLogin = !hasSeenIntro(studentId);

  // Fetch child's first name from API if needed - use ref to track if we've started fetching
  const nameFetchedRef = useRef(false);
  useEffect(() => {
    const fetchChildName = async () => {
      // Prevent multiple fetches
      if (nameFetchedRef.current) return;
      nameFetchedRef.current = true;

      try {
        // If parent viewing child, get name from account
        if (account?.type === "child" && account?.raw?.user?.first_name) {
          setChildFirstName(account.raw.user.first_name);
          return;
        }

        // If we have user's first name directly, use it
        if (user?.first_name) {
          setChildFirstName(user.first_name);
          return;
        }

        // Otherwise, fetch from API
        if (studentId) {
          const api = (await import("@/api/axios")).default;
          const studentsRes = await api.get("/allstudents");
          const students = Array.isArray(studentsRes.data)
            ? studentsRes.data
            : studentsRes.data?.data || [];
          
          const student = students.find(
            (s) => s?.user?.id === studentId || s?.user_id === studentId || s?.id === studentId
          );
          
          if (student?.user?.first_name) {
            setChildFirstName(student.user.first_name);
          }
        }
      } catch (err) {
        console.debug("Could not fetch child name:", err);
      }
    };

    if (ready) {
      fetchChildName();
    }
  }, [account, user, studentId, ready]);

  // Build greeting with child's name
  const greeting = childFirstName
    ? `Hallo ${childFirstName}! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.`
    : "Hallo! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.";

  // DO NOT mark intro as seen until onboarding is complete
  // This ensures first-time users cannot skip

  // Automatic TTS greeting on page load - always enabled
  // Use ref to prevent double execution within the same render cycle
  useEffect(() => {
    if (ready && !hasSpokenRef.current) {
      // Mark as spoken immediately to prevent double execution
      hasSpokenRef.current = true;
      
      // Wait a bit for name to be fetched, but don't wait forever
      const timer = setTimeout(() => {
        const finalGreeting = childFirstName
          ? `Hallo ${childFirstName}! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.`
          : "Hallo! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.";
        speakBrowser(finalGreeting);
      }, 1200); // Delay to allow name fetch, but proceed even if name not found
      return () => clearTimeout(timer);
    }
    // Reset ref when component unmounts so it can run again on next mount
    return () => {
      hasSpokenRef.current = false;
    };
    // Only depend on ready - not childFirstName to prevent re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const speak = () => {
    speakBrowser(greeting);
  };

  const next = () => navigate("/student/onboarding/welcome-tour");

  // Skip only allowed if onboarding has been completed before (not first login)
  const skip = () => {
    if (!isFirstLogin) {
      markIntroSeen(studentId);
      markTourDone(studentId);
      navigate("/student/home");
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* ---------- Background Layers (match InterestsWizard) ---------- */}
      {/* Base texture/sky */}
      <div
        className="absolute inset-0 -z-40"
        style={{
          backgroundImage: `url(${bgGlobal})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Soft peach gradient overlay */}
      <div
        className="absolute inset-0 -z-30 opacity-90"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #ffd7ba 0%, #f6e7da 55%, #eaf5ef 100%)",
        }}
      />
      {/* Drifting clouds */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-[55%] -z-20"
        style={{
          backgroundImage: `url(${bgClouds})`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "top center",
          backgroundSize: "contain",
          animation: "kib-clouds 60s linear infinite",
          opacity: 0.9,
        }}
      />
      {/* Tree/bush horizon */}
      <div className="pointer-events-none absolute inset-x-0 top-[18%] -z-5 flex justify-center">
        <img
          src={bgTrees}
          alt=""
          className="w-[1200px] max-w-full object-contain"
          draggable={false}
        />
      </div>
      {/* Curved foreground bottom panel */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[160%] max-w-[1900px] -z-10"
        style={{
          height: "60vw",
          maxHeight: "920px",
          minHeight: "540px",
          backgroundImage: `url(${bgBottom})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
        }}
      />
      {/* Header */}
      <div className="relative z-30 flex items-center justify-end gap-2 px-3 pt-3">
        {/* Only show skip button if not first login */}
        {!isFirstLogin && (
          <button
            className="px-2 py-1 text-sm rounded-full bg-white/70 hover:bg-white shadow-sm transition"
            onClick={skip}
          >
            Überspringen
          </button>
        )}
        <Button
          icon={
            <img
              src={speakerIcon}
              alt="Vorlesen"
              className="w-4 h-4 object-contain"
            />
          }
          onClick={speak}
          className="rounded-full"
        >
          Vorlesen
        </Button>
      </div>

      {/* Buddy + bubble - centered */}
      <div className="relative z-20 px-3 mt-[35vh] md:mt-[32vh]">
        <div className="relative min-h-[240px] flex flex-col items-center">
          <img
            src={buddy?.img || buddyMascot}
            alt="Kibundo"
            className="w-[230px] drop-shadow-[0_22px_45px_rgba(90,76,58,0.22)] select-none mx-auto"
            draggable={false}
          />

          <div className="mt-4 max-w-[85%] text-[#1b3a1b] drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
            <div className="rounded-[28px] bg-[#a4dc4f] px-6 py-5 text-center">
              <Text style={{ fontSize: 14, lineHeight: 1.4, display: "block" }}>
                {childFirstName ? `Hallo ${childFirstName}! Ich bin Kibundo.` : "Hallo! Ich bin Kibundo."}
                <br />
                Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-20 mt-8 flex w-full justify-center px-6 pb-32 md:pb-24 lg:pb-8">
        <Button
          type="primary"
          size="large"
          onClick={next}
          className="w-full max-w-[320px] rounded-full !bg-[#ff4d4f] !border-none !h-[52px] font-semibold shadow-[0_18px_32px_rgba(255,77,79,0.35)]"
        >
          Los geht’s
        </Button>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes kib-clouds {
          0% { background-position: 0px top; }
          100% { background-position: 2000px top; }
        }
      `}</style>
    </div>
  );
}
