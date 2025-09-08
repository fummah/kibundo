// src/pages/student/onboarding/WelcomeIntro.jsx
import { useEffect, useState } from "react";
import { Button } from "antd";
import { Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HomeRibbon from "@/components/student/mobile/HomeRibbon";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

/* Backgrounds */
import globalBg from "C:\\wamp64\\www\\kibundo\\frontend\\src\\assets\\backgrounds\\global-bg.png";
import intBack from "C:\\wamp64\\www\\kibundo\\frontend\\src\\assets\\backgrounds\\int-back.png";
/* Mascot (replace with your final file if you have one) */
import buddyMascot from "C:\\wamp64\\www\\kibundo\\frontend\\src\\assets\\buddies\\kibundo-buddy.png";

const INTRO_LS_KEY = "kib_intro_seen_v1";

export default function WelcomeIntro() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Mark as seen as soon as we land here (or do it on CTA click if you prefer)
    localStorage.setItem(INTRO_LS_KEY, "1");
  }, []);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(
        "Hallo! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch."
      );
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const next = () => navigate("/student/onboarding/buddy"); // -> your BuddySelect route
  const skip = () => navigate("/student/home");              // or jump straight to home

  return (
    <div className="relative min-h-[100svh] md:min-h-screen overflow-hidden">
      {/* Background layers */}
      <img
        src={globalBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-20"
        draggable={false}
      />
      <img
        src={intBack}
        alt=""
        className="absolute bottom-0 left-0 w-full h-1/2 object-cover pointer-events-none -z-10"
        draggable={false}
      />

      {/* Ribbons */}
      <HomeRibbon />
      <SettingsRibbon />

      {/* Content column (mobile look on all breakpoints) */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto px-4 pt-[88px] md:pt-[104px] pb-6 min-h-[100svh] md:min-h-screen flex flex-col">
        {/* Title */}
        <h1 className="text-center text-[22px] font-extrabold text-[#4D4D4D] mb-3">
          Willkommen
        </h1>

        {/* Mascot + speech bubble */}
        <div className="relative flex items-start justify-center gap-4">
          <img
            src={buddyMascot}
            alt="Kibundo"
            className="h-[150px] object-contain select-none drop-shadow"
            draggable={false}
          />
          <div className="relative">
            <div
              className="rounded-3xl px-4 py-3 shadow"
              style={{ backgroundColor: "#9CE16C", color: "#1b3a1b" }}
            >
              <div className="max-w-[240px] leading-snug text-[15px]">
                Hallo! Ich bin Kibundo. <br />
                Gemeinsam machen wir Hausaufgaben <br />
                entspannt und spielerisch.
              </div>
            </div>
            <div
              className="absolute -left-2 top-6 w-4 h-4 rotate-45"
              style={{
                backgroundColor: "#9CE16C",
                boxShadow: "2px 2px 0 rgba(0,0,0,.06)",
              }}
            />
          </div>
        </div>

        {/* Speak + Skip */}
        <div className="flex justify-center gap-3 mt-4">
          <Button
            icon={<Volume2 className="w-4 h-4" />}
            onClick={speak}
            loading={speaking}
            className="rounded-xl"
          >
            Vorlesen
          </Button>
          <Button onClick={skip} className="rounded-xl">
            Überspringen
          </Button>
        </div>

        {/* Centered buddy (optional, if you want avatar below text) */}
        <div className="flex justify-center mt-6">
          <BuddyAvatar src={buddy?.img || buddyMascot} size={120} />
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Button
            type="primary"
            size="large"
            onClick={next}
            className="w-full rounded-xl !bg-[#FF7900] !border-none text-[16px] font-bold"
          >
            Los geht’s
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper you can reuse in routing to decide if intro should show
export const hasSeenIntro = () => {
  try { return localStorage.getItem(INTRO_LS_KEY) === "1"; } catch { return false; }
};
