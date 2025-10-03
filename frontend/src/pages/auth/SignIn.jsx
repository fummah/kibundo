// src/pages/auth/SignIn.jsx
import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Button, Typography } from "antd";
import { MailOutlined, LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext";
import { ROLE_PATHS, ROLES } from "../../utils/roleMapper";
import Lottie from "lottie-react";
import loginAnimation from "../../assets/signup2.json";
import api from "../../api/axios";

/* Onboarding flags (no HMR conflicts) */
import { hasSeenIntro, hasDoneTour } from "@/pages/student/onboarding/introFlags";

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
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const goForgot = useCallback(() => navigate("/forgot-password"), [navigate]);

  const handleFinish = async (values) => {
    try {
      setLoading(true);

      const resp = await api.post("/auth/login", values);
      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp);

      if (!user || !token) {
        toast.error("Unexpected login response (missing user or token).");
        return;
      }

      console.log("🔑 Login successful, received token:", token);

      localStorage.setItem("kibundo_token", token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      const roleId = normalizeRoleId(user);
      login(user, token);
      toast.success("Login successful!");

      if (roleId === ROLES.STUDENT) {
        if (!hasSeenIntro()) {
          navigate("/student/onboarding/welcome-intro", { replace: true });
          return;
        }
        if (!hasDoneTour()) {
          navigate("/student/onboarding/welcome-tour", { replace: true });
          return;
        }
      }

      const rolePath = ROLE_PATHS[roleId] || "/dashboard";
      navigate(rolePath, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-white to-purple-100 relative">
      <Toaster position="top-center" />

      {/* 🔙 Back Button */}
      <div className="absolute top-6 left-6 z-50">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={goHome}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Back
        </Button>
      </div>

      <div className="flex w-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-xl">
        {/* 🔵 Left Section - Lottie */}
        <div className="hidden md:flex flex-col justify-center items-center bg-blue-600 p-8 w-1/2 text-white">
          <Lottie animationData={loginAnimation} loop className="w-full max-w-xs" />
          <Title level={3} className="!text-white mt-4 text-center">
            Welcome Back!
          </Title>
          <p className="text-sm text-center max-w-xs">
            Log in to your Kibundo account and continue your learning journey.
          </p>
        </div>

        {/* ✏️ Right Section - Form */}
        <div className="w-full md:w-1/2 p-8">
          <Title level={3} className="text-center text-gray-800 mb-6">
            Login to Kibundo
          </Title>

          <Form layout="vertical" onFinish={handleFinish}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Invalid email format" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter your email"
                className="rounded-md"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                className="rounded-md"
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="text-right mb-3">
              <Text
                className="text-indigo-600 hover:underline cursor-pointer"
                onClick={goForgot}
              >
                Forgot Password?
              </Text>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                loading={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Form.Item>

            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-indigo-600 hover:underline">
                Sign Up
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
