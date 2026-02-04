import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Card, Form, Input, Button, Typography } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import api from "../../api/axios";
import globalBg from "@/assets/backgrounds/global-bg.png";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return toast.error("Please enter your email.");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: form.email });
      toast.success("Reset instructions sent to your email.");
      setSent(true);
      setTimeout(() => {
        navigate("/signin");
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
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

        <div className="relative z-10 flex items-center justify-center px-4 py-10 min-h-screen">
          <Toaster position="top-center" />
          <Card
            className="w-full max-w-md"
            styles={{ body: { padding: 28 } }}
            style={{ borderRadius: 18, background: "rgba(255,255,255,0.95)" }}
          >
            <div className="mb-6">
              <Typography.Title level={3} style={{ marginBottom: 4, textAlign: "center" }}>
                Forgot password
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, textAlign: "center", opacity: 0.75 }}>
                {sent
                  ? "If the email exists, we’ve sent a reset link. Please check your inbox (and spam folder)."
                  : "Enter your email and we’ll send you a secure reset link."}
              </Typography.Paragraph>
            </div>

            {sent ? (
              <div className="space-y-2">
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate("/signin")}
                  style={{ borderRadius: 12, height: 44 }}
                >
                  Continue to sign in
                </Button>
              </div>
            ) : (
              <Form layout="vertical" onSubmitCapture={handleSubmit} requiredMark={false}>
                <Form.Item label="Email" required>
                  <Input
                    size="large"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    prefix={<MailOutlined />}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  style={{ borderRadius: 12, height: 44 }}
                >
                  Send reset link
                </Button>

                <Button
                  type="link"
                  block
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate("/signin")}
                  style={{ marginTop: 10 }}
                >
                  Back to sign in
                </Button>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
