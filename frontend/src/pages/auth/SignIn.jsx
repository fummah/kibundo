// src/pages/auth/SignIn.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Input, Button, Typography } from "antd";
import { UserOutlined, LockOutlined, LeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import api from "@/api/axios";
import heroImage from "@/assets/onboarding-dino.png";
import globalBg from "@/assets/backgrounds/global-bg.png";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";
import {
  hasSeenIntro,
  hasDoneTour,
} from "@/pages/student/onboarding/introFlags";

const { Title, Text } = Typography;

/* ----------------------------- helpers ----------------------------- */
function extractToken(resp) {
  const d = resp?.data || {};
  let t =
    d.token ??
    d.access_token ??
    d.jwt ??
    d?.data?.token ??
    d?.data?.access_token ??
    null;

  if (!t) {
    const authHeader =
      resp?.headers?.authorization ||
      resp?.headers?.Authorization ||
      d?.authorization;
    if (authHeader && typeof authHeader === "string") {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        t = parts[1];
      }
    }
  }
  return t || null;
}

function normalizeRoleId(user) {
  return Number(user?.role_id ?? user?.roleId ?? user?.role?.id ?? NaN);
}

/* ------------------------------ page ------------------------------- */
export default function SignIn() {
  const { i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error("Bitte gib deine E-Mail und dein Passwort ein");
      return;
    }

    try {
      setLoading(true);
      const loginPayload = { username: email, password };
      const resp = await api.post("/auth/login", loginPayload);
      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp);

      if (!user || !token) {
        return;
      }

      const roleId = normalizeRoleId(user);
      login(user, token);
      toast.success("Erfolgreich angemeldet!");

      if (roleId === ROLES.STUDENT) {
        // Always show start screen after login (intro screen appears first every time)
        navigate("/student/onboarding/welcome-intro", { replace: true });
        return;
      }

      if (roleId === ROLES.PARENT) {
        sessionStorage.removeItem("redirect_to_account_after_subscription");
        navigate("/parent/account", { replace: true });
        return;
      }

      const rolePath = ROLE_PATHS[roleId] || "/dashboard";
      navigate(rolePath, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        (status === 401 && "E-Mail oder Passwort ist ungültig.") ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Anmeldung fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const goForgot = () => navigate("/forgot-password");

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

        <Toaster position="top-center" />

        <div
          className="relative z-10 w-full"
          style={{ maxWidth: "752px", margin: "0 auto", padding: "75px 24px 24px" }}
        >
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            style={{
              position: "absolute",
              left: 48,
              top: 48,
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

          {/* Title */}
          <div
            style={{
              marginBottom: "32px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "45px",
                lineHeight: "1.364",
                letterSpacing: "2%",
                textAlign: "center",
                color: "#544C3B",
                margin: 0,
              }}
            >
              Anmelden
            </h1>
          </div>

          {/* Kibundo image in center (like Figma) */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "178px",
                height: "350px",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <img
                src={heroImage}
                alt="Kibundo"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>

          {/* Slogan from startscreen Figma: Hausaufgaben mit Spaß und in Deinem Tempo */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            <Text
              style={{
                fontFamily: "Nunito",
                fontWeight: 400,
                fontSize: "18px",
                lineHeight: "1.364",
                color: "#287D7F",
              }}
            >
              Hausaufgaben mit Spaß
              <br />
              und in Deinem Tempo
            </Text>
          </div>

          {/* Form card like Group 17 (350px wide) */}
          <div style={{ maxWidth: "350px", margin: "0 auto" }}>
            <div
              style={{
                width: "350px",
                height: "52px",
                borderRadius: "12px",
                border: "1px solid #C9B7A7",
                background: "#FFFFFF",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                boxSizing: "border-box",
              }}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="E-Mail oder Benutzername"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                bordered={false}
                style={{
                  padding: 0,
                  boxShadow: "none",
                }}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div
              style={{
                width: "350px",
                height: "52px",
                borderRadius: "12px",
                border: "1px solid #C9B7A7",
                background: "#FFFFFF",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                boxSizing: "border-box",
              }}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bordered={false}
                style={{
                  padding: 0,
                  boxShadow: "none",
                }}
                autoComplete="current-password"
                onPressEnter={handleSubmit}
              />
            </div>

            <div
              style={{
                marginBottom: "16px",
                textAlign: "right",
              }}
            >
              <Text
                className="cursor-pointer"
                style={{
                  fontFamily: "Nunito",
                  fontWeight: 400,
                  fontSize: "16px",
                  color: "#EF7C2E",
                }}
                onClick={goForgot}
              >
                Passwort vergessen?
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={loading}
              style={{
                width: "275px",
                height: "65px",
                borderRadius: "32px",
                background: "#EF7C2E",
                border: "none",
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "25px",
                color: "#FFFFFF",
                letterSpacing: "2%",
                display: "block",
                margin: "0 auto 16px",
              }}
            >
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </Button>

            <div
              style={{
                textAlign: "center",
                fontFamily: "Nunito",
                fontWeight: 400,
                fontSize: "18px",
                color: "#544C3B",
              }}
            >
              Noch kein Konto?{" "}
              <Link
                to="/signup"
                style={{
                  fontWeight: 900,
                  color: "#EF7C2E",
                }}
              >
                Registrieren
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
