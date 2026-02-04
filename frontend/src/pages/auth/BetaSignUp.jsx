// src/pages/auth/BetaSignUp.jsx
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Select, Typography, Checkbox } from "antd";
import { DownOutlined, LeftOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import { useAuthContext } from "@/context/AuthContext";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Text, Title } = Typography;

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
export default function BetaSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const inputClass =
    "h-12 w-full rounded-[12px] border border-[#C9B7A7] bg-white px-4 text-base text-[#4F3A2D] placeholder:text-[rgba(0,0,0,0.3)] shadow-sm focus:border-[#C9B7A7] focus:shadow-md transition";

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
      acceptTerms,
      acceptBetaTerms,
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
      is_beta: true,
    };

    try {
      setLoading(true);
      const resp = await api.post("/auth/beta-signup", payload);

      // Handle different response scenarios
      if (resp.data.converted_to_beta) {
        toast.success("Dein bestehender Account wurde für das Beta-Programm angemeldet!");
      } else {
        toast.success("Beta-Anmeldung erfolgreich! Wir werden dich benachrichtigen, sobald dein Zugang freigeschaltet wurde.");
      }

      // Redirect to a beta success page
      navigate("/beta-signup-success", { replace: true });
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
      let msg;
      
      if (isConflict) {
        if (err?.response?.data?.already_beta) {
          msg = "Du bist bereits für das Beta-Programm angemeldet.";
          if (err?.response?.data?.beta_status === 'pending') {
            msg += " Dein Status: Warten auf Freischaltung.";
          } else if (err?.response?.data?.beta_status === 'approved') {
            msg += " Dein Zugang wurde bereits freigeschaltet!";
          }
        } else {
          msg = "Ein Konto mit diesen Daten existiert bereits.";
        }
      } else {
        msg = err?.response?.data?.message ||
             err?.response?.data?.error ||
             err?.message ||
             "Beta-Registrierung fehlgeschlagen";
      }
      
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center bg-white overflow-hidden min-h-screen w-full relative">
      <div
        className="relative w-full"
        style={{
          maxWidth: "1280px",
          minHeight: "100vh",
          boxSizing: "border-box",
          background: "#FFFFFF",
          margin: "0 auto",
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

            <div style={{ textAlign: "center" }}>
              <h1
                style={{
                  fontFamily: "Nunito",
                  fontWeight: 900,
                  fontSize: "45px",
                  lineHeight: "1.364",
                  letterSpacing: "2%",
                  textAlign: "center",
                  color: "#544C3B",
                  margin: "0 0 16px 0",
                }}
              >
                Beta Programm
              </h1>
              <div
                style={{
                  backgroundColor: "#FF8400",
                  color: "white",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  display: "inline-block",
                  marginBottom: "16px",
                }}
              >
                Begrenzte Plätze verfügbar
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <Text style={{ fontSize: "16px", color: "#544C3B", lineHeight: "1.5" }}>
              Sei unter den Ersten, die Kibundo erleben!<br />
              Melde dich für unser Beta-Programm an und erhalte exklusiven Zugang<br />
              zu neuen Funktionen vor der offiziellen Veröffentlichung.
            </Text>
          </div>

          <Form
            form={form}
            onFinish={handleFinish}
            autoComplete="off"
            requiredMark={false}
            layout="vertical"
            className="space-y-0 pb-4 mx-auto"
            colon={false}
            style={{ maxWidth: "350px" }}
          >
            <Form.Item
              name="first_name"
              rules={[{ required: true, message: "Bitte geben Sie Ihren Vornamen ein" }]}
              className="mb-4"
              label={<span className="hidden">Vorname Elternteil</span>}
            >
              <Input
                placeholder="Vorname Elternteil"
                autoComplete="given-name"
                disabled={loading}
                className={inputClass}
              />
            </Form.Item>

            <Form.Item
              name="last_name"
              rules={[{ required: true, message: "Bitte geben Sie Ihren Nachnamen ein" }]}
              className="mb-4"
              label={<span className="hidden">Nachname Elternteil</span>}
            >
              <Input
                placeholder="Nachname Elternteil"
                autoComplete="family-name"
                disabled={loading}
                className={inputClass}
              />
            </Form.Item>

            <Form.Item
              name="bundesland"
              rules={[{ required: false }]}
              className="mb-4"
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
              className="mb-2"
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

            <Form.Item className="mb-4">
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
              className="mb-4"
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

            <Form.Item
              name="acceptBetaTerms"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            "Bitte akzeptieren Sie die Beta-Programmbedingungen"
                          )
                        ),
                },
              ]}
              className="mb-4"
            >
              <Checkbox disabled={loading} className="text-sm text-[#4F3A2D]">
                Ich verstehe, dass dies ein Beta-Programm ist und mein Zugang nach der Anmeldung manuell freigeschaltet werden muss. Ich bin einverstanden, Feedback zu geben und bei der Verbesserung von Kibundo zu helfen.
              </Checkbox>
            </Form.Item>

            <div className="mt-2 text-center text-sm font-medium text-[#816B5B] tracking-wide opacity-70">
              🚀 Exklusiver Zugang zu neuen Funktionen
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "20px",
                width: "275px",
                height: "65px",
                borderRadius: "32px",
                background: "#EF7C2E",
                boxShadow: "1px 1px 4px rgba(0,0,0,0.25)",
                border: "none",
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "25px",
                color: "#FFFFFF",
                letterSpacing: "2%",
                cursor: "pointer",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? "Wird angemeldet..." : "Für Beta anmelden"}
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
    </div>
  );
}
