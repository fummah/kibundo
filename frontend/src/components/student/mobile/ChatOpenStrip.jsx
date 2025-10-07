// src/components/student/mobile/ChatOpenStrip.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import minimiseBg from "@/assets/backgrounds/minimise.png";

export default function ChatOpenStrip({
  to = "/student/chat",           // default: open ChatLayer
  ariaLabel = "Open chat",
  height = 54,
  bg = minimiseBg,
  className = "",
  style = {},
}) {
  const navigate = useNavigate();
  const onActivate = () => navigate(to);

  return (
    <div
      onClick={onActivate}
      className={["cursor-pointer select-none", className].join(" ")}
      style={{
        backgroundImage: `url(${bg})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: `${height}px`,
        ...style,
      }}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onActivate()}
    />
  );
}