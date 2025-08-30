// src/pages/student/ReadingScreen.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography } from "antd";
import { ArrowLeft } from "lucide-react";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";

const { Title, Text } = Typography;

function Tile({ img, title, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left" aria-label={title}>
      <Card
        hoverable
        className="rounded-2xl border-0 !p-0 overflow-hidden shadow-sm"
        bodyStyle={{ padding: 0 }}
      >
        <img
          src={img}
          alt={title}
          className="w-full h-36 object-cover"
          loading="eager"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "https://via.placeholder.com/800x360.png?text=Reading";
          }}
        />
        <div className="px-3 py-3">
          <div className="font-semibold">{title}</div>
        </div>
      </Card>
    </button>
  );
}

const stock = {
  camera:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format&fit=crop",
  book:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80&auto=format&fit=crop",
  quiz:
    "https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=800&q=80&auto=format&fit=crop",
};

// simple student-tone → gradient classes for mobile hero
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
      {/* ============ Mobile hero (client style) ============ */}
      <div className="md:hidden mb-4">
        <div className={`rounded-3xl overflow-hidden bg-gradient-to-b ${heroGrad} p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <button
              className="p-2 rounded-full hover:bg-white/60 active:scale-95"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Title level={4} className="!mb-0">
              Reading Practice
            </Title>
          </div>

          <div className="rounded-2xl bg-white/70 p-3 flex items-center gap-3 mb-4">
            <BuddyAvatar src={buddy?.avatar} size={56} />
            <div className="min-w-0">
              <div className="font-semibold truncate">Hello, {name}! 👋</div>
              <Text type="secondary" className="block">
                Choose an activity to improve your reading.
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <Tile
              img={stock.camera}
              title="Read Aloud"
              onClick={() => navigate("/student/reading/read-aloud")}
            />
            <Tile
              img={stock.book}
              title="AI Reading Text"
              onClick={() => navigate("/student/reading/ai-text")}
            />
            <div className="col-span-2">
              <Tile
                img={stock.quiz}
                title="Reading Quiz"
                onClick={() => navigate("/student/reading/quiz")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============ Desktop: header + clean card grid ============ */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 mb-4">
          <BuddyAvatar src={buddy?.avatar} size={56} />
          <div>
            <Title level={4} className="!mb-0">
              Reading Practice
            </Title>
            <Text type="secondary">Pick an activity to begin.</Text>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-4xl">
          <Tile
            img={stock.camera}
            title="Read Aloud"
            onClick={() => navigate("/student/reading/read-aloud")}
          />
          <Tile
            img={stock.book}
            title="AI Reading Text"
            onClick={() => navigate("/student/reading/ai-text")}
          />
          <Tile
            img={stock.quiz}
            title="Reading Quiz"
            onClick={() => navigate("/student/reading/quiz")}
          />
        </div>
      </div>
    </div>
  );
}
