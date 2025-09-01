import React, { useEffect, useRef, useState } from "react";
import { Card, Button, Segmented, message } from "antd";
import { Play, Pause, X, TimerReset } from "lucide-react";

const LS_KEY = "global_focus_timer_v3";
const LS_POS_KEY = "global_focus_timer_pos_v1";

function mmss(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default function GlobalFocusTimer() {
  // UI state
  const [collapsed, setCollapsed] = useState(true);
  const [running, setRunning] = useState(false);
  const [totalMs, setTotalMs] = useState(15 * 60 * 1000);
  const [remainingMs, setRemainingMs] = useState(15 * 60 * 1000);

  // Drag/position – snap to left/right, remember top
  const [side, setSide] = useState("right"); // 'left' | 'right'
  const [top, setTop] = useState(300);       // px from viewport top

  const wrapRef = useRef(null);
  const tickRef = useRef(null);
  const mountedRef = useRef(true);

  // ---------- Hydrate ----------
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (raw.totalMs) setTotalMs(raw.totalMs);
      if (raw.remainingMs) setRemainingMs(raw.remainingMs);
      if (raw.running) setRunning(Boolean(raw.running));
    } catch {}
    try {
      const pos = JSON.parse(localStorage.getItem(LS_POS_KEY) || "{}");
      if (pos.side === "left" || pos.side === "right") setSide(pos.side);
      if (typeof pos.top === "number") setTop(pos.top);
    } catch {}
    // keep collapsed so it doesn't cover UI on load
    setCollapsed(true);
    // clamp to viewport
    const avail = window.innerHeight;
    setTop((t) => clamp(t, 16, Math.max(16, avail - 180)));
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------- Persist ----------
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ running, totalMs, remainingMs })
      );
    } catch {}
  }, [running, totalMs, remainingMs]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_POS_KEY, JSON.stringify({ side, top }));
    } catch {}
  }, [side, top]);

  // ---------- Resize clamp ----------
  useEffect(() => {
    const onResize = () => {
      const maxTop = Math.max(16, window.innerHeight - 180);
      setTop((t) => clamp(t, 16, maxTop));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- Ticking ----------
  useEffect(() => {
    clearInterval(tickRef.current);
    if (running) {
      tickRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            clearInterval(tickRef.current);
            if (mountedRef.current) {
              setRunning(false);
              setRemainingMs(0);
              setCollapsed(false); // open to show the notice
              message.success("⏱️ Time’s up — take a short break!");
              // Best-effort desktop notification (if permitted)
              if ("Notification" in window) {
                if (Notification.permission === "granted") {
                  new Notification("Kibundo Focus Timer", {
                    body: "Time’s up — take a short break!",
                  });
                } else if (Notification.permission === "default") {
                  // Ask once, quietly
                  Notification.requestPermission().then((perm) => {
                    if (perm === "granted") {
                      new Notification("Kibundo Focus Timer", {
                        body: "Time’s up — take a short break!",
                      });
                    }
                  });
                }
              }
            }
          }
          return Math.max(0, next);
        });
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [running]);

  // ---------- Controls ----------
  const presets = [
    { label: "10m", value: 10 * 60 * 1000 },
    { label: "15m", value: 15 * 60 * 1000 },
    { label: "20m", value: 20 * 60 * 1000 },
    { label: "25m", value: 25 * 60 * 1000 },
  ];

  const onPreset = (valMs) => {
    setTotalMs(valMs);
    setRemainingMs(valMs);
  };

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemainingMs(totalMs);
  };

  // ---------- Minimal drag + edge snap ----------
  const dragState = useRef({
    dragging: false,
    grabOffsetY: 0,
  });

  const beginDrag = (e) => {
    // Only desktop; ignore right-click
    if (e.button === 2) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current.dragging = true;
    dragState.current.grabOffsetY =
      (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    // Attach listeners on window so we can track outside the card too
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", endDrag);
  };

  const onDragMove = (e) => {
    if (!dragState.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // vertical position
    const newTop = clientY - dragState.current.grabOffsetY;
    const maxTop = Math.max(16, window.innerHeight - 180);
    setTop(clamp(newTop, 16, maxTop));

    // live edge hint (snap on release; here we just preview by flipping if close to edge)
    const midpoint = window.innerWidth / 2;
    setSide(clientX < midpoint ? "left" : "right");

    // Prevent page scrolling while dragging on touch
    if (e.cancelable) e.preventDefault();
  };

  const endDrag = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", endDrag);
    // Snap is already applied via side state; nothing else to do
  };

  // ---------- Styles ----------
  const posStyle =
    side === "left"
      ? { left: 16, top }
      : { right: 16, top };

  return (
    <div className="hidden md:block">
      {/* Collapsed pill (draggable) */}
      {collapsed && (
        <div
          ref={wrapRef}
          style={{ position: "fixed", zIndex: 2500, ...posStyle }}
          className="cursor-grab active:cursor-grabbing select-none"
          onMouseDown={beginDrag}
          onTouchStart={beginDrag}
        >
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Open focus timer"
            className="
              bg-neutral-900/85 text-white shadow-lg backdrop-blur
              rounded-full px-3 py-2
              flex items-center gap-2
              min-w-[112px] justify-center
              hover:bg-neutral-900/95 transition
            "
          >
            <span className="inline-flex items-center justify-center w-5">
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </span>
            <span className="font-medium tabular-nums">{mmss(remainingMs)}</span>
          </button>
        </div>
      )}

      {/* Expanded card (draggable by header row) */}
      {!collapsed && (
        <div
          ref={wrapRef}
          style={{ position: "fixed", zIndex: 2500, ...posStyle }}
          className="w-[280px]"
        >
          <Card className="rounded-2xl shadow-xl border-0" bodyStyle={{ padding: 14 }}>
            {/* Drag handle / header */}
            <div
              className="flex items-start justify-between cursor-grab active:cursor-grabbing"
              onMouseDown={beginDrag}
              onTouchStart={beginDrag}
            >
              <div>
                <div className="text-[13px] text-neutral-500">Focus timer</div>
                <div className="text-2xl font-bold tabular-nums">{mmss(remainingMs)}</div>
              </div>
              <div className="flex items-center gap-1">
                {/* Minimize */}
                <button
                  aria-label="Minimize timer"
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-neutral-100"
                >
                  <X className="w-4 h-4 text-neutral-600" />
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-3">
              <Segmented
                size="small"
                options={presets.map((p) => ({ label: p.label, value: p.value }))}
                value={totalMs}
                onChange={(v) => onPreset(v)}
              />
            </div>

            {/* Controls */}
            <div className="mt-3 flex items-center gap-2">
              {!running ? (
                <Button type="primary" className="rounded-xl" onClick={start}>
                  <Play className="w-4 h-4 mr-1" /> Start
                </Button>
              ) : (
                <Button className="rounded-xl" onClick={pause}>
                  <Pause className="w-4 h-4 mr-1" /> Pause
                </Button>
              )}
              <Button onClick={reset} className="rounded-xl" icon={<TimerReset className="w-4 h-4" />}>
                Reset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
