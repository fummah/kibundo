// src/pages/student/onboarding/BuddySelect.jsx
import { useState, useEffect, useRef } from "react";
import { Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";

/* New shared UI components */
import OnboardingHeader from "@/components/student/onboarding/OnboardingHeader.jsx";
import BuddyCard from "@/components/student/onboarding/BuddyCard.jsx";

/* Screen backgrounds */
import globalBg from "@/assets/backgrounds/global-bg.png";
import cloudsBg from "@/assets/backgrounds/clouds.png";
import bottomBg from "@/assets/backgrounds/bottom.png";

// Import buddy images
import buddyMilo from "@/assets/buddies/kibundo-buddy.png";
import buddyLumi from "@/assets/buddies/kibundo-buddy1.png";
import buddyZuzu from "@/assets/buddies/monster1.png";
import buddyKiko from "@/assets/buddies/monster21.png";
import buddyPipa from "@/assets/buddies/Hausaufgaben.png";
import buddyNori from "@/assets/buddies/Lernen.png";

const { Title, Text } = Typography;

const BUDDIES = [
  { id: "m1", name: "Milo", img: buddyMilo },
  { id: "m2", name: "Lumi", img: buddyLumi },
  { id: "m3", name: "Zuzu", img: buddyZuzu },
  { id: "m4", name: "Kiko", img: buddyKiko },
  { id: "m5", name: "Pipa", img: buddyPipa },
  { id: "m6", name: "Nori", img: buddyNori },
];

export default function BuddySelect() {
  const { t, i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const navigate = useNavigate();
  const { buddy, setBuddy } = useStudentApp();
  const [selected, setSelected] = useState(buddy?.id || null);
  const buttonRef = useRef(null);

  const choose = (b) => setSelected(b.id);

  // Force update button color when selection changes
  useEffect(() => {
    if (buttonRef.current) {
      const btn = buttonRef.current;
      if (selected) {
        btn.style.backgroundColor = '#ff4d4f';
        btn.style.borderColor = '#ff4d4f';
      } else {
        btn.style.backgroundColor = '#d9d9d9';
        btn.style.borderColor = '#d9d9d9';
      }
    }
  }, [selected]);

  const next = () => {
    const chosen = BUDDIES.find((x) => x.id === selected);
    if (!chosen) return;
    setBuddy(chosen);
    try {
      localStorage.setItem("kibundo_buddy", JSON.stringify(chosen));
    } catch {}
    navigate("/student/onboarding/interests");
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      {/* ---------- BACKGROUND ---------- */}
      <div className="absolute inset-0 pointer-events-none -z-20">
        <img
          src={globalBg}
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
            backgroundImage: `url(${cloudsBg})`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
            backgroundSize: "contain",
            animation: "kib-clouds 60s linear infinite",
            opacity: 0.9,
          }}
        />
      </div>
      <div
        className="absolute bottom-0 left-1/2 -z-10 h-[58vh] w-[150%] max-w-[1800px] -translate-x-1/2"
        style={{
          backgroundImage: `url(${bottomBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          clipPath: "ellipse(120% 90% at 50% 0%)",
          borderTopLeftRadius: "60% 32%",
          borderTopRightRadius: "60% 32%",
          boxShadow: "0 -32px 60px rgba(157, 141, 117, 0.18)",
        }}
      />
      {/* ---------- CONTENT ---------- */}
      <div className="relative px-4 py-6 flex flex-col min-h-[100svh]">
        {/* Header (Back + TTS/Skip if you want) */}
        <OnboardingHeader onBack={() => navigate(-1)} />

        {/* Title + subtitle */}
        <div className="mt-1 text-center">
          <Title level={4} className="!mb-1">{t("onboarding.chooseBuddy")}</Title>
          <Text className="text-neutral-700">
            {t("onboarding.chooseBuddySubtitle")}
          </Text>
        </div>

        {/* Buddy grid */}
        <div
          className="grid grid-cols-2 gap-4 flex-1 mt-4 mb-4"
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

        {/* Next button - Always visible at bottom */}
        <div className="relative z-10 mt-auto pt-4 pb-6 bg-white/95 backdrop-blur-sm rounded-t-2xl -mx-4 px-4">
          <Button
            ref={buttonRef}
            disabled={!selected}
            onClick={next}
            type="primary"
            className={`w-full rounded-full !border-none ${selected ? '!bg-[#ff4d4f]' : '!bg-[#d9d9d9]'}`}
            size="large"
            style={{
              minHeight: '52px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: selected ? '#ff4d4f' : '#d9d9d9',
              borderColor: selected ? '#ff4d4f' : '#d9d9d9',
            }}
            onMouseEnter={(e) => {
              if (selected && !e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#ff7875';
              }
            }}
            onMouseLeave={(e) => {
              if (selected && !e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#ff4d4f';
              }
            }}
            onMouseDown={(e) => {
              if (selected && !e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#d32f2f';
              }
            }}
            onMouseUp={(e) => {
              if (selected && !e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#ff4d4f';
              }
            }}
          >
            {t("common.next") || "Weiter"}
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes kib-clouds {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
