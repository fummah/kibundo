import { useEffect } from "react";
import { Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { markIntroSeen, markTourDone } from "./introFlags";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

import bgGlobal from "@/assets/backgrounds/global-bg.png";
import bgClouds from "@/assets/backgrounds/clouds.png";
import bgBottom from "@/assets/backgrounds/bottom.png";
import defaultBuddy from "@/assets/buddies/kibundo-buddy.png";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";

const { Title, Text } = Typography;

export default function WelcomeSuccess() {
  const navigate = useNavigate();
  const { buddy, ttsEnabled } = useStudentApp();
  const { user, account } = useAuthContext();
  const { i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);

  // If parent has selected a child account (Netflix-style), use that child's ID
  // Otherwise, use the logged-in student's ID
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);

  // Mark onboarding as complete when reaching success page
  useEffect(() => {
    if (studentId) {
      markIntroSeen(studentId);
      markTourDone(studentId);
    }
  }, [studentId]);

  // Speak congratulations message when page loads (if TTS is enabled)
  useEffect(() => {
    if (ttsEnabled) {
      const timer = setTimeout(() => {
        try {
          const message = "Glückwunsch! Du hast den ersten Schritt gemacht.";
          const u = new SpeechSynthesisUtterance(message);
          u.lang = "de-DE";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch {}
      }, 500); // Small delay for page to render
      
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [ttsEnabled]);

  if (!ready) {
    return null;
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 pb-32 md:pb-24 lg:pb-6 overflow-hidden">
      {/* Background layers matching interests */}
      <div className="absolute inset-0 pointer-events-none -z-30">
        <img
          src={bgGlobal}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, #ffd7ba 0%, #f6e7da 55%, #eaf5ef 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgClouds})`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
            backgroundSize: "contain",
            animation: "kib-clouds 60s linear infinite",
            opacity: 0.9,
          }}
        />
      </div>
      <div
        className="absolute bottom-0 left-1/2 -z-20 h-[58vh] w-[150%] max-w-[1800px] -translate-x-1/2"
        style={{
          backgroundImage: `url(${bgBottom})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          clipPath: "ellipse(120% 90% at 50% 0%)",
          borderTopLeftRadius: "60% 32%",
          borderTopRightRadius: "60% 32%",
          boxShadow: "0 -32px 60px rgba(157, 141, 117, 0.18)",
        }}
      />

      {/* Light confetti overlay - distributed across entire screen - in front of everything */}
      <div className="pointer-events-none absolute inset-0 z-[9999] overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => {
          // Better distribution: use golden ratio spacing for natural distribution
          const goldenRatio = 0.618;
          const leftPosition = ((i * goldenRatio * 100) % 100);
          const size = 6 + (i % 4) * 2; // Vary sizes: 6px, 8px, 10px, 12px
          const animationDuration = 3 + (i % 3) * 0.5; // Vary speeds: 3s, 3.5s, 4s
          const horizontalDrift = (i % 2 === 0 ? 1 : -1) * (10 + (i % 20)); // Drift left/right
          
          return (
            <div
              key={i}
              className="success-confetti"
              style={{
                left: `${leftPosition}%`,
                animationDelay: `${(i % 15) * 0.12}s`,
                animationDuration: `${animationDuration}s`,
                background: ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#b892ff", "#ff9a56", "#ffcc5c"][i % 7],
                width: `${size}px`,
                height: `${size * 1.5}px`,
                '--drift': `${horizontalDrift}px`,
              }}
            />
          );
        })}
      </div>

     {/* ---------- CONTENT ---------- */}
<div className="relative z-10 text-center" style={{ position: 'relative', zIndex: 1 }}>
  <div className="text-[22px] font-extrabold text-[#4D4D4D] mb-2">Erfolgreich</div>
  
  {/* Centered BuddyAvatar */}
  <div className="flex justify-center mt-4">
    <BuddyAvatar src={buddy?.img || defaultBuddy} size={180} />
  </div>

  <Title level={3} className="!mt-6 !mb-2 text-[#82B400] font-extrabold">
    Glückwunsch
  </Title>
  <Text className="block text-neutral-700 max-w-md mx-auto leading-snug">
    Du hast den ersten Schritt gemacht, damit Dein Kind bei den Hausaufgaben Spaß hat und
    individuell auf seiner Lernreise von Kibundo begleitet wird.
  </Text>
  <Button
    type="primary"
    size="large"
    className="rounded-xl mt-8 !bg-[#FF7900] !border-none !px-10 !h-12 text-[16px] font-bold"
    onClick={() => navigate("/student/home")}
  >
    Weiter
  </Button>
</div>

      <style>{`
        @keyframes kib-clouds {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .success-confetti {
          position: absolute;
          top: -20px;
          border-radius: 2px;
          animation: success-fall 3.5s linear infinite;
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
        }
        @keyframes success-fall {
          0%   { 
            transform: translateY(-20px) translateX(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) translateX(var(--drift, 0px)) rotate(270deg) scale(1.1);
            opacity: 0.9;
          }
          100% { 
            transform: translateY(120vh) translateX(calc(var(--drift, 0px) * 1.5)) rotate(720deg) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
