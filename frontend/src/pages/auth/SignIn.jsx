// src/pages/auth/SignIn.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Input, Button, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import api from "@/api/axios";
import heroImage from "@/assets/onboarding-dino.png";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";
import CircularBackground from "@/components/layouts/CircularBackground";
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
    <CircularBackground>
      <Toaster position="top-center" />

      <div className="flex min-h-screen flex-col items-center justify-between w-full">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <img
            src={heroImage}
            alt="Kibundo Buddy"
            style={{ width: "201px", height: "412px" }}
            className="drop-shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
          />
          <div className="space-y-3">
            <Title
              level={1}
              className="!m-0 text-4xl font-bold tracking-[0.08em] md:text-5xl"
              style={{ color: "#FF7F32", fontSize: "60px" }}
            >
              Kibundo
            </Title>
            <Text
              className="block text-base font-medium md:text-lg"
              style={{ color: "#31A892" }}
            >
              Hausaufgaben mit Spaß
              <br />
              und in Deinem Tempo
            </Text>
          </div>
        </div>

        <div className="w-full max-w-[600px] md:max-w-[800px] mb-8">
          <Title
            level={3}
            className="!mb-2 text-center text-2xl md:text-3xl font-semibold text-[#5A4C3A]"
          >
            Anmelden
          </Title>
          <Text className="mb-6 block text-center text-sm md:text-base text-[#8A8075]">
            Melde dich an, um mit Kibundo weiterzulernen.
          </Text>

          <div className="space-y-4">
            <Input
              size="large"
              prefix={<UserOutlined />} 
              placeholder="E-Mail oder Benutzername"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border-none bg-[#F6F1E8] py-2 text-base shadow-inner transition focus:bg-white focus:shadow-md"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />

            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full border-none bg-[#F6F1E8] py-2 text-base shadow-inner transition focus:bg-white focus:shadow-md"
              autoComplete="current-password"
              onPressEnter={handleSubmit}
            />

            <div className="mb-3 text-right">
              <Text
                className="cursor-pointer text-sm font-medium text-[#FF7F32] hover:underline"
                onClick={goForgot}
              >
                Passwort vergessen?
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              className="w-full rounded-full border-none bg-[#FF7F32] text-lg font-semibold tracking-wide shadow-lg transition hover:bg-[#ff6c12]"
              loading={loading}
            >
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </Button>

            <div className="text-center text-sm text-[#8A8075]">
              Noch kein Konto?{" "}
              <Link
                to="/signup"
                className="font-semibold text-[#FF7F32] hover:underline"
              >
                Registrieren
              </Link>
            </div>
          </div>
        </div>
      </div>
    </CircularBackground>
  );
}
