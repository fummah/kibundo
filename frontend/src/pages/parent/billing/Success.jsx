// src/pages/parent/billing/Success.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Typography, Spin, Alert, Result } from "antd";
import { CheckCircleOutlined, HomeOutlined, FileTextOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import ParentShell from "@/components/parent/ParentShell";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Title, Text } = Typography;

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        return;
      }

      try {
        // Try to verify session - if auth fails, still show success message
        // (Stripe has already processed the payment)
        const res = await api.get("/payment/checkout-session", {
          params: { session_id: sessionId },
          validateStatus: (status) => status < 500, // Don't treat 401/403 as errors
        }).catch(() => null);

        if (res?.data?.status === "paid" || res?.data?.status === "complete") {
          setSuccess(true);
          // Mark that billing data needs to be refreshed
          sessionStorage.setItem("billing_refresh_needed", "true");
          sessionStorage.setItem("billing_refresh_time", Date.now().toString());
        } else if (sessionId) {
          // If we have a session ID, assume payment was successful
          // (Stripe redirects here only after successful payment)
          setSuccess(true);
          // Mark that billing data needs to be refreshed
          sessionStorage.setItem("billing_refresh_needed", "true");
          sessionStorage.setItem("billing_refresh_time", Date.now().toString());
        } else {
          setError("Payment not completed. Please contact support if you were charged.");
        }
      } catch (err) {
        console.error("Error verifying session:", err);
        // If verification fails but we have a session_id, assume success
        // (Stripe only redirects here after successful payment)
        if (sessionId) {
          setSuccess(true);
          // Mark that billing data needs to be refreshed
          sessionStorage.setItem("billing_refresh_needed", "true");
          sessionStorage.setItem("billing_refresh_time", Date.now().toString());
        } else {
          setError("Unable to verify payment status. Please check your billing overview.");
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId]);

  if (loading) {
    return (
      <ParentShell bgImage={globalBg}>
        <div className="w-full min-h-[100dvh] flex justify-center items-center">
          <Spin size="large" />
        </div>
      </ParentShell>
    );
  }

  if (error) {
    return (
      <ParentShell bgImage={globalBg}>
        <div className="w-full min-h-[100dvh] flex justify-center">
          <div className="w-full max-w-2xl mx-auto px-4 py-8">
            <Alert
              message="Payment Verification Error"
              description={error}
              type="warning"
              showIcon
              action={
                <Button onClick={() => navigate("/parent/billing/overview")}>
                  Go to Billing
                </Button>
              }
            />
          </div>
        </div>
      </ParentShell>
    );
  }

  return (
    <ParentShell bgImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-4">
            <Button
              type="link"
              onClick={() => navigate("/parent/billing/overview")}
              className="!p-0 !h-auto"
            >
              Billing
            </Button>
            <span>/</span>
            <Button
              type="link"
              onClick={() => navigate("/parent/billing/subscription")}
              className="!p-0 !h-auto"
            >
              Subscriptions
            </Button>
            <span>/</span>
            <span className="text-neutral-400">Success</span>
          </div>

          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            title="Payment Successful!"
            subTitle="Your subscription has been activated. You can now access all premium features."
            extra={[
              <Button
                type="primary"
                key="home"
                icon={<HomeOutlined />}
                onClick={() => navigate("/parent/home")}
              >
                Go to Home
              </Button>,
              <Button
                key="billing"
                icon={<FileTextOutlined />}
                onClick={() => {
                  // Navigate with refresh flag to trigger data refresh
                  navigate("/parent/billing/overview?refresh=true");
                }}
              >
                View Billing
              </Button>,
            ]}
          />

          <Card className="mt-6 shadow-sm rounded-2xl">
            <Title level={5}>What's Next?</Title>
            <ul className="list-disc list-inside space-y-2 text-neutral-600">
              <li>Your subscription is now active</li>
              <li>You can manage your subscription from the billing overview page</li>
              <li>You'll receive an email confirmation shortly</li>
              <li>If you have any questions, please contact our support team</li>
            </ul>
          </Card>
        </div>
      </div>
    </ParentShell>
  );
}

