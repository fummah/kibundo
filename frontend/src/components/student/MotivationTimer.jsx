// src/components/student/MotivationTimer.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Typography, Button, Segmented, message, Tooltip } from "antd";
import { Play, Pause, RotateCw, Sparkles } from "lucide-react";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

const { Title, Text } = Typography;

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const THEME_HEX = {
  indigo: "#6366F1",
  emerald: "#10B981",
  sky: "#0EA5E9",
  rose: "#F43F5E",
  amber: "#F59E0B",
  violet: "#8B5CF6",
};

export default function MotivationTimer({
  presets = [5, 10, 15, 20],
  onComplete,
  autoStart = false,
  tts = false,
}) {
  const { state } = useStudentApp?.() ?? { state: {} };
  const theme = state?.colorTheme || "indigo";
  const ringColor = THEME_HEX[theme] || THEME_HEX.indigo;
  const ttsEnabled = state?.ttsEnabled ?? false;

  const [minutes, setMinutes] = useState(presets[1] || 10);
  const [running, setRunning] = useState(Boolean(autoStart));
  const [endAt, setEndAt] = useState(null);
  const [remaining, setRemaining] = useState(minutes * 60 * 1000);
  const [mode, setMode] = useState("Focus"); // "Focus" | "Break"
  const raf = useRef(null);

  // ---- audio/voice ----
  const audioCtxRef = useRef(null);
  const beep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const speak = (text) => {
    if (!(tts && ttsEnabled && "speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    setRemaining(minutes * 60 * 1000);
  }, [minutes]);

  const total = useMemo(() => minutes * 60 * 1000, [minutes]);
  const pct = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
  }, [total, remaining]);

  const elapsed = Math.max(0, total - remaining);

  // main loop
  const tick = () => {
    const now = Date.now();
    const rem = Math.max(0, (endAt || now) - now);
    setRemaining(rem);
    if (rem <= 0) {
      setRunning(false);
      setEndAt(null);
      beep();
      const doneMsg =
        mode === "Focus"
          ? "Great focus! ⭐ Time for a short break?"
          : "Nice break! Ready to learn again?";
      message.success(doneMsg);
      speak(doneMsg);
      onComplete && onComplete();

      // confetti
      const el = document.createElement("div");
      el.innerHTML = `<div class="fixed inset-0 pointer-events-none z-[9999]">
        ${Array.from({length: 28})
          .map(
            (_, i) =>
              `<span class="absolute -top-4 w-2 h-3 rounded-sm" style="left:${(i * 13) %
                100}%; background:${["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#b892ff"][i % 5]}; animation:kib-pop 1200ms linear ${i *
                30}ms forwards;"></span>`
          )
          .join("")}
      </div>
      <style>@keyframes kib-pop { to { transform: translateY(110vh) rotate(540deg); opacity:.9 } }</style>`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    } else {
      raf.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(raf.current || 0);
  }, []);

  useEffect(() => {
    if (autoStart && !running) {
      setEndAt(Date.now() + remaining);
      setRunning(true);
      cancelAnimationFrame(raf.current || 0);
      raf.current = requestAnimationFrame(tick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    setEndAt(Date.now() + remaining);
    setRunning(true);
    cancelAnimationFrame(raf.current || 0);
    raf.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    setRunning(false);
    setEndAt(null);
    cancelAnimationFrame(raf.current || 0);
  };

  const reset = () => {
    pause();
    setRemaining(minutes * 60 * 1000);
  };

  const switchMode = (val) => {
    setMode(val);
    pause();
    const def = val === "Focus" ? (presets[1] || 10) : 5;
    setMinutes(def);
    setRemaining(def * 60 * 1000);
  };

  // SVG ring math (fixed 120 viewBox, stroke scales via CSS size)
  const CIRC = 2 * Math.PI * 54; // ~339
  const dash = (pct / 100) * CIRC;

  return (
    <Card className="rounded-2xl" bodyStyle={{ padding: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Title level={5} className="!mb-0 flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Motivation Timer
        </Title>
        <Segmented value={mode} onChange={switchMode} options={["Focus", "Break"]} />
      </div>

      {/* Responsive body: mobile stacked, desktop side-by-side */}
      <div className="flex flex-col md:flex-row md:items-center md:gap-6">
        {/* Progress ring */}
        <div
          className="relative w-28 h-28 md:w-36 md:h-36 mx-auto md:mx-0"
          role="timer"
          aria-live="off"
          aria-label={`${mode} timer`}
        >
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle cx="60" cy="60" r="54" stroke="#eee" strokeWidth="10" fill="none" />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke={mode === "Focus" ? ringColor : "#22C55E"}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${dash} ${CIRC}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 300ms linear, stroke 200ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl md:text-2xl font-bold tabular-nums">
              {format(remaining)}
            </div>
            <div className="text-[11px] text-neutral-500">{pct}%</div>
          </div>
        </div>

        {/* Right / below content */}
        <div className="mt-3 md:mt-0 flex-1">
          {/* Motivation line */}
          <Text type="secondary" className="block text-center md:text-left">
            {mode === "Focus"
              ? "Stay calm and curious. Small steps add up!"
              : "Breathe, stretch, sip water. We’ll learn again soon."}
          </Text>

          {/* Time rows: show running & remaining */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-center md:text-left">
            <div className="bg-neutral-50 rounded-lg py-2">
              <div className="text-[11px] text-neutral-500">Elapsed</div>
              <div className="font-semibold tabular-nums">{format(elapsed)}</div>
            </div>
            <div className="bg-neutral-50 rounded-lg py-2">
              <div className="text-[11px] text-neutral-500">Left</div>
              <div className="font-semibold tabular-nums">{format(remaining)}</div>
            </div>
          </div>

          {/* Presets */}
          <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
            {(mode === "Focus" ? presets : [3, 5, 7]).map((m) => (
              <Button
                key={m}
                size="small"
                onClick={() => {
                  setMinutes(m);
                  setRemaining(m * 60 * 1000);
                }}
                className="rounded-full"
              >
                {m} min
              </Button>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center justify-center md:justify-start gap-2">
            {!running ? (
              <Tooltip title="Start">
                <Button type="primary" onClick={start} className="rounded-xl" icon={<Play className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Start</span>
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Pause">
                <Button onClick={pause} className="rounded-xl" icon={<Pause className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Pause</span>
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Reset">
              <Button onClick={reset} className="rounded-xl" icon={<RotateCw className="w-4 h-4" />}>
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </Card>
  );
}
