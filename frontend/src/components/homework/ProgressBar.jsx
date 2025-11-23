import React, { useMemo } from "react";

// Use your assets (never raw C:\ paths in Vite)
import emptyBar from "@/assets/mobile/icons/empty-progress.png";
import filledBar from "@/assets/mobile/icons/filled-progress.png";

const STEPS = [
  { key: "collect", label: "Sammeln" },
  { key: "do",      label: "machen" },
  { key: "review",  label: "Rückmeldung" },
];

// Slightly inset positions so 1 and 3 are not cut at screen edges
const STEP_POSITIONS = ["8%", "50%", "92%"];

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
    <div className="w-full select-none pb-8 md:pb-10">
      {/* Centered wrapper with SAME padding left & right */}
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        {/* BAR */}
        <div className="relative w-full h-[12px] md:h-[15px]">
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
            const left = STEP_POSITIONS[i];
            const state =
              i < current ? "done" : i === current ? "active" : "upcoming";

            const styles =
              state === "active"
                ? "bg-[#ff8745] text-white ring-2 ring-white shadow-md"
                : state === "done"
                ? "bg-[#8fd85d] text-white ring-2 ring-white shadow-md"
                : "bg-[#cfd7d3] text-white ring-2 ring-white opacity-95";

            return (
              <div
                key={i}
                className={`absolute -top-3 md:-top-4 translate-x-[-50%] w-8 h-8 md:w-10 md:h-10 rounded-full grid place-items-center ${styles}`}
                style={{ left }}
                aria-hidden
              >
                <span className="font-bold text-xs md:text-[14px]">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* LABEL PILLS */}
        <div className="mt-6 md:mt-8 relative min-h-[2.5rem] md:min-h-[3rem]">
          {STEPS.map((s, i) => {
            const active = i === current;
            const done = i < current;
            const left = STEP_POSITIONS[i];

            return (
              <div
                key={s.key}
                className="absolute translate-x-[-50%] text-center"
                style={{ left }}
              >
                <span
                  className={[
                    "inline-block px-4 md:px-5 py-1 md:py-[6px] rounded-full text-[11px] md:text-[13px] font-semibold whitespace-nowrap",
                    done
                      ? "bg-[#aee17b] text-[#1b3a1b]"
                      : active
                      ? "bg-[#ff8745] text-white shadow-sm"
                      : "bg-[#e5ece9] text-[#51625e]",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
