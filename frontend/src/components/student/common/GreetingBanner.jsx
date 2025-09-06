// src/components/student/common/GreetingBanner.jsx
import React from "react";
import { Typography } from "antd";

const { Text } = Typography;

export default function GreetingBanner({
  title,
  subtitle,
  className = "",
  translucent = true,
  titleClassName = "",      // ← new
  subtitleClassName = "",   // ← new
}) {
  return (
    <div
      className={[
        "rounded-2xl p-5",
        translucent ? "bg-white/70" : "bg-white",
        className,
      ].join(" ")}
    >
      <div className={["font-semibold truncate", titleClassName || "text-[18px] md:text-[20px]"].join(" ")}>
        {title}
      </div>

      {subtitle && (
        <Text
          type="secondary"
          className={["block", subtitleClassName || "text-[14px] md:text-[15px]"].join(" ")}
        >
          {subtitle}
        </Text>
      )}
    </div>
  );
}
