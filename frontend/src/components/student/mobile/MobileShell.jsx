// src/pages/student/mobile/MobileShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { NUNITO_FONT_STACK } from "@/constants/fonts.js";

/**
 * MobileShell
 * Wraps all student routes so they render:
 * - raw on phones/tablets
 * - inside DeviceFrame when on desktop
 */
export default function MobileShell() {
  // App-level device frame is applied in src/App.jsx. To prevent double frames,
  // this shell simply renders the nested routes.
  return (
    <div className="contents" style={{ fontFamily: NUNITO_FONT_STACK }}>
      <Outlet />
    </div>
  );
}
