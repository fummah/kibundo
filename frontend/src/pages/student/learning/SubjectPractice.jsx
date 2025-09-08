import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  Typography,
  Tag,
  Button,
  Empty,
  message,
  Row,
  Col,
  Segmented,
  Divider,
  Dropdown,
} from "antd";
import { ArrowLeft, MoreVertical } from "lucide-react";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";

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

function PracticeCard({ item, color = "indigo", onStart }) {
  return (
    <Card
      hoverable
      className={`rounded-2xl border-0 shadow-sm hover:shadow-md transition ring-1 ${toneRing[color] || toneRing.indigo}`}
      bodyStyle={{ padding: 16 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs md:text-sm text-neutral-500 truncate">
            {item.topic} • {item.level}
          </div>
          <Title level={5} className="!mt-1 !mb-1 truncate">{item.title}</Title>
          <Text type="secondary" className="block">{item.desc}</Text>
          <div className="mt-2 flex items-center gap-2">
            <Tag color="blue">{item.est} min</Tag>
            <Tag color="gold">⭐ Good practice</Tag>
          </div>
        </div>
        <Button type="primary" onClick={onStart} className="rounded-xl whitespace-nowrap">
          Start
        </Button>
      </div>
    </Card>
  );
}

function SubjectTile({ code, active, onClick }) {
  const meta = SUBJECT_META[code];
  return (
    <Card
      hoverable
      onClick={onClick}
      className={`rounded-2xl border ${active ? "border-indigo-300 ring-2 ring-indigo-200" : "border-neutral-200"} transition`}
      bodyStyle={{ padding: 14 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{meta.title}</div>
          <div className="text-xs text-neutral-500">{meta.topics.length} topics</div>
        </div>
        <div
          className={[
            "w-8 h-8 rounded-lg",
            code === "math" && "bg-indigo-100",
            code === "science" && "bg-emerald-100",
            code === "tech" && "bg-sky-100",
            code === "german" && "bg-orange-100",
          ].filter(Boolean).join(" ")}
        />
      </div>
    </Card>
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
  const [difficulty, setDifficulty] = useState("Easy");
  const [topic, setTopic] = useState(meta.topics?.[0] || "");

  useEffect(() => {
    const prefs = loadPrefs();
    const saved = prefs[subject] || {};
    const validTopic = (t) => (meta.topics || []).includes(t) ? t : (meta.topics?.[0] || "");
    setDifficulty(saved.difficulty || "Easy");
    setTopic(validTopic(saved.topic));
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const DIFFICULTIES = ["Easy", "Medium", "Hard"];

  return (
    <div className="px-3 md:px-6 py-4 mx-auto w-full max-w-6xl">
      {/* Header */}
      <div className="flex items-center p-6 gap-2 mb-4">
        <button
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">{meta.title}</Title>
      </div>

      {/* Greeting */}
      <div className="mb-6">
        <GreetingBanner
          avatarSrc={buddy?.avatar}
          title={`Hello, ${name}!`}
          subtitle="Pick a subject, choose a topic, and try a quick practice."
          className="!bg-white p-6"
          translucent={false}
          titleClassName="text-[20px] md:text-[22px] font-bold"
          subtitleClassName="text-[15px] md:text-[16px]"
        />
      </div>

      {/* Subject Switcher */}
      <Card className="rounded-2xl border-0 shadow-sm mb-4">
        <Row gutter={[12, 12]} align="stretch">
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
      <Card className="rounded-2xl border-0 shadow-sm mb-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* ---------- Topic picker ---------- */}
            <div className="min-w-0">
              <Text type="secondary" className="block">Topic</Text>

              {/* Desktop: Segmented */}
              <div className="hidden md:block mt-1">
                <Segmented
                  size="middle"
                  value={topic}
                  onChange={(v) => setTopic(v)}
                  options={(meta.topics || []).map((t) => ({ label: t, value: t }))}
                />
              </div>

              {/* Mobile: Dropdown via kebab */}
              <div className="md:hidden mt-1">
                <div className="flex items-center gap-2">
                  <Tag className="!m-0" color="blue">{topic}</Tag>

                  <Dropdown
                    trigger={["click"]}
                    placement="bottomRight"
                    menu={{
                      items: (meta.topics || []).map((t) => ({
                        key: t,
                        label: (
                          <span className={t === topic ? "font-medium" : ""}>
                            {t}
                          </span>
                        ),
                        onClick: () => setTopic(t),
                      })),
                    }}
                  >
                    <Button
                      shape="circle"
                      className="!w-10 !h-10 flex items-center justify-center"
                      aria-label="Choose topic"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </Dropdown>
                </div>
              </div>
            </div>

            {/* ---------- Difficulty picker ---------- */}
            <div className="min-w-0">
              <Text type="secondary" className="block">Difficulty</Text>

              {/* Desktop: Segmented */}
              <div className="hidden md:block mt-1">
                <Segmented
                  size="middle"
                  value={difficulty}
                  onChange={(v) => setDifficulty(v)}
                  options={DIFFICULTIES}
                />
              </div>

              {/* Mobile: Dropdown via kebab */}
              <div className="md:hidden mt-1">
                <div className="flex items-center gap-2">
                  <Tag className="!m-0" color="gold">{difficulty}</Tag>

                  <Dropdown
                    trigger={["click"]}
                    placement="bottomRight"
                    menu={{
                      items: DIFFICULTIES.map((lvl) => ({
                        key: lvl,
                        label: (
                          <span className={lvl === difficulty ? "font-medium" : ""}>
                            {lvl}
                          </span>
                        ),
                        onClick: () => setDifficulty(lvl),
                      })),
                    }}
                  >
                    <Button
                      shape="circle"
                      className="!w-10 !h-10 flex items-center justify-center"
                      aria-label="Choose difficulty"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>

          <Divider className="!my-2" />
          <Text type="secondary" className="text-xs">
            Tip: Pick a topic you enjoy and start easy — we’ll build up from there.
          </Text>
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
