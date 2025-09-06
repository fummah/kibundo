// src/pages/student/mobile/HomeMobile.jsx
import React from "react";
import { Row, Col } from "antd";
import { useNavigate } from "react-router-dom";

import BackgroundShell from "@/components/student/mobile/BackgroundShell";
import ImageTile from "@/components/student/mobile/ImageTile";
import FooterChat from "@/components/student/mobile/FooterChat";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";

import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import { TILE_BG } from "@/assets/mobile/tiles";
import { IMGS } from "@/assets/mobile";

export default function HomeMobile() {
  const navigate = useNavigate();

  return (
    <BackgroundShell>
      {/* self-contained screen; footer sits at the bottom */}
      <div className="relative flex flex-col min-h-[100dvh]">
        {/* scrollable content; add bottom padding so footer doesn't overlap */}
        <div className="flex-1 px-4 pt-4 pb-24 md:pb-28">
          <SettingsRibbon />

          {/* Header / Mascot */}
          <div className="flex justify-center mt-6 mb-8">
            <img
              src={buddyMascot}
              alt="Buddy"
              className="w-[164px] md:w-[184px] h-auto drop-shadow-[0_10px_18px_rgba(0,0,0,.18)] select-none"
              draggable={false}
            />
          </div>

          {/* Tiles (cards) */}
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

      </div>
    </BackgroundShell>
  );
}
