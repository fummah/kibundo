// src/pages/auth/SubscriptionChoice.jsx
import { useCallback, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LeftOutlined } from "@ant-design/icons";
import { message } from "antd";
import cloudsImg from "@/assets/backgrounds/clouds.png";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import api from "@/api/axios";
import { productToPlan } from "@/pages/parent/billing/planUtils";
import CircularBackground from "@/components/layouts/CircularBackground";

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

        // German translations for default features
        const defaultFeatures = [
          "Jederzeit kündbar",
          "Voller Zugriff auf die Plattform",
        ];
        
        const bulletPoints =
          (Array.isArray(plan.features) && plan.features.length > 0
            ? plan.features.map(f => {
                // Translate common English features to German
                if (typeof f === 'string') {
                  const lower = f.toLowerCase();
                  if (lower.includes('cancel') || lower.includes('anytime')) return "Jederzeit kündbar";
                  if (lower.includes('full') && lower.includes('access')) return "Voller Zugriff auf die Plattform";
                  if (lower.includes('child') || lower.includes('children')) return f; // Keep as is
                  if (lower.includes('trial')) return f; // Keep as is
                }
                return f;
              })
            : defaultFeatures).slice(0, 3);

        // Better name fallback - capitalize and format
        const rawName = metadata.display_name || plan.name || product.name || "Subscription";
        const displayName = rawName === "admin" || rawName.toLowerCase() === "admin" 
          ? (metadata.display_name || "Abonnement") 
          : rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        
        return {
          slug,
          plan,
          product,
          productId: plan.id,
          priceId: plan.stripe_price_id,
          name: displayName,
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
    console.log("🛒 Fetching products from /products endpoint...");
    const response = await api.get("/products");
    const products = Array.isArray(response.data) ? response.data : [];
    console.log(`✅ Loaded ${products.length} products:`, products.map(p => ({ id: p.id, name: p.name, active: p.active })));
    return products;
  } catch (err) {
    console.error("❌ Failed to load products:", err);
    console.error("❌ Error details:", err.response?.data || err.message);
    return [];
  }
}

export default function SubscriptionChoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const resolvedPlans = useResolvedPlans(products);

  const plans = useMemo(() => {
    console.log(`📋 [SubscriptionChoice] Processing ${resolvedPlans.length} resolved plans from ${products.length} products`);
    
    // Display ALL products from database, not just monthly/yearly
    // Sort by sort_order from metadata, then by id
    const sorted = [...resolvedPlans].sort((a, b) => {
      const orderA = a.plan?.sort_order ?? a.product?.metadata?.sort_order ?? 999;
      const orderB = b.plan?.sort_order ?? b.product?.metadata?.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.productId || 0) - (b.productId || 0);
    });
    
    console.log(`✅ [SubscriptionChoice] Final plans count: ${sorted.length}`, sorted.map(p => ({ 
      id: p.productId, 
      slug: p.slug, 
      name: p.name,
      price: p.price 
    })));
    return sorted;
  }, [resolvedPlans, products.length]);

  const nextPath =
    (location.state && typeof location.state.next === "string" && location.state.next.startsWith("/")
      ? location.state.next
      : null) || ROLE_PATHS[ROLES.PARENT] || "/parent";
  const backPath = location.state?.back || "/signup/add-child/another";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchProducts().then((list) => {
      if (mounted) {
        setProducts(list);
        if (list.length === 0) {
          setError("Keine Abonnements verfügbar. Bitte kontaktiere den Support.");
        }
        setLoading(false);
      }
    }).catch((err) => {
      if (mounted) {
        console.error("Error fetching products:", err);
        setError("Fehler beim Laden der Abonnements. Bitte versuche es später erneut.");
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const resolvePlan = useCallback(
    (identifier) => {
      // Support both productId (preferred) and slug (fallback)
      if (typeof identifier === 'number' || (typeof identifier === 'string' && /^\d+$/.test(identifier))) {
        // It's a product ID
        return plans.find((plan) => plan.productId === Number(identifier)) || null;
      } else {
        // It's a slug - but this can be ambiguous if multiple products have same slug
        return plans.find((plan) => plan.slug === identifier) || null;
      }
    },
    [plans]
  );

  const handleSelectPlan = useCallback(
    async (productId) => {
      // Use productId directly instead of slug to avoid ambiguity
      const resolved = resolvePlan(productId);
      if (!resolved?.productId) {
        console.error('❌ [handleSelectPlan] Plan not found for productId:', productId);
        message.error("Dieses Abonnement ist momentan nicht verfügbar. Bitte versuche es später erneut.");
        return;
      }

      console.log('✅ [handleSelectPlan] Selected plan:', { 
        productId: resolved.productId, 
        name: resolved.name, 
        price: resolved.price 
      });

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

  // Removed handleSkip - subscription is now mandatory

  return (
    <CircularBackground>
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: `url(${cloudsImg})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "cover",
        }}
      />
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
          {loading && (
            <article className="rounded-[32px] bg-white/90 p-6 text-center text-sm text-[#6F5A4A] shadow-[0_12px_28px_rgba(79,58,45,0.12)]">
              Lade Abonnements...
            </article>
          )}
          
          {!loading && error && (
            <article className="rounded-[32px] bg-white/90 p-6 text-center text-sm text-[#6F5A4A] shadow-[0_12px_28px_rgba(79,58,45,0.12)]">
              {error}
            </article>
          )}
          
          {!loading && !error && plans.length === 0 && (
            <article className="rounded-[32px] bg-white/90 p-6 text-center text-sm text-[#6F5A4A] shadow-[0_12px_28px_rgba(79,58,45,0.12)]">
              Aktuell stehen keine Abonnements zur Verfügung. Bitte versuche es später erneut oder kontaktiere den Support.
            </article>
          )}

          {!loading && !error && plans.map((plan) => (
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
                onClick={() => handleSelectPlan(plan.productId)}
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
          7 Tage kostenlos testen ohne Risiko! Du kannst jederzeit kündigen.
        </p>
      </div>
    </CircularBackground>
  );
}

