import { useMemo, useState, useEffect } from "react";
import { Typography, Button, App } from "antd";
import { Volume2, VolumeX, Check, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import api from "@/api/axios";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";

/* Mascot (optional) */
import buddyMascot from "@/assets/buddies/kibundo-buddy.png";

/* Choice images */
import dinoImg from "@/assets/mobile/icons/Dinosaurier.png";
import unicornImg from "@/assets/mobile/icons/Einhörner.png";

/* ---------- NEW: layered background assets ---------- */
import bgGlobal from "@/assets/backgrounds/global-bg.png";
import bgClouds from "@/assets/backgrounds/clouds.png";
import bgBottom from "@/assets/backgrounds/bottom.png";

const { Title } = Typography;

/* ---------- Steps ---------- */
const STEPS = [
  { id: "colors", title: "Welche Farbe gefällt dir am meisten?", choices: ["Rot", "Blau", "Grün", "Gelb"], grid: 2, style: "colors" },
  { id: "theme1", title: "Was magst du lieber? Einhörner oder Dinosaurier?", choices: ["Einhörner", "Dinosaurier"], grid: 2, style: "imageCards", images: { Einhörner: unicornImg, Dinosaurier: dinoImg }, bg: "#f6ded6" },
  { id: "theme2", title: "Was magst du lieber? Roboter oder Zauberer?", choices: ["Roboter", "Zauberer"], grid: 2 },
  { id: "hobby1", title: "Was machst du gerne?", choices: ["Malen", "Bauen (Lego)"], grid: 2 },
  { id: "world", title: "Welche Welt findest du spannender?", choices: ["Weltraum", "Unterwasserwelt"], grid: 2 },
  { id: "animals", title: "Welche Tiere magst du?", choices: ["Hund / Katze / Kaninchen", "Schlange / Spinne / Schildkröte"], grid: 2 },
];

export default function InterestsWizard() {
  const { message } = App.useApp();
  const { t, i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    buddy,
    interests,
    setInterests,
    profile,
    ttsEnabled,
    setTtsEnabled,
    setProfile,
    theme,
  } = useStudentApp();

  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState(() =>
    interests?.length ? [...interests] : []
  );

  // Restore from localStorage if context empty
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

  // TTS: auto-say the step title on change
  useEffect(() => {
    if (ttsEnabled && step) {
      const timer = setTimeout(() => {
        try {
          const u = new SpeechSynthesisUtterance(step.title);
          u.lang = "de-DE";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch {}
      }, 300);
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [stepIdx, step, ttsEnabled]);

  const choose = (c) => {
    const next = [...answers];
    next[stepIdx] = c;
    setAnswers(next);

    if (ttsEnabled && c) {
      try {
        const u = new SpeechSynthesisUtterance(c);
        u.lang = "de-DE";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch {}
    }
  };

  const onBack = () => {
    if (stepIdx === 0) return navigate(-1);
    setStepIdx((i) => i - 1);
  };

  const onNext = async () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      const final = answers.filter(Boolean);
      setInterests(final);

      try {
        localStorage.setItem("kibundo_interests", JSON.stringify(final));
      } catch {}

      setSaving(true);
      try {
        const allRes = await api.get("/allstudents", { validateStatus: (s) => s >= 200 && s < 500 });
        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        const match = all.find(
          (s) =>
            s?.user?.id === user?.id ||
            s?.user_id === user?.id ||
            s?.id === user?.id
        );

        if (match && match.id) {
          const currentTtsEnabled = Boolean(ttsEnabled);
          const payload = {
            profile: {
              name: profile?.name ?? "",
              ttsEnabled: currentTtsEnabled,
              theme: theme || "indigo",
            },
            interests: final,
            buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
          };

          await api.patch(`/student/${match.id}`, payload);
          message.success?.("Interessen erfolgreich gespeichert!");
        }
      } catch (error) {
        console.error("Failed to save interests:", error);
      } finally {
        setSaving(false);
      }

      navigate("/student/onboarding/success");
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <App>
      {/* ---------- Background Layers (match screenshot) ---------- */}
      <div className="relative min-h-[100svh] md:min-h-screen overflow-hidden">
        {/* Base texture/gradient */}
        <div
          className="absolute inset-0 -z-40"
          style={{
            backgroundImage: `url(${bgGlobal})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Peach sky fallback/overlay gradient to soften */}
        <div
          className="absolute inset-0 -z-30 opacity-90"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, #ffd7ba 0%, #f6e7da 55%, #eaf5ef 100%)",
          }}
        />
        {/* Slow drifting clouds (top) */}
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
        {/* ---------- Page content ---------- */}
        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[900px] flex-col px-5 pb-10 pt-8 md:px-10">
          {/* Header */}
          <div className="flex items-center justify-center">
            <Title level={2} className="!mb-0 text-center text-3xl font-bold tracking-wide text-[#5a4c3a]">
              Interessen
            </Title>
          </div>

          {/* Hero + controls */}
          <div className="mt-10 flex flex-1 flex-col items-center gap-6 md:gap-8">
            <div className="flex w-full items-start justify-center gap-4 md:gap-8">
              <div className="relative flex flex-col items-center">
                <BuddyAvatar src={buddy?.img || buddyMascot} size={150} />
                <div className="relative mt-4 rounded-[28px] bg-[#A4DC4F] px-6 py-4 text-lg font-semibold text-[#3A4E1A] shadow-lg">
                  <div>{step.title}</div>
                  <div className="text-sm font-medium text-[#4e5f2f]">
                    Schritt {stepIdx + 1} von {STEPS.length}
                  </div>
                  <div className="absolute -left-4 top-1/2 h-0 w-0 -translate-y-1/2 border-8 border-transparent border-r-[#A4DC4F]" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF7F32] text-white shadow-lg transition hover:scale-105"
                  onClick={() => {
                    const next = !ttsEnabled;
                    setTtsEnabled(next);
                    setProfile({ ...profile, ttsEnabled: next });
                    if (next) {
                      try {
                        const feedback = new SpeechSynthesisUtterance("Eingeschaltet");
                        feedback.lang = "de-DE";
                        window.speechSynthesis.cancel();
                        window.speechSynthesis.speak(feedback);
                      } catch {}
                    } else {
                      try {
                        window.speechSynthesis.cancel();
                      } catch {}
                    }
                  }}
                  aria-label={ttsEnabled ? "Stimme deaktivieren" : "Stimme aktivieren"}
                >
                  {ttsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>

                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF7F32] text-white shadow-lg transition hover:scale-105"
                  onClick={onBack}
                  aria-label="Zurück"
                >
                  <RotateCcw size={24} />
                </button>
              </div>
            </div>

            {/* Choices */}
            <div
              className={`grid w-full max-w-[720px] gap-5 ${step.grid === 2 ? "grid-cols-2" : "grid-cols-1"}`}
              role="radiogroup"
              aria-label={step.title}
            >
              {step.choices.map((c) => {
                const isActive = answers[stepIdx] === c;

                if (step.style === "colors") {
                  const bg =
                    c === "Rot" ? "#ef4444" :
                    c === "Blau" ? "#3b82f6" :
                    c === "Grün" ? "#22c55e" :
                    "#eab308";

                  return (
                    <button
                      key={c}
                      onClick={() => choose(c)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(c); } }}
                      role="radio"
                      aria-checked={isActive}
                      className="w-full rounded-[30px] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFB347]/60"
                    >
                      <div
                        className={`relative rounded-[30px] border-none shadow-[0_18px_45px_rgba(0,0,0,0.08)] transition bg-white ${isActive ? "ring-4 ring-[#FFB347]" : ""}`}
                        style={{ padding: 0 }}
                      >
                        <div className="h-20 rounded-2xl" style={{ background: bg }} />
                        {isActive && (
                          <div className="absolute top-4 right-4 rounded-full bg-[#FF7F32] p-2 text-white shadow-lg">
                            <Check className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                }

                if (step.style === "imageCards") {
                  const imgSrc = step.images?.[c];
                  return (
                    <button
                      key={c}
                      onClick={() => choose(c)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(c); } }}
                      role="radio"
                      aria-checked={isActive}
                      className="text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFB347]/60"
                      aria-label={c}
                    >
                      <div
                        className={`relative rounded-[32px] border-none shadow-[0_24px_50px_rgba(0,0,0,0.1)] transition bg-white ${isActive ? "ring-4 ring-[#A4DC4F]" : ""}`}
                        style={{ padding: 0 }}
                      >
                        <div className="grid h-[240px] place-items-center rounded-[32px]" style={{ backgroundColor: step.bg || "#f6ded6" }}>
                          {imgSrc ? (
                            <img src={imgSrc} alt={c} className="h-[220px] object-contain" />
                          ) : (
                            <div className="text-xl font-semibold">{c}</div>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute top-4 right-4 rounded-full bg-[#A4DC4F] p-2 text-white shadow-lg">
                            <Check className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="mt-4 text-center text-xl font-extrabold text-[#5b4f3f]">{c}</div>
                    </button>
                  );
                }

                return (
                  <button
                    key={c}
                    onClick={() => choose(c)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(c); } }}
                    role="radio"
                    aria-checked={isActive}
                    className="w-full rounded-[30px] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFB347]/60"
                  >
                    <div
                      className={`relative rounded-[30px] border-none bg-white/90 shadow-[0_18px_45px_rgba(0,0,0,0.08)] transition ${isActive ? "ring-4 ring-[#FFB347]" : ""}`}
                      style={{ padding: 24 }}
                    >
                      <div className="text-xl font-semibold text-left text-[#5b4f3f]">{c}</div>
                      {isActive && (
                        <div className="absolute top-4 right-4 rounded-full bg-[#FF7F32] p-2 text-white shadow-lg">
                          <Check className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 flex w-full items-center justify-between gap-2">
            <Button
              onClick={onBack}
              disabled={saving}
              className="rounded-full border-none bg-white/80 px-6 py-3 text-base font-semibold text-[#5b4f3f] shadow-md hover:bg-white"
            >
              Zurück
            </Button>
            <Button
              type="primary"
              disabled={!canNext || saving}
              loading={saving}
              onClick={onNext}
              className="rounded-full border-none bg-[#FF7F32] px-8 py-3 text-lg font-semibold shadow-lg hover:bg-[#ff6c12]"
            >
              {stepIdx === STEPS.length - 1 ? "Fertig" : "Weiter"}
            </Button>
          </div>
        </div>
      </div>

      {/* Small CSS block for cloud/parallax + confetti */}
      <style>{`
        @keyframes kib-clouds {
          from { background-position: 0px top; }
          to   { background-position: 2000px top; }
        }
        @keyframes kib-parallax {
          from { background-position: 0 bottom; }
          to   { background-position: 1500px bottom; }
        }
        /* Lightweight confetti made from tiny radial gradients */
        .kib-confetti::before, .kib-confetti::after {
          content: "";
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle 3px at 10% 5%,   #ff7332 99%, transparent 100%),
            radial-gradient(circle 3px at 20% 12%,  #ffa62b 99%, transparent 100%),
            radial-gradient(circle 3px at 30% 7%,   #48b9ff 99%, transparent 100%),
            radial-gradient(circle 3px at 40% 18%,  #6ee7b7 99%, transparent 100%),
            radial-gradient(circle 3px at 55% 9%,   #f472b6 99%, transparent 100%),
            radial-gradient(circle 3px at 65% 16%,  #93c5fd 99%, transparent 100%),
            radial-gradient(circle 3px at 75% 6%,   #fbbf24 99%, transparent 100%),
            radial-gradient(circle 3px at 88% 15%,  #34d399 99%, transparent 100%);
          background-size: 220px 220px;
          animation: kib-confetti-scroll 28s linear infinite;
          opacity: .8;
        }
        .kib-confetti::after {
          background-size: 260px 260px;
          animation-duration: 36s;
          opacity: .6;
        }
        @keyframes kib-confetti-scroll {
          from { background-position: 0 0; }
          to   { background-position: 0 3800px; }
        }
      `}</style>
    </App>
  );
}
