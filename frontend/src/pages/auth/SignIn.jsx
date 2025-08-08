import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Button, Typography } from "antd";
import { MailOutlined, LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext";
import { ROLE_PATHS } from "../../utils/roleMapper";
import Lottie from "lottie-react";
import loginAnimation from "../../assets/signup2.json";
import api from "../../api/axios";

const { Title, Text } = Typography;

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);

const handleFinish = async (values) => {
  try {
    const { data } = await api.post("/auth/login", values);
    

    console.log("Token:", data.token);
    console.log("User Role ID:", data.user.role_id);

    
    login(data.user, data.token);
    const rolePath = ROLE_PATHS[data.user.role_id] || "/dashboard";
    toast.success("Login successful!");
    navigate(rolePath, { replace: true });
  } catch (err) {
    toast.error(err.response?.data?.message || "Login failed");
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
          onClick={() => navigate("/")}
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
              />
            </Form.Item>

            <div className="text-right mb-3">
              <Text
                className="text-indigo-600 hover:underline cursor-pointer"
                onClick={() => navigate("/forgot-password")}
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
              <span
                className="text-indigo-600 hover:underline cursor-pointer"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </span>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
