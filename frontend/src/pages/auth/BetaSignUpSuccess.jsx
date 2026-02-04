// src/pages/auth/BetaSignUpSuccess.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import globalBg from "@/assets/backgrounds/global-bg.png";

export default function BetaSignUpSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="flex justify-center bg-white overflow-hidden min-h-screen w-full relative">
      <Helmet>
        <title>Beta Anmeldung erfolgreich - Kibundo</title>
        <meta
          name="description"
          content="Deine Beta-Anmeldung für Kibundo war erfolgreich. Wir werden dich benachrichtigen, sobald dein Zugang freigeschaltet wurde."
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
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={globalBg}
            alt="Background"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div
          className="relative z-10 w-full flex flex-col items-center justify-center"
          style={{ padding: "75px 24px 24px", minHeight: "100vh" }}
        >
          {/* Success Icon */}
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              backgroundColor: "#52C41A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            <CheckCircleOutlined
              style={{
                fontSize: "64px",
                color: "white",
              }}
            />
          </div>

          {/* Success Message */}
          <h1
            style={{
              fontFamily: "Nunito",
              fontWeight: 900,
              fontSize: "36px",
              lineHeight: "1.364",
              letterSpacing: "2%",
              textAlign: "center",
              color: "#544C3B",
              margin: "0 0 24px 0",
            }}
          >
            Beta-Anmeldung erfolgreich!
          </h1>

          <div
            style={{
              textAlign: "center",
              maxWidth: "500px",
              marginBottom: "40px",
            }}
          >
            <p
              style={{
                fontFamily: "Nunito",
                fontSize: "18px",
                lineHeight: "1.5",
                color: "#544C3B",
                margin: "0 0 16px 0",
              }}
            >
              Vielen Dank für dein Interesse am Kibundo Beta-Programm!
            </p>
            <p
              style={{
                fontFamily: "Nunito",
                fontSize: "16px",
                lineHeight: "1.5",
                color: "#816B5B",
                margin: "0 0 16px 0",
              }}
            >
              Wir haben deine Anmeldung erhalten und werden sie in Kürze überprüfen. Du wirst eine E-Mail erhalten, sobald dein Zugang freigeschaltet wurde.
            </p>
            <p
              style={{
                fontFamily: "Nunito",
                fontSize: "16px",
                lineHeight: "1.5",
                color: "#816B5B",
                margin: "0 0 16px 0",
              }}
            >
              Da dies ein Beta-Programm ist, sind die Plätze begrenzt. Wir bitten um etwas Geduld.
            </p>
          </div>

          {/* Beta Badge */}
          <div
            style={{
              backgroundColor: "#FF8400",
              color: "white",
              padding: "8px 20px",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "40px",
              display: "inline-block",
            }}
          >
            Beta-Programm Teilnehmer
          </div>

          {/* Action Button */}
          <Button
            type="primary"
            size="large"
            onClick={handleGoHome}
            style={{
              width: "250px",
              height: "56px",
              borderRadius: "28px",
              background: "#EF7C2E",
              border: "none",
              fontFamily: "Nunito",
              fontWeight: 900,
              fontSize: "18px",
              color: "#FFFFFF",
              letterSpacing: "1%",
            }}
          >
            Zurück zur Startseite
          </Button>

          {/* Auto-redirect notice */}
          <p
            style={{
              fontFamily: "Nunito",
              fontSize: "14px",
              color: "#816B5B",
              textAlign: "center",
              marginTop: "24px",
            }}
          >
            Du wirst in 10 Sekunden automatisch zur Startseite weitergeleitet...
          </p>
        </div>
      </div>
    </div>
  );
}
