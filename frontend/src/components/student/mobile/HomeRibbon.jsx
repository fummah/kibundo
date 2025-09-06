import React from "react";
import { useNavigate } from "react-router-dom";
import { HomeFilled } from "@ant-design/icons";

/**
 * Responsive ribbon button for Home (top-left corner).
 */
export default function HomeRibbon() {
  const navigate = useNavigate();

  const faceSize = "clamp(30px, 14vw, 36px)";
  const iconSize = "clamp(16px, 5vw, 10px)";
  const tailSize = "clamp(10px, 3vw, 14px)";
  const topOffset = "clamp(8px, 2.5vw, 16px)";

  return (
    <div
      className="absolute left-0 z-[100] pointer-events-auto"
      style={{
        top: topOffset,
      }}
    >
      <div
        className="relative text-white shadow-md"
        style={{
          width: faceSize,
          height: faceSize,
          backgroundColor: "#5b4f3f",
          borderTopRightRadius: 10,
          borderBottomRightRadius: 10,
        }}
      >
        {/* Tail */}
        <div
          className="absolute left-0 top-full w-0 h-0"
          style={{
            borderTop: `${tailSize} solid transparent`,
          }}
        />
        {/* Clickable face */}
        <button
          type="button"
          aria-label="Home"
          onClick={() => navigate("/student/home-mobile")}
          className="absolute inset-0 grid place-items-center cursor-pointer"
        >
          <HomeFilled style={{ fontSize: iconSize }} />
        </button>
      </div>
    </div>
  );
}
