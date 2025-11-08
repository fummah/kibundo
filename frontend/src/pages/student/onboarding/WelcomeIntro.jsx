// src/pages/student/onboarding/WelcomeIntro.jsx
import { useEffect, useState } from "react";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import { markIntroSeen, markTourDone } from "./introFlags";

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
  const { user } = useAuthContext();
  const [speaking, setSpeaking] = useState(false);
  const { i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);

  const studentId = user?.id || user?.user_id || null;

  useEffect(() => {
    markIntroSeen(studentId);
  }, [studentId]);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(
        "Hallo! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch."
      );
      u.lang = "de-DE";
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  };

  const next = () => navigate("/student/onboarding/welcome-tour");

  const skip = () => {
    markIntroSeen(studentId);
    markTourDone(studentId);
    navigate("/student/home");
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
      <div className="pointer-events-none absolute inset-x-0 top-[18%] -z-10 flex justify-center">
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
        <button
          className="px-2 py-1 text-sm rounded-full bg-white/70 hover:bg-white shadow-sm transition"
          onClick={skip}
        >
          Überspringen
        </button>
        <Button
          icon={
            <img
              src={speakerIcon}
              alt="Vorlesen"
              className="w-4 h-4 object-contain"
            />
          }
          onClick={speak}
          loading={speaking}
          className="rounded-full"
        >
          Vorlesen
        </Button>
      </div>

      {/* Buddy + bubble */}
      <div className="relative z-20 px-3 mt-2">
        <div className="relative min-h-[240px]">
          <img
            src={buddy?.img || buddyMascot}
            alt="Kibundo"
            className="w-[230px] drop-shadow-[0_22px_45px_rgba(90,76,58,0.22)] select-none"
            draggable={false}
          />

          <div className="absolute left-[150px] top-[8px] max-w-[75%] text-[#1b3a1b] drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
            <div className="rounded-[28px] bg-[#a4dc4f] px-6 py-5 text-left">
              <Text style={{ fontSize: 14, lineHeight: 1.4, display: "block" }}>
                Hallo! Ich bin Kibundo.
                <br />
                Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-20 mt-[12vh] flex w-full justify-center px-6 pb-8">
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
