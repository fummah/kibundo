// src/pages/auth/SignUpAddAnotherChild.jsx
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import cloudsImg from "@/assets/backgrounds/clouds.png";
import dinoImg from "@/assets/onboarding-dino.png";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";

const CTA_ROUTE = "/parent/myfamily/add-student-flow";
const ONBOARDING_FLAG_KEY = "parent.onboarding.active";
const ONBOARDING_NEXT_KEY = "parent.onboarding.next";
const ONBOARDING_RETURN_KEY = "parent.onboarding.return";

export default function SignUpAddAnotherChild() {
  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = (() => {
    const stateNext =
      location.state && typeof location.state.next === "string" && location.state.next.startsWith("/")
        ? location.state.next
        : null;
    if (stateNext) return stateNext;
    try {
      const stored = sessionStorage.getItem(ONBOARDING_NEXT_KEY);
      if (stored && stored.startsWith("/")) return stored;
    } catch {
      // ignore storage issues
    }
    return ROLE_PATHS[ROLES.PARENT] || "/parent";
  })();

  const handleAddChild = () => {
    try {
      sessionStorage.setItem(ONBOARDING_FLAG_KEY, "1");
      sessionStorage.setItem(ONBOARDING_NEXT_KEY, nextPath);
      sessionStorage.setItem(ONBOARDING_RETURN_KEY, "/signup/choose-subscription");
    } catch {
      // ignore storage issues
    }
    navigate(CTA_ROUTE, {
      replace: true,
      state: { from: "/signup/add-child/another", back: location.state?.back || "/signup/add-child" },
    });
  };

  const handleSkip = () => {
    try {
      sessionStorage.removeItem(ONBOARDING_FLAG_KEY);
      sessionStorage.removeItem(ONBOARDING_RETURN_KEY);
      sessionStorage.removeItem(ONBOARDING_NEXT_KEY);
    } catch {
      // ignore storage issues
    }
    navigate("/signup/choose-subscription", {
      replace: true,
      state: { next: nextPath, back: "/signup/add-child/another" },
    });
  };

  const CloudBackground = useMemo(
    () => (
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: `url(${cloudsImg})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "cover",
        }}
      />
    ),
    []
  );

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-16 pb-32 md:pb-24 lg:pb-16"
      style={{
        background:
          "linear-gradient(180deg, rgba(244,190,155,1) 0%, rgba(242,214,177,1) 45%, rgba(237,226,203,1) 100%)",
      }}
    >
      {CloudBackground}
      <div className="pointer-events-none absolute inset-x-[-40%] bottom-[-60%] h-[130%] rounded-[50%] bg-[#F2E5D5]" />

      <div className="relative z-10 flex w-full max-w-[520px] flex-col items-center px-6 text-center">
        <button
          type="button"
          onClick={() => {
            if (location.state?.back) {
              navigate(location.state.back, {
                replace: true,
                state: location.state?.backState || { next: nextPath },
              });
            } else {
              navigate(-1);
            }
          }}
          className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-[#F0E4D8] bg-white text-[#4F3A2D] shadow-[0_8px_16px_rgba(79,58,45,0.12)]"
        >
          <span className="text-lg">←</span>
        </button>

        <div className="pt-6" />

        <img
          src={dinoImg}
          alt="Kibundo Dino"
          className="h-auto w-[240px] drop-shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
        />

        <h1 className="mt-6 text-3xl font-semibold text-[#4F3A2D]">
          Los geht‘s
        </h1>

        <p className="mt-6 text-2xl font-semibold text-[#7DB533] leading-tight">
          Weiteres Kind anlegen
        </p>

        <p className="mt-6 text-base text-[#6F5A4A]">
          Du kannst für mehrere Kinder Konten hinzufügen. Das hinzufügen ist jederzeit auch
          nachträglich möglich. Für jedes weitere Kind erhältst Du eine Vergünstigung.
        </p>

        <button
          type="button"
          onClick={handleAddChild}
          className="mt-8 flex w-full max-w-[260px] flex-col items-center gap-3 rounded-[28px] bg-white/90 px-4 py-5 text-lg font-semibold text-[#FF8400] shadow-[0_18px_38px_rgba(255,132,0,0.25)] transition hover:bg-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF8400] text-3xl text-white shadow-[0_8px_16px_rgba(255,132,0,0.35)]">
            +
          </span>
          Kind hinzufügen
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-6 w-full max-w-[260px] rounded-full bg-[#FF8400] py-3 text-lg font-semibold text-white shadow-[0_18px_38px_rgba(255,132,0,0.35)] transition hover:bg-[#FF7600] focus:outline-none focus:ring-4 focus:ring-[#FFB066]/50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

