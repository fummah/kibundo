import { useState } from "react";
import { Card, Typography, Button } from "antd";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

const { Title, Text } = Typography;

// Dummy internet images
const BUDDIES = [
  { id: "m1", name: "Milo", img: "https://placekitten.com/200/200", theme: { bg: "from-rose-50 to-amber-50" } },
  { id: "m2", name: "Lumi", img: "https://placekitten.com/201/200", theme: { bg: "from-sky-50 to-emerald-50" } },
  { id: "m3", name: "Zuzu", img: "https://placekitten.com/202/200", theme: { bg: "from-violet-50 to-fuchsia-50" } },
  { id: "m4", name: "Kiko", img: "https://placekitten.com/203/200", theme: { bg: "from-cyan-50 to-indigo-50" } },
  { id: "m5", name: "Pipa", img: "https://placekitten.com/204/200", theme: { bg: "from-lime-50 to-yellow-50" } },
  { id: "m6", name: "Nori", img: "https://placekitten.com/205/200", theme: { bg: "from-teal-50 to-sky-50" } },
];

export default function BuddySelect() {
  const navigate = useNavigate();
  const { buddy, setBuddy } = useStudentApp();
  const [selected, setSelected] = useState(buddy?.id || null);

  const choose = (b) => setSelected(b.id);
  const next = () => {
    const chosen = BUDDIES.find((x) => x.id === selected);
    setBuddy(chosen);
    navigate("/student/onboarding/interests");
  };

  const bg = BUDDIES.find((b) => b.id === selected)?.theme.bg || "from-white to-white";

  return (
    <div className={`px-3 md:px-6 py-4 bg-gradient-to-br ${bg} min-h-[100dvh]`}>
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">Choose your Buddy</Title>
      </div>

      <Text className="block mb-3 text-neutral-700">Pick a little monster friend to join your learning journey.</Text>

      <div className="grid grid-cols-2 gap-3">
        {BUDDIES.map((b) => (
          <button key={b.id} onClick={() => choose(b)} className="w-full">
            <Card
              className={`rounded-2xl border-2 ${selected === b.id ? "border-blue-500" : "border-transparent"} shadow-sm`}
              bodyStyle={{ padding: 14 }}
              hoverable
            >
              <div className="flex items-center gap-3">
                <BuddyAvatar src={b.img} size={64} />
                <div className="font-semibold">{b.name}</div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <Button type="primary" size="large" disabled={!selected} onClick={next} className="rounded-xl">
          Next
        </Button>
      </div>
    </div>
  );
}
