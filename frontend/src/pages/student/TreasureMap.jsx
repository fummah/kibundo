// src/pages/student/TreasureMap.jsx
import { useMemo, useState } from "react";
import { Card, Typography, Tag, Modal, Progress, Button } from "antd";
import { Crown, Lock, Map as MapIcon, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentStatsCard from "@/components/student/StudentStatsCard.jsx";

const { Title, Text } = Typography;

// Mock student progress (replace with API data)
const mockProfile = {
  stars: 27,
  xp: 1240,
  unlockedIds: ["island-1", "island-2", "island-3"], // gate by length
};

const ALL_AREAS = [
  {
    id: "island-1",
    name: "Starter Beach",
    img: "https://picsum.photos/seed/beach/400/260",
    skills: ["Focus", "Reading", "Math Basics"],
    tasks: ["Reading: Short story", "Math: 10 additions", "Quiz: 3 questions"],
    requiredStars: 0,
  },
  {
    id: "island-2",
    name: "Jungle of Numbers",
    img: "https://picsum.photos/seed/jungle/400/260",
    skills: ["Addition", "Subtraction", "Attention"],
    tasks: ["Math: 5 word problems", "Timer: 10 min focus", "Reading quiz"],
    requiredStars: 10,
  },
  {
    id: "island-3",
    name: "Robot City",
    img: "https://picsum.photos/seed/robot/400/260",
    skills: ["Logic", "Programming"],
    tasks: ["Patterns game", "If/Then cards", "Debug the steps"],
    requiredStars: 20,
  },
  {
    id: "island-4",
    name: "Crystal Library",
    img: "https://picsum.photos/seed/library/400/260",
    skills: ["Fluency", "Comprehension"],
    tasks: ["AI reading text", "Retell the story", "Vocabulary cards"],
    requiredStars: 30,
  },
  {
    id: "island-5",
    name: "Sky Labs",
    img: "https://picsum.photos/seed/lab/400/260",
    skills: ["Science", "Experiments"],
    tasks: ["Label the diagram", "Cause & effect", "Hypothesis game"],
    requiredStars: 40,
  },
  {
    id: "island-6",
    name: "Summit of Mastery",
    img: "https://picsum.photos/seed/mountain/400/260",
    skills: ["Accuracy", "Perseverance"],
    tasks: ["Mixed challenge set", "Focus 15 timer", "Buddy challenge"],
    requiredStars: 55,
  },
];

export default function TreasureMap() {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);

  const areas = useMemo(() => {
    return ALL_AREAS.map((a, idx) => {
      const unlocked = mockProfile.stars >= a.requiredStars;
      return { ...a, unlocked, index: idx + 1 };
    });
  }, []);

  const unlockedCount = areas.filter((a) => a.unlocked).length;
  const overallPct = Math.min(
    100,
    Math.round((unlockedCount / ALL_AREAS.length) * 100)
  );

  const startSuggested = (taskText = "") => {
    const t = taskText.toLowerCase();
    if (t.includes("ai reading") || t.includes("ai reading text")) {
      navigate("/student/reading/ai-text");
    } else if (t.includes("reading quiz") || t.includes("quiz")) {
      navigate("/student/reading/quiz");
    } else if (t.includes("reading")) {
      navigate("/student/reading");
    } else if (t.includes("word problem") || t.includes("math")) {
      navigate("/student/learning/subject/math");
    } else if (t.includes("timer") || t.includes("focus")) {
      navigate("/student/motivation"); // your focus timer page
    } else {
      // fallback to learning hub
      navigate("/student/learning");
    }
  };

  return (
    <div className="px-3 md:px-6 py-4 bg-gradient-to-b from-white to-neutral-50 min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapIcon className="w-6 h-6 opacity-70" />
          <Title level={4} className="!mb-0">
            Treasure Map
          </Title>
        </div>
        <div className="flex items-center gap-2">
          <Tag color="gold">
            <Crown className="inline w-4 h-4 mr-1" /> {mockProfile.stars} stars
          </Tag>
          <Tag color="blue">
            <Trophy className="inline w-4 h-4 mr-1" /> {mockProfile.xp} XP
          </Tag>
        </div>
      </div>

      {/* Top row: Student stats + overall progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Lightweight student stats (today time, streak, last subject) */}
        <StudentStatsCard />

        {/* Overall progress card */}
        <Card className="rounded-2xl border-0 shadow-md lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <Text type="secondary">Overall progress</Text>
              <Progress percent={overallPct} className="!mb-0" />
            </div>
            <Button
              type="primary"
              className="rounded-xl self-start md:self-auto"
              onClick={() => navigate("/student/learning")}
            >
              Continue Learning
            </Button>
          </div>
        </Card>
      </div>

      {/* Map grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {areas.map((a) => (
          <button
            key={a.id}
            className="text-left"
            onClick={() => a.unlocked && setActive(a)}
            disabled={!a.unlocked}
            aria-label={a.name}
          >
            <Card
              hoverable={a.unlocked}
              className={`rounded-2xl overflow-hidden border-0 shadow-sm ${
                a.unlocked ? "" : "opacity-60"
              }`}
              bodyStyle={{ padding: 0 }}
            >
              <div className="relative">
                <img
                  src={a.img}
                  alt={a.name}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
                {!a.unlocked && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white/90 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      <Lock className="w-4 h-4" /> Unlock at {a.requiredStars}★
                    </div>
                  </div>
                )}
                {a.unlocked && (
                  <div className="absolute top-2 left-2 bg-white/95 rounded-full px-2 py-0.5 text-xs shadow">
                    Area {a.index}
                  </div>
                )}
              </div>
              <div className="px-3 py-3">
                <div className="font-semibold text-neutral-900">{a.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.skills.slice(0, 3).map((s) => (
                    <Tag key={s} className="rounded-full">
                      {s}
                    </Tag>
                  ))}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      <Modal
        open={!!active}
        onCancel={() => setActive(null)}
        footer={null}
        title={active ? active.name : ""}
        className="rounded-2xl"
      >
        {active && (
          <div className="space-y-3">
            <img
              src={active.img}
              alt={active.name}
              className="w-full h-40 object-cover rounded-xl"
            />
            <div>
              <Text type="secondary">Key skills</Text>
              <div className="mt-1 flex flex-wrap gap-2">
                {active.skills.map((s) => (
                  <Tag key={s} className="rounded-full">
                    {s}
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <Text type="secondary">Suggested next steps</Text>
              <ul className="list-disc pl-5 mt-1">
                {active.tasks.map((t) => (
                  <li key={t} className="text-sm">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="primary"
                className="rounded-xl"
                onClick={() => {
                  // pick the first suggested task to route
                  const first = active.tasks?.[0] || "";
                  setActive(null);
                  startSuggested(first);
                }}
              >
                Start Activity
              </Button>
              <Button className="rounded-xl" onClick={() => setActive(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
