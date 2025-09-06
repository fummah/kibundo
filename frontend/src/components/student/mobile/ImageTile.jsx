// src/components/student/mobile/ImageTile.jsx
import React from "react";

/**
 * ImageTile
 * A clickable tile with a background frame graphic and optional foreground illustration.
 *
 * Props:
 *  - title           : tile label
 *  - bg              : required background PNG (tile frame)
 *  - illustration    : optional foreground image (books/map/etc.)
 *  - onClick         : click handler
 *  - height          : tile height (default 158)
 *  - titleClassName  : extra classes for title text
 */
export default function ImageTile({
  title,
  bg,
  illustration,
  onClick,
  height = 158,
  titleClassName = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left active:scale-[0.99] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-[28px]"
      aria-label={title}
    >
      <div
        className="relative w-full rounded-[28px] overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,.06)]"
        style={{ height }}
      >
        {/* Background frame */}
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover select-none"
          draggable={false}
        />

        {/* Foreground illustration (optional) */}
        {illustration ? (
          <img
            src={illustration}
            alt=""
            aria-hidden="true"
            className="absolute right-3 bottom-3 max-h-[70%] object-contain pointer-events-none select-none"
            draggable={false}
          />
        ) : null}

        {/* Title */}
        <div
          className={`absolute left-6 top-6 font-semibold text-[18px] leading-snug tracking-[-0.25px] text-[#4D4D4D] ${titleClassName}`}
        >
          {title}
        </div>
      </div>
    </button>
  );
}
