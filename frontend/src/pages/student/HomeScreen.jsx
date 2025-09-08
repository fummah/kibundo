// src/pages/student/mobile/HomeMobile.jsx
import React from "react";
import { Row, Col } from "antd";
import { useNavigate } from "react-router-dom";

import ImageTile from "@/components/student/mobile/ImageTile";
import FooterChat from "@/components/student/mobile/FooterChat";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import { TILE_BG } from "@/assets/mobile/tiles";
import { IMGS } from "@/assets/mobile";

// Assets (absolute paths you provided)
import topBg from "C:/wamp64/www/kibundo/frontend/src/assets/backgrounds/top.png";
import bottomBg from "C:/wamp64/www/kibundo/frontend/src/assets/backgrounds/int-back.png";

export default function HomeMobile() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f7f2ec]">
        {/* Sticky settings */}
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
      >
      

        <img
          src={buddyMascot}
          alt="Buddy"
          className="w-[100px] md:w-[100px] lg:w-[120px] h-auto drop-shadow-[0_10px_18px_rgba(0,0,0,.18)] select-none"
          draggable={false}
        />
      </header>

      {/* CARDS SECTION — bottom background lives here so tiles ALWAYS sit on it */}
      <main
        className="relative flex-1 overflow-y-auto px-4 pb-28"
        style={{
          backgroundImage: `url(${bottomBg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% auto",         // spans full width
          backgroundPosition: "top center",     // artwork starts at top of this section
          backgroundColor: "#f7f2ec",           // fill below the artwork
        }}
      >
        {/* pull section slightly up so it kisses the wave/curve nicely */}
        <div className="pt-8 md:pt-10 lg:pt-12">
          <Row gutter={[14, 14]}>
            <Col span={12}>
              <ImageTile
                title="Hausaufgaben"
                bg={TILE_BG.blue}
                illustration={IMGS.homework}
                onClick={() => navigate("/student/homework-start")}
                ariaLabel="Zu Hausaufgaben"
              />
            </Col>

            <Col span={12}>
              <ImageTile
                title="Lernen"
                bg={TILE_BG.yellow}
                illustration={IMGS.learning}
                onClick={() => navigate("/student/learning")}
                ariaLabel="Zu Lernen"
              />
            </Col>

            <Col span={12}>
              <ImageTile
                title="Lesen"
                bg={TILE_BG.pink}
                illustration={IMGS.reading}
                onClick={() => navigate("/student/reading-practice")}
                ariaLabel="Zu Lesen"
              />
            </Col>

            <Col span={12}>
              <ImageTile
                title="Schatzkarte"
                bg={TILE_BG.green}
                illustration={IMGS.map}
                onClick={() => navigate("/student/map")}
                ariaLabel="Zur Schatzkarte"
              />
            </Col>
          </Row>
        </div>
      </main>

      <FooterChat />
    </div>
  );
}
