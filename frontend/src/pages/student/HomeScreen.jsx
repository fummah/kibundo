// src/pages/student/HomeScreen.jsx
import { Card, Typography, List, Tag, Button, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import {
  BookOutlined,
  ReadOutlined,
  ProjectOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
// ⛔️ Removed local MotivationTimer import — global chip handles persistence
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";

const { Title, Text } = Typography;

/* ---------------- Theme helpers ---------------- */
const TONE_ICON_BG = {
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  orange: "bg-orange-100 text-orange-700",
  pink: "bg-pink-100 text-pink-700",
};
const ACCENT_HEX = {
  indigo: "#4f46e5",
  emerald: "#10b981",
  sky: "#0ea5e9",
  orange: "#f59e0b",
  pink: "#ec4899",
};

/* ---------- Desktop tile ---------- */
function BigTile({ icon, title, subtitle, onClick, tone = "indigo", className = "" }) {
  const chip = TONE_ICON_BG[tone] || TONE_ICON_BG.indigo;
  return (
    <button onClick={onClick} className={`text-left w-full ${className}`} aria-label={title}>
      <Card hoverable className="rounded-2xl overflow-hidden border-0 shadow-md bg-white/90">
        <div className="flex items-center gap-3 p-4">
          <div className={`w-12 h-12 rounded-xl grid place-items-center text-xl ${chip}`}>
            {icon}
          </div>
          <div>
            <div className="font-semibold text-neutral-900">{title}</div>
            {subtitle && <div className="text-xs text-neutral-500">{subtitle}</div>}
          </div>
        </div>
      </Card>
    </button>
  );
}

/* ---------- Mobile square tile ---------- */
function MobileTile({ title, tone = "neutral", onClick }) {
  const bg =
    tone === "cream"
      ? "bg-amber-50 border-amber-100"
      : "bg-neutral-100 border-neutral-200";
  return (
    <button
      onClick={onClick}
      aria-label={title}
      className={`rounded-2xl ${bg} border w-full h-[108px] active:scale-[0.98] transition grid place-items-center`}
    >
      <span className="font-semibold text-[15px] text-neutral-800 text-center">
        {title}
      </span>
    </button>
  );
}

/* ---------- Helpers for desktop widgets ---------- */
const PREFS_KEY = "student_learning_prefs_v1";
const STREAK_KEY = "student_streak_v1";

function getLastPracticePref() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    const subject = Object.keys(prefs)[0];
    if (!subject) return null;
    const { topic, difficulty } = prefs[subject] || {};
    return { subject, topic, difficulty };
  } catch {
    return null;
  }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  return Math.round((d2 - d1) / 86400000);
}

/* ---------- Streak Chip ---------- */
function StreakChip() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    try {
      const t = todayStr();
      const raw = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
      if (!raw.last) {
        localStorage.setItem(STREAK_KEY, JSON.stringify({ last: t, count: 1 }));
        setCount(1);
        return;
      }
      if (raw.last === t) {
        setCount(raw.count || 1);
        return;
      }
      const diff = daysBetween(raw.last, t);
      const next = diff === 1 ? (raw.count || 1) + 1 : 1;
      localStorage.setItem(STREAK_KEY, JSON.stringify({ last: t, count: next }));
      setCount(next);
    } catch {
      setCount(1);
    }
  }, []);

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-100">
      🔥 {count}-day streak
    </span>
  );
}

/* ---------- Sample data for desktop widgets ---------- */
const TODAY_TASKS = [
  { id: 1, subject: "Math", title: "7-times table", due: "Today", tag: "Practice" },
  { id: 2, subject: "German", title: "Read two pages", due: "Today", tag: "Reading" },
  { id: 3, subject: "Science", title: "Planet facts quiz", due: "Tomorrow", tag: "Quiz" },
];

const RECENT = [
  { id: "a", label: "Reading quiz • 4/5 correct", when: "20m ago" },
  { id: "b", label: "Math practice • Multiplication (10 min)", when: "Yesterday" },
  { id: "c", label: "Homework scan started", when: "2 days ago" },
];

/* ---------- Focus Session controller (talks to GlobalFocusTimer) ---------- */
function FocusSessionCard({ accent = "#4f46e5", onOpenMotivation }) {
  // fire commands that a global listener (GlobalFocusTimer) will handle
  const send = (cmd, payload = {}) => {
    try {
      window.dispatchEvent(
        new CustomEvent("kibundo-focus-control", { detail: { cmd, ...payload } })
      );
    } catch {}
  };

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Title level={4} className="!mb-1">Focus session</Title>
          <Text type="secondary">
            Starts a timer that keeps running across pages. You’ll be notified when time is up — take a short break!
          </Text>

          <div className="mt-3 flex flex-wrap gap-2">
            {[10, 15, 20, 25].map((m) => (
              <Button
                key={m}
                size="small"
                className="rounded-full"
                onClick={() => send("start", { minutes: m })}
                style={{ borderColor: accent, color: accent }}
              >
                {m} min
              </Button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button onClick={() => send("pause")} className="rounded-xl">Pause</Button>
            <Button onClick={() => send("resume")} className="rounded-xl">Resume</Button>
            <Button onClick={() => send("reset")} danger className="rounded-xl">Reset</Button>
          </div>
        </div>

        <div className="shrink-0">
          <Button
            type="primary"
            className="rounded-xl"
            style={{ background: accent }}
            onClick={onOpenMotivation}
          >
            Open Motivation
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { state } = useStudentApp();
  const { user } = useAuthContext();
  const buddy = state?.buddy;

  // student name
  const name = useMemo(() => {
    const fromProfile = state?.profile?.name;
    const fromUser =
      user?.first_name ||
      user?.name ||
      (user?.email ? user.email.split("@")[0] : null);
    return fromProfile || fromUser || "Student";
  }, [state?.profile?.name, user]);

  // student theme (color)
  const studentTone =
    state?.colorTheme || state?.profile?.theme || buddy?.theme || "indigo";
  const accent = ACCENT_HEX[studentTone] || ACCENT_HEX.indigo;

  const last = getLastPracticePref();

  return (
    <div className="px-0 md:px-6 py-0 md:py-4">
      {/* ===================== MOBILE (unchanged) ===================== */}
      <div className="md:hidden">
        <div className="min-h-[100dvh] bg-white flex flex-col">
          {/* Buddy hero */}
          <div className="px-5 pt-6">
            <BuddyAvatar src={buddy?.avatar} size={150} className="mx-auto" />
            <div className="mt-3 text-center">
              <Title level={4} className="!mb-0">Welcome back, {name}!</Title>
              <Text type="secondary">What would you like to do today?</Text>
            </div>
          </div>

          {/* 2×2 grid */}
          <div className="px-5 mt-10 grid grid-cols-2 gap-3">
            <MobileTile title="Homework" onClick={() => navigate("/student/homework")} />
            <MobileTile
              title="Subjects & Practice"
              tone="cream"
              onClick={() => navigate("/student/learning")}
            />
            <MobileTile title="Reading" onClick={() => navigate("/student/reading")} />
            <MobileTile title="Treasure Map" tone="cream" onClick={() => navigate("/student/map")} />
          </div>

          {/* Bottom bar */}
          <div className="mt-auto px-5 pb-6 pt-5 flex items-center justify-between text-[12px] text-neutral-600">
            <button
              onClick={() => navigate("/student/settings")}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white shadow-sm"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <div className="font-medium">Chat layer</div>
            <div className="w-6" />
          </div>
        </div>
      </div>

      {/* ===================== DESKTOP ===================== */}
      <div className="hidden md:block">
        {/* Greeting + streak */}
        <div className="flex items-center gap-4 mb-4">
          <BuddyAvatar src={buddy?.avatar} size={96} className="md:size-[112px]" />
          <div className="flex items-start gap-3">
            <div>
              <Title level={3} className="!mb-0">Hi there, {name}!</Title>
              <Text type="secondary">Ready for today’s mission?</Text>
            </div>
            <StreakChip />
          </div>
        </div>

        {/* Primary shortcuts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <BigTile
            tone={studentTone}
            icon={<FileSearchOutlined />}
            title="Homework"
            subtitle="Scan worksheet, get help"
            onClick={() => navigate("/student/homework")}
          />
          <BigTile
            tone="sky"
            icon={<ReadOutlined />}
            title="Reading"
            subtitle="Read aloud, AI text, quiz"
            onClick={() => navigate("/student/reading")}
          />
          <BigTile
            tone="emerald"
            icon={<BookOutlined />}
            title="Subjects & Practice"
            subtitle="Pick a subject and practice"
            onClick={() => navigate("/student/learning")}
          />
          <BigTile
            tone="orange"
            icon={<ProjectOutlined />}
            title="Treasure Map"
            subtitle="See your progress"
            onClick={() => navigate("/student/map")}
          />
        </div>

        {/* Interactive row: Continue Learning • Focus session (global) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Continue learning */}
          <Card className="rounded-2xl border-0 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Title level={4} className="!mb-1">Continue learning</Title>
                <Text type="secondary">
                  {last
                    ? `Last subject: ${last.subject} • ${last.topic || "topic"} • ${last.difficulty || "Easy"}`
                    : "Pick a subject to get started."}
                </Text>
              </div>
              <div className="shrink-0">
                <Button
                  type="primary"
                  className="rounded-xl"
                  style={{ background: accent }}
                  onClick={() =>
                    navigate(
                      last
                        ? `/student/learning/subject/${last.subject}`
                        : "/student/learning"
                    )
                  }
                >
                  {last ? "Resume" : "Choose subject"}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["math", "science", "tech", "german"].map((s) => (
                <Button
                  key={s}
                  size="small"
                  className="rounded-full"
                  onClick={() => navigate(`/student/learning/subject/${s}`)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </Card>

          {/* Focus session controls (talks to persistent GlobalFocusTimer) */}
          <FocusSessionCard
            accent={accent}
            onOpenMotivation={() => navigate("/student/motivation")}
          />

          {/* (Optional) Keep a third widget space — you can add something else later */}
          <Card className="rounded-2xl border-0 shadow-md">
            <Title level={5} className="!mb-1">Quick tips</Title>
            <Text type="secondary">
              Try a 10–15 minute focus block, then take a short break. Consistency beats cramming!
            </Text>
          </Card>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-0 shadow-md">
            <Title level={5} className="!mb-2">Today’s tasks</Title>
            <List
              itemLayout="horizontal"
              dataSource={TODAY_TASKS}
              locale={{ emptyText: <Empty description="No tasks yet" /> }}
              renderItem={(it) => (
                <List.Item className="!px-0">
                  <List.Item.Meta
                    title={
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{it.title}</span>
                        <Tag color={it.due === "Today" ? "green" : "gold"}>{it.due}</Tag>
                      </div>
                    }
                    description={
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Tag color="blue">{it.subject}</Tag>
                        <span>{it.tag}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <Title level={5} className="!mb-2">Recent activity</Title>
            <List
              dataSource={RECENT}
              renderItem={(it) => (
                <List.Item className="!px-0">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm">{it.label}</span>
                    <span className="text-xs text-neutral-500">{it.when}</span>
                  </div>
                </List.Item>
              )}
            />
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <div className="flex items-start gap-3">
              <BuddyAvatar src={buddy?.avatar} size={56} />
              <div>
                <Title level={5} className="!mb-1">Buddy tip</Title>
                <Text type="secondary">
                  Break big tasks into small steps. Start a short timer, do one step, then celebrate the win!
                </Text>
                <div className="mt-3">
                  <Button
                    size="small"
                    className="rounded-full"
                    onClick={() => navigate("/student/motivation")}
                    style={{ borderColor: accent, color: accent }}
                  >
                    Open Motivation
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
