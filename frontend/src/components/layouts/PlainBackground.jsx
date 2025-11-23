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
        background:
          "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)",
        fontFamily: NUNITO_FONT_STACK,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
