// src/pages/student/onboarding/WelcomeTour.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Typography } from "antd";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { markIntroSeen, markTourDone } from "./introFlags";

/* Backgrounds like HomeworkStart */
import buddyImg from "@/assets/buddies/kibundo-buddy.png";
import treesBg from "@/assets/backgrounds/trees.png";
import waterBg from "@/assets/backgrounds/water.png";

/* Icons & bubble */
import chatAgentIcon from "@/assets/mobile/icons/chat-agent.png";
import micIcon from "@/assets/mobile/icons/mic.png";
import speakerIcon from "@/assets/mobile/icons/speaker.png";

const { Text } = Typography;

const Halo = ({ children, active }) => (
  <div className={`relative inline-grid place-items-center ${active ? "animate-[pulse_1.6s_ease-in-out_infinite]" : ""}`}>
    <div className={`absolute inset-[-10px] rounded-full ${active ? "ring-2 ring-[#ff4d4f]/70" : "ring-0"}`} />
    {children}
  </div>
);

export default function WelcomeTour() {
  const navigate = useNavigate();
  const { buddy } = useStudentApp();

  const micRef = useRef(null);
  const chatRef = useRef(null);
  const homeRef = useRef(null);

  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      { id: "welcome", text: "Welcome! I'm your learning buddy. I'll briefly show you how everything works." },
      { id: "voice",   text: "Tap the microphone to talk to me and tell me what you need help with.", anchor: "mic" },
      { id: "chat",    text: "This is the chat. We can write and exchange pictures here.", anchor: "chat" },
      { id: "home",    text: "This takes you home where you start tasks and adventures.", anchor: "home" },
      { id: "done",    text: "All set! Let’s go 🎉" },
    ],
    []
  );

  const current = steps[step];

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(current.text);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    markIntroSeen();
    speak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const onSkip = () => {
    markTourDone();
    navigate("/student/home");
  };
  const onNext = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else {
      markTourDone();
      navigate("/student/onboarding/buddy");
    }
  };
  const onBack = () => {
    if (step === 0) return navigate(-1);
    setStep((s) => s - 1);
  };

  const haloActive = {
    mic: current.anchor === "mic",
    chat: current.anchor === "chat",
    home: current.anchor === "home",
  };

  return (
    <div className="relative z-0 min-h-[100dvh] overflow-hidden pb-28">
      {/* ---------- SKY (gradient like HomeworkStart) ---------- */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 600px at 92% 4%, rgba(247,210,178,.85) 0%, rgba(247,210,178,.55) 20%, rgba(247,210,178,0) 55%),
            linear-gradient(180deg, #eaf5f5 0%, #edf2ed 45%, #e8f4f6 100%)
          `,
        }}
      />

      {/* ---------- WATER (bottom, rounded container) ---------- */}
      <div
        className="absolute inset-x-0 bottom-0 h-[50vh] pointer-events-none z-10 overflow-hidden"
        style={{
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          boxShadow: "0 -8px 24px rgba(0,0,0,.10)",
          background: "linear-gradient(180deg, #cfeef2 0%, #bfe6e8 100%)",
        }}
      >
        <img
          src={waterBg}
          alt=""
          className="w-full h-full object-contain object-bottom select-none"
          draggable={false}
        />
      </div>

      {/* ---------- TREES (above water) ---------- */}
      <div className="absolute inset-x-0 top-9 bottom-[43vh] z-20 pointer-events-none">
        <img
          src={treesBg}
          alt=""
          className="w-full h-full object-contain object-bottom select-none"
          draggable={false}
        />
      </div>

      {/* ---------- HEADER ---------- */}
      <div className="relative z-30 flex items-center gap-2 px-3 pt-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={onBack} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button className="px-2 py-1 text-sm rounded-full hover:bg-neutral-100" onClick={onSkip}>
            Skip Intro
          </button>
          <button className="p-2 rounded-full hover:bg-neutral-100" onClick={speak} aria-label="Read aloud">
            <img src={speakerIcon} alt="Read" className="w-5 h-5 object-contain" />
          </button>
        </div>
      </div>

      {/* ---------- FOREGROUND CONTENT (no overlap) ---------- */}
      <div className="relative z-30 flex flex-col items-center pt-8 px-4 ">
        {/* Mascot + PNG speech bubble */}
       <div className="w-full mx-auto mt-[3vh] z-30 pointer-events-none">
                  <div className="mx-auto w-full max-w-[180px] h-[40vh] min-h-[140px]">
            <img
              src={buddy?.img || buddyImg}
              alt="Buddy"
              draggable={false}
              className="w-full h-full object-contain object-bottom select-none"
              style={{ filter: "drop-shadow(0 12px 22px rgba(0,0,0,.18))" }}
            />
          </div>
        </div>
          

        {/* Bubble positioned near the head, but still above chips */}
        <div
          className="relative -mt-10 mb-2"
          style={{ width: 280, maxWidth: "85%" }}
        >
          <div
            className="mx-auto text-[#1b3a1b]"
            style={{
              backgroundImage: `url(${chatAgentIcon})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              width: "100%",
              minHeight: 175,
              padding: "28px 24px 36px 26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,.12))",
            }}
            role="note"
            aria-label="Buddy message"
          >
            <Text style={{ fontSize: 14, lineHeight: 1.3, display: "block", textAlign: "center" }}>
              {current.text}
            </Text>
          </div>
        </div>

        {/* Mid highlights — BELOW mascot and bubble */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <Halo active={haloActive.chat}>
            <button
              ref={chatRef}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm"
              aria-label="Chat"
            >
              <img src={chatAgentIcon} alt="Chat" className="w-4 h-4 object-contain" />
              <span className="text-sm font-medium">Chat</span>
            </button>
          </Halo>

          <Halo active={haloActive.home}>
            <button
              ref={homeRef}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </button>
          </Halo>
        </div>

        {/* Big mic (in flow, not absolute) */}
        <div className="mt-8 grid place-items-center">
          <Halo active={haloActive.mic}>
            <button
              ref={micRef}
              aria-label="Voice input"
              className="grid place-items-center w-16 h-16 rounded-full shadow-lg bg-[#ff7a00]"
            >
              <img src={micIcon} alt="Mic" className="w-15 h-15 object-contain" />
            </button>
          </Halo>
        </div>
      </div>

   

      <div className="absolute left-3 right-3 bottom-3 flex gap-2 z-30">
       
        <Button
          type="primary"
          onClick={onNext}
          className="rounded-full flex-1 !bg-[#ff4d4f] !border-none !h-[48px] font-semibold"
        >
          {step < steps.length - 1 ? "Further" : "Let’s start"}
        </Button>
      </div>
    </div>
  );
}
