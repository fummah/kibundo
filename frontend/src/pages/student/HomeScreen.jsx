import React from "react";
import { Row, Col } from "antd";
import { useNavigate } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext.jsx";

import ImageTile from "@/components/student/mobile/ImageTile";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";
// FooterChat is rendered globally in App.jsx for selected routes

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import { TILE_BG } from "@/assets/mobile/tiles";
import { IMGS } from "@/assets/mobile";

// Background art (use alias paths)
import topBg from "@/assets/backgrounds/top.png";
import bottomBg from "@/assets/backgrounds/int-back.png";

export default function HomeMobile() {
  const navigate = useNavigate();
  const { closeChat } = useChatDock();

  // Desktop Layout - Shows starting from iPad (md: 768px and above)
  const DesktopLayout = () => (
    <div className="hidden md:flex flex-col min-h-[100dvh] md:min-h-0 md:h-full bg-[#f7f2ec]">
      {/* Sticky settings (safe-area aware) */}
      <div className="sticky top-0 z-50 flex justify-end px-4 pt-[env(safe-area-inset-top)] pointer-events-none">
        <div className="pointer-events-auto">
          <SettingsRibbon />
        </div>
      </div>

      {/* HEADER — top background only */}
      <header
        className="relative w-full h-[260px] md:h-[300px] lg:h-[340px] flex items-end justify-center"
        style={{
          backgroundImage: `url(${topBg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
        aria-label="Kibundo Startbereich"
      >
        <img
          src={buddyMascot}
          alt="Buddy"
          loading="lazy"
          className="w-[120px] md:w-[130px] lg:w-[162px] h-auto select-none drop-shadow-[0_10px_18px_rgba(0,0,0,.18)]"
        />
      </header>

      {/* CARDS SECTION — bottom background lives here so tiles ALWAYS sit on it */}
      <main
        className="relative flex-1 px-4 pb-0"
        style={{
          backgroundImage: `url(${bottomBg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
          backgroundColor: "#f7f2ec",
        }}
        aria-label="Schnellzugriffe"
      >
        <div className="pt-2 md:pt-5 lg:pt-6 max-w-[980px] mx-auto">
          <Row gutter={[14, 14]}>
            <Col xs={12}>
              <ImageTile
                title="Hausaufgaben"
                bg={TILE_BG.blue}
                illustration={IMGS.homework}
                onClick={() => {
                  closeChat?.(); // Close chat before navigating (same approach as onboarding)
                  navigate("/student/homework");
                }}
                ariaLabel="Zu Hausaufgaben"
                data-testid="tile-homework"
              />
            </Col>

            {/* 
              FEATURE: Learning (Lernen)
              Status: Temporarily hidden - content not ready
              TODO: Enable when content is available
            */}
            {/* <Col xs={12}>
              <ImageTile
                title="Lernen"
                bg={TILE_BG.yellow}
                illustration={IMGS.learning}
                onClick={() => navigate("/student/learning")}
                ariaLabel="Zu Lernen"
                data-testid="tile-learning"
              />
            </Col> */}

            {/* 
              FEATURE: Reading (Lesen)
              Status: Temporarily hidden - content not ready
              TODO: Enable when content is available
            */}
            {/* <Col xs={12}>
              <ImageTile
                title="Lesen"
                bg={TILE_BG.pink}
                illustration={IMGS.reading}
                onClick={() => navigate("/student/reading")}
                ariaLabel="Zu Lesen"
                data-testid="tile-reading"
              />
            </Col> */}

            {/* 
              FEATURE: Treasure Map (Schatzkarte)
              Status: Temporarily hidden - content not ready
              TODO: Enable when content is available
            */}
            {/* <Col xs={12}>
              <ImageTile
                title="Schatzkarte"
                bg={TILE_BG.green}
                illustration={IMGS.map}
                ariaLabel="Zur Schatzkarte"
                data-testid="tile-map"
              />
            </Col> */}
          </Row>
        </div>
        {/* Footer chat is injected globally */}
      </main>
    </div>
  );

  // Mobile Layout - Only shows on screens smaller than iPad (< 768px)
  const MobileLayout = () => (
    <div className="md:hidden flex flex-col min-h-[100dvh] bg-[#f7f2ec]">
      {/* Sticky settings */}
      <div className="sticky top-0 z-50 flex justify-end px-4 pt-[env(safe-area-inset-top)] pointer-events-none">
        <div className="pointer-events-auto">
          <SettingsRibbon />
        </div>
      </div>

      {/* Simple Mobile Header */}
      <header className="relative w-full py-8 flex flex-col items-center justify-center bg-gradient-to-b from-[#a8d5ba] to-[#f7f2ec]">
        <img
          src={buddyMascot}
          alt="Buddy"
          loading="lazy"
          className="w-[100px] h-auto select-none mb-4"
        />
        <h1 className="text-2xl font-bold text-[#2b6a5b]">Willkommen!</h1>
      </header>

      {/* Simple Cards List */}
      <main className="relative flex-1 px-4 py-6 bg-[#f7f2ec]" aria-label="Schnellzugriffe">
        <div className="max-w-md mx-auto space-y-4">
          <button
            onClick={() => {
              closeChat?.(); // Close chat before navigating (same approach as onboarding)
              navigate("/student/homework");
            }}
            className="w-full p-4 rounded-2xl shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: TILE_BG.blue }}
            aria-label="Zu Hausaufgaben"
            data-testid="tile-homework-mobile"
          >
            <div className="flex items-center gap-4">
              <img src={IMGS.homework} alt="" className="w-16 h-16 object-contain" />
              <span className="text-xl font-bold text-[#2b6a5b]">Hausaufgaben</span>
            </div>
          </button>

          {/* 
            FEATURE: Learning (Lernen) - Mobile
            Status: Temporarily hidden - content not ready
            TODO: Enable when content is available
          */}
          {/* <button
            onClick={() => navigate("/student/learning")}
            className="w-full p-4 rounded-2xl shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: TILE_BG.yellow }}
            aria-label="Zu Lernen"
            data-testid="tile-learning-mobile"
          >
            <div className="flex items-center gap-4">
              <img src={IMGS.learning} alt="" className="w-16 h-16 object-contain" />
              <span className="text-xl font-bold text-[#2b6a5b]">Lernen</span>
            </div>
          </button> */}

          {/* 
            FEATURE: Reading (Lesen) - Mobile
            Status: Temporarily hidden - content not ready
            TODO: Enable when content is available
          */}
          {/* <button
            onClick={() => navigate("/student/reading")}
            className="w-full p-4 rounded-2xl shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: TILE_BG.pink }}
            aria-label="Zu Lesen"
            data-testid="tile-reading-mobile"
          >
            <div className="flex items-center gap-4">
              <img src={IMGS.reading} alt="" className="w-16 h-16 object-contain" />
              <span className="text-xl font-bold text-[#2b6a5b]">Lesen</span>
            </div>
          </button> */}

          {/* 
            FEATURE: Treasure Map (Schatzkarte) - Mobile
            Status: Temporarily hidden - content not ready
            TODO: Enable when content is available
          */}
          {/* <button
            onClick={() => navigate("/student/map")}
            className="w-full p-4 rounded-2xl shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: TILE_BG.green }}
            aria-label="Zur Schatzkarte"
            data-testid="tile-map-mobile"
          >
            <div className="flex items-center gap-4">
              <img src={IMGS.map} alt="" className="w-16 h-16 object-contain" />
              <span className="text-xl font-bold text-[#2b6a5b]">Schatzkarte</span>
            </div>
          </button> */}
        </div>
      </main>
    </div>
  );

  return (
    <>
      <DesktopLayout />
      <MobileLayout />
    </>
  );
}
