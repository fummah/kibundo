import { useEffect, useState } from "react";
import { Button, Typography } from "antd";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { markIntroSeen, markTourDone } from "./introFlags";

import globalBg from "@/assets/backgrounds/global-bg.png";
import intBack from "@/assets/backgrounds/int-back.png";
import buddyMascot from "@/assets/buddies/kibundo-buddy.png";

/* PNG icons */
import chatAgentIcon from "@/assets/mobile/icons/chat-agent.png";
import micIcon from "@/assets/mobile/icons/mic.png";
import speakerIcon from "@/assets/mobile/icons/speaker.png";

const { Text } = Typography;

export default function WelcomeIntro() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    markIntroSeen();
  }, []);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(
        "Hallo! Ich bin Kibundo. Gemeinsam machen wir Hausaufgaben entspannt und spielerisch."
      );
      u.lang = "de-DE";
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  };

  const next = () => navigate("/student/onboarding/welcome-tour");

  const skip = () => {
    markIntroSeen();
    markTourDone();
    navigate("/student/home");
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Backgrounds */}
      <div className="absolute inset-0 -z-10">
        <img
          src={globalBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        <img
          src={intBack}
          alt=""
          className="absolute bottom-0 left-0 w-full h-1/2 object-cover"
          draggable={false}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          className="p-2 rounded-full hover:bg-neutral-100"
          onClick={() => navigate(-1)}
          aria-label="Zurück"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-2 py-1 text-sm rounded-full hover:bg-neutral-100"
            onClick={skip}
          >
            Überspringen
          </button>
          <Button
            icon={<img src={speakerIcon} alt="Vorlesen" className="w-4 h-4 object-contain" />}
            onClick={speak}
            loading={speaking}
            className="rounded-full"
          >
            Vorlesen
          </Button>
        </div>
      </div>

      {/* Buddy + PNG bubble */}
      <div className="px-3 mt-2">
        <div className="relative min-h-[240px]">
          <img
            src={buddy?.img || buddyMascot}
            alt="Kibundo"
            className="w-[230px] drop-shadow-md select-none"
            draggable={false}
          />

          {/* Bubble as background using chat-agent.png */}
          <div
            className="absolute left-[150px] top-[8px] max-w-[75%] text-[#1b3a1b]"
            style={{
              backgroundImage: `url(${chatAgentIcon})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              width: 270,
              minHeight: 170,
              padding: "28px 24px 36px 26px",
              display: "flex",
              alignItems: "center",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,.12))",
            }}
            role="note"
            aria-label="Kibundo Nachricht"
          >
            <Text style={{ fontSize: 14, lineHeight: 1.3, display: "block" }}>
              Hallo! Ich bin Kibundo. <br />
              Gemeinsam machen wir Hausaufgaben entspannt und spielerisch.
            </Text>
          </div>
        </div>
      </div>

      {/* Decorative big mic */}
      <div className="absolute left-0 right-0 bottom-20 grid place-items-center">
        <div className="grid place-items-center w-16 h-16 rounded-full shadow-lg bg-[#ffb08f]">
          <img
            src={micIcon}
            alt="Mikrofon"
            className="w-7 h-7 object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom tab label (“Chat”) */}
      <div className="absolute left-0 right-0 bottom-10 px-6">
        <div className="mx-auto h-8 w-32 bg-white/90 rounded-t-2xl shadow-sm grid place-items-center">
          <div className="flex items-center gap-1">
            <img
              src={chatAgentIcon}
              alt="Chat"
              className="w-4 h-4 object-contain"
              draggable={false}
            />
            <span className="text-[13px] font-medium">Chat</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="absolute left-3 right-3 bottom-3">
        <Button
          type="primary"
          size="large"
          onClick={next}
          className="w-full rounded-full !bg-[#ff4d4f] !border-none !h-[52px] font-semibold"
        >
          Los geht’s
        </Button>
      </div>
    </div>
  );
}
