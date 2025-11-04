// src/pages/parent/billing/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Button,
  Input,
  Typography,
  Space,
  Divider,
  Alert,
  Spin,
  message,
  Modal,
} from "antd";
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UpOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";
import ParentShell from "@/components/parent/ParentShell";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Title, Text } = Typography;

/* ----------------------------- Utilities ----------------------------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("plan");
  const promoCodeParam = searchParams.get("code");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [promoCode, setPromoCode] = useState(promoCodeParam || "");
  const [couponValid, setCouponValid] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [parentId, setParentId] = useState(null);
  const [error, setError] = useState(null);
  const [existingSubscription, setExistingSubscription] = useState(null);
  const [upgradeMode, setUpgradeMode] = useState(false);

  // Load plan and parent data
  useEffect(() => {
    const fetchData = async () => {
      if (!planId) {
        setError("No plan selected. Please go back and select a subscription plan.");
        setLoading(false);
        return;
      }

      try {
          // Get current user to find parent_id
          const userRes = await api.get("/current-user");
          const userId = userRes.data?.id;

        if (!userId) {
          setError("Please log in to continue.");
          setLoading(false);
          return;
        }

        // Get parent record
        const parentRes = await api.get("/parents", { params: { user_id: userId } });
        const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
        const parent = parents.find((p) => p.user_id === userId) || parents[0];

        if (!parent?.id) {
          setError("Parent account not found. Please contact support.");
          setLoading(false);
          return;
        }

        setParentId(parent.id);

        // Check for existing active subscriptions
        const subscriptionsRes = await api.get("/subscriptions", { params: { parent_id: parent.id } });
        const subscriptions = Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : [];
        
        // Find active or trialing subscription
        const activeSub = subscriptions.find(sub => {
          const status = String(sub.status || "").toLowerCase();
          return status === "active" || status === "trialing";
        });

        if (activeSub) {
          setExistingSubscription(activeSub);
          // Check if they're trying to upgrade to a different plan
          const currentPlanId = activeSub.plan_id || activeSub.product_id;
          if (String(currentPlanId) !== String(planId)) {
            setUpgradeMode(true);
          } else {
            setError("You already have an active subscription for this plan.");
            setLoading(false);
            return;
          }
        }

        // Get product/plan details
        const productRes = await api.get(`/product/${planId}`);
        const product = productRes.data;

        if (!product) {
          setError("Plan not found. Please select a different plan.");
          setLoading(false);
          return;
        }

        // Map product to plan format
        const plan = {
          id: product.id,
          name: product.name || "Subscription Plan",
          price_amount: parseFloat(product.price || 0),
          currency: "EUR",
          description: product.description || "",
          stripe_product_id: product.stripe_product_id,
        };

        setSelectedPlan(plan);

        // Validate coupon if provided
        if (promoCode) {
          await validateCoupon(promoCode);
        }
      } catch (err) {
        console.error("Failed to load checkout data:", err);
        setError(err?.response?.data?.message || "Failed to load checkout data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  // Validate coupon code
  const validateCoupon = async (code) => {
    if (!code.trim()) {
      setCouponValid(null);
      setCouponDiscount(0);
      return;
    }

    try {
      const couponsRes = await api.get("/coupons");
      const coupons = Array.isArray(couponsRes.data) ? couponsRes.data : [];
      const coupon = coupons.find(
        (c) => c.name?.toUpperCase() === code.trim().toUpperCase() && c.valid
      );

      if (coupon) {
        setCouponValid(true);
        // Calculate discount
        if (coupon.percent_off) {
          const discount = (selectedPlan?.price_amount || 0) * (coupon.percent_off / 100);
          setCouponDiscount(discount);
        } else if (coupon.amount_off_cents) {
          setCouponDiscount(coupon.amount_off_cents / 100);
        } else {
          setCouponDiscount(0);
        }
        message.success("Coupon applied successfully!");
      } else {
        setCouponValid(false);
        setCouponDiscount(0);
        message.error("Invalid or expired coupon code.");
      }
    } catch (err) {
      console.error("Coupon validation error:", err);
      setCouponValid(false);
      setCouponDiscount(0);
    }
  };

  const handleApplyCoupon = () => {
    validateCoupon(promoCode);
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !parentId) {
      message.error("Missing information. Please try again.");
      return;
    }

    // If upgrading, use upgrade endpoint
    if (upgradeMode && existingSubscription) {
      await handleUpgrade();
      return;
    }

    setProcessing(true);
    try {
      // Create Stripe checkout session
      // Pass frontend URL to backend so it knows where to redirect after payment
      const frontendUrl = window.location.origin;
      const checkoutRes = await api.post("/payment/create-checkout-session", {
        product_id: selectedPlan.id,
        parent_id: parentId,
        coupon_code: couponValid && promoCode ? promoCode.trim().toUpperCase() : null,
        frontend_url: frontendUrl,
      });

      // Redirect to Stripe Checkout
      // Note: Warnings in Stripe's checkout page (preload, module errors) are from Stripe's code
      // and don't affect functionality - they can be safely ignored
      const checkoutUrl = checkoutRes.data?.checkoutUrl || checkoutRes.data?.sessionUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else if (checkoutRes.data?.sessionId) {
        // Fallback: construct checkout URL if only sessionId is provided
        const stripeUrl = `https://checkout.stripe.com/c/pay/${checkoutRes.data.sessionId}`;
        window.location.href = stripeUrl;
      } else {
        message.error("Failed to create checkout session. Please try again.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      const errorMessage = err?.response?.data?.message || "Failed to process checkout. Please try again.";
      message.error(errorMessage);
      
      // If upgrade is available, suggest it
      if (err?.response?.data?.upgrade_available && err?.response?.data?.existing_subscription) {
        setTimeout(() => {
          message.info("Redirecting to subscription page to upgrade...", 3);
          setTimeout(() => {
            navigate("/parent/billing/subscription");
          }, 2000);
        }, 1000);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan || !parentId || !existingSubscription) {
      message.error("Missing information. Please try again.");
      return;
    }

    setProcessing(true);
    try {
      const upgradeRes = await api.post("/payment/upgrade-subscription", {
        subscription_id: existingSubscription.id,
        new_product_id: selectedPlan.id,
        coupon_code: couponValid && promoCode ? promoCode.trim().toUpperCase() : null,
      });

      if (upgradeRes.data?.success) {
        message.success("Subscription upgraded successfully!");
        // Redirect to billing overview after a short delay
        setTimeout(() => {
          navigate("/parent/billing/overview?refresh=true");
        }, 1500);
      } else {
        message.error(upgradeRes.data?.message || "Failed to upgrade subscription. Please try again.");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      message.error(
        err?.response?.data?.message || "Failed to upgrade subscription. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

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
              message="Error"
              description={error}
              type="error"
              showIcon
              action={
                <Button onClick={() => navigate("/parent/billing/subscription")}>
                  Go Back
                </Button>
              }
            />
          </div>
        </div>
      </ParentShell>
    );
  }

  const subtotal = selectedPlan?.price_amount || 0;
  const discount = couponDiscount;
  const total = Math.max(0, subtotal - discount);

  return (
    <ParentShell bgImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/parent/billing/subscription")}
            >
              Back
            </Button>
            <Title level={3} className="!mb-0">
              {upgradeMode ? "Upgrade Subscription" : "Checkout"}
            </Title>
          </div>

          {/* Upgrade Alert */}
          {upgradeMode && existingSubscription && (
            <Alert
              message="You already have an active subscription"
              description={
                <div>
                  <p className="mb-2">
                    You currently have an active subscription. Upgrading will replace your current plan.
                  </p>
                  <p className="text-sm text-gray-600">
                    Your current subscription will be canceled and replaced with the new plan.
                  </p>
                </div>
              }
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              className="mb-4"
            />
          )}

          {/* Order Summary */}
          <Card className="shadow-sm rounded-2xl">
            <Title level={5} className="!mb-4">
              Order Summary
            </Title>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Text type="secondary">Plan</Text>
                <Text strong>{selectedPlan?.name || "—"}</Text>
              </div>

              <Divider className="my-2" />

              <div className="flex justify-between">
                <Text type="secondary">Subtotal</Text>
                <Text strong>{money(subtotal, selectedPlan?.currency || "EUR")}</Text>
              </div>

              {couponValid && discount > 0 && (
                <div className="flex justify-between">
                  <Text type="secondary">Discount</Text>
                  <Text strong className="text-[#6D8F00]">
                    - {money(discount, selectedPlan?.currency || "EUR")}
                  </Text>
                </div>
              )}

              <Divider className="my-2" />

              <div className="flex justify-between text-lg">
                <Text strong>Total</Text>
                <Text strong className="text-[#E95F6A] text-xl">
                  {money(total, selectedPlan?.currency || "EUR")}
                </Text>
              </div>
            </div>
          </Card>

          {/* Coupon Code */}
          <Card className="shadow-sm rounded-2xl">
            <Title level={5} className="!mb-4">
              Promo Code
            </Title>
            <Space.Compact className="w-full">
              <Input
                size="large"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onPressEnter={handleApplyCoupon}
                disabled={processing}
                status={couponValid === false ? "error" : couponValid === true ? "success" : ""}
              />
              <Button
                size="large"
                type="primary"
                className="bg-[#C7D425] text-neutral-900"
                onClick={handleApplyCoupon}
                disabled={processing || !promoCode.trim()}
              >
                Apply
              </Button>
            </Space.Compact>
            {couponValid === false && (
              <Text type="danger" className="text-xs mt-2 block">
                Invalid or expired coupon code.
              </Text>
            )}
          </Card>

          {/* Payment Info */}
          <Card className="shadow-sm rounded-2xl">
            <Title level={5} className="!mb-4">
              <CreditCardOutlined className="mr-2" />
              Payment
            </Title>
            <Text type="secondary">
              You will be redirected to a secure payment page to complete your purchase.
              We accept all major credit cards.
            </Text>
          </Card>

          {/* Checkout/Upgrade Button */}
          <Button
            type="primary"
            size="large"
            block
            className="h-12 bg-[#C7D425] text-neutral-900 border-none hover:!bg-[#b8c61d]"
            icon={upgradeMode ? <UpOutlined /> : <CheckCircleOutlined />}
            onClick={handleCheckout}
            loading={processing}
            disabled={!selectedPlan}
          >
            {processing 
              ? (upgradeMode ? "Upgrading..." : "Processing...") 
              : (upgradeMode ? "Upgrade Subscription" : "Proceed to Payment")}
          </Button>

          {/* Security Notice */}
          <Text type="secondary" className="text-xs text-center block">
            Your payment information is secure and encrypted. We never store your card details.
          </Text>
        </div>
      </div>
    </ParentShell>
  );
}

