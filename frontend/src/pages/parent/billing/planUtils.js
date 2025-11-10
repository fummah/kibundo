// src/pages/parent/billing/planUtils.js

export function money(value, currency = "EUR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

/**
 * Convert a product record to a normalized "plan" object.
 * Mirrors the logic used in the parent subscription page so other
 * screens (e.g. onboarding) can stay in sync.
 */
export function productToPlan(product) {
  if (!product) return null;

  const metadata = product.metadata || {};

  // Infer billing interval
  let billingInterval = metadata.billing_interval;
  if (!billingInterval) {
    const name = (product.name || "").toLowerCase();
    if (name.includes("week")) billingInterval = "week";
    else if (name.includes("year") || name.includes("annual")) billingInterval = "year";
    else billingInterval = "month";
  }

  // Infer child count
  let childCount = metadata.child_count;
  if (!childCount) {
    const name = (product.name || "").toLowerCase();
    if (name.includes("family") || name.includes("2") || name.includes("two")) childCount = 2;
    else childCount = 1;
  }
  childCount = parseInt(childCount, 10) || 1;

  // Build feature list
  const features = [
    metadata.feature1,
    metadata.feature2,
    metadata.feature3,
  ].filter(Boolean);

  if (!features.length) {
    features.push(
      "Cancel anytime",
      billingInterval === "year" ? "Priority email support" : "Full platform access",
      `For ${childCount} ${childCount === 1 ? "child" : "children"}`
    );
    if (billingInterval === "year") {
      features.push("2 months free (equivalent)");
    }
    if (product.trial_period_days && product.trial_period_days > 0) {
      features.push(`${product.trial_period_days}-day free trial`);
    }
  }

  return {
    id: product.id,
    name: product.name || "Subscription Plan",
    billing_interval: billingInterval,
    child_count: childCount,
    price_amount: parseFloat(product.price || product.price_amount || 0),
    currency: (product.currency || metadata.currency || "EUR").toUpperCase(),
    trial_days: product.trial_period_days || metadata.trial_period_days || 0,
    is_best_value: metadata.is_best_value || metadata.best_value || false,
    features,
    sort_order: metadata.sort_order || 999,
    stripe_product_id: product.stripe_product_id,
    stripe_price_id:
      metadata.stripe_price_id ||
      product.stripe_price_id ||
      product.price_id ||
      product.stripe_price ||
      null,
  };
}

