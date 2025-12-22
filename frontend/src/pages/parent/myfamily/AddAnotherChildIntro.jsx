// src/pages/parent/myfamily/AddAnotherChildIntro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined, LeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import CircularBackground from "@/components/layouts/CircularBackground";
import buddyImg from "@/assets/buddies/kibundo-buddy.png";

export default function AddAnotherChildIntro() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <CircularBackground>
      <div
        className="relative z-10 w-full"
        style={{ maxWidth: "752px", margin: "0 auto", padding: "75px 24px 24px" }}
      >
          {/* Back button + title row */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                position: "absolute",
                left: 0,
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#D9D9D9",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <LeftOutlined style={{ color: "#544C3B", fontSize: 18 }} />
            </button>

            <h1
              style={{
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "50px",
                lineHeight: "68px",
                letterSpacing: "2%",
                textAlign: "center",
                color: "#544C3B",
                margin: 0,
              }}
            >
              {t("parent.addChild.more.title", "Los geht‘s")}
            </h1>
          </div>

          {/* Kibundo illustration */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <img
              src={buddyImg}
              alt="Kibundo Buddy"
              style={{ width: "191px", height: "375px", objectFit: "contain" }}
              draggable={false}
            />
          </div>

          {/* Headline and copy */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "35px",
                lineHeight: "1.364",
                color: "#87A01D",
                marginBottom: "12px",
              }}
            >
              {t("parent.addChild.more.headline", "Weiteres Kind anlegen")}
            </div>
            <p
              style={{
                fontFamily: "Nunito",
                fontWeight: 400,
                fontSize: "18px",
                lineHeight: "1.364",
                color: "#000000",
                maxWidth: "476px",
                margin: "0 auto",
              }}
            >
              {t(
                "parent.addChild.more.copy",
                "Du kannst für mehrere Kinder Konten hinzufügen. Das Hinzufügen ist jederzeit auch nachträglich möglich. Für jedes weitere Kind erhälst Du eine Vergünstigung."
              )}
            </p>
          </div>

          {/* Primary CTA card - Kind hinzufügen */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <button
              type="button"
              onClick={() => navigate("/parent/myfamily/add-student-flow?step=0")}
              style={{
                position: "relative",
                width: "260px",
                height: "165px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.25)",
                border: "2px dashed #FFFFFF",
                boxShadow: "1.5px 1.5px 6px rgba(0,0,0,0.25)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#EF7C2E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "1.5px 1.5px 6px rgba(0,0,0,0.25)",
                  marginBottom: "16px",
                }}
              >
                <PlusOutlined style={{ color: "#FFFFFF", fontSize: 28 }} />
              </div>
              <div
                style={{
                  fontFamily: "Nunito",
                  fontWeight: 900,
                  fontSize: "25px",
                  lineHeight: "1.364",
                  color: "#544C3B",
                }}
              >
                {t("parent.addChild.more.cta", "Kind hinzufügen")}
              </div>
            </button>
          </div>

          {/* Secondary CTA - Überspringen */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => navigate("/parent/home")}
              style={{
                width: "275px",
                height: "65px",
                borderRadius: "32px",
                background: "#EF7C2E",
                boxShadow: "1px 1px 4px rgba(0,0,0,0.25)",
                border: "none",
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "25px",
                letterSpacing: "2%",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              {t("parent.addChild.more.skip", "Überspringen")}
            </button>
          </div>
        </div>
    </CircularBackground>
  );
}
