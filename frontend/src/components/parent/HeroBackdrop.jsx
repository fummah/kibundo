// src/components/parent/HeroBackdrop.jsx
import React from "react";
import PropTypes from "prop-types";

import globalTop from "@/assets/backgrounds/global-bg.png";   // global (below int)
import intBack   from "@/assets/backgrounds/int-back.png";    // int (above global)
import clouds    from "@/assets/backgrounds/clouds.png";
import buddyImg  from "@/assets/buddies/kibundo-buddy.png";

export default function HeroBackdrop({
  children,
  header = null,
  headerTop = 16,
  showBuddy = true,
  buddyAlt = "Kibundo Buddy",
  buddySize = 390,
  buddyTop = 88,
  extraBelowBuddy = 322,
  gradient = "linear-gradient(180deg, #FBEADF 0%, #F5E8DD 40%, #EEF3E9 100%)",
  className = "",
  contentClassName = "",
}) {
  const contentPadTopPx = showBuddy ? buddyTop + buddySize + extraBelowBuddy : 24;

  return (
    <div className={["relative min-h-[100dvh] overflow-hidden", className].join(" ")}>
      {/* Base gradient */}
      <div className="absolute inset-0 z-0" style={{ background: gradient }} aria-hidden />

      {/* Global background (below int) */}
      <img
        src={globalTop}
        alt=""
        className="absolute top-0 left-0 right-0 w-full h-auto z-[1] select-none pointer-events-none"
        draggable={false}
        aria-hidden
      />

      {/* Int background (ABOVE global) – fill entire frame to avoid inner "phone" look */}
      <img
        src={intBack}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-[2] select-none pointer-events-none"
        draggable={false}
        aria-hidden
      />

      {/* Clouds overlay */}
      <img
        src={clouds}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-[3] opacity-80 select-none pointer-events-none"
        draggable={false}
        aria-hidden
      />

      {/* Header ABOVE buddy */}
      {header ? (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[5] px-6"
          style={{ top: `calc(env(safe-area-inset-top) + ${headerTop}px)` }}
        >
          {header}
        </div>
      ) : null}

      {/* Buddy */}
      {showBuddy && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[4]"
          style={{ top: `calc(env(safe-area-inset-top) + ${buddyTop}px)` }}
        >
          <img
            src={buddyImg}
            alt={buddyAlt}
            width={buddySize}
            height={buddySize}
            className="mx-auto drop-shadow-[0_18px_32px_rgba(0,0,0,0.18)] select-none"
            draggable={false}
          />
        </div>
      )}

      {/* Content BELOW buddy */}
      <div
        className={["relative z-[5] px-6", contentClassName].join(" ")}
        style={{ paddingTop: `calc(env(safe-area-inset-top) + ${contentPadTopPx}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

HeroBackdrop.propTypes = {
  children: PropTypes.node,
  header: PropTypes.node,
  headerTop: PropTypes.number,
  showBuddy: PropTypes.bool,
  buddyAlt: PropTypes.string,
  buddySize: PropTypes.number,
  buddyTop: PropTypes.number,
  extraBelowBuddy: PropTypes.number,
  gradient: PropTypes.string,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
};
