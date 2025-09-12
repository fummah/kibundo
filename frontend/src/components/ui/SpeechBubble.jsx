import React from "react";

export default function SpeechBubble({ children, className="", tailTop=22 }) {
  return (
    <div className={`relative bg-black/6 rounded-2xl p-3 ${className}`} style={{ backdropFilter:"blur(2px)" }}>
      <div className="text-[14px] leading-snug">{children}</div>
      <span
        style={{
          position:"absolute", left:-12, top:tailTop, width:0, height:0,
          borderTop:"10px solid transparent", borderBottom:"10px solid transparent",
          borderRight:"12px solid rgba(0,0,0,0.06)"
        }}
      />
    </div>
  );
}
