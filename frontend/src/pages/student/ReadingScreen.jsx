// src/pages/student/ReadingScreen.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "antd";
import BackButton from "@/components/student/common/BackButton.jsx";
import CardTile from "@/components/student/common/CardTile.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";

const { Title } = Typography;

const STOCK = {
  camera:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format&fit=crop",
  book:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80&auto=format&fit=crop",
  quiz:
    "https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=800&q=80&auto=format&fit=crop",
};

const OPTIONS = [
  { key: "read-aloud", title: "Read Aloud", img: STOCK.camera, to: "/student/reading/read-aloud" },
  { key: "ai-text", title: "AI Reading Text", img: STOCK.book, to: "/student/reading/ai-text" },
  { key: "quiz", title: "Reading Quiz", img: STOCK.quiz, to: "/student/reading/quiz" },
];

const HERO_GRAD_BY_TONE = {
  indigo: "from-indigo-50 to-sky-100",
  sky: "from-sky-100 to-indigo-100",
  emerald: "from-emerald-50 to-sky-100",
  orange: "from-orange-50 to-amber-100",
  pink: "from-pink-50 to-rose-100",
};

export default function ReadingScreen() {
  const navigate = useNavigate();
  const { state } = useStudentApp();
  const { user } = useAuthContext();

  const buddy = state?.buddy;
  const name = useMemo(() => {
    const fromProfile = state?.profile?.name;
    const fromUser =
      user?.first_name ||
      user?.name ||
      (user?.email ? user.email.split("@")[0] : null);
    return fromProfile || fromUser || "Student";
  }, [state?.profile?.name, user]);

  const studentTone =
    state?.colorTheme || state?.profile?.theme || buddy?.theme || "sky";
  const heroGrad = HERO_GRAD_BY_TONE[studentTone] || HERO_GRAD_BY_TONE.sky;

  return (
    <div className="px-3 md:px-6 py-4">
      {/* ============ Mobile hero ============ */}
      <div className="md:hidden mb-4">
        <div className={`rounded-3xl overflow-hidden p-5`}>
          <div className="relative mb-3">
            <BackButton className="absolute left-0 top-0 p-2 rounded-full hover:bg-white/60 active:scale-95" />
            <Title level={4} className="!mb-0 text-center">Reading Practice</Title>
          </div>

          <GreetingBanner
            title={`Hello, ${name}! 👋`}
            subtitle="Choose an activity to improve your reading."
            className="mb-4"
            translucent
          />

          <div className="grid grid-cols-2 gap-3 mt-2">
            {OPTIONS.slice(0, 2).map((opt) => (
              <CardTile
                key={opt.key}
                img={opt.img}
                title={opt.title}
                onClick={() => navigate(opt.to)}
              />
            ))}
            <div className="col-span-2">
              <CardTile
                img={OPTIONS[2].img}
                title={OPTIONS[2].title}
                onClick={() => navigate(OPTIONS[2].to)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============ Desktop: header + clean card grid ============ */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 pt-6 mb-4">
          <div className="shrink-0">
            <BackButton
              className="p-2 rounded-full hover:bg-black/5 active:scale-95"
              aria-label="Back"
            />
          </div>

          <div className="flex-1">
      <GreetingBanner
        title="Reading Practice"                 // ✅ fix: was invalid JSX
        subtitle="Pick an activity to begin."
        className="!bg-white"
        translucent={false}
        
      />
    </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-4xl">
          {OPTIONS.map((opt) => (
            <CardTile
              key={opt.key}
              img={opt.img}
              title={opt.title}
              onClick={() => navigate(opt.to)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
