// src/pages/student/mobile/MobileShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import DeviceFrame from "@/components/student/mobile/DeviceFrame";

/**
 * MobileShell
 * Wraps all student routes so they render:
 * - raw on phones/tablets
 * - inside DeviceFrame when on desktop
 */
export default function MobileShell() {
  return (
    <DeviceFrame>
      <Outlet />
    </DeviceFrame>
  );
}
