import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/onboarding-dino.png";
import { NUNITO_FONT_STACK } from "@/constants/fonts.js";

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-6 py-10"
      style={{
        background: "linear-gradient(180deg, #F8C9AA 0%, #CBEADF 100%)",
        fontFamily: NUNITO_FONT_STACK,
      }}
    >
      {/* Character Section - Top */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <img
          src={heroImage}
          alt="Kibundo Character"
          className="mb-8 drop-shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
          style={{ maxWidth: "280px", height: "auto" }}
        />

        {/* Brand Name */}
        <h1
          className="mb-3 text-5xl font-bold tracking-tight"
          style={{ color: "#FF7F32" }}
        >
          Kibundo
        </h1>

        {/* Tagline */}
        <p
          className="mb-12 text-lg font-medium"
          style={{ color: "#31A892" }}
        >
          Hausaufgaben mit Spaß und in Deinem Tempo
        </p>
      </div>

      {/* Login Button - Bottom */}
      <button
        onClick={() => navigate("/signin")}
        className="w-full max-w-sm rounded-full border-none py-4 text-lg font-semibold text-white shadow-lg transition hover:opacity-90"
        style={{
          background: "#FF7F32",
        }}
      >
        Anmelden
      </button>
    </div>
  );
}
