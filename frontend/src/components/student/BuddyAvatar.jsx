// src/components/student/BuddyAvatar.jsx
import React from "react";
import clsx from "clsx";
import defaultBuddy from "@/assets/buddies/kibundo-buddy.png";

export default function BuddyAvatar({
  src,
  size = 72,
  alt = "Buddy",
  className = "",
  ring = true,
}) {
  const [imgSrc, setImgSrc] = React.useState(src || defaultBuddy);

  React.useEffect(() => {
    setImgSrc(src || defaultBuddy);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={clsx(
        "",
        ring ? "" : "",
        className
      )}
      onError={(e) => {
        // prevent loop if default also fails
        if (imgSrc !== defaultBuddy) setImgSrc(defaultBuddy);
      }}
      draggable={false}
    />
  );
}
