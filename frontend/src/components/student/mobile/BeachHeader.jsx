// src/components/student/mobile/BeachHeader.jsx
import React from "react";
import topBg from "@/assets/backgrounds/top.png";

/**
 * BeachHeader
 * Shows the beach hero with a smooth curved bottom cutting into the cream area.
 *
 * Props:
 *  - height (px)   : overall header height (default 255)
 *  - image         : override hero image (defaults to topBg)
 *  - fill          : color below the curve (default "#f7efe8")
 *  - children      : overlay content (settings button, buddy, etc.)
 */
export default function BeachHeader({
  height = 255,
  image = topBg,
  fill = "#f7efe8",
  children,
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
      {/* Hero image */}
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
      />

      {/* Curved divider at the bottom */}
      <svg
        className="absolute -bottom-px left-0 w-full"
        viewBox="0 0 360 64"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Adjust control points for deeper/shallower curve */}
        <path d="M0,16 C90,48 270,48 360,16 L360,64 L0,64 Z" fill={fill} />
      </svg>

      {/* Overlay slot (buttons/mascot) */}
      {children ? <div className="relative z-10 h-full w-full">{children}</div> : null}
    </div>
  );
}
