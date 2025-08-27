import { useNavigate } from "react-router-dom";
import { Card, Typography } from "antd";
import { ArrowLeft } from "lucide-react";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

const { Title, Text } = Typography;

function Tile({ img, title, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card hoverable className="rounded-2xl border-0 !p-0 overflow-hidden shadow-sm" bodyStyle={{ padding: 0 }}>
        <img src={img} alt={title} className="w-full h-36 object-cover" />
        <div className="px-3 py-3">
          <div className="font-semibold">{title}</div>
        </div>
      </Card>
    </button>
  );
}

const stock = {
  camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format&fit=crop",
  book: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80&auto=format&fit=crop",
  quiz: "https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=800&q=80&auto=format&fit=crop",
};

export default function ReadingScreen() {
  const navigate = useNavigate();

  return (
    <div className="px-3 md:px-6 py-4">
      {/* Mobile hero (like client) */}
      <div className="md:hidden mb-4">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100 to-indigo-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <button className="p-2 rounded-full hover:bg-white/60 active:scale-95" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Title level={4} className="!mb-0">Reading Practice</Title>
          </div>

          <div className="rounded-2xl bg-white/70 p-3 flex items-center gap-3 mb-3">
            <BuddyAvatar size={40} />
            <div>
              <div className="font-semibold">Let’s practice reading!</div>
              <Text type="secondary">Choose an activity below to improve your reading skills.</Text>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tile img={stock.camera} title="Read Aloud" onClick={() => navigate("/student/reading/read-aloud")} />
            <Tile img={stock.book} title="AI Reading Text" onClick={() => navigate("/student/reading/ai-text")} />
            <div className="col-span-2">
              <Tile img={stock.quiz} title="Reading Quiz" onClick={() => navigate("/student/reading/quiz")} />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop keeps current card grid */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 mb-3">
          <BuddyAvatar size={48} />
          <Title level={4} className="!mb-0">Reading Practice</Title>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-3xl">
          <Tile img={stock.camera} title="Read Aloud" onClick={() => navigate("/student/reading/read-aloud")} />
          <Tile img={stock.book} title="AI Reading Text" onClick={() => navigate("/student/reading/ai-text")} />
          <Tile img={stock.quiz} title="Reading Quiz" onClick={() => navigate("/student/reading/quiz")} />
        </div>
      </div>
    </div>
  );
}
