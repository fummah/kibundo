// src/pages/profile/CreateProfile.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Flex,
  Grid,
  Row,
  Col,
  Typography,
  Space,
  Badge,
} from "antd";
import {
  SoundOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

// ---- ASSETS (adjust if your relative paths differ)
import globalBg from "@/assets/backgrounds/global-bg.png";
import bottomBg from "@/assets/backgrounds/bottom.png";
import buddyImg from "@/assets/buddies/kibundo-buddy.png";

// You can replace these with your local avatar illustrations
import a1 from "@/assets/avatars/a1.png";
import a2 from "@/assets/avatars/a2.png";
import a3 from "@/assets/avatars/a3.png";
import a4 from "@/assets/avatars/a4.png";
import a5 from "@/assets/avatars/a5.png";
import a6 from "@/assets/avatars/a6.png";

export default function CreateProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const screens = useBreakpoint();

  const messageText = useMemo(
    () =>
      "Hall (Name), schön dich kennenzulernen. Wähle einen Avatar aus.",
    []
  );

  const avatars = useMemo(
    () => [
      { id: 1, src: a1, alt: "Avatar 1" },
      { id: 2, src: a2, alt: "Avatar 2" },
      { id: 3, src: a3, alt: "Avatar 3" },
      { id: 4, src: a4, alt: "Avatar 4" },
      { id: 5, src: a5, alt: "Avatar 5" },
      { id: 6, src: a6, alt: "Avatar 6" },
    ],
    []
  );

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(messageText);
      u.lang = "de-DE";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (_) {}
  };

  const handleCreate = () => {
    if (!selected) {
      // Keep it gentle—AntD notification not strictly required
      alert(t("profile.selectAvatar", "Bitte wähle zuerst einen Avatar."));
      return;
    }
    // Navigate to interests selection after avatar selection
    navigate("/student/onboarding/interests");
  };

  // --- styles
  const root = {
    minHeight: "100dvh",
    width: "100%",
    backgroundImage: `url(${globalBg})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center top",
    position: "relative",
    paddingBottom: "96px", // room for fixed CTA
  };

  const bottomDecor = {
    position: "fixed",
    insetInline: 0,
    bottom: 0,
    height: 140,
    backgroundImage: `url(${bottomBg})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center bottom",
    pointerEvents: "none",
    zIndex: 0,
  };

  const page = {
    maxWidth: 420, // close to 390px artboard but with a little room
    margin: "0 auto",
    padding: "16px 16px 0 16px",
    position: "relative",
    zIndex: 1,
  };

  const mascotWrap = {
    position: "relative",
    paddingTop: 8,
    paddingBottom: 8,
  };

  const mascotImg = {
    width: "56%",
    maxWidth: 240,
    filter: "drop-shadow(0 6px 18px rgba(0,0,0,.15))",
  };

  const bubble = {
    position: "absolute",
    left: "44%",
    top: screens.xs ? 6 : 0,
    width: 190,
    background: "rgba(255,255,255,.95)",
    borderRadius: 16,
    padding: "12px 14px",
    boxShadow: "0 6px 16px rgba(0,0,0,.08)",
  };

  const bubbleTail = {
    content: '""',
    position: "absolute",
    left: -10,
    bottom: 18,
    width: 0,
    height: 0,
    borderTop: "10px solid transparent",
    borderBottom: "10px solid transparent",
    borderRight: "12px solid rgba(255,255,255,.95)",
    filter: "drop-shadow(-1px 1px 0 rgba(0,0,0,.05))",
  };

  const soundBtn = {
    position: "absolute",
    left: 12,
    top: 12,
    background: "#fff",
    borderRadius: 999,
    boxShadow: "0 4px 12px rgba(0,0,0,.12)",
    padding: 10,
    cursor: "pointer",
  };

  const avatarCard = {
    width: 132,
    height: 132,
    borderRadius: "999px",
    overflow: "hidden",
    border: "2px solid #f0f0f0",
    boxShadow: "0 6px 14px rgba(0,0,0,.06)",
    position: "relative",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform .15s ease, box-shadow .15s ease, border-color .15s",
  };

  const gridWrap = {
    marginTop: 8,
    marginBottom: 8,
  };

  const ctaWrap = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 12,
    paddingInline: 16,
    zIndex: 2,
  };

  return (
    <div style={root}>
      <div style={page}>
        <Flex vertical gap={8}>
          <Title
            level={4}
            style={{ textAlign: "center", marginTop: 4, marginBottom: 4 }}
          >
            Profil
          </Title>

          {/* Mascot + bubble */}
          <div style={mascotWrap}>
            <div style={soundBtn} role="button" onClick={speak} aria-label="Vorlesen">
              <SoundOutlined />
            </div>

            <img src={buddyImg} alt="Kibundo Buddy" style={mascotImg} />

            <div style={bubble}>
              <span style={bubbleTail} />
              <Text style={{ fontSize: 13, lineHeight: 1.3, display: "block" }}>
                {messageText}
              </Text>
            </div>
          </div>

          {/* Section title */}
          <Title level={5} style={{ marginTop: 12 }}>
            Profilbild
          </Title>

          {/* Avatar grid */}
          <div style={gridWrap}>
            <Row gutter={[24, 24]} justify="space-between">
              {avatars.map((a) => {
                const isActive = selected === a.id;
                return (
                  <Col key={a.id} span={12} style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSelected(a.id)}
                      aria-pressed={isActive}
                      style={{
                        ...avatarCard,
                        borderColor: isActive ? "rgba(22,119,255,.35)" : "#f0f0f0",
                        boxShadow: isActive
                          ? "0 8px 18px rgba(22,119,255,.15)"
                          : avatarCard.boxShadow,
                        transform: isActive ? "translateY(-2px)" : "none",
                      }}
                    >
                      <img
                        src={a.src}
                        alt={a.alt}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        draggable={false}
                      />
                      {isActive && (
                        <CheckCircleFilled
                          style={{
                            position: "absolute",
                            right: 6,
                            bottom: 6,
                            fontSize: 22,
                            color: "#52c41a",
                            filter: "drop-shadow(0 2px 6px rgba(0,0,0,.25))",
                          }}
                        />
                      )}
                    </button>
                  </Col>
                );
              })}
            </Row>
          </div>
        </Flex>
      </div>

      {/* Bottom CTA */}
      <div style={ctaWrap}>
        <Button
          type="primary"
          size="large"
          block
          onClick={handleCreate}
          style={{
            height: 52,
            borderRadius: 999,
            background: "#ff4d4f", // red to match the mock
            border: "none",
            fontWeight: 600,
          }}
        >
          Profil erstellen
        </Button>
      </div>

      {/* Decorative bottom background */}
      <div style={bottomDecor} aria-hidden />
    </div>
  );
}
