import React, { useState } from "react";

/**
 * BigTile
 * - Clickable image tile with title + optional subtitle
 * - Keyboard accessible (Enter/Space)
 */
export default function BigTile({
  img = "https://picsum.photos/seed/placeholder/600/400",
  title = "Title",
  subtitle = "",
  onClick = () => {},
  className = "",
}) {
  const [src, setSrc] = useState(img);

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={onClick}
      onKeyDown={handleKey}
      className={`group cursor-pointer select-none rounded-2xl overflow-hidden shadow hover:shadow-md transition ${className}`}
    >
      <div className="relative">
        <img
          src={src}
          onError={() =>
            setSrc("https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=800&auto=format&fit=crop")
          }
          alt={title}
          className="w-full h-36 object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition" />
      </div>
      <div className="px-3 py-3 bg-white">
        <div className="font-semibold text-neutral-900 leading-tight">{title}</div>
        {subtitle ? (
          <div className="text-xs text-neutral-500 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
