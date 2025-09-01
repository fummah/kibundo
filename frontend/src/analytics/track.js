// /src/api/track.js
const LS_KEY = "analytics_task_events_v1";
const API_URL = import.meta.env.VITE_API_URL || "";

/* utils */
function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function save(events) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(events.slice(-5000))); } catch {}
}
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtHMS(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  return (h>0? `${h}:${String(m).padStart(2,"0")}`: `${m}`)+`:${String(ss).padStart(2,"0")}`;
}

/* public API */
export async function logTaskEvent({ taskId, status, ms, meta = {} }) {
  const ev = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    taskId,
    status,                 // "started" | "paused" | "resumed" | "completed" | "reset" | "abandon"
    durationMs: Math.max(0, Math.floor(ms || 0)),
    meta,
    at: new Date().toISOString(),
  };
  const events = load();
  events.push(ev);
  save(events);

  if (API_URL) {
    try {
      fetch(`${API_URL}/analytics/task-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(ev),
      });
    } catch {}
  }
  return ev;
}

export async function fetchStudentRecentTasks(limit = 20) {
  const events = load().filter(e => e.status === "completed").sort((a,b)=>b.at.localeCompare(a.at));
  return events.slice(0, limit);
}

export async function fetchStudentDailyStats(days = 14) {
  const events = load().filter(e => e.status === "completed");
  const byDay = {};
  for (const e of events) {
    const day = e.at.slice(0,10);
    (byDay[day] ||= []).push(e.durationMs);
  }
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = todayStr(d);
    const arr = byDay[key] || [];
    const cnt = arr.length;
    const total = arr.reduce((a,b)=>a+b,0);
    const avg = cnt ? Math.round(total/cnt) : 0;
    const med = cnt ? arr.slice().sort((a,b)=>a-b)[Math.floor((cnt-1)/2)] : 0;
    out.push({
      day: key,
      tasks: cnt,
      totalMs: total,
      avgMs: avg,
      medianMs: med,
      avgHMS: fmtHMS(avg),
      medianHMS: fmtHMS(med),
      totalHMS: fmtHMS(total),
    });
  }
  return out.reverse();
}

export function clearAnalyticsLocal() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/* optional debug */
export function _debugGetEvents() {
  return load();
}
