import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Typography, Button, Segmented, message } from "antd";
import { Play, Pause, RotateCw, Sparkles } from "lucide-react";

const { Title, Text } = Typography;

function fmt(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
const KEY_DEFAULT = "student_focus_timer_v1";

/**
 * A global, persistent Pomodoro-style timer.
 * - Persists to localStorage; resumes across pages.
 * - Notifies on completion (“Time’s up—take a break!”).
 *
 * Props:
 * - storageKey?: string
 * - presets?: number[] (minutes)  default [10,15,20]
 * - onComplete?: () => void
 * - accent?: string (hex for primary btn)
 * - variant?: "card" | "chip" (compact floating ui)
 */
export default function MotivationTimer({
  storageKey = KEY_DEFAULT,
  presets = [10, 15, 20],
  onComplete,
  accent,
  variant = "card",
}) {
  const [mode, setMode] = useState("Focus"); // Focus | Break
  const [minutes, setMinutes] = useState(presets[0] || 10);
  const [running, setRunning] = useState(false);
  const [endAt, setEndAt] = useState(null); // timestamp ms
  const [remaining, setRemaining] = useState((presets[0] || 10) * 60 * 1000);
  const tickRef = useRef(null);

  // ---- hydrate from localStorage ----
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (raw.mode) setMode(raw.mode);
      if (raw.minutes) setMinutes(raw.minutes);
      if (raw.endAt) setEndAt(raw.endAt);
      if (typeof raw.running === "boolean") setRunning(raw.running);
      const base = (raw.minutes || presets[0] || 10) * 60 * 1000;
      const now = Date.now();
      const rem = raw.running && raw.endAt ? Math.max(0, raw.endAt - now) : (raw.remaining ?? base);
      setRemaining(rem);
      // handle passed time while away
      if (raw.running && raw.endAt && now >= raw.endAt) {
        finishCycle(raw.mode || "Focus");
      }
    } catch {}
    // cross-tab/page sync
    const onStorage = (e) => {
      if (e.key !== storageKey) return;
      try {
        const raw = JSON.parse(e.newValue || "{}");
        if (raw.mode !== undefined) setMode(raw.mode);
        if (raw.minutes !== undefined) setMinutes(raw.minutes);
        if (raw.endAt !== undefined) setEndAt(raw.endAt);
        if (raw.running !== undefined) setRunning(raw.running);
        if (raw.remaining !== undefined) setRemaining(raw.remaining);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- tick loop ----
  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const rem = Math.max(0, (endAt || now) - now);
      setRemaining(rem);
      if (rem <= 0) {
        finishCycle(mode);
      }
    }, 250);
    return () => clearInterval(tickRef.current);
  }, [running, endAt, mode]);

  // ---- persist ----
  useEffect(() => {
    try {
      const state = { mode, minutes, running, endAt, remaining };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [mode, minutes, running, endAt, remaining, storageKey]);

  const total = useMemo(() => minutes * 60 * 1000, [minutes]);
  const pct = useMemo(() => {
    const used = Math.max(0, total - remaining);
    return total ? Math.round((used / total) * 100) : 0;
  }, [total, remaining]);

  function start() {
    const nextEnd = Date.now() + remaining;
    setEndAt(nextEnd);
    setRunning(true);
  }
  function pause() {
    if (!running) return;
    const now = Date.now();
    setRemaining(Math.max(0, (endAt || now) - now));
    setRunning(false);
    setEndAt(null);
  }
  function reset(toMinutes = minutes) {
    setRunning(false);
    setEndAt(null);
    setRemaining(toMinutes * 60 * 1000);
  }
  function switchMode(next) {
    setMode(next);
    const def = next === "Focus" ? (presets[0] || 10) : 5;
    setMinutes(def);
    reset(def);
  }

  function finishCycle(currentMode) {
    setRunning(false);
    setEndAt(null);
    setRemaining(0);
    if (currentMode === "Focus") {
      message.success("Great focus! ⭐ Time’s up — take a short break.");
      setMode("Break");
      const def = 5;
      setMinutes(def);
      setRemaining(def * 60 * 1000);
    } else {
      message.success("Break finished! Ready to learn again?");
      setMode("Focus");
      const def = presets[0] || 10;
      setMinutes(def);
      setRemaining(def * 60 * 1000);
    }
    // confetti (tiny)
    const el = document.createElement("div");
    el.innerHTML = `<div class="fixed inset-0 pointer-events-none z-[9999]">
      ${Array.from({length: 28}).map((_,i)=>`<span class="absolute -top-4 w-2 h-3 rounded-sm" style="left:${(i*13)%100}%; background:${["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#b892ff"][i%5]}; animation:kib-pop 1200ms linear ${i*30}ms forwards;"></span>`).join("")}
    </div>
    <style>@keyframes kib-pop { to { transform: translateY(110vh) rotate(540deg); opacity:.9 } }</style>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);

    onComplete && onComplete();
  }

  if (variant === "chip") {
    // Compact floating chip (for global layout)
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full shadow-md bg-white border border-neutral-200">
        <span className="text-xs font-medium">{mode}</span>
        <span className="text-sm font-bold tabular-nums">{fmt(remaining)}</span>
        {!running ? (
          <Button size="small" type="primary" onClick={start} style={accent ? { background: accent } : {}}>
            Start
          </Button>
        ) : (
          <Button size="small" onClick={pause}>Pause</Button>
        )}
        <Button size="small" onClick={() => reset()}>Reset</Button>
      </div>
    );
  }

  // Full card (page widget)
  return (
    <Card className="rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <Title level={5} className="!mb-0 flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Motivation Timer
        </Title>
        <Segmented
          value={mode}
          onChange={switchMode}
          options={["Focus", "Break"]}
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 120 120" className="w-36 h-36">
            <circle cx="60" cy="60" r="54" stroke="#eee" strokeWidth="10" fill="none" />
            <circle
              cx="60" cy="60" r="54"
              stroke="currentColor" strokeWidth="10" fill="none"
              strokeDasharray={`${(pct/100)*339} 339`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              className="text-indigo-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold tabular-nums">{fmt(remaining)}</div>
            <div className="text-xs text-neutral-500">{pct}%</div>
          </div>
        </div>

        {/* Controls & presets */}
        <div className="flex-1">
          <Text type="secondary">
            {mode === "Focus"
              ? "Stay calm and curious. Small steps add up!"
              : "Breathe, stretch, sip water. We’ll learn again soon."}
          </Text>

          <div className="mt-2 flex flex-wrap gap-2">
            {(mode === "Focus" ? presets : [3, 5, 7]).map((m) => (
              <Button
                key={m}
                size="small"
                onClick={() => { setMinutes(m); setRemaining(m * 60 * 1000); }}
                className="rounded-full"
              >
                {m} min
              </Button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {!running ? (
              <Button
                type="primary"
                onClick={start}
                className="rounded-xl"
                icon={<Play className="w-4 h-4" />}
                style={accent ? { background: accent } : {}}
              >
                Start
              </Button>
            ) : (
              <Button onClick={pause} className="rounded-xl" icon={<Pause className="w-4 h-4" />}>
                Pause
              </Button>
            )}
            <Button onClick={() => reset()} className="rounded-xl" icon={<RotateCw className="w-4 h-4" />}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
