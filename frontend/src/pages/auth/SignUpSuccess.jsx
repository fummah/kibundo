// src/pages/auth/SignUpSuccess.jsx
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import dinoImg from "@/assets/onboarding-dino.png";
import cloudsImg from "@/assets/backgrounds/clouds.png";

export default function SignUpSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = useMemo(() => {
    const candidate = location?.state?.next;
    if (typeof candidate === "string" && candidate.startsWith("/")) {
      return candidate;
    }
    return ROLE_PATHS[ROLES.PARENT] || "/parent";
  }, [location?.state]);

  const handleContinue = () => {
    navigate("/signup/add-child", { replace: true, state: { next: nextPath, back: "/signup/success" } });
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16"
      style={{
        background:
          "linear-gradient(180deg, rgba(244,190,155,1) 0%, rgba(242,214,177,1) 55%, rgba(237,226,203,1) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${cloudsImg})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute inset-x-[-40%] bottom-[-65%] h-[130%] rounded-[50%] bg-[#F2E5D5]" />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center px-4 text-center">
        <img
          src={dinoImg}
          alt="Kibundo Dino"
          className="h-auto w-[240px] drop-shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
        />

        <h1 className="mt-8 text-3xl font-semibold text-[#4F3A2D]">Erfolgreich</h1>

        <p className="mt-4 text-xl font-semibold text-[#7DB533]">
          Registrierung erfolgreich abgeschlossen
        </p>

        <p className="mt-4 text-base text-[#6F5A4A]">
          Du hast den ersten Schritt gemacht, damit Dein Kind bei den Hausaufgaben Spaß hat und
          individuell auf seiner Lernreise von Kibundo begleitet wird.
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-9 w-full max-w-[220px] rounded-full bg-[#FF8400] py-3 text-lg font-semibold text-white shadow-[0_18px_38px_rgba(255,132,0,0.35)] transition hover:bg-[#FF7600] focus:outline-none focus:ring-4 focus:ring-[#FFB066]/50"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

