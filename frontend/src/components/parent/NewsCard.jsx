// src/components/parent/NewsCard.jsx
import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

/**
 * NewsCard
 * - Use `to` for internal routes, `href` for external links, or `onClick` for a plain clickable card.
 * - Accepts either `excerpt` or `desc` (your pages use `desc`); `excerpt` takes precedence when both are provided.
 */
function NewsCard({
  to,
  href,
  target,
  rel,
  onClick,
  badge,
  badgeColor = "#69b06b",
  title,
  excerpt,
  desc,
  image,
  imageAlt = "",
  className = "",
  compact = false,
}) {
  const text = typeof excerpt === "string" ? excerpt : desc;
  const baseClass =
    "block w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

  // Wrapper element selection - prioritize to (internal route), then href (external), then div
  const Wrapper = to ? Link : href ? "a" : "div";
  const wrapperProps = {
    className: [baseClass, className].join(" "),
    onClick: onClick || (to || href ? undefined : undefined), // Allow custom onClick
    ...(to ? { to } : {}),
    ...(href ? { href, target, rel } : {}),
    ...(onClick && !to && !href ? { role: "button", tabIndex: 0 } : {}),
    "aria-label": title || "News article",
    style: to || href ? { cursor: "pointer" } : undefined, // Ensure pointer cursor for clickable cards
  };

  const imageBox = compact ? "w-24 h-20" : "w-28 h-24";

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          {badge ? (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mb-1"
              style={{ backgroundColor: badgeColor, color: "#fff" }}
            >
              {badge}
            </span>
          ) : null}

          <div className="text-xl font-extrabold text-neutral-800 mb-2 leading-snug">
            {title}
          </div>

          {text ? (
            <div className="text-neutral-600 text-[14px]">{text}</div>
          ) : null}
        </div>

        {image ? (
          <div
            className={[
              imageBox,
              "shrink-0 rounded-xl overflow-hidden ring-4 ring-white/60 self-center",
            ].join(" ")}
          >
            <img 
              src={image} 
              alt={imageAlt || title || "News image"} 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // If uploaded image fails to load, try to use a placeholder
                // Only hide if it's not already a placeholder
                if (!image.includes("blognews") && !image.includes("platnews") && !image.includes("unkcat")) {
                  console.warn("Failed to load blog image:", image);
                  // You could set a placeholder here if needed
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </Wrapper>
  );
}

NewsCard.propTypes = {
  to: PropTypes.string,
  href: PropTypes.string,
  target: PropTypes.string,
  rel: PropTypes.string,
  onClick: PropTypes.func,
  badge: PropTypes.string,
  badgeColor: PropTypes.string,
  title: PropTypes.string.isRequired,
  excerpt: PropTypes.string, // preferred
  desc: PropTypes.string,     // supported for compatibility with existing data
  image: PropTypes.string,
  imageAlt: PropTypes.string,
  className: PropTypes.string,
  compact: PropTypes.bool,
};

export default NewsCard;
export { NewsCard };
