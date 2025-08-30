// src/pages/student/HomeScreen.jsx
import { Typography, Card } from "antd";
import { useNavigate } from "react-router-dom";
import {
  BookOutlined,
  ReadOutlined,
  ProjectOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import ChatLayer from "@/components/student/ChatLayer.jsx";

const { Title, Text } = Typography;

/** Static, stable images (mobile only) */
const IMGS = {
  homework:
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
  practice:
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
  reading:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop",
  map:
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
};

/* ------------------------ MOBILE image tile ------------------------ */
function ImageTile({ img, title, onClick, cream = false }) {
  return (
    <button
      onClick={onClick}
      className="block text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-[0.98] transition"
      aria-label={title}
    >
      <Card
        hoverable
        className={`rounded-2xl border-0 !shadow-none ${cream ? "bg-amber-50" : "bg-neutral-100"}`}
        bodyStyle={{ padding: 0 }}
        cover={
          <img
            src={img}
            alt={title}
            className="w-full h-28 object-cover"
            loading="eager"
          />
        }
      >
        <div className="px-3 py-3">
          <div className="font-semibold text-neutral-900">{title}</div>
        </div>
      </Card>
    </button>
  );
}

/* ------------------------ DESKTOP icon card ------------------------ */
function IconTile({ icon, title, subtitle, onClick, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-100 text-indigo-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    orange: "bg-orange-100 text-orange-700",
  };
  const chip = tones[tone] || tones.indigo;
  return (
    <button type="button" onClick={onClick} aria-label={title} className="text-left w-full">
      <Card
        hoverable
        className="rounded-2xl overflow-hidden border-0 shadow-md bg-white/90 hover:shadow-lg transition"
        bodyStyle={{ padding: 0 }}
      >
        <div className="p-4 flex items-center gap-3 min-h-[108px]">
          <div className={`w-12 h-12 rounded-xl grid place-items-center text-xl shrink-0 ${chip}`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-neutral-900">{title}</div>
            {subtitle && <div className="text-xs text-neutral-500 mt-0.5">{subtitle}</div>}
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function HomeScreen() {
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

  return (
    <div className="px-3 md:px-6 py-4 bg-gradient-to-b from-white to-neutral-50 min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title
          level={4}
          onClick={() => navigate("/student/learning")}
          className="!mb-0 cursor-pointer hover:text-indigo-600 transition-colors"
          role="button"
          aria-label="Go to Learning"
        >
          Learn
        </Title>
      </div>

      {/* Buddy greeting */}
      <div className="flex items-start gap-3 mb-4">
        <BuddyAvatar src={buddy?.avatar} size={96} className="md:size-[112px]" />
        <div className="pt-1">
          <Title level={4} className="!mb-1">Hello, {name}!</Title>
          <Text className="text-neutral-600">What would you like to do today?</Text>
        </div>
      </div>

      {/* MOBILE: image tiles */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <ImageTile
          img={IMGS.homework}
          title="Homework"
          onClick={() => navigate("/student/homework")}
        />
       <ImageTile
  img={IMGS.practice}
  title="Subjects & Practice"
  cream
  onClick={() => navigate("/student/learning/subject/math")}
/>

        <ImageTile
          img={IMGS.reading}
          title="Reading"
          onClick={() => navigate("/student/reading")}
        />
        <ImageTile
          img={IMGS.map}
          title="Treasure Map"
          cream
          onClick={() => navigate("/student/map")}
        />
      </div>

      {/* DESKTOP: icon cards (no images) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <IconTile
          icon={<FileSearchOutlined />}
          title="Homework"
          subtitle="Scan worksheet, get help"
          tone="orange"
          onClick={() => navigate("/student/homework")}
        />
        <IconTile
          icon={<ReadOutlined />}
          title="Reading"
          subtitle="Read aloud, AI text, quiz"
          tone="sky"
          onClick={() => navigate("/student/reading")}
        />
       <IconTile
  icon={<BookOutlined />}
  title="Subjects & Practice"
  subtitle="Pick a subject and practice"
  tone="emerald"
  onClick={() => navigate("/student/learning/subject/math")}
/>

        <IconTile
          icon={<ProjectOutlined />}
          title="Treasure Map"
          subtitle="See your progress"
          tone="indigo"
          onClick={() => navigate("/student/map")}
        />
      </div>

      {/* Chat helper */}
      <div className="mt-3">
        <ChatLayer message="Tip: Try a quick practice set in your favorite subject!" tts={false} />
      </div>
    </div>
  );
}
