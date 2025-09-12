// src/pages/student/onboarding/BuddySelect.jsx
import { useState } from "react";
import { Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

/* New shared UI components */
import OnboardingHeader from "@/components/student/onboarding/OnboardingHeader.jsx";
import BuddyCard from "@/components/student/onboarding/BuddyCard.jsx";
import CTAButton from "@/components/ui/CTAButton.jsx";

/* Optional ribbons (keep if you want the top overlays) */
import HomeRibbon from "@/components/student/mobile/HomeRibbon";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";

/* Screen backgrounds */
import globalBg from "@/assets/backgrounds/global-bg.png";
import intBack from "@/assets/backgrounds/int-back.png";

const { Title, Text } = Typography;

/* Dummy buddies: replace with your real assets when ready */
const BUDDIES = [
  { id: "m1", name: "Milo", img: "https://placekitten.com/200/200" },
  { id: "m2", name: "Lumi", img: "https://placekitten.com/201/200" },
  { id: "m3", name: "Zuzu", img: "https://placekitten.com/202/200" },
  { id: "m4", name: "Kiko", img: "https://placekitten.com/203/200" },
  { id: "m5", name: "Pipa", img: "https://placekitten.com/204/200" },
  { id: "m6", name: "Nori", img: "https://placekitten.com/205/200" },
];

export default function BuddySelect() {
  const navigate = useNavigate();
  const { buddy, setBuddy } = useStudentApp();
  const [selected, setSelected] = useState(buddy?.id || null);

  const choose = (b) => setSelected(b.id);

  const next = () => {
    const chosen = BUDDIES.find((x) => x.id === selected);
    if (!chosen) return;
    setBuddy(chosen);
    try {
      localStorage.setItem("kibundo_buddy", JSON.stringify(chosen));
    } catch {}
    navigate("/student/onboarding/interests");
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      {/* ---------- BACKGROUND ---------- */}
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

      {/* ---------- RIBBONS (optional) ---------- */}
      <HomeRibbon />
      <SettingsRibbon />

      {/* ---------- CONTENT ---------- */}
      <div className="relative px-4 py-6 flex flex-col min-h-[100svh]">
        {/* Header (Back + TTS/Skip if you want) */}
        <OnboardingHeader onBack={() => navigate(-1)} />

        {/* Title + subtitle */}
        <div className="mt-1 text-center">
          <Title level={4} className="!mb-1">Wähle deinen Buddy</Title>
          <Text className="text-neutral-700">
            Wähle einen kleinen Freund, der dich auf deiner Lernreise begleitet.
          </Text>
        </div>

        {/* Buddy grid */}
        <div
          className="grid grid-cols-2 gap-4 flex-1 mt-4"
          role="radiogroup"
          aria-label="Buddy Auswahl"
        >
          {BUDDIES.map((b) => (
            <BuddyCard
              key={b.id}
              name={b.name}
              img={b.img}
              selected={selected === b.id}
              onClick={() => choose(b)}
            />
          ))}
        </div>

        {/* Next button */}
        <div className="mt-6 safe-bottom">
          <CTAButton
            disabled={!selected}
            onClick={next}
            className="w-full"
          >
            Weiter
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
