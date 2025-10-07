import React from "react";
import PropTypes from "prop-types";

/**
 * ParentSpaceBar
 * Adds vertical space so content doesn't hide behind the sticky bottom tab bar.
 * - Mobile: safe-area aware
 * - Tablet/Desktop: fixed height
 */
export default function ParentSpaceBar({ height = 72, className = "" }) {
  const h = typeof height === "number" ? `${height}px` : height;

  return (
    <>
      {/* Mobile / small screens */}
      <div
        className={["block md:hidden", className].join(" ")}
        style={{ height: h, paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden
      />
      {/* Tablet / desktop: no spacer to keep nav tight to bottom */}
      <div className={["hidden md:block h-0", className].join(" ")} aria-hidden />
    </>
  );
}

ParentSpaceBar.propTypes = {
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
};

/* Optional: alias for backwards compatibility with previous naming */
export function ParentTabSpacer(props) {
  return <ParentSpaceBar {...props} />;
}
