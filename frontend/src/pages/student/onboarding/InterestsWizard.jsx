import { useMemo, useState, useEffect } from "react";
import { Card, Typography, Button } from "antd";
import { ArrowLeft, Volume2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import DeviceFrame from "@/components/student/mobile/DeviceFrame.jsx";

import globalBg from "../../../assets/backgrounds/global-bg.png";
import intBack from "../../../assets/backgrounds/int-back.png";

/* Mascot (optional, not directly used here) */
import buddyMascot from "../../../assets/buddies/kibundo-buddy.png";

/* image assets (used for the theme step) */
import dinoImg from "../../../assets/mobile/icons/Dinosaurier.png";
import unicornImg from "../../../assets/mobile/icons/Einhörner.png";

const { Title } = Typography;

/* ---------- Steps ---------- */
const STEPS = [
  {
    id: "colors",
    title: "Welche Farbe gefällt dir am meisten?",
    choices: ["Rot", "Blau", "Grün", "Gelb"],
    grid: 2,
    style: "colors",
  },
  {
    id: "theme1",
    title: "Was magst du lieber? Einhörner oder Dinosaurier?",
    choices: ["Einhörner", "Dinosaurier"],
    grid: 2,
    style: "imageCards",
    images: { Einhörner: unicornImg, Dinosaurier: dinoImg },
    bg: "#f6ded6",
  },
  {
    id: "theme2",
    title: "Was magst du lieber? Roboter oder Zauberer?",
    choices: ["Roboter", "Zauberer"],
    grid: 2,
  },
  {
    id: "hobby1",
    title: "Was machst du gerne?",
    choices: ["Malen", "Bauen (Lego)"],
    grid: 2,
  },
  {
    id: "world",
    title: "Welche Welt findest du spannender?",
    choices: ["Weltraum", "Unterwasserwelt"],
    grid: 2,
  },
  {
    id: "animals",
    title: "Welche Tiere magst du?",
    choices: ["Hund / Katze / Kaninchen", "Schlange / Spinne / Schildkröte"],
    grid: 2,
  },
];

export default function InterestsWizard() {
  const navigate = useNavigate();
  const { buddy, interests, setInterests } = useStudentApp();
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState(() =>
    interests?.length ? [...interests] : []
  );

  // Optional restore from localStorage if context is empty
  useEffect(() => {
    if (!interests?.length) {
      try {
        const raw = localStorage.getItem("kibundo_interests");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) setAnswers(parsed);
        }
      } catch {}
    }
  }, []);  

  const step = STEPS[stepIdx];
  const canNext = useMemo(() => !!answers[stepIdx], [answers, stepIdx]);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(step.title);
      u.lang = "de-DE";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const choose = (c) => {
    const next = [...answers];
    next[stepIdx] = c;
    setAnswers(next);
  };

  const onBack = () => {
    if (stepIdx === 0) return navigate(-1);
    setStepIdx((i) => i - 1);
  };

  const onNext = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else {
      const final = answers.filter(Boolean);
      setInterests(final);
      try { localStorage.setItem("kibundo_interests", JSON.stringify(final)); } catch {}
      navigate("/student/onboarding/success");
    }
  };

  return (
    <div className="relative min-h-[100svh] md:min-h-screen overflow-hidden">
       <DeviceFrame>
      {/* Backgrounds */}
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

      {/* Page content */}
      <div
        className="
          relative z-10 w-full max-w-[480px] mx-auto
          px-3 md:px-4 py-4
          min-h-[100svh] md:min-h-screen
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            className="p-2 rounded-full hover:bg-neutral-100"
            onClick={onBack}
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Title level={4} className="!mb-0">
            Interessen
          </Title>
          <button
            className="ml-auto p-2 rounded-full hover:bg-neutral-100"
            onClick={speak}
            aria-label="Vorlesen"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Buddy + question */}
        <div className="flex items-start gap-3 mb-4">
          <BuddyAvatar
            src={buddy?.img || "https://placekitten.com/200/201"}
            size={96}
          />
          <div className="flex-1">
            <div className="text-lg font-semibold">{step.title}</div>
            <div className="text-neutral-600 text-sm">
              Schritt {stepIdx + 1} von {STEPS.length}
            </div>
          </div>
        </div>

        {/* Choices */}
        <div
          className={`grid ${step.grid === 2 ? "grid-cols-2" : "grid-cols-1"} gap-3`}
          role="radiogroup"
          aria-label={step.title}
        >
          {step.choices.map((c) => {
            const isActive = answers[stepIdx] === c;

            // Color squares
            if (step.style === "colors") {
              const bg =
                c === "Rot"
                  ? "#ef4444"
                  : c === "Blau"
                  ? "#3b82f6"
                  : c === "Grün"
                  ? "#22c55e"
                  : "#eab308";
              return (
                <button
                  key={c}
                  onClick={() => choose(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(c); }
                  }}
                  role="radio"
                  aria-checked={isActive}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-2xl"
                >
                  <Card
                    className={`relative rounded-2xl border-2 ${
                      isActive
                        ? "border-blue-500 ring-2 ring-blue-300"
                        : "border-transparent"
                    }`}
                    styles={{ body: { padding: 18 } }}
                    hoverable
                  >
                    <div className="h-14 rounded-xl" style={{ background: bg }} />
                    {isActive && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </Card>
                </button>
              );
            }

            // Image cards (Unicorn/Dino)
            if (step.style === "imageCards") {
              const imgSrc = step.images?.[c];
              return (
                <button
                  key={c}
                  onClick={() => choose(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(c); }
                  }}
                  role="radio"
                  aria-checked={isActive}
                  className="text-left focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-2xl"
                  aria-label={c}
                >
                  <Card
                    hoverable
                    className={`relative rounded-2xl transition shadow-sm ${
                      isActive ? "ring-2 ring-emerald-400" : ""
                    }`}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div
                      className="h-[210px] rounded-2xl grid place-items-center"
                      style={{ backgroundColor: step.bg || "#f6ded6" }}
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={c}
                          className="h-[140px] object-contain"
                        />
                      ) : (
                        <div className="text-lg font-semibold">{c}</div>
                      )}
                    </div>

                    {isActive && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </Card>
                  <div className="text-center font-extrabold mt-3 text-[#5b4f3f]">
                    {c}
                  </div>
                </button>
              );
            }

            // Default text cards
            return (
              <button
                key={c}
                onClick={() => choose(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(c); }
                }}
                role="radio"
                aria-checked={isActive}
                className="w-full focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-2xl"
              >
                <Card
                  className={`relative rounded-2xl border-2 ${
                    isActive
                      ? "border-blue-500 ring-2 ring-blue-300"
                      : "border-transparent"
                  } bg-neutral-50`}
                  styles={{ body: { padding: 18 } }}
                  hoverable
                >
                  <div className="text-lg font-semibold text-left">{c}</div>

                  {isActive && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </Card>
              </button>
            );
          })}
        </div>

        {/* Footer Aktionen */}
        <div className="mt-5 flex gap-2 mb-[env(safe-area-inset-bottom,0)]">
          <Button onClick={onBack} className="rounded-xl">
            Zurück
          </Button>
          <Button
            type="primary"
            disabled={!canNext}
            onClick={onNext}
            className="rounded-xl"
          >
            Weiter
          </Button>
        </div>

       
      </div>
       </DeviceFrame>
    </div>
     
  );
}
