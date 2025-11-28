// src/pages/auth/SignUp.jsx
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Select, Typography, Checkbox } from "antd";
import { DownOutlined, LeftOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import { useAuthContext } from "@/context/AuthContext";
import { INTRO_LS_KEY, TOUR_LS_KEY } from "@/pages/student/onboarding/introFlags";
import CircularBackground from "@/components/layouts/CircularBackground";

const { Title, Text } = Typography;

const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

/* helpers */
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

function normalizeRoleId(user, fallback) {
  return Number(user?.role_id ?? user?.roleId ?? user?.role?.id ?? fallback);
}

/* page */
export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const inputClass =
    "h-12 w-full rounded-2xl border border-[#E9DED2] bg-white px-4 text-base text-[#4F3A2D] placeholder:text-[#BCB1A8] shadow-[0_6px_16px_rgba(87,60,42,0.08)] focus:border-[#FF9A36] focus:shadow-[0_10px_24px_rgba(255,154,54,0.28)] transition";

  const bundeslandOptions = useMemo(
    () =>
      BUNDESLAENDER.map((name) => ({
        label: name,
        value: name,
      })),
    []
  );

  const handleFinish = async (values) => {
    const {
      first_name,
      last_name,
      email,
      password,
      confirm_password,
      bundesland,
    } = values;

    const role_id = ROLES.PARENT;

    const payload = {
      first_name,
      last_name,
      email,
      password,
      role_id,
      bundesland,
      confirm_password,
    };

    try {
      setLoading(true);
      const resp = await api.post("/auth/signup", payload);

      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp) ?? resp?.data?.token ?? null;

      if (!user || !token) return;

      login(user, token);

      const userRoleId = normalizeRoleId(user, role_id);
      if (userRoleId !== role_id) {
        toast.error(`Role mismatch! Expected ${role_id} but got ${userRoleId}`);
      }

      toast.success("Konto erstellt!");

      if (role_id === ROLES.STUDENT) {
        try {
          localStorage.removeItem(INTRO_LS_KEY);
          localStorage.removeItem(TOUR_LS_KEY);
        } catch {}
        navigate("/student/onboarding/welcome-intro", { replace: true });
        return;
      }

      const resolvedRoleId = normalizeRoleId(user, role_id);
      const finalRoleId = userRoleId === role_id ? resolvedRoleId : role_id;
      const finalPath = ROLE_PATHS[finalRoleId] || "/dashboard";

      if (finalRoleId === ROLES.PARENT) {
        navigate("/signup/success", {
          replace: true,
          state: { next: finalPath },
        });
        return;
      }

      navigate(finalPath, { replace: true });
    } catch (err) {
      const status = err?.response?.status;

      if (status === 422 && err?.response?.data?.errors) {
        const fields = Object.entries(err.response.data.errors).map(
          ([name, errors]) => ({
            name,
            errors: Array.isArray(errors) ? errors : [String(errors)],
          })
        );
        form.setFields(fields);
      }

      const isConflict = status === 409;
      const msg =
        (isConflict && "Ein Konto mit diesen Daten existiert bereits.") ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Registrierung fehlgeschlagen";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CircularBackground>
      <Toaster position="top-center" />

      <div className="w-full max-w-[600px] md:max-w-[800px] h-screen flex flex-col overflow-hidden mx-auto">
        {/* Back button + centered title */}
        <div className="mb-4 flex items-center flex-shrink-0 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4E3D3] shadow-[0_4px_10px_rgba(87,60,42,0.18)]"
          >
            <LeftOutlined className="text-base text-[#4F3A2D]" />
          </button>
          <div className="flex-1">
            <Title
              level={2}
              className="m-0 text-center font-semibold !text-[#4F3A2D] text-xl md:text-2xl"
            >
              Registrieren
            </Title>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <Form
            form={form}
            onFinish={handleFinish}
            autoComplete="off"
            requiredMark={false}
            layout="vertical"
            className="space-y-0 pb-4"
            colon={false}
          >
          <Form.Item
            name="first_name"
            rules={[{ required: true, message: "Bitte geben Sie Ihren Vornamen ein" }]}
            className="mb-3"
            label={<span className="hidden">Vorname</span>}
          >
            <Input
              placeholder="Vorname"
              autoComplete="given-name"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item
            name="last_name"
            rules={[{ required: true, message: "Bitte geben Sie Ihren Nachnamen ein" }]}
            className="mb-3"
            label={<span className="hidden">Nachname</span>}
          >
            <Input
              placeholder="Nachname"
              autoComplete="family-name"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item
            name="bundesland"
            rules={[{ required: false }]}
            className="mb-3"
            label={<span className="hidden">Bundesland (fakultativ)</span>}
          >
            <div className={`${inputClass} flex items-center !px-0`}>
              <Select
                placeholder="Bundesland auswählen (fakultativ)"
                disabled={loading}
                showSearch
                optionFilterProp="label"
                options={bundeslandOptions}
                variant="borderless"
                className="h-full w-full text-base text-[#4F3A2D]"
                classNames={{ popup: "rounded-2xl" }}
                suffixIcon={<DownOutlined className="text-[#BCB1A8]" />}
              />
            </div>
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "E-Mail ist erforderlich" },
              { type: "email", message: "Ungültige E-Mail-Adresse" },
            ]}
            className="mb-1"
            label={<span className="hidden">E-Mail</span>}
          >
            <Input
              placeholder="E-Mail-Adresse"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item className="mb-3">
            <Text className="text-xs text-[#816B5B]">
              Diese E-Mail-Adresse wird auch Ihr Benutzername beim Anmelden sein.
            </Text>
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Bitte geben Sie ein Passwort ein" },
              {
                min: 6,
                message: "Das Passwort muss mindestens 6 Zeichen lang sein",
              },
            ]}
            className="mb-3"
            label={<span className="hidden">Passwort</span>}
          >
            <Input.Password
              placeholder="Passwort"
              autoComplete="new-password"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Bitte bestätigen Sie Ihr Passwort" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Die Passwörter stimmen nicht überein")
                  );
                },
              }),
            ]}
            className="mb-4"
            label={<span className="hidden">Passwort bestätigen</span>}
          >
            <Input.Password
              placeholder="Passwort bestätigen"
              autoComplete="new-password"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item
            name="acceptTerms"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          "Bitte akzeptieren Sie die Datenschutzerklärung und die Allgemeinen Geschäftsbedingungen"
                        )
                      ),
              },
            ]}
            className="mb-4"
          >
            <Checkbox disabled={loading} className="text-sm text-[#4F3A2D]">
              Ich akzeptiere die{" "}
              <Link
                to="/privacy-policy"
                className="text-[#FF8400] underline hover:text-[#FF7600]"
              >
                Datenschutzerklärung
              </Link>{" "}
              und die{" "}
              <Link
                to="/terms"
                className="text-[#FF8400] underline hover:text-[#FF7600]"
              >
                Allgemeinen Geschäftsbedingungen
              </Link>
              .
            </Checkbox>
          </Form.Item>

          <div className="mt-6 text-center text-sm font-medium text-[#816B5B] tracking-wide">
            7 Tage kostenlos testen ohne Risiko!
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 h-14 w-full rounded-full bg-[#FF8400] text-lg font-semibold text-white shadow-[0_12px_24px_rgba(255,132,0,0.35)] transition hover:bg-[#FF7600] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? "Wird registriert..." : "Registrieren"}
          </button>

          <Text className="mt-5 block text-center text-sm text-[#816B5B]">
            Bereits ein Konto?{" "}
            <Link to="/signin" className="font-semibold text-[#FF8400]">
              Anmelden
            </Link>
          </Text>
        </Form>
        </div>
      </div>
    </CircularBackground>
  );
}
