import React from "react";
import { useNavigate } from "react-router-dom";
import { SettingFilled } from "@ant-design/icons";

/**
 * Ribbon button for Settings (top-right corner, no tail).
 */
export default function SettingsRibbon() {
  const navigate = useNavigate();

  const faceSize = "clamp(30px, 14vw, 36px)";
  const iconSize = "clamp(16px, 5vw, 10px)";
  const sideOffset = "clamp(8px, 2.5vw, 16px)";

  return (
    <div
      className="absolute z-[100] pointer-events-auto"
      style={{
        top: 0,
        right: sideOffset,
      }}
    >
      <div
        className="relative text-white shadow-md"
        style={{
          width: faceSize,
          height: faceSize,
          backgroundColor: "#5b4f3f",
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }}
      >
        {/* Clickable face */}
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate("/student/settings")}
          className="absolute inset-0 grid place-items-center cursor-pointer"
        >
          <SettingFilled style={{ fontSize: iconSize }} />
        </button>
      </div>
    </div>
  );
}
