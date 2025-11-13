// src/pages/auth/SignUp.jsx
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Select, Typography } from "antd";
import { DownOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import { useAuthContext } from "@/context/AuthContext";

// Onboarding flags (clear them on fresh student signup)
import { INTRO_LS_KEY, TOUR_LS_KEY } from "@/pages/student/onboarding/introFlags";

const { Title, Text } = Typography;

/** German Bundesländer */
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

function normalizeRoleId(user, fallback) {
  return Number(user?.role_id ?? user?.roleId ?? user?.role?.id ?? fallback);
}

/* ------------------------------ page ------------------------------- */
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
      bundesland, // required
    } = values;

    const role_id = ROLES.PARENT;

    const payload = {
      first_name,
      last_name,
      email,
      password,
      role_id,
      bundesland,
      confirm_password: password,
    };

    try {
      setLoading(true);
      const resp = await api.post("/auth/signup", payload);

      // Normalize user & token from various backend response shapes
      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp) ?? resp?.data?.token ?? null;

      if (!user || !token) {
        return;
      }

      // Log user into context (persists tiny summary and sets axios header/token)
      login(user, token);
      
      // Verify the user role matches what we expected
      const userRoleId = normalizeRoleId(user, role_id);
      if (userRoleId !== role_id) {
        toast.error(`Role mismatch! Expected ${role_id} but got ${userRoleId}`);
      }
      
      toast.success("Account created!");

      // Student onboarding (force fresh intro/tour)
      if (role_id === ROLES.STUDENT) {
        try {
          localStorage.removeItem(INTRO_LS_KEY);
          localStorage.removeItem(TOUR_LS_KEY);
        } catch {}
        navigate("/student/onboarding/welcome-intro", { replace: true });
        return;
      }

      // Non-students → role landing
      // Use the role_id we sent (not the user's role_id from response, in case of mismatch)
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

      // Map backend validation errors (422) to form fields
      if (status === 422 && err?.response?.data?.errors) {
        const fields = Object.entries(err.response.data.errors).map(
          ([name, errors]) => ({
            name,
            errors: Array.isArray(errors) ? errors : [String(errors)],
          })
        );
        form.setFields(fields);
      }

      // Friendlier duplicate email/phone message
      const isConflict = status === 409;
      const msg =
        (isConflict && "An account with these details already exists.") ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center px-6 pt-24 pb-32 md:pb-24 lg:pb-28"
      style={{
        background:
          "linear-gradient(185deg, #F4BE9B 0%, #F2D6B1 45%, #EDE2CB 100%)",
      }}
    >
      <Toaster position="top-center" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-45%] bottom-[-82%] z-0 h-[150%] w-[190%] rounded-[50%] bg-[#F2E5D5]"
      />
      <div className="relative z-10 w-full max-w-[420px]">
        <Title
          level={2}
          className="text-center font-semibold !text-[#4F3A2D]"
        >
          Sign up
        </Title>
        <Form
          form={form}
          onFinish={handleFinish}
          autoComplete="off"
          requiredMark={false}
          layout="vertical"
          className="mt-9 space-y-0"
          colon={false}
        >
          <Form.Item
            name="first_name"
            rules={[{ required: true, message: "Please enter your first name" }]}
            className="mb-4"
            label={<span className="hidden">First Name</span>}
          >
            <Input
              placeholder="First Name"
              autoComplete="given-name"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>
          <Form.Item
            name="last_name"
            rules={[{ required: true, message: "Please enter your last name" }]}
            className="mb-4"
            label={<span className="hidden">Last Name</span>}
          >
            <Input
              placeholder="Last Name"
              autoComplete="family-name"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item
            name="bundesland"
            rules={[{ required: true, message: "Bitte Bundesland auswählen" }]}
            className="mb-4"
            label={<span className="hidden">Bundesland</span>}
          >
            <Select
              placeholder="Bundesland"
              disabled={loading}
              showSearch
              optionFilterProp="label"
              options={bundeslandOptions}
              className="custom-signup-select w-full text-base text-[#4F3A2D]"
              styles={{
                selector: {
                  borderRadius: 16,
                  border: "1px solid #E9DED2",
                  background: "#FFFFFF",
                  boxShadow: "0 6px 16px rgba(87, 60, 42, 0.08)",
                  padding: "0 16px",
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                },
                selectionItem: {
                  fontSize: 16,
                  lineHeight: "48px",
                  color: "#4F3A2D",
                },
                placeholder: {
                  fontSize: 16,
                  color: "#BCB1A8",
                  lineHeight: "48px",
                },
                input: {
                  height: 48,
                },
                dropdown: {
                  borderRadius: 16,
                },
              }}
              popupClassName="rounded-2xl"
              suffixIcon={<DownOutlined className="text-[#BCB1A8]" />}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
            className="mb-4"
            label={<span className="hidden">Email</span>}
          >
            <Input
              placeholder="Email address"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Enter a password" }]}
            className="mb-6"
            label={<span className="hidden">Password</span>}
          >
            <Input
              type="password"
              placeholder="Passwort"
              autoComplete="new-password"
              disabled={loading}
              className={inputClass}
            />
          </Form.Item>

          <div className="mt-10 text-center text-sm font-medium text-[#816B5B] tracking-wide" style={{ paddingTop: "60px" }}>XX Tage kostenlos testen und dann entscheiden!</div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 h-14 w-full rounded-full bg-[#FF8400] text-lg font-semibold text-white shadow-[0_12px_24px_rgba(255,132,0,0.35)] transition hover:bg-[#FF7600] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? "Signing up..." : "Sign up"}
          </button>

          <Text className="mt-7 block text-center text-sm text-[#816B5B]">
            Already have an account?{" "}
            <Link to="/signin" className="font-semibold text-[#FF8400]">
              Sign In
            </Link>
          </Text>

          <div className="pt-2 text-center text-sm font-medium text-[#816B5B]">
            {/* placeholder for spacing previously */}
          </div>
        </Form>
      </div>
    </div>
  );
}
