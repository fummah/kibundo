// src/pages/Subscription.jsx
import { useMemo, useState, useEffect } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  Radio,
  Segmented,
  Space,
  Table,
  Typography,
  Spin,
  App,
  Alert,
} from "antd";
import { ArrowRightOutlined, CheckCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

import ParentShell from "@/components/parent/ParentShell";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Text, Title } = Typography;

/* ----------------------------- Utilities ----------------------------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

/* ----------------------------- Helper to convert product to plan ----------------------------- */
function productToPlan(product) {
  const metadata = product.metadata || {};
  
  // Try to infer billing interval from name or metadata, default to "month"
  let billingInterval = metadata.billing_interval;
  if (!billingInterval) {
    const name = (product.name || "").toLowerCase();
    if (name.includes("week") || name.includes("weekly")) billingInterval = "week";
    else if (name.includes("year") || name.includes("yearly") || name.includes("annual")) billingInterval = "year";
    else billingInterval = "month"; // Default
  }
  
  // Try to infer child count from name or metadata, default to 1
  let childCount = metadata.child_count;
  if (!childCount) {
    const name = (product.name || "").toLowerCase();
    if (name.includes("family") || name.includes("2") || name.includes("two")) childCount = 2;
    else childCount = 1; // Default
  }
  
  // Ensure childCount is a number
  childCount = parseInt(childCount) || 1;
  
  // Generate features based on product data - always show consistent features
  const features = [
    "Cancel anytime",
    billingInterval === "year" ? "Priority email support" : "Full platform access",
    `For ${childCount} ${childCount === 1 ? "child" : "children"}`,
  ];
  
  if (billingInterval === "year") {
    features.push("2 months free (equivalent)");
  }
  
  // Add trial period as a feature if it exists
  if (product.trial_period_days && product.trial_period_days > 0) {
    features.push(`${product.trial_period_days}-day free trial`);
  }
  
  return {
    id: product.id,
    name: product.name || "Subscription Plan",
    billing_interval: billingInterval,
    child_count: childCount,
    price_amount: parseFloat(product.price || 0),
    currency: "EUR",
    trial_days: product.trial_period_days || 0,
    is_best_value: metadata.is_best_value || false,
    features,
    sort_order: metadata.sort_order || 999,
    stripe_product_id: product.stripe_product_id,
  };
}

/* ----------------------------- Small Pieces ----------------------------- */
function Check({ text }) {
  return (
    <div className="flex items-center gap-2 text-neutral-700">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#6D8F00] text-white text-xs">
        ✓
      </span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-neutral-800">
          {plan.name}
          <span className="ml-2 text-xs font-normal text-neutral-500">
            ({plan.billing_interval}/{plan.child_count}{" "}
            {plan.child_count === 1 ? "child" : "children"})
          </span>
        </div>
        {plan.is_best_value ? <Badge color="#F6C89E" text="Best Value" /> : null}
      </div>

      <div className="mt-2">
        {plan.price_amount > 0 ? (
          <>
            <span className="text-3xl font-extrabold text-[#E95F6A]">
              {money(plan.price_amount, plan.currency)}
            </span>
            <span className="ml-2 font-semibold text-neutral-500">
              / {plan.billing_interval}
            </span>
          </>
        ) : (
          <span className="text-xl font-semibold text-neutral-500">
            Free
          </span>
        )}
        {plan.trial_days > 0 && (
          <div className="mt-1">
            <span className="text-xs text-[#6D8F00] font-semibold">
              {plan.trial_days}-day free trial
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1">
        {(plan.features ?? []).map((line, idx) => (
          <Check key={idx} text={line} />
        ))}
      </div>

      <div className="mt-4">
        <Button
          type={selected ? "primary" : "default"}
          block
          className={selected ? "bg-[#C7D425] text-neutral-900 border-none" : ""}
          icon={selected ? <CheckCircleOutlined /> : null}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(plan);
          }}
        >
          {selected ? "Selected" : "Choose package"}
        </Button>
      </div>
    </>
  );

  return (
    <Card
      hoverable
      onClick={() => onSelect(plan)}
      className={`rounded-3xl transition ${
        selected 
          ? "ring-2 ring-[#C7D425] border-[#C7D425] shadow-lg" 
          : "border-neutral-200"
      }`}
      styles={{ body: { padding: 16 } }}
    >
      {plan.is_best_value ? (
        <Badge.Ribbon text="Best Value" color="#F6C89E">
          <div className="pt-2">{body}</div>
        </Badge.Ribbon>
      ) : (
        body
      )}
    </Card>
  );
}

function PromoSummary({ selectedPlan, promoCode, setPromoCode }) {
  // Note: Coupon validation happens in checkout page
  // This is just for preview
  const subtotal = selectedPlan ? selectedPlan.price_amount : 0;
  const discount = 0; // Will be calculated in checkout
  const total = subtotal;

  return (
    <Card className="rounded-3xl border-0 shadow">
      <Title level={5} className="!m-0">
        Promo & Summary
      </Title>

      <Space.Compact className="w-full mt-3" aria-label="Apply promo code">
        <Input
          size="large"
          placeholder="Enter promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          disabled={!selectedPlan}
          aria-label="Promo code"
        />
        <Button
          size="large"
          type="primary"
          className="bg-[#C7D425] text-neutral-900"
          disabled={!selectedPlan}
          onClick={() => setPromoCode((c) => c.trim())}
        >
          Apply
        </Button>
      </Space.Compact>

      <div className="mt-4 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <Text type="secondary">Plan</Text>
          <Text strong>
            {selectedPlan
              ? `${selectedPlan.name}`
              : "No plan selected"}
          </Text>
        </div>
        {selectedPlan && (
          <div className="flex justify-between mt-1">
            <Text type="secondary" className="text-xs">Details</Text>
            <Text className="text-xs">
              {selectedPlan.billing_interval} · {selectedPlan.child_count} {selectedPlan.child_count === 1 ? "child" : "children"}
            </Text>
          </div>
        )}
        <div className="flex justify-between mt-1">
          <Text type="secondary">Subtotal</Text>
          <Text strong>{money(subtotal, "EUR")}</Text>
        </div>
        <div className="flex justify-between mt-1">
          <Text type="secondary">Discount</Text>
          <Text strong className={discount > 0 ? "text-[#6D8F00]" : ""}>
            - {money(discount, "EUR")}
          </Text>
        </div>
        <div className="flex justify-between mt-2">
          <Text>Total</Text>
          <Text strong className="text-[#E95F6A]">{money(total, "EUR")}</Text>
        </div>

        {!!promoCode && (
          <div className="mt-2 text-xs text-neutral-500">
            Promo code will be validated at checkout.
          </div>
        )}
      </div>
    </Card>
  );
}

function Comparison({ plans }) {
  if (!plans || plans.length === 0) {
    return null;
  }

  const columns = [
    { title: "Feature", dataIndex: "feature", key: "feature", width: 260, fixed: "left" },
    ...plans.map((p) => ({
      title: `${p.name} (${p.billing_interval})`,
      dataIndex: p.id,
      key: p.id,
      align: "center",
    })),
  ];

  const all = Array.from(new Set(plans.flatMap((p) => p.features || [])));
  const rows = all.map((feat, idx) => {
    const row = { key: idx, feature: feat };
    plans.forEach((p) => {
      row[p.id] = p.features?.includes(feat) ? "✓" : "—";
    });
    return row;
  });

  return (
    <Card className="rounded-3xl border-0 shadow">
      <Title level={5} className="!m-0 mb-3">
        Compare Plans
      </Title>
      <div className="overflow-x-auto -mx-2 px-2">
        <Table
          columns={columns}
          dataSource={rows}
          pagination={false}
          size="small"
          scroll={{ x: true }}
          rowClassName="text-sm"
        />
      </div>
    </Card>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Subscription() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [interval, setInterval] = useState("month"); // "week" | "month" | "year"
  const [childrenCount, setChildrenCount] = useState(1); // 1 | 2
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);

  // Load products from backend and check for active subscriptions
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/products");
        const productsList = Array.isArray(res.data) ? res.data : [];
        
        // Filter active products and convert to plans
        let plans = productsList
          .filter((p) => {
            // Filter out inactive products
            if (p.active === false) {
              return false;
            }
            
            // Filter out admin/test products (case-insensitive)
            const name = (p.name || "").toLowerCase().trim();
            if (name.includes("admin") || name.includes("test") || name === "admin") {
              return false;
            }
            
            // Allow products even if they don't have metadata - we'll use defaults
            return true;
          })
          .map(productToPlan);
        
        // Filter out plans with zero price and no trial (after conversion)
        plans = plans.filter((plan) => {
          // After conversion, filter out plans with zero price and no trial
          if (plan.price_amount <= 0 && plan.trial_days === 0) {
            return false;
          }
          return true;
        });
        
        // Remove duplicates by name (keep the one with lower sort_order or first occurrence)
        const seen = new Map();
        plans = plans.filter((plan) => {
          const key = `${plan.name.toLowerCase()}_${plan.billing_interval}_${plan.child_count}`;
          if (seen.has(key)) {
            // If duplicate, keep the one with lower sort_order
            const existing = seen.get(key);
            if (plan.sort_order < existing.sort_order) {
              seen.set(key, plan);
              return true;
            }
            return false;
          }
          seen.set(key, plan);
          return true;
        });
        
        setProducts(plans);

        // Check for active subscriptions
        try {
          const userRes = await api.get("/current-user");
          const userId = userRes.data?.id;
          if (userId) {
            const parentRes = await api.get("/parents", { params: { user_id: userId } });
            const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
            const parent = parents.find((p) => p.user_id === userId) || parents[0];
            
            if (parent?.id) {
              const subscriptionsRes = await api.get("/subscriptions", { params: { parent_id: parent.id } });
              const subscriptions = Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : [];
              
              const activeSub = subscriptions.find(sub => {
                const status = String(sub.status || "").toLowerCase();
                return status === "active" || status === "trialing";
              });
              
              if (activeSub) {
                setActiveSubscription(activeSub);
              }
            }
          }
        } catch (err) {
          console.warn("Failed to check active subscriptions:", err);
          // Don't block the page if subscription check fails
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        message.error("Failed to load subscription plans. Please try again.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    console.log(`🔍 Filtering ${products.length} plans by interval="${interval}" and child_count=${childrenCount}`);
    const subset = products.filter(
      (p) => p.billing_interval === interval && p.child_count === childrenCount
    ).slice();
    console.log(`✅ Filtered result: ${subset.length} plans match the criteria`);
    if (subset.length < products.length) {
      const excluded = products.filter(p => !(p.billing_interval === interval && p.child_count === childrenCount));
      console.log(`❌ Excluded ${excluded.length} plans:`, excluded.map(p => `${p.name} (${p.billing_interval}/${p.child_count})`));
    }
    subset.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    return subset;
  }, [products, interval, childrenCount]);

  const allForComparison = useMemo(() => filtered, [filtered]);

  const selectedStillVisible = selectedPlan
    ? filtered.some((p) => p.id === selectedPlan.id)
    : false;
  const currentSelected = selectedStillVisible ? selectedPlan : null;

  const handleContinue = () => {
    if (!currentSelected) return;
    const code = promoCode.trim();
    const url = `/parent/billing/checkout?plan=${encodeURIComponent(
      currentSelected.id
    )}${code ? `&code=${encodeURIComponent(code.toUpperCase())}` : ""}`;
    navigate(url);
  };

  const selectedPrice = currentSelected?.price_amount ?? 0;
  const discount =
    promoCode.trim().toUpperCase() === "WELCOME20"
      ? +(selectedPrice * 0.2).toFixed(2)
      : 0;
  const total = +(selectedPrice - discount).toFixed(2);

  if (loading) {
    return (
      <App>
        <ParentShell bgImage={globalBg}>
          <div className="w-full min-h-[100dvh] flex justify-center items-center">
            <Spin size="large" />
          </div>
        </ParentShell>
      </App>
    );
  }

  return (
    <App>
      <ParentShell bgImage={globalBg}>
      <div className="w-full min-h-[100dvh]">
        {/* Responsive layout - no frame */}
        <main className="w-full max-w-7xl mx-auto px-4 md:px-8">
          {/* Page header */}
          <div className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/parent/billing/overview")}
                className="flex items-center"
              >
                Back
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-800 m-0">
              Subscriptions
            </h1>
          </div>

          {/* Active Subscription Alert */}
          {activeSubscription && (
            <div className="mt-3">
              <Alert
                message="You have an active subscription"
                description={
                  <div>
                    <p className="mb-1">
                      You currently have an active subscription. Selecting a different plan will upgrade your subscription.
                    </p>
                    <p className="text-sm text-gray-600">
                      Your current subscription will be replaced with the new plan you select.
                    </p>
                  </div>
                }
                type="info"
                showIcon
                closable
                className="rounded-2xl"
              />
            </div>
          )}

          {/* Hero / Controls */}
          <div>
            <div className="mt-3 rounded-3xl bg-white/80 p-5 shadow">
              <div className="md:flex md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold m-0">
                    Choose Your Subscription
                  </h2>
                  <p className="mt-1 text-neutral-600">
                    Flexible packages for 1 or 2 children. Change or cancel
                    anytime.
                  </p>
                </div>

                <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
                  <Segmented
                    size="large"
                    options={[
                      { label: "Weekly", value: "week" },
                      { label: "Monthly", value: "month" },
                      { label: "Yearly", value: "year" },
                    ]}
                    value={interval}
                    onChange={setInterval}
                    aria-label="Billing interval"
                  />

                  {/* Package selector (Starter/Family) */}
                  <Radio.Group
                    size="large"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(e.target.value)}
                    className="bg-white rounded-full px-2 py-1"
                    aria-label="Package"
                  >
                    <Radio.Button value={1}>Starter (1 child)</Radio.Button>
                    <Radio.Button value={2}>Family (2 children)</Radio.Button>
                  </Radio.Group>
                </div>
              </div>
            </div>

            {/* Layout */}
            <div className="mt-5 grid grid-cols-1 gap-6 lg:max-w-6xl xl:max-w-7xl mx-auto md:grid-cols-3">
              {/* Plans */}
              <div className="md:col-span-2">
                {/* Mobile list */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filtered.length === 0 ? (
                    <Card className="text-center py-8">
                      <Text type="secondary" className="block mb-2">
                        {products.length === 0 
                          ? "No subscription plans are currently available. Please contact support."
                          : `No plans available for ${interval} billing with ${childrenCount} ${childrenCount === 1 ? "child" : "children"}. Try selecting a different option above.`}
                      </Text>
                    </Card>
                  ) : (
                    filtered.map((p) => (
                      <PlanCard
                        key={p.id}
                        plan={p}
                        selected={currentSelected?.id === p.id}
                        onSelect={setSelectedPlan}
                      />
                    ))
                  )}
                </div>

                {/* Desktop grid */}
                <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.length === 0 ? (
                    <Card className="text-center py-8 col-span-full">
                      <Text type="secondary" className="block mb-2">
                        {products.length === 0 
                          ? "No subscription plans are currently available. Please contact support."
                          : `No plans available for ${interval} billing with ${childrenCount} ${childrenCount === 1 ? "child" : "children"}. Try selecting a different option above.`}
                      </Text>
                    </Card>
                  ) : (
                    filtered.map((p) => (
                      <PlanCard
                        key={p.id}
                        plan={p}
                        selected={currentSelected?.id === p.id}
                        onSelect={setSelectedPlan}
                      />
                    ))
                  )}
                </div>

                {/* Comparison (desktop & tablet) */}
                {allForComparison.length > 0 && (
                  <div className="hidden md:block mt-6">
                    <Comparison plans={allForComparison} />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="md:col-span-1 md:relative">
                {/* Sticky on desktop */}
                <div className="hidden md:block md:sticky md:top-20">
                  <PromoSummary
                    selectedPlan={currentSelected}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                  />
                  <Button
                    size="large"
                    className="mt-4 h-12 w-full rounded-full bg-[#C7D425] text-neutral-900 border-none hover:!bg-[#b8c61d]"
                    disabled={!currentSelected}
                    onClick={handleContinue}
                    icon={<ArrowRightOutlined />}
                  >
                    {currentSelected ? "Continue to Checkout" : "Select a plan to continue"}
                  </Button>
                  {!currentSelected && (
                    <Text type="secondary" className="text-xs text-center block mt-2">
                      Please select a subscription plan above
                    </Text>
                  )}
                </div>

                {/* Mobile */}
                <div className="md:hidden">
                  <PromoSummary
                    selectedPlan={currentSelected}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                  />
                </div>
              </div>
            </div>

            {/* Give enough breathing room above the bottom bar */}
            <div className="h-24 md:h-10" />
          </div>
        </main>

        {/* Mobile sticky action bar — offset ABOVE the BottomTabBar */}
        <div
          className="fixed inset-x-0 md:hidden z-40 bg-white/95 backdrop-blur border-t border-neutral-200 px-4 py-3"
          style={{ bottom: "calc(80px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-neutral-500">Selected package</div>
              <div className="text-sm font-semibold truncate">
                {currentSelected
                  ? `${currentSelected.name} · ${money(
                      total || 0,
                      "EUR"
                    )}/${currentSelected.billing_interval}`
                  : "None"}
              </div>
            </div>
            <Button
              type="primary"
              className="bg-[#C7D425] text-neutral-900"
              size="large"
              shape="round"
              disabled={!currentSelected}
              onClick={handleContinue}
              icon={<ArrowRightOutlined />}
            >
              {currentSelected ? "Continue" : "Select Plan"}
            </Button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
      </ParentShell>
    </App>
  );
}
