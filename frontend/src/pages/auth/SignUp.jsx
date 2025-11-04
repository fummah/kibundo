// src/pages/auth/SignUp.jsx
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Button, Select, Typography } from "antd";
import {
  PhoneOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import { useAuthContext } from "@/context/AuthContext";

// Onboarding flags (clear them on fresh student signup)
import { INTRO_LS_KEY, TOUR_LS_KEY } from "@/pages/student/onboarding/introFlags";

const { Title, Text } = Typography;
const { Option } = Select;

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

  const bundeslandOptions = useMemo(
    () =>
      BUNDESLAENDER.map((name) => (
        <Option key={name} value={name}>
          {name}
        </Option>
      )),
    []
  );

  const handleFinish = async (values) => {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      confirm_password,
      role,        // "student" | "parent" | "teacher"
      bundesland,  // required
    } = values;

    // UI role -> backend role_id
    const roleMap = { 
      parent: ROLES.PARENT,  // 2
      teacher: ROLES.TEACHER // 3
    };
    
    // Debug: Log actual values
    console.log("🔍 Frontend signup - Role selection:", role);
    console.log("🔍 Role type:", typeof role);
    console.log("🔍 ROLES.PARENT =", ROLES.PARENT);
    console.log("🔍 ROLES.TEACHER =", ROLES.TEACHER);
    console.log("🔍 Role map:", roleMap);
    
    // Normalize role to lowercase string
    const normalizedRole = String(role || "").toLowerCase().trim();
    console.log("🔍 Normalized role:", normalizedRole);
    
    const role_id = roleMap[normalizedRole];
    
    console.log("🎯 Frontend signup - Mapped role_id:", role_id);
    console.log("🎯 Selected role string:", normalizedRole);
    console.log("🎯 Expected for 'parent':", ROLES.PARENT);
    console.log("🎯 Expected for 'teacher':", ROLES.TEACHER);
    
    if (!role_id) {
      console.error("❌ Invalid role selected. Role value:", role, "Normalized:", normalizedRole);
      console.error("❌ Available roles in map:", Object.keys(roleMap));
      toast.error(`Invalid role selected: ${role}`);
      return;
    }

    const payload = {
      first_name,
      last_name,
      email,
      phone,
      password,
      confirm_password,
      role_id,
      bundesland,
    };
    
    console.log("📤 Frontend signup - Sending payload:");
    console.log("  - first_name:", first_name);
    console.log("  - email:", email);
    console.log("  - role_id:", role_id, "(type:", typeof role_id, ")");
    console.log("  - original role value:", role);
    console.log("  - bundesland:", bundesland);

    try {
      setLoading(true);
      const resp = await api.post("/auth/signup", payload);

      // Normalize user & token from various backend response shapes
      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp) ?? resp?.data?.token ?? null;

      if (!user || !token) {
        // Let backend/interceptor handle error messages; avoid duplicate toasts
        return;
      }

      // Log user into context (persists tiny summary and sets axios header/token)
      login(user, token);
      
      // Verify the user role matches what we expected
      const userRoleId = normalizeRoleId(user, role_id);
      console.log("✅ Signup response received");
      console.log("  - Expected role_id:", role_id);
      console.log("  - User role_id from response:", userRoleId);
      console.log("  - User object role_id:", user?.role_id);
      console.log("  - User object:", user);
      
      if (userRoleId !== role_id) {
        console.error("⚠️ ERROR: User role_id doesn't match expected role_id!");
        console.error("  - Expected:", role_id);
        console.error("  - Actual:", userRoleId);
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
      const rolePath = ROLE_PATHS[resolvedRoleId] || ROLE_PATHS[role_id] || "/dashboard";
      
      console.log("🚀 Navigation details:");
      console.log("  - Expected role_id:", role_id);
      console.log("  - User role_id from response:", userRoleId);
      console.log("  - Resolved role_id:", resolvedRoleId);
      console.log("  - Role path for resolvedRoleId:", ROLE_PATHS[resolvedRoleId]);
      console.log("  - Role path for role_id:", ROLE_PATHS[role_id]);
      console.log("  - Final navigation path:", rolePath);
      
      // Double-check: if there's a mismatch, use the expected role_id
      const finalRoleId = userRoleId === role_id ? resolvedRoleId : role_id;
      const finalPath = ROLE_PATHS[finalRoleId] || "/dashboard";
      
      console.log("  - Using final role_id:", finalRoleId);
      console.log("  - Using final path:", finalPath);
      
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-tr from-blue-100 via-white to-purple-100">
      <Toaster position="top-center" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl p-8">
        <Title level={3} className="text-center mb-6 text-indigo-700">
          Create Your Account
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          requiredMark={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: "Please enter your first name" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="First Name"
                autoComplete="given-name"
                disabled={loading}
              />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: "Please enter your last name" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Last Name"
                autoComplete="family-name"
                disabled={loading}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email address"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: "Phone number is required" },
              { 
                pattern: /^(\+49|0)[1-9]\d{1,14}$/, 
                message: "Please enter a valid German phone number (e.g., +49 30 12345678 or 030 12345678)" 
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="+49 30 12345678"
              autoComplete="tel"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="bundesland"
            label="Bundesland"
            rules={[{ required: true, message: "Bitte Bundesland auswählen" }]}
          >
            <Select
              placeholder="Bundesland wählen"
              showSearch
              optionFilterProp="children"
              disabled={loading}
            >
              {bundeslandOptions}
            </Select>
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
            initialValue={null}
          >
            <Select 
              placeholder="Select Role" 
              disabled={loading}
              onChange={(value) => {
                console.log("🎯 Role Select onChange - Selected value:", value);
                console.log("🎯 Role Select onChange - Value type:", typeof value);
              }}
            >
              <Option value="parent">Parent</Option>
              <Option value="teacher">Teacher</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Enter a password" }]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              autoComplete="new-password"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm Password"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm password"
              autoComplete="new-password"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </Form.Item>

          <Text className="block text-center">
            Already have an account?{" "}
            <Link to="/signin" className="text-indigo-600 hover:underline">
              Sign In
            </Link>
          </Text>
        </Form>
      </div>
    </div>
  );
}
