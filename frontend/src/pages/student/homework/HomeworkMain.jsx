import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CameraFilled, AudioFilled, PictureFilled } from "@ant-design/icons";

import HomeRibbon from "@/components/student/mobile/HomeRibbon";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";
import FooterChat from "@/components/student/mobile/FooterChat";

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import treesBg from "@/assets/backgrounds/trees.png";
import waterBg from "@/assets/backgrounds/water.png";

export default function HomeworkStart() {
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleImageSelect = (file, source, inputEl) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      navigate("/student/homework/interaction", {
        state: { source, image: reader.result }, // 👈 pass DataURL
      });
      if (inputEl) inputEl.value = ""; // allow re-selecting the same file later
    };
    reader.readAsDataURL(file);
  };

  const onOpenCamera = () => cameraInputRef.current?.click();
  const onOpenGallery = () => galleryInputRef.current?.click();
  const onMic = () =>
    navigate("/student/homework/interaction", { state: { source: "mic" } });

  return (
    <div className="relative z-0 min-h-[100dvh] overflow-hidden pb-28">
      {/* SKY */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 600px at 92% 4%, rgba(247,210,178,.85) 0%, rgba(247,210,178,.55) 20%, rgba(247,210,178,0) 55%),
            linear-gradient(180deg, #eaf5f5 0%, #edf2ed 45%, #e8f4f6 100%)
          `,
        }}
      />

      {/* WATER (contained with img) */}
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

      {/* TREES (fully contained above water) */}
      <div className="absolute inset-x-0 top-9 bottom-[43vh] z-20 pointer-events-none">
        <img
          src={treesBg}
          alt=""
          className="w-full h-full object-contain object-bottom select-none"
          draggable={false}
        />
      </div>

      {/* RIBBONS */}
      <HomeRibbon onClick={() => navigate("/student")} />
      <SettingsRibbon onClick={() => navigate("/student/settings")} />

      {/* FOREGROUND */}
      <div className="relative z-30 flex flex-col items-center pt-6 sm:pt-8 px-4">
        <h1
          className="text-center font-extrabold"
          style={{ color: "#0f7a7a", fontSize: "clamp(24px, 5.6vw, 34px)" }}
        >
          Hausaufgaben
        </h1>

        {/* MASCOT */}
        <div className="w-full mx-auto mt-[3vh] z-30 pointer-events-none">
          <div className="mx-auto w-full max-w-[180px] h-[40vh] min-h-[140px]">
            <img
              src={buddyMascot}
              alt="Buddy"
              draggable={false}
              className="w-full h-full object-contain object-bottom select-none"
              style={{ filter: "drop-shadow(0 12px 22px rgba(0,0,0,.18))" }}
            />
          </div>
        </div>

        {/* ACTIONS — equal visual gap left/right of the mic */}
        <div className="w-full mx-auto mt-6 sm:mt-7 z-30 pointer-events-auto">
          <div className="mx-auto w-full max-w-[360px] min-w-[260px]">
            <div className="grid grid-cols-[auto_auto_auto] justify-center items-center gap-x-[4vw]">
              {/* Camera (small) */}
              <button
                aria-label="Kamera"
                onClick={onOpenCamera}
                className="grid place-items-center text-white"
                style={{
                  width: "min(14vw, 56px)",
                  height: "min(14vw, 56px)",
                  borderRadius: 999,
                  backgroundColor: "#ff7a00",
                  boxShadow: "0 10px 18px rgba(0,0,0,.20)",
                }}
              >
                <CameraFilled style={{ fontSize: "clamp(16px, 5vw, 22px)" }} />
              </button>

              {/* Mic (large) */}
              <button
                aria-label="Mikrofon"
                onClick={onMic}
                className="grid place-items-center text-white"
                style={{
                  width: "min(24vw, 96px)",
                  height: "min(24vw, 96px)",
                  borderRadius: 999,
                  backgroundColor: "#ff7a00",
                  boxShadow: "0 18px 30px rgba(0,0,0,.25)",
                }}
              >
                <AudioFilled style={{ fontSize: "clamp(22px, 7vw, 34px)" }} />
              </button>

              {/* Gallery (small) */}
              <button
                aria-label="Galerie"
                onClick={onOpenGallery}
                className="grid place-items-center text-white"
                style={{
                  width: "min(14vw, 56px)",
                  height: "min(14vw, 56px)",
                  borderRadius: 999,
                  backgroundColor: "#ff7a00",
                  boxShadow: "0 10px 18px rgba(0,0,0,.20)",
                }}
              >
                <PictureFilled style={{ fontSize: "clamp(16px, 5vw, 22px)" }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) =>
          handleImageSelect(e.target.files?.[0], "camera", e.target)
        }
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          handleImageSelect(e.target.files?.[0], "gallery", e.target)
        }
      />

      {/* Footer chat strip */}
      <FooterChat to="/student/chat" className="mt-auto" />
    </div>
  );
}
