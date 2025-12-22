// src/pages/auth/SignUpSuccess.jsx
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import dinoImg from "@/assets/onboarding-dino.png";
import globalBg from "@/assets/backgrounds/global-bg.png";

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
    <div className="flex justify-center bg-white overflow-hidden min-h-screen w-full relative">
      <div
        className="relative w-full"
        style={{
          maxWidth: "1280px",
          minHeight: "100vh",
          margin: "0 auto",
          boxSizing: "border-box",
          background: "#FFFFFF",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={globalBg}
            alt="Background"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Big circular "arch" – same as CircularBackground */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 bottom-[-96vh] h-[150vh] w-[150vh] -translate-x-1/2 rounded-full bg-[#F2E5D5] z-[1]"
        />

        <div
          className="relative z-10 w-full"
          style={{ maxWidth: "752px", margin: "0 auto", padding: "75px 24px 24px" }}
        >
          <div className="flex w-full max-w-[420px] flex-col items-center px-4 text-center mx-auto">
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
      </div>
    </div>
  );
}

