// src/components/layout/AuthBackground.jsx
import React from "react";
import { NUNITO_FONT_STACK } from "@/constants/fonts.js";

export default function AuthBackground({
  children,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden ${className}`}
      style={{
        // Default: transparent app background; screens can supply their own via `style`
        backgroundColor: "transparent",
        fontFamily: NUNITO_FONT_STACK,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
