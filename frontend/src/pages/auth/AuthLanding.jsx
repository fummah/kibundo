import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import globalBg from "@/assets/backgrounds/global-bg.png";
import { NUNITO_FONT_STACK } from "@/constants/fonts.js";

export default function AuthLanding() {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Welcome intro style loading, then redirect to parent sign-in
  useEffect(() => {
    let loadingInterval;
    let navigationTimeout;

    loadingInterval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          clearInterval(loadingInterval);
          navigationTimeout = setTimeout(() => {
            navigate("/signin", { replace: true });
          }, 500);
          return 100;
        }
        return next;
      });
    }, 50);

    return () => {
      if (loadingInterval) clearInterval(loadingInterval);
      if (navigationTimeout) clearTimeout(navigationTimeout);
    };
  }, [navigate]);

  return (
    <div className="flex justify-center bg-white overflow-hidden min-h-screen w-full relative">
      <Helmet>
        <title>Kibundo - Hausaufgaben mit Spaß | Lern-App für Kinder</title>
        <meta
          name="description"
          content="Kibundo macht Hausaufgaben zum Vergnügen! Eine spielerische Lern-App für Kinder mit süßen Maskottchen und individuellem Lerntempo für bessere Lernerfolge."
        />
      </Helmet>

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
        {/* Background image like parent home wrapper */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={globalBg}
            alt="Background"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <main
          className="relative z-10 w-full min-h-screen overflow-hidden"
          style={{
            margin: "0 auto",
            fontFamily: NUNITO_FONT_STACK,
          }}
        >
          {/* Kibundo character */}
          <img
            src="/images/img_kibundo.png"
            alt="Kibundo Maskottchen"
            className="absolute"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              top: "155px",
              width: "127px",
              height: "250px",
              objectFit: "contain",
            }}
          />

          {/* Kibundo logo */}
          <img
            src="/images/img_startscreen.svg"
            alt="Kibundo Logo"
            className="absolute"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              top: "436px",
              width: "260px",
              height: "50px",
              objectFit: "contain",
            }}
          />

          {/* Tagline */}
          <p
            className="absolute text-center whitespace-pre-line"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              top: "512px",
              width: "196px",
              height: "50px",
              fontWeight: 400,
              fontSize: "18px",
              lineHeight: "24.5px",
              color: "#287D7F",
              textAlign: "center",
            }}
          >
            {"Hausaufgaben mit Spaß\nund in Deinem Tempo"}
          </p>

          {/* Progress bar */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              top: "616px",
              width: "450px",
              maxWidth: "80vw",
              height: "12px",
              borderRadius: "8px",
              backgroundColor: "#F4EDE6",
              boxShadow: "inset 0px 0px 3px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: "#BDCF56",
                borderRadius: "8px",
                boxShadow: "inset 0px 0px 10px rgba(0, 0, 0, 0.25)",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
