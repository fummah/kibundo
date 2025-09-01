// src/components/student/StudentStatsCard.jsx
import { useEffect, useMemo, useState } from "react";
import { Card, Typography, Tag } from "antd";

const { Text } = Typography;

const STREAK_KEY = "student_streak_v1";
const PREFS_KEY = "student_learning_prefs_v1";

/** Lightweight card for /student/map */
export default function StudentStatsCard() {
  const [todayMs, setTodayMs] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastSubject, setLastSubject] = useState("—");

  useEffect(() => {
    // streak
    try {
      const raw = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
      setStreak(raw.count || 0);
    } catch { setStreak(0); }

    // last subject from prefs
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      const subject = Object.keys(prefs)[0];
      setLastSubject(subject ? subject[0].toUpperCase() + subject.slice(1) : "—");
    } catch { setLastSubject("—"); }

    // best-effort: sum today from a dev buffer (adjust to your track.js key if different)
    try {
      const rawBuf = JSON.parse(localStorage.getItem("analytics_events_v1") || "[]");
      const dayStart = new Date(); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(); dayEnd.setHours(23,59,59,999);
      const f = dayStart.getTime(), t = dayEnd.getTime();
      const total = rawBuf
        .filter(e => e.type === "task" && ["completed","abandon"].includes(e.status) && (e.ts || e.time || 0) >= f && (e.ts || e.time || 0) <= t)
        .reduce((acc, e) => acc + (e.ms || 0), 0);
      setTodayMs(total);
    } catch { setTodayMs(0); }
  }, []);

  const hhmm = useMemo(() => {
    const total = Math.floor(todayMs / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }, [todayMs]);

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="text-neutral-500">Focus today</div>
          <div className="text-lg font-semibold">{hhmm} h</div>
        </div>
        <div className="text-sm">
          <div className="text-neutral-500">Streak</div>
          <div className="font-semibold">{streak} days</div>
        </div>
        <div className="text-sm">
          <div className="text-neutral-500">Last subject</div>
          <Tag className="rounded-full">{lastSubject}</Tag>
        </div>
      </div>
    </Card>
  );
}
