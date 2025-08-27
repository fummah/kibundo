import { Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

const { Title, Text } = Typography;

export default function WelcomeSuccess() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-white">
      {/* lightweight confetti style */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${(i * 13) % 100}%`,
              animationDelay: `${(i % 10) * 0.15}s`,
              background: ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#b892ff"][i % 5],
            }}
          />
        ))}
        <style>{`
          .confetti { position:absolute; top:-10px; width:8px; height:14px; border-radius:2px; animation:kib-fall 2.8s linear infinite; }
          @keyframes kib-fall { 0%{transform:translateY(-10px) rotate(0)} 100%{transform:translateY(120vh) rotate(540deg)} }
        `}</style>
      </div>

      <BuddyAvatar src={buddy?.img || "https://placekitten.com/200/202"} size={140} />
      <Title level={2} className="!mt-4 !mb-1 text-center">Great job!</Title>
      <Text className="text-center text-neutral-600">
        You’re all set. Let’s make homework calm and fun.
      </Text>
      <Button
        type="primary"
        size="large"
        className="rounded-xl mt-6"
        onClick={() => navigate("/student/home")}
      >
        Continue
      </Button>
    </div>
  );
}
