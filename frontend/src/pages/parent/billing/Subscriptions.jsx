// src/pages/Subscription.jsx
import { useMemo, useState } from "react";
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
} from "antd";
import GradientShell from "@/components/GradientShell";

const { Text, Title } = Typography;

/* ----------------------------- Utilities ----------------------------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

/* ----------------------------- Dummy Data ----------------------------- */
const PLANS = [
  // Weekly
  {
    id: "w_1",
    name: "Weekly Starter",
    billing_interval: "week",
    child_count: 1,
    price_amount: 9.99,
    currency: "EUR",
    trial_days: 7,
    is_best_value: false,
    features: ["Cancel anytime", "Full platform access", "For 1 child"],
    sort_order: 20,
  },
  {
    id: "w_2",
    name: "Weekly Family",
    billing_interval: "week",
    child_count: 2,
    price_amount: 14.99,
    currency: "EUR",
    trial_days: 7,
    is_best_value: true,
    features: ["Cancel anytime", "Full platform access", "For 2 children"],
    sort_order: 10,
  },

  // Monthly
  {
    id: "m_1",
    name: "Monthly Starter",
    billing_interval: "month",
    child_count: 1,
    price_amount: 19.99,
    currency: "EUR",
    trial_days: 14,
    is_best_value: false,
    features: ["Cancel anytime", "Parent dashboard", "For 1 child"],
    sort_order: 20,
  },
  {
    id: "m_2",
    name: "Monthly Family",
    billing_interval: "month",
    child_count: 2,
    price_amount: 29.99,
    currency: "EUR",
    trial_days: 14,
    is_best_value: true,
    features: ["Cancel anytime", "Parent dashboard", "For 2 children"],
    sort_order: 10,
  },

  // Yearly
  {
    id: "y_1",
    name: "Yearly Starter",
    billing_interval: "year",
    child_count: 1,
    price_amount: 199.0,
    currency: "EUR",
    trial_days: 30,
    is_best_value: false,
    features: [
      "Cancel anytime",
      "Priority email support",
      "For 1 child",
      "2 months free (equivalent)",
    ],
    sort_order: 20,
  },
  {
    id: "y_2",
    name: "Yearly Family",
    billing_interval: "year",
    child_count: 2,
    price_amount: 299.0,
    currency: "EUR",
    trial_days: 30,
    is_best_value: true,
    features: [
      "Cancel anytime",
      "Priority email support",
      "For 2 children",
      "2 months free (equivalent)",
    ],
    sort_order: 10,
  },
];

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
        <span className="text-3xl font-extrabold text-[#E95F6A]">
          {money(plan.price_amount, plan.currency)}
        </span>
        <span className="ml-2 font-semibold text-neutral-500">
          / {plan.billing_interval}
        </span>
        {plan.trial_days ? (
          <span className="ml-2 text-xs text-[#6D8F00] font-semibold">
            {plan.trial_days}-day free trial
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-1">
        {(plan.features ?? []).map((line, idx) => (
          <Check key={idx} text={line} />
        ))}
      </div>

      <Radio className="mt-4" checked={selected} onChange={() => onSelect(plan)}>
        Select
      </Radio>
    </>
  );

  return (
    <Card
      hoverable
      onClick={() => onSelect(plan)}
      className={`rounded-3xl transition ${selected ? "ring-2 ring-[#C7D425]" : ""}`}
      bodyStyle={{ padding: 16 }}
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

function PromoSummary({ selectedPlan }) {
  const [code, setCode] = useState("");
  const valid = code.trim().toUpperCase() === "WELCOME20"; // dummy rule
  const subtotal = selectedPlan ? selectedPlan.price_amount : 0;
  const discount = valid ? +(subtotal * 0.2).toFixed(2) : 0;
  const total = +(subtotal - discount).toFixed(2);

  return (
    <Card className="rounded-3xl border-0 shadow">
      <Title level={5} className="!m-0">
        Promo & Summary
      </Title>

      <Space.Compact className="w-full mt-3">
        <Input
          size="large"
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!selectedPlan}
        />
        <Button
          size="large"
          type="primary"
          className="bg-[#C7D425] text-neutral-900"
          disabled={!selectedPlan}
          onClick={() => setCode((c) => c.trim())}
        >
          Apply
        </Button>
      </Space.Compact>

      <div className="mt-4 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <Text type="secondary">Plan</Text>
          <Text strong>
            {selectedPlan
              ? `${selectedPlan.name} (${selectedPlan.billing_interval})`
              : "—"}
          </Text>
        </div>
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

        {!!code && (
          <div className="mt-2 text-xs">
            {valid ? (
              <span className="text-[#6D8F00]">
                Promo “{code.toUpperCase()}” applied (20% off).
              </span>
            ) : (
              <span className="text-red-500">Promo invalid or not applicable.</span>
            )}
          </div>
        )}
      </div>

      <Button
        size="large"
        className="mt-5 h-12 w-full rounded-full bg-[#C7D425] text-neutral-900 border-none hover:!bg-[#b8c61d]"
        disabled={!selectedPlan}
        onClick={() => {
          if (!selectedPlan) return;
          alert(
            `Proceed to checkout: ${selectedPlan.id}${
              valid ? ` + promo ${code.toUpperCase()}` : ""
            }`
          );
        }}
      >
        Continue to Checkout
      </Button>

   
    </Card>
  );
}

function Comparison({ plans }) {
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
      <Table
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="small"
        scroll={{ x: true }}
        rowClassName="text-sm"
      />
    </Card>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Subscription() {
  const [interval, setInterval] = useState("month"); // "week" | "month" | "year"
  const [childrenCount, setChildrenCount] = useState(1); // 1 | 2
  const [selectedPlan, setSelectedPlan] = useState(null);

  const filtered = useMemo(() => {
    const subset = PLANS.filter(
      (p) => p.billing_interval === interval && p.child_count === childrenCount
    ).slice();
    subset.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    return subset;
  }, [interval, childrenCount]);

  const allForComparison = useMemo(() => filtered, [filtered]);

  const selectedStillVisible = selectedPlan
    ? filtered.some((p) => p.id === selectedPlan.id)
    : false;
  const currentSelected = selectedStillVisible ? selectedPlan : null;

  return (
    <GradientShell>
      {/* Page header (kept simple to avoid external dependencies) */}
      <div className="px-5 md:px-8 pt-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-800 m-0">
          Subscriptions
        </h1>
      </div>

      {/* Hero / Controls */}
      <div className="px-5 md:px-8">
        <div className="mt-3 rounded-3xl bg-white/80 p-5 shadow">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold m-0">
                Choose Your Subscription
              </h2>
              <p className="mt-1 text-neutral-600">
                Flexible plans for 1 or 2 children. Change or cancel anytime.
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
              />
              <Radio.Group
                size="large"
                value={childrenCount}
                onChange={(e) => setChildrenCount(e.target.value)}
                className="bg-white rounded-full px-2 py-1"
              >
                <Radio.Button value={1}>1 Child</Radio.Button>
                <Radio.Button value={2}>2 Children</Radio.Button>
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
              {filtered.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  selected={currentSelected?.id === p.id}
                  onSelect={setSelectedPlan}
                />
              ))}
            </div>

            {/* Desktop grid */}
            <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  selected={currentSelected?.id === p.id}
                  onSelect={setSelectedPlan}
                />
              ))}
            </div>

            {/* Comparison (desktop) */}
            <div className="hidden md:block mt-6">
              <Comparison plans={allForComparison} />
            </div>

        
          </div>

          {/* Summary */}
          <div className="md:col-span-1 md:relative">
            <div className="hidden md:block md:sticky md:top-20">
              <PromoSummary selectedPlan={currentSelected} />
            </div>
            <div className="md:hidden">
              <PromoSummary selectedPlan={currentSelected} />
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </GradientShell>
  );
}
