import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/onboarding-dino.png";

const GRADIENT =
  "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)";
const PROGRESS_DURATION = 3200;

export default function SplashScreen({
  autoRedirect = true,
  redirectTo = "/signin",
  duration = PROGRESS_DURATION,
}) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId;
    let timeoutId;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        frameId = requestAnimationFrame(tick);
      } else if (autoRedirect) {
        timeoutId = window.setTimeout(
          () => navigate(redirectTo, { replace: true }),
          250
        );
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [autoRedirect, duration, navigate, redirectTo]);

  const progressStyle = useMemo(
    () => ({
      width: `${progress}%`,
      transition: "width 120ms ease-out",
    }),
    [progress]
  );

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-10"
      style={{
        background: GRADIENT,
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <img
          src={heroImage}
          alt="Kibundo Buddy"
          className="w-full max-w-xs drop-shadow-[0_14px_40px_rgba(0,0,0,0.12)]"
          draggable="false"
        />

        <div className="space-y-2">
          <h1
            className="text-[42px] font-extrabold tracking-[0.08em] text-[#FF7F32] md:text-[56px]"
            style={{ fontFamily: "'Nunito', 'Poppins', sans-serif" }}
          >
            Kibundo
          </h1>
          <p className="text-lg font-medium leading-snug text-[#31A892] md:text-xl">
            Hausaufgaben mit Spaß
            <br />
            und in Deinem Tempo
          </p>
        </div>
      </div>

      <div className="mt-16 w-full max-w-xl rounded-full bg-[#F5E8CC] px-1 py-[6px] shadow-inner">
        <div
          className="h-[12px] rounded-full bg-gradient-to-r from-[#9EC448] via-[#B4D55D] to-[#F6E6C9]"
          style={progressStyle}
        />
      </div>
    </div>
  );
}

