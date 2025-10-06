// src/components/parent/ParentShell.jsx
import React from "react";
import PropTypes from "prop-types";

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
    <div className={className}>
      {/* Background + layout that fills the App's framed screen */}
      <div
        className="min-h-[100svh] md:min-h-0 md:h-full flex flex-col"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Content fills available height; the outer screen (App.jsx) provides scrolling */}
        <main id="parent-shell" className="flex-1 relative">
          {/* Padded content wrapper */}
          <div className={contentClassName}>{children}</div>

          {/* Keep content clear of the sticky bottom bar on mobile */}
          {!hideBottomBar && <ParentSpaceBar />}

          {/* Sticky bottom nav lives inside the same screen; full-width edge-to-edge */}
          {!hideBottomBar && (
            <BottomTabBar
              includeOnRoutes={includeOnRoutes}
              hideOnRoutes={hideOnRoutes}
            />
          )}
        </main>
      </div>
    </div>
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
