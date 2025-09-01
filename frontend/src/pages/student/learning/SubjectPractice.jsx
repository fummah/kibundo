import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Typography, Tag, Button, Empty, message, Row, Col, Space } from "antd";
import { ArrowLeft } from "lucide-react";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

const { Title, Text } = Typography;

const DUMMY_HERO =
  "https://images.unsplash.com/photo-1544717305-996b815c338c?auto=format&fit=crop&w=1200&q=80";

/* ---------- Subject meta ---------- */
const SUBJECT_META = {
  math: {
    title: "Math",
    color: "indigo",
    hero:
      "https://images.unsplash.com/photo-1520975922203-bc5e3b6c3d26?auto=format&fit=crop&w=1200&q=80",
    topics: ["Addition", "Subtraction", "Multiplication", "Division", "Fractions", "Word Problems"],
  },
  science: {
    title: "Science",
    color: "emerald",
    hero:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981d?auto=format&fit=crop&w=1200&q=80",
    topics: ["Plants", "Animals", "Forces", "Space", "Materials"],
  },
  tech: {
    title: "Technology & Programming",
    color: "sky",
    hero:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1200&q=80",
    topics: ["Computers", "Typing", "Scratch", "Logic", "Web Basics"],
  },
  german: {
    title: "German Language",
    color: "orange",
    hero:
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=1200&q=80",
    topics: ["Reading", "Vocabulary", "Grammar", "Spelling"],
  },
};
const SUBJECT_KEYS = Object.keys(SUBJECT_META);

/* ---------- Dummy practice bank ---------- */
const PRACTICE_BANK = {
  math: [
    { topic: "Addition", level: "Easy", est: 5, title: "Add to 20", desc: "Warm-up sums with number lines." },
    { topic: "Subtraction", level: "Easy", est: 6, title: "Take Away", desc: "Simple take-away with pictures." },
    { topic: "Multiplication", level: "Medium", est: 8, title: "Times Tables 2–5", desc: "Quick drills and games." },
    { topic: "Division", level: "Medium", est: 10, title: "Share Fair", desc: "Divide equally between groups." },
    { topic: "Fractions", level: "Hard", est: 12, title: "Pizza Fractions", desc: "Halves, thirds, quarters." },
    { topic: "Word Problems", level: "Medium", est: 10, title: "Story Math", desc: "Read, plan, solve." },
  ],
  science: [
    { topic: "Plants", level: "Easy", est: 6, title: "Parts of a Plant", desc: "Roots, stem, leaves, flower." },
    { topic: "Animals", level: "Easy", est: 6, title: "Living or Not?", desc: "Sort and explain why." },
    { topic: "Forces", level: "Medium", est: 8, title: "Push & Pull", desc: "What makes things move?" },
    { topic: "Space", level: "Medium", est: 10, title: "Our Solar System", desc: "Planets in order." },
    { topic: "Materials", level: "Hard", est: 12, title: "Solid or Liquid?", desc: "Group by properties." },
  ],
  tech: [
    { topic: "Computers", level: "Easy", est: 6, title: "Parts of a Computer", desc: "Match and label." },
    { topic: "Typing", level: "Easy", est: 5, title: "Home Row", desc: "Short, fun drills." },
    { topic: "Scratch", level: "Medium", est: 12, title: "Animate a Cat", desc: "Blocks & loops." },
    { topic: "Logic", level: "Medium", est: 10, title: "Patterns & Rules", desc: "Find what comes next." },
    { topic: "Web Basics", level: "Hard", est: 12, title: "Build a Page", desc: "Tags and layout." },
  ],
  german: [
    { topic: "Reading", level: "Easy", est: 6, title: "Short Sentences", desc: "Read aloud practice." },
    { topic: "Vocabulary", level: "Easy", est: 6, title: "Match Words", desc: "Picture–word pairs." },
    { topic: "Grammar", level: "Medium", est: 10, title: "Der/Die/Das", desc: "Articles mini-quiz." },
    { topic: "Spelling", level: "Medium", est: 8, title: "Missing Letters", desc: "Fill the blanks." },
  ],
};

const toneRing = {
  indigo: "ring-indigo-200",
  emerald: "ring-emerald-200",
  sky: "ring-sky-200",
  orange: "ring-orange-200",
};

function TopicChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm transition border ${
        active ? "bg-indigo-600 text-white border-indigo-600"
               : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}

function PracticeCard({ item, color = "indigo", onStart }) {
  return (
    <Card className={`rounded-2xl border-0 shadow-sm hover:shadow-md transition ring-1 ${toneRing[color] || toneRing.indigo}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">
            {item.topic} • {item.level}
          </div>
          <Title level={5} className="!mt-1 !mb-1">{item.title}</Title>
          <Text type="secondary">{item.desc}</Text>
          <div className="mt-2 flex items-center gap-2">
            <Tag color="blue">{item.est} min</Tag>
            <Tag color="gold">⭐ Good practice</Tag>
          </div>
        </div>
        <Button type="primary" onClick={onStart} className="rounded-xl">Start</Button>
      </div>
    </Card>
  );
}

function SubjectTile({ code, active, onClick }) {
  const meta = SUBJECT_META[code];
  const toneBg = {
    indigo: "bg-indigo-50",
    emerald: "bg-emerald-50",
    sky: "bg-sky-50",
    orange: "bg-orange-50",
  }[meta.color];

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-2xl border transition p-3 ${
        active ? "border-indigo-300 ring-2 ring-indigo-200" : "border-neutral-200 hover:border-neutral-300"
      } ${toneBg}`}
      aria-label={meta.title}
    >
      <div className="font-semibold">{meta.title}</div>
      <div className="text-xs text-neutral-500">{meta.topics.length} topics</div>
    </button>
  );
}

const LS_KEY = "student_learning_prefs_v1";
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};
const savePrefs = (prefs) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch {}
};

export default function SubjectPractice() {
  const navigate = useNavigate();
  const { subject: paramSubject } = useParams();
  const { state } = useStudentApp();
  const { user } = useAuthContext();

  const subject = SUBJECT_KEYS.includes(paramSubject || "") ? paramSubject : "math";
  const meta = SUBJECT_META[subject];
  const color = meta.color;

  const buddy = state?.buddy;

  const name = useMemo(() => {
    const fromProfile = state?.profile?.name;
    const fromUser =
      user?.first_name || user?.name || (user?.email ? user.email.split("@")[0] : null);
    return fromProfile || fromUser || "Student";
  }, [state?.profile?.name, user]);

  // prefs
  const [difficulty, setDifficulty] = useState("Easy"); // keep difficulty (you can remove if desired)
  const [topic, setTopic] = useState(meta.topics?.[0] || "");

  useEffect(() => {
    const prefs = loadPrefs();
    const saved = prefs[subject] || {};
    const validTopic = (t) => (meta.topics || []).includes(t) ? t : (meta.topics?.[0] || "");
    setDifficulty(saved.difficulty || "Easy");
    setTopic(validTopic(saved.topic));
    window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  useEffect(() => {
    const prefs = loadPrefs();
    prefs[subject] = { topic, difficulty };
    savePrefs(prefs);
  }, [subject, topic, difficulty]);

  const bank = PRACTICE_BANK[subject] || [];
  const filtered = bank.filter((it) => (!topic || it.topic === topic) && (!difficulty || it.level === difficulty));

  const startPractice = (it) => {
    message.success(`Starting: ${it.title}`);
    // navigate(`/student/learning/practice/start?subject=${subject}&topic=${it.topic}&level=${it.level}`);
  };

  return (
    <div className="px-3 md:px-6 py-4 mx-auto w-full max-w-6xl">
      {/* Back + Title */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">{meta.title}</Title>
      </div>

      {/* Greeting + Buddy */}
      <div className="flex items-start gap-3 mb-4">
        <BuddyAvatar src={buddy?.avatar} size={96} className="md:size-[112px]" />
        <div className="pt-1">
          <Title level={4} className="!mb-1">Hello, {name}!</Title>
          <Text type="secondary">Pick a subject, choose a topic, and try a quick practice.</Text>
        </div>
      </div>

      {/* Subject switcher */}
      <Card className="rounded-2xl border-0 shadow-sm mb-4">
        <Row gutter={[12, 12]} align="middle">
          {SUBJECT_KEYS.map((code) => (
            <Col key={code} xs={12} md={6}>
              <SubjectTile
                code={code}
                active={code === subject}
                onClick={() => navigate(`/student/learning/subject/${code}`)}
              />
            </Col>
          ))}
        </Row>
      </Card>

      {/* Hero (mobile only) */}
      <div className="rounded-2xl overflow-hidden mb-4 md:hidden">
        <img
          src={meta.hero || DUMMY_HERO}
          alt={`${meta.title} hero`}
          className="w-full h-40 object-cover"
          loading="eager"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DUMMY_HERO;
          }}
        />
      </div>

      {/* Controls */}
      <Card className="rounded-2xl border-0 shadow-sm mb-4">
        <div className="flex flex-col gap-3">
          {/* Topics */}
          <div className="flex flex-wrap gap-2">
            {(meta.topics || []).map((t) => (
              <TopicChip key={t} label={t} active={t === topic} onClick={() => setTopic(t)} />
            ))}
          </div>

          {/* (Optional) Difficulty — keep or remove as you wish */}
          <div className="flex flex-wrap items-center gap-2">
            <Text type="secondary">Difficulty:</Text>
            <Space wrap>
              {["Easy", "Medium", "Hard"].map((lvl) => (
                <Button
                  key={lvl}
                  size="small"
                  type={difficulty === lvl ? "primary" : "default"}
                  onClick={() => setDifficulty(lvl)}
                  className="rounded-full"
                >
                  {lvl}
                </Button>
              ))}
            </Space>
          </div>
        </div>
      </Card>

      {/* Practice list */}
      {filtered.length === 0 ? (
        <Empty
          description={<span>No practice found. Try a different topic or level.</span>}
          className="bg-white rounded-2xl border"
        />
      ) : (
        <Row gutter={[12, 12]}>
          {filtered.map((it, i) => (
            <Col key={`${it.title}-${i}`} xs={24} md={12}>
              <PracticeCard item={it} color={color} onStart={() => startPractice(it)} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
