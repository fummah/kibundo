// src/pages/student/onboarding/WelcomeTour.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { Typography } from "antd";
import { ArrowLeft, ArrowRight, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { markIntroSeen, markTourDone, hasSeenIntro } from "./introFlags";
import useTTS from "@/lib/voice/useTTS";

import buddyImg from "@/assets/buddies/kibundo-buddy.png";

/* Layered background assets (same set used in the InterestsWizard) */
import bgGlobal from "@/assets/backgrounds/global-bg.png";
import bgClouds from "@/assets/backgrounds/clouds.png";
import bgTrees from "@/assets/backgrounds/trees.png";
import bgBottom from "@/assets/backgrounds/bottom.png";

import useEnsureGerman from "@/hooks/useEnsureGerman.js";

const { Title, Text } = Typography;

export default function WelcomeTour() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();
  const { user, account } = useAuthContext();
  const { i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);

  // If parent has selected a child account (Netflix-style), use that child's ID
  // Otherwise, use the logged-in student's ID
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);

  const current = useMemo(
    () => ({
      title: "Sprich mit mir",
      text: "Tippe auf das Mikrofon, erzähle mir wofür du Hilfe brauchst und ich höre zu.",
    }),
    []
  );

  // Check if this is first login - don't mark as seen until onboarding is complete
  const isFirstLogin = !hasSeenIntro(studentId);

  // Use the friendly TTS hook from home screen
  const { speak: speakTTS } = useTTS({ lang: "de-DE", enabled: true });
  const hasSpokenRef = useRef(false);

  const speak = () => {
    const message = `${current.title}. ${current.text}`;
    speakTTS(message);
  };

  // Automatic TTS on mount - always enabled
  // Use ref to prevent double execution within the same render cycle
  useEffect(() => {
    if (ready && !hasSpokenRef.current) {
      // Mark as spoken immediately to prevent double execution
      hasSpokenRef.current = true;
      
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        const message = `${current.title}. ${current.text}`;
        speakTTS(message);
      }, 800);
      return () => clearTimeout(timer);
    }
    // Reset ref when component unmounts so it can run again on next mount
    return () => {
      hasSpokenRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const onSkip = () => {
    // Only allow skip if not first login
    if (!isFirstLogin) {
      markTourDone(studentId);
      navigate("/student/home");
    }
  };

  const onNext = () => {
    // Mark tour as done when proceeding to next step
    markTourDone(studentId);
    navigate("/student/onboarding/buddy");
  };

  const onBack = () => {
    navigate("/student/onboarding/welcome-intro", {
      state: { allowIntroReturn: true },
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* ---------- Background Layers (same look as InterestsWizard) ---------- */}
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
      {/* Drifting clouds (top) */}
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
      {/* Static tree horizon */}
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
      {/* ---------- Header ---------- */}
      <div className="relative z-30 flex items-center justify-between px-5 pt-5">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
          onClick={onBack}
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5 text-[#5b4f3f]" />
        </button>

        <div className="flex items-center gap-3">
          {/* Only show skip button if not first login */}
          {!isFirstLogin && (
            <button
              className="rounded-full border border-white/40 bg-white/60 px-4 py-1 text-sm font-medium text-[#5b4f3f] transition hover:bg-white"
              onClick={onSkip}
            >
              Überspringen
            </button>
          )}
          <button
            onClick={onNext}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#ff7a00] shadow-sm transition hover:bg-white"
            aria-label="Weiter"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ---------- Content ---------- */}
      <div className="relative z-20 mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-[640px] flex-col items-center px-6 pt-[35vh] md:pt-[32vh] pb-32 md:pb-24 lg:pb-6 text-center">
        <div className="w-full max-w-[210px] md:max-w-[240px]">
          <img
            src={buddy?.img || buddyImg}
            alt="Kibundo"
            className="w-full select-none drop-shadow-[0_22px_45px_rgba(90,76,58,0.22)]"
            draggable={false}
          />
        </div>

        <div className="mt-6 flex max-w-[520px] flex-col gap-2 text-[#4c3f32]">
          <Title level={3} className="!m-0 text-2xl font-semibold tracking-wide text-[#4c3f32]">
            {current.title}
          </Title>
          <Text className="text-base leading-relaxed text-[#5f5449]">
            {current.text}
          </Text>
        </div>

        <div className="mt-9 flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={speak}
            className="grid h-20 w-20 place-items-center rounded-full bg-[#ff7a00] text-white shadow-[0_18px_32px_rgba(255,122,0,0.35)] transition hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            aria-label="Tour erklären lassen"
          >
            <Mic className="h-9 w-9" />
          </button>
        </div>
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
