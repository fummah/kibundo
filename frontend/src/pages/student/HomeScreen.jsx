import React from "react";
import { Row, Col } from "antd";
import { useNavigate } from "react-router-dom";

import ImageTile from "@/components/student/mobile/ImageTile";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";
// FooterChat is rendered globally in App.jsx for selected routes

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import { TILE_BG } from "@/assets/mobile/tiles";
import { IMGS } from "@/assets/mobile";

// Background art (use alias paths)
import topBg from "@/assets/backgrounds/top.png";
import bottomBg from "@/assets/backgrounds/int-back.png";

/* ---- Homework entry route (supports resume) ---- */
function computeHomeworkEntryRoute() {
  // Expecting: localStorage.setItem('kibundo.homework.progress.v1', JSON.stringify({ step: 0|1|2|3 }))
  try {
    const raw = localStorage.getItem("kibundo.homework.progress.v1");
    if (raw) {
      const { step } = JSON.parse(raw) ?? {};
      switch (step) {
        case 1:
          return "/student/homework/doing";
        case 2:
          return "/student/homework/chat";
        case 3:
          return "/student/homework/feedback";
        default:
          return "/student/homework"; // 0 or unknown → HomeworkList
      }
    }
  } catch {}
  return "/student/homework";
}

export default function HomeMobile() {
  const navigate = useNavigate();

  const HomeContent = () => (
    <div className="flex flex-col min-h-[100dvh] md:min-h-0 md:h-full bg-[#f7f2ec]">
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
                onClick={() => navigate("/student/homework")} // <— always list
                ariaLabel="Zu Hausaufgaben"
                data-testid="tile-homework"
              />
            </Col>

            <Col xs={12}>
              <ImageTile
                title="Lernen"
                bg={TILE_BG.yellow}
                illustration={IMGS.learning}
                onClick={() => navigate("/student/learning")}
                ariaLabel="Zu Lernen"
                data-testid="tile-learning"
              />
            </Col>

            <Col xs={12}>
              <ImageTile
                title="Lesen"
                bg={TILE_BG.pink}
                illustration={IMGS.reading}
                onClick={() => navigate("/student/reading")}
                ariaLabel="Zu Lesen"
                data-testid="tile-reading"
              />
            </Col>

            <Col xs={12}>
              <ImageTile
                title="Schatzkarte"
                bg={TILE_BG.green}
                illustration={IMGS.map}
                ariaLabel="Zur Schatzkarte"
                data-testid="tile-map"
              />
            </Col>
          </Row>
        </div>
        {/* Footer chat is injected globally */}
      </main>
    </div>
  );

  return <HomeContent />;
}
