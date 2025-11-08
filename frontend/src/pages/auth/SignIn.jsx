// src/pages/auth/SignIn.jsx
import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuthContext } from "@/context/AuthContext";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import api from "@/api/axios";
import heroImage from "@/assets/onboarding-dino.png";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";

// Onboarding flags
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
  const { t, i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const goForgot = useCallback(
    () => navigate("/forgot-password"),
    [navigate]
  );

  const handleFinish = async (values) => {
    try {
      setLoading(true);

      // Always send as username field, whether it's email or username
      const { email: emailOrUsername, password } = values;
      
      // Always use username field for backend
      const loginPayload = { username: emailOrUsername, password };
      const resp = await api.post("/auth/login", loginPayload);
      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp);


      if (!user || !token) {
        // Let backend/interceptor handle errors; avoid duplicate frontend toasts
        return;
      }

      // ✅ Update auth context (persists tiny summary and sets axios header/token)
      const roleId = normalizeRoleId(user);
      login(user, token);
      toast.success("Erfolgreich angemeldet!");

      // ✅ Student onboarding flow - check user-specific flags
      if (roleId === ROLES.STUDENT) {
        const studentId = user?.id || user?.user_id || null;
        if (!hasSeenIntro(studentId)) {
          navigate("/student/onboarding/welcome-intro", { replace: true });
          return;
        }
        if (!hasDoneTour(studentId)) {
          navigate("/student/onboarding/welcome-tour", { replace: true });
          return;
        }
      }

      // ✅ Role-based landing
      const rolePath = ROLE_PATHS[roleId] || "/dashboard";
      navigate(rolePath, { replace: true });
    } catch (err) {
      const status = err?.response?.status;

      // Map field errors (422) into the form
      if (status === 422 && err?.response?.data?.errors) {
        const fields = Object.entries(err.response.data.errors).map(
          ([name, errors]) => ({
            name,
            errors: Array.isArray(errors) ? errors : [String(errors)],
          })
        );
        form.setFields(fields);
      }

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

  if (!ready) {
    return (
      <div
        className="relative min-h-screen w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)",
        }}
      />
    );
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)",
      }}
    >
      <Toaster position="top-center" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-4 py-10">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <img
            src={heroImage}
            alt="Kibundo Buddy"
            className="w-full max-w-xs drop-shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
          />
          <div className="space-y-3">
            <Title
              level={1}
              className="!m-0 text-4xl font-bold tracking-[0.08em] md:text-5xl"
              style={{ color: "#FF7F32" }}
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

        <div className="w-full max-w-md rounded-[32px] bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <Title
            level={3}
            className="!mb-2 text-center text-2xl font-semibold text-[#5A4C3A]"
          >
            Willkommen zurück
          </Title>
          <Text className="mb-6 block text-center text-sm text-[#8A8075]">
            Melde dich an, um mit Kibundo weiterzulernen.
          </Text>

          <Form
            layout="vertical"
            form={form}
            onFinish={handleFinish}
            requiredMark={false}
            className="space-y-4"
          >
            <Form.Item
              name="email"
              rules={[
                {
                  required: true,
                  message: "Bitte gib deine E-Mail oder deinen Benutzernamen ein",
                },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();

                    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

                    if (isEmail) {
                      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Ungültiges E-Mail-Format"));
                    }

                    return /^[a-zA-Z0-9_]+$/.test(value)
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            "Der Benutzername darf nur Buchstaben, Zahlen und Unterstriche enthalten"
                          )
                        );
                  },
                },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="E-Mail oder Benutzername"
                className="rounded-full border-none bg-[#F6F1E8] py-2 text-base shadow-inner transition focus:bg-white focus:shadow-md"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Bitte gib dein Passwort ein" }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Passwort"
                className="rounded-full border-none bg-[#F6F1E8] py-2 text-base shadow-inner transition focus:bg-white focus:shadow-md"
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="mb-3 text-right">
              <Text
                className="cursor-pointer text-sm font-medium text-[#FF7F32] hover:underline"
                onClick={goForgot}
              >
                Passwort vergessen?
              </Text>
            </div>

            <Form.Item className="!mb-2">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full rounded-full border-none bg-[#FF7F32] text-lg font-semibold tracking-wide shadow-lg transition hover:bg-[#ff6c12]"
                loading={loading}
              >
                {loading ? t("auth.signIn") : t("auth.signIn")}
              </Button>
            </Form.Item>

            <div className="text-center text-sm text-[#8A8075]">
              {t("auth.noAccount")}{" "}
              <Link
                to="/signup"
                className="font-semibold text-[#FF7F32] hover:underline"
              >
                {t("auth.signUp")}
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
