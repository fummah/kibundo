// src/components/parent/ParentShell.jsx
import React from "react";
import PropTypes from "prop-types";

import DeviceFrame from "@/components/student/mobile/DeviceFrame";
import BottomTabBar from "@/components/parent/BottomTabBar";
import ParentSpaceBar from "@/components/parent/ParentSpaceBar.jsx";
import defaultBg from "@/assets/backgrounds/global-bg.png";

/**
 * ParentShell
 * - Uses DeviceFrame for the desktop mock; full viewport on mobile
 * - Sticky BottomTabBar lives INSIDE the scroll container
 * - Safe-area aware (iOS notch)
 */
export default function ParentShell({
  children,
  // legacy props (ignored; kept for compatibility)
  title,             // eslint-disable-line no-unused-vars
  showBack = false,  // eslint-disable-line no-unused-vars
  hideTopBar = true, // eslint-disable-line no-unused-vars

  // active props
  hideBottomBar = false,
  includeOnRoutes,
  hideOnRoutes,
  bgImage = defaultBg,
  className = "",
  contentClassName = "px-5",
}) {
  return (
    <DeviceFrame className={className}>
      {/* Background + layout */}
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Scrollable content (sticky bottom bar must live inside here) */}
        <main className={["flex-1 overflow-y-auto", contentClassName].join(" ")}>
          {children}

          {/* Keep content clear of the sticky bottom bar */}
          {!hideBottomBar && <ParentSpaceBar />}

          {/* Sticky bottom nav inside the scroller */}
          {!hideBottomBar && (
            <BottomTabBar
              includeOnRoutes={includeOnRoutes}
              hideOnRoutes={hideOnRoutes}
            />
          )}
        </main>
      </div>
    </DeviceFrame>
  );
}

ParentShell.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  showBack: PropTypes.bool,
  hideTopBar: PropTypes.bool,
  hideBottomBar: PropTypes.bool,
  includeOnRoutes: PropTypes.arrayOf(PropTypes.string),
  hideOnRoutes: PropTypes.arrayOf(PropTypes.string),
  bgImage: PropTypes.string,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
};
