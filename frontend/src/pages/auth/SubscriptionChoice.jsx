// src/pages/auth/SubscriptionChoice.jsx
import { useCallback, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LeftOutlined } from "@ant-design/icons";
import { message } from "antd";
import cloudsImg from "@/assets/backgrounds/clouds.png";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import api from "@/api/axios";
import { productToPlan } from "@/pages/parent/billing/planUtils";

const MONTHLY_PLAN_SLUG = "monthly";
const YEARLY_PLAN_SLUG = "yearly";

function resolveSlug(product, plan) {
  const metadata = product?.metadata || {};
  if (metadata.slug) return metadata.slug;
  if (plan?.billing_interval === "year") return YEARLY_PLAN_SLUG;
  if (plan?.billing_interval === "month") return MONTHLY_PLAN_SLUG;
  return String(plan?.billing_interval || "").toLowerCase() || "plan";
}

function formatPrice(amount, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function useResolvedPlans(products = []) {
  return useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];

    return products
      .map((product) => {
        const plan = productToPlan(product);
        if (!plan) return null;

        const metadata = product?.metadata || {};
        const slug = resolveSlug(product, plan);

        const intervalLabel =
          metadata.interval_label ||
          (plan.billing_interval === "month" ? "/Monat" : plan.billing_interval === "year" ? "/Jahr" : `/${plan.billing_interval}`);

        const buttonColor =
          metadata.button_color ||
          (slug === MONTHLY_PLAN_SLUG ? "#F7BAC2" : slug === YEARLY_PLAN_SLUG ? "#C7D425" : "#FF8400");

        const textColor =
          metadata.price_color ||
          (slug === MONTHLY_PLAN_SLUG ? "#E95F6A" : slug === YEARLY_PLAN_SLUG ? "#7DB533" : "#4F3A2D");

        const pillLabel = metadata.badge || (plan.is_best_value ? "best value" : null);

        const bulletPoints =
          (Array.isArray(plan.features) && plan.features.length > 0
            ? plan.features
            : [
                "Cancel anytime",
                "Full platform access",
              ]).slice(0, 3);

        return {
          slug,
          plan,
          product,
          productId: plan.id,
          priceId: plan.stripe_price_id,
          name: metadata.display_name || plan.name || product.name || "Subscription",
          price: formatPrice(plan.price_amount, plan.currency),
          intervalLabel,
          buttonColor,
          textColor,
          pillLabel,
          bulletPoints,
        };
      })
      .filter(Boolean);
  }, [products]);
}

async function fetchProducts() {
  try {
    const response = await api.get("/products");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Failed to load products:", err);
    return [];
  }
}

export default function SubscriptionChoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const resolvedPlans = useResolvedPlans(products);

  const plans = useMemo(() => {
    const bySlug = new Map();
    resolvedPlans.forEach((entry) => {
      if (!entry?.slug) return;
      if (!bySlug.has(entry.slug)) {
        bySlug.set(entry.slug, entry);
      }
    });
    const ordered = [];
    [MONTHLY_PLAN_SLUG, YEARLY_PLAN_SLUG].forEach((slug) => {
      if (bySlug.has(slug)) {
        ordered.push(bySlug.get(slug));
        bySlug.delete(slug);
      }
    });
    bySlug.forEach((entry) => ordered.push(entry));
    return ordered;
  }, [resolvedPlans]);

  const nextPath =
    (location.state && typeof location.state.next === "string" && location.state.next.startsWith("/")
      ? location.state.next
      : null) || ROLE_PATHS[ROLES.PARENT] || "/parent";
  const backPath = location.state?.back || "/signup/add-child/another";

  useEffect(() => {
    let mounted = true;
    fetchProducts().then((list) => {
      if (mounted) setProducts(list);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const resolvePlan = useCallback(
    (slug) => plans.find((plan) => plan.slug === slug) || null,
    [plans]
  );

  const handleSelectPlan = useCallback(
    async (planKey) => {
      const resolved = resolvePlan(planKey);
      if (!resolved?.productId) {
        message.error("Dieses Abonnement ist momentan nicht verfügbar. Bitte versuche es später erneut.");
        return;
      }

      const search = new URLSearchParams();
      search.set("plan", resolved.productId);
      if (resolved.priceId) {
        search.set("price", resolved.priceId);
      }

      navigate(`/parent/billing/checkout?${search.toString()}`, {
        replace: true,
        state: { next: nextPath, back: "/signup/choose-subscription" },
      });
    },
    [navigate, nextPath, resolvePlan]
  );

  const handleSkip = () => {
    navigate(nextPath, { replace: true });
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center px-6 pb-32 md:pb-24 lg:pb-20 pt-16"
      style={{
        background:
          "linear-gradient(185deg, #F4BE9B 0%, #F2D6B1 45%, #EDE2CB 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: `url(${cloudsImg})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute inset-x-[-45%] bottom-[-80%] z-0 h-[160%] rounded-[50%] bg-[#F2E5D5]" />

      <div className="relative z-10 w-full max-w-[620px]">
        <button
          type="button"
          onClick={() => navigate(backPath, { replace: true })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F0E4D8] bg-white text-[#4F3A2D] shadow-[0_8px_16px_rgba(79,58,45,0.12)]"
        >
          <LeftOutlined />
        </button>

        <h1 className="mt-6 text-center text-3xl font-semibold text-[#4F3A2D]">
          Abonement
        </h1>

        <p className="mt-5 text-center text-lg font-semibold text-[#816B5B]">
          Wähle Dein Abo
        </p>

        <div className="mt-8 space-y-5">
          {plans.length === 0 && (
            <article className="rounded-[32px] bg-white/90 p-6 text-center text-sm text-[#6F5A4A] shadow-[0_12px_28px_rgba(79,58,45,0.12)]">
              Aktuell stehen keine Abonnements zur Verfügung. Bitte versuche es später erneut oder kontaktiere den Support.
            </article>
          )}

          {plans.map((plan) => (
            <article
              key={plan.slug}
              className="rounded-[32px] bg-white/95 p-6 shadow-[0_18px_48px_rgba(79,58,45,0.15)]"
            >
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-[#4F3A2D]">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-3xl font-bold" style={{ color: plan.textColor }}>
                    {plan.price}
                    <span className="ml-1 text-base font-semibold text-[#816B5B]">
                      {plan.intervalLabel}
                    </span>
                  </p>
                </div>
                {plan.pillLabel ? (
                  <span className="rounded-full bg-[#FFE4BE] px-3 py-1 text-xs font-semibold text-[#816B5B]">
                    {plan.pillLabel}
                  </span>
                ) : (
                  <span />
                )}
              </header>

              <button
                type="button"
                onClick={() => handleSelectPlan(plan.slug)}
                className="mt-6 w-full rounded-full py-3 text-lg font-semibold text-[#4F3A2D] shadow-[0_16px_36px_rgba(0,0,0,0.12)]"
                style={{ backgroundColor: plan.buttonColor }}
              >
                Start Free Trial
              </button>

              <ul className="mt-5 space-y-2 text-sm text-[#6F5A4A]">
                {plan.bulletPoints.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="text-lg">✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#6F5A4A]">
          Start your free trial today and enjoy XX days of unlimited access to our entire library of
          learning. You can cancel anytime!
        </p>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-6 w-full rounded-full bg-[#FF8400] py-3 text-lg font-semibold text-white shadow-[0_18px_38px_rgba(255,132,0,0.35)] transition hover:bg-[#FF7600]"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

