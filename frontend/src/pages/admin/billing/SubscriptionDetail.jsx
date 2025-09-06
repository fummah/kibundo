import EntityDetail from "@/components/EntityDetail";

export default function SubscriptionDetail() {
  return (
    <EntityDetail
      cfg={{
        entityKey: "subscription",
        titleSingular: "Subscription",
        routeBase: "/admin/billing/subscriptions",
        idField: "id",
        api: {
          getPath: (id) => `/subscriptions/${id}`,
          updatePath: (id) => `/subscriptions/${id}`,
          removePath: (id) => `/subscriptions/${id}`,
        },
        parseItem: (s) => {
          const p = s?.parent || {};
          const u = p?.user || {};
          const parent_name =
            u?.name ||
            [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() ||
            p?.name || "-";
          return {
            id: s.id,
            status: s.status,
            parent_id: p.id ?? s.parent_id,
            parent_name,
            stripe_subscription_id: s.stripe_subscription_id ?? "-",
            plan_id: s.plan_id || s.product_id || s?.product?.id,
            plan_name: s?.price?.nickname || s?.product?.name || s?.plan?.name || "-",
            interval:
              s?.price?.interval || s?.product?.interval || s?.plan?.interval || "-",
            current_period_end: s.current_period_end || null,
            raw: s,
          };
        },
        fields: [
          { key: "id", label: "ID", readOnly: true },
          { key: "status", label: "Status", type: "select", options: [
            { label: "Active", value: "active" },
            { label: "Trialing", value: "trialing" },
            { label: "Canceled", value: "canceled" },
          ]},
          { key: "parent_name", label: "Parent", readOnly: true },
          { key: "stripe_subscription_id", label: "Stripe Sub ID", readOnly: true },
          { key: "plan_id", label: "Plan ID", readOnly: true },
          { key: "plan_name", label: "Plan / Product", readOnly: true },
          { key: "interval", label: "Interval", readOnly: true },
          { key: "current_period_end", label: "Renews", type: "date" },
        ],
      }}
    />
  );
}
