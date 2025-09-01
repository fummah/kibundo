// /src/hooks/useTaskTimer.js
import { useEffect, useRef, useState } from "react";
import { logTaskEvent } from "@/api/track.js";

/**
 * useTaskTimer(taskId, meta, autoStart)
 * - Tracks elapsed time per task (stopwatch).
 * - Persists state to localStorage.
 * - Emits analytics events (start/pause/resume/completed/reset/abandon).
 * - Safe BroadcastChannel usage + StrictMode-safe abandon logic.
 */
export function useTaskTimer(taskId, meta = {}, autoStart = true) {
  const [running, setRunning] = useState(false);
  const [accum, setAccum] = useState(0);
  const [startAt, setStartAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const tickRef = useRef(null);
  const chanRef = useRef(null);
  const chanOpenRef = useRef(false);
  const finalizedRef = useRef(false); // prevents “abandon” after “completed”
  const mountedRef = useRef(false);

  const key = `task_timer_v1:${taskId}`;

  // ---------- Hydrate + open sync channel ----------
  useEffect(() => {
    mountedRef.current = true;

    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      const sAccum = Number(saved.accum) || 0;
      const sRunning = Boolean(saved.running);
      const sStartAt = Number(saved.startAt) || null;

      setAccum(sAccum);

      if (sRunning && sStartAt) {
        setRunning(true);
        setStartAt(sStartAt);
        setElapsedMs(sAccum + (Date.now() - sStartAt));
      } else if (autoStart) {
        const now = Date.now();
        setRunning(true);
        setStartAt(now);
        setElapsedMs(sAccum); // start from saved accum (usually 0)
        logTaskEvent({ taskId, status: "started", ms: 0, meta });
      } else {
        setElapsedMs(sAccum);
      }
    } catch {}

    try {
      const ch = new BroadcastChannel(`tt:${taskId}`);
      chanRef.current = ch;
      chanOpenRef.current = true;
    } catch {}

    return () => {
      mountedRef.current = false;
      if (chanRef.current) {
        try { chanRef.current.close(); } catch {}
      }
      chanOpenRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // ---------- Persist + derive elapsed ----------
  useEffect(() => {
    // derive elapsed from source of truth (accum + delta)
    const total = running && startAt ? accum + (Date.now() - startAt) : accum;
    setElapsedMs(total);
    try {
      localStorage.setItem(key, JSON.stringify({ running, accum, startAt }));
    } catch {}
  }, [running, accum, startAt, key]);

  // ---------- Ticking (recompute from wall clock, no drift) ----------
  useEffect(() => {
    clearInterval(tickRef.current);
    if (running) {
      tickRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setElapsedMs(accum + (Date.now() - (startAt || Date.now())));
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [running, accum, startAt]);

  // ---------- Safe channel send ----------
  const safeSend = (msg) => {
    const ch = chanRef.current;
    if (!ch || !chanOpenRef.current) return;
    try { ch.postMessage(msg); } catch {}
  };

  // ---------- Controls ----------
  const start = () => {
    if (running) return;
    const now = Date.now();
    setStartAt(now);
    setRunning(true);
    safeSend({ t: "resumed" });
    logTaskEvent({ taskId, status: "resumed", ms: accum, meta });
  };

  const pause = () => {
    if (!running) return;
    const stopAt = Date.now();
    const newAccum = accum + (stopAt - (startAt || stopAt));
    setAccum(newAccum);
    setStartAt(null);
    setRunning(false);
    safeSend({ t: "paused" });
    logTaskEvent({ taskId, status: "paused", ms: newAccum, meta });
  };

  const reset = () => {
    setRunning(false);
    setStartAt(null);
    setAccum(0);
    setElapsedMs(0);
    finalizedRef.current = false;
    safeSend({ t: "reset" });
    logTaskEvent({ taskId, status: "reset", ms: 0, meta });
  };

  const flush = (status = "completed") => {
    const ms = running && startAt ? accum + (Date.now() - startAt) : accum;
    setRunning(false);
    setStartAt(null);
    setAccum(ms);
    finalizedRef.current = true; // prevent abandon on unmount
    safeSend({ t: "flush", status, ms });
    logTaskEvent({ taskId, status, ms, meta });
    return ms;
  };

  // ---------- Best-effort on unmount: record abandon (StrictMode-safe) ----------
  useEffect(() => {
    return () => {
      if (finalizedRef.current) return;
      const ms = running && startAt ? accum + (Date.now() - startAt) : accum;
      if (ms > 0) {
        try { logTaskEvent({ taskId, status: "abandon", ms, meta }); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, startAt, accum, taskId]);

  return { running, elapsedMs, start, pause, reset, flush };
}
