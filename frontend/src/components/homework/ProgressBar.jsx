import React, { useMemo } from "react";

// Use your assets (never raw C:\ paths in Vite)
import emptyBar from "@/assets/mobile/icons/empty-progress.png";
import filledBar from "@/assets/mobile/icons/filled-progress.png";

const STEPS = [
  { key: "collect", label: "Sammeln" },
  { key: "do",      label: "machen" },
  { key: "review",  label: "Rückmeldung" },
];

/**
 * Props:
 *  - current: 0|1|2
 */
export default function ProgressBar({ current = 0 }) {
  const pct = useMemo(() => {
    const denom = Math.max(1, STEPS.length - 1);
    const c = Math.min(Math.max(current, 0), STEPS.length - 1);
    return (c / denom) * 100;
  }, [current]);

  return (
    <div className="w-full select-none">
      {/* BAR */}
      <div className="relative w-full h-[15px]">
        {/* empty track */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${emptyBar})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        {/* filled portion */}
        <div
          className="absolute left-0 top-0 h-full overflow-hidden transition-all duration-400 ease-out"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          <div
            className="h-full"
            style={{
              backgroundImage: `url(${filledBar})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "left center",
              width: "100%",
            }}
          />
        </div>

        {/* ROUND STEP CIRCLES (1, 2, 3) */}
        {[0, 1, 2].map((i) => {
          const left = i === 0 ? "0%" : i === 1 ? "50%" : "100%";
          const state = i < current ? "done" : i === current ? "active" : "upcoming";
          const styles =
            state === "active"
              ? "bg-[#ff8745] text-white ring-2 ring-white shadow-md"
              : state === "done"
              ? "bg-[#8fd85d] text-white ring-2 ring-white shadow-md"
              : "bg-[#cfd7d3] text-white ring-2 ring-white opacity-95";
          return (
            <div
              key={i}
              className={`absolute -top-4 translate-x-[-50%] w-10 h-10 rounded-full grid place-items-center ${styles}`}
              style={{ left }}
              aria-hidden
            >
              <span className="font-bold text-[14px]">{i + 1}</span>
            </div>
          );
        })}
      </div>

      {/* LABEL PILLS */}
      <div className="mt-2 grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <div key={s.key} className="text-center">
              <span
                className={[
                  "inline-block px-3 py-[6px] rounded-full text-[13px] font-semibold",
                  done
                    ? "bg-[#aee17b] text-[#1b3a1b]"
                    : active
                    ? "bg-[#ff8745] text-white shadow-sm"
                    : "bg-[#e5ece9] text-[#51625e]"
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
