import { useState } from "react";
import { Card, Typography, Button } from "antd";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import HomeRibbon from "@/components/student/mobile/HomeRibbon";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";

import globalBg from "../../../assets/backgrounds/global-bg.png";
import intBack from "../../../assets/backgrounds/int-back.png";



const { Title, Text } = Typography;

// Dummy buddies
const BUDDIES = [
  { id: "m1", name: "Milo", img: "https://placekitten.com/200/200" },
  { id: "m2", name: "Lumi", img: "https://placekitten.com/201/200" },
  { id: "m3", name: "Zuzu", img: "https://placekitten.com/202/200" },
  { id: "m4", name: "Kiko", img: "https://placekitten.com/203/200" },
  { id: "m5", name: "Pipa", img: "https://placekitten.com/204/200" },
  { id: "m6", name: "Nori", img: "https://placekitten.com/205/200" },
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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* ---------- BACKGROUND ---------- */}
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

      {/* ---------- RIBBONS ---------- */}
      <HomeRibbon />
      <SettingsRibbon />

      {/* ---------- CONTENT ---------- */}
      <div className="relative px-4 py-6 flex flex-col min-h-[100dvh]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <button
            className="p-2 rounded-full hover:bg-neutral-100"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Title level={4} className="!mb-0">Wähle deinen Buddy</Title>
        </div>

        <Text className="block mb-4 text-neutral-700 text-center">
          Wähle einen kleinen Freund, der dich auf deiner Lernreise begleitet.
        </Text>

        {/* Buddy grid */}
        <div className="grid grid-cols-2 gap-4 flex-1">
          {BUDDIES.map((b) => {
            const isActive = selected === b.id;
            return (
              <button
                key={b.id}
                onClick={() => choose(b)}
                className="relative w-full text-center"
              >
                <Card
                  hoverable
                  className={`rounded-2xl shadow-sm transition ${
                    isActive ? "ring-2 ring-emerald-400" : ""
                  }`}
                  styles={{ body: { padding: 16 } }}
                >
                  <BuddyAvatar src={b.img} size={96} />
                  <div className="mt-3 font-semibold text-neutral-800">
                    {b.name}
                  </div>

                  {isActive && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1 shadow">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </Card>
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <div className="mt-8">
          <Button
            type="primary"
            size="large"
            disabled={!selected}
            onClick={next}
            className="rounded-xl w-full !bg-[#FF7900] !border-none text-[16px] font-bold"
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}
