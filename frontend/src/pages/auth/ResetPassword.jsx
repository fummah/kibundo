import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Card, Form, Input, Button, Typography } from "antd";
import { LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import globalBg from "@/assets/backgrounds/global-bg.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }
    if (!form.password) {
      toast.error("Please enter a new password.");
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password: form.password,
        confirm_password: form.confirm_password,
      });
      toast.success("Password updated successfully. You can now sign in.");
      setTimeout(() => navigate("/signin"), 800);
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
                Reset password
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, textAlign: "center", opacity: 0.75 }}>
                Choose a strong password to secure your account.
              </Typography.Paragraph>
            </div>

            <Form layout="vertical" onSubmitCapture={handleSubmit} requiredMark={false}>
              <Form.Item label="New password" required>
                <Input.Password
                  size="large"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  prefix={<LockOutlined />}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item label="Confirm new password" required>
                <Input.Password
                  size="large"
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  prefix={<LockOutlined />}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
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
                Update password
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
          </Card>
        </div>
      </div>
    </div>
  );
}
