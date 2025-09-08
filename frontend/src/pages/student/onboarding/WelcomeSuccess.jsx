import { Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

/* ✅ Backgrounds */
import globalBg from "../../../assets/backgrounds/global-bg.png";
import intBack from "../../../assets/backgrounds/int-back.png";

const { Title, Text } = Typography;

export default function WelcomeSuccess() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* ---------- BACKGROUND LAYERS ---------- */}
      <img
        src={globalBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-20"
        draggable={false}
      />
      <img
        src={intBack}
        alt=""
        className="absolute bottom-0 left-0 w-full h-1/2 object-cover pointer-events-none -z-10"
        draggable={false}
      />

      {/* ---------- CONFETTI ANIMATION (lightweight) ---------- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${(i * 13) % 100}%`,
              animationDelay: `${(i % 10) * 0.15}s`,
              background: ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#b892ff"][i % 5],
            }}
          />
        ))}
        <style>{`
          .confetti { 
            position: absolute; 
            top: -10px; 
            width: 8px; 
            height: 14px; 
            border-radius: 2px; 
            animation: kib-fall 2.8s linear infinite; 
          }
          @keyframes kib-fall { 
            0%   { transform: translateY(-10px) rotate(0) } 
            100% { transform: translateY(120vh) rotate(540deg) } 
          }
        `}</style>
      </div>

     {/* ---------- CONTENT ---------- */}
<div className="relative z-10 text-center">
  <div className="text-[22px] font-extrabold text-[#4D4D4D] mb-2">Erfolgreich</div>
  
  {/* Centered BuddyAvatar */}
  <div className="flex justify-center mt-4">
    <BuddyAvatar src={buddy?.img || "https://placekitten.com/200/202"} size={180} />
  </div>

  <Title level={3} className="!mt-6 !mb-2 text-[#82B400] font-extrabold">
    Glückwunsch
  </Title>
  <Text className="block text-neutral-700 max-w-md mx-auto leading-snug">
    Du hast den ersten Schritt gemacht, damit Dein Kind bei den Hausaufgaben Spaß hat und
    individuell auf seiner Lernreise von Kibundo begleitet wird.
  </Text>
  <Button
    type="primary"
    size="large"
    className="rounded-xl mt-8 !bg-[#FF7900] !border-none !px-10 !h-12 text-[16px] font-bold"
    onClick={() => navigate("/student/home")}
  >
    Weiter
  </Button>
</div>

    </div>
  );
}
