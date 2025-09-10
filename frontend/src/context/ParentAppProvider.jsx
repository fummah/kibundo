// src/context/ParentAppProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

/**
 * ParentAppProvider
 * - Single unified localStorage key for parent-side state (profile, family, active student, billing)
 * - No direct API calls (keep it pure state; hydrate from pages/services)
 * - Ergonomic setters + derived selectors
 */

const ParentAppContext = createContext(null);

// Unified storage key (versioned so we can evolve shape without clobbering old data)
const LS_KEY = "parent_app_state_v1";

/* -------------------- Default State -------------------- */
const DEFAULT_STATE = {
  // Core
  profile: { name: "", email: "", locale: "de-DE" },
  family: [],                 // [{ id, name, grade, avatar, ... }]
  activeStudentId: null,      // string|number

  // Billing bundle (preloaded by pages/services calling setters)
  billing: {
    subscription: null,       // { status, plan: { name, ... }, renewal_date, ... }
    invoices: [],             // []
    upcomingInvoice: null,    // { total, date, ... } | null
    paymentMethods: [],       // []
    coupons: [],              // []
  },
};

/* -------------------- Legacy Migration (optional) --------------------
   If you used scattered keys previously, migrate them here.
   Adjust the keys if you had older storage names. Return null if nothing to migrate.
----------------------------------------------------------------------- */
function migrateFromLegacyKeys() {
  try {
    // Example legacy keys (change/remove as needed)
    const legacyProfile = localStorage.getItem("parent_profile");
    const legacyFamily = localStorage.getItem("parent_family");
    const legacyActive = localStorage.getItem("parent.activeStudentId");
    const legacyBilling = localStorage.getItem("parent_billing");

    if (!legacyProfile && !legacyFamily && !legacyActive && !legacyBilling) return null;

    const next = { ...DEFAULT_STATE };

    if (legacyProfile) {
      const p = JSON.parse(legacyProfile);
      next.profile = {
        name: p?.name ?? DEFAULT_STATE.profile.name,
        email: p?.email ?? DEFAULT_STATE.profile.email,
        locale: p?.locale ?? DEFAULT_STATE.profile.locale,
      };
    }

    if (legacyFamily) {
      const fam = JSON.parse(legacyFamily);
      if (Array.isArray(fam)) next.family = fam;
    }

    if (legacyActive != null) {
      next.activeStudentId = legacyActive;
    }

    if (legacyBilling) {
      const b = JSON.parse(legacyBilling);
      next.billing = {
        subscription: b?.subscription ?? DEFAULT_STATE.billing.subscription,
        invoices: Array.isArray(b?.invoices) ? b.invoices : DEFAULT_STATE.billing.invoices,
        upcomingInvoice: b?.upcomingInvoice ?? DEFAULT_STATE.billing.upcomingInvoice,
        paymentMethods: Array.isArray(b?.paymentMethods) ? b.paymentMethods : DEFAULT_STATE.billing.paymentMethods,
        coupons: Array.isArray(b?.coupons) ? b.coupons : DEFAULT_STATE.billing.coupons,
      };
    }

    return next;
  } catch {
    return null;
  }
}

/* -------------------- Provider -------------------- */
export default function ParentAppProvider({ children }) {
  // Initialize from LS (unified), else migrate legacy, else defaults
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Shallow merge onto defaults to keep forward-compat
        return {
          ...DEFAULT_STATE,
          ...parsed,
          profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) },
          family: Array.isArray(parsed.family) ? parsed.family : DEFAULT_STATE.family,
          activeStudentId: parsed.activeStudentId ?? DEFAULT_STATE.activeStudentId,
          billing: {
            ...DEFAULT_STATE.billing,
            ...(parsed.billing || {}),
            invoices: Array.isArray(parsed.billing?.invoices) ? parsed.billing.invoices : [],
            paymentMethods: Array.isArray(parsed.billing?.paymentMethods)
              ? parsed.billing.paymentMethods
              : [],
            coupons: Array.isArray(parsed.billing?.coupons) ? parsed.billing.coupons : [],
          },
        };
      }
    } catch {}

    const migrated = migrateFromLegacyKeys();
    if (migrated) return migrated;

    return DEFAULT_STATE;
  });

  // Persist unified state
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  /* -------------------- Derived selectors -------------------- */
  const activeStudent = useMemo(() => {
    if (!state.activeStudentId || !Array.isArray(state.family)) return null;
    return state.family.find((s) => String(s.id) === String(state.activeStudentId)) || null;
  }, [state.family, state.activeStudentId]);

  const isSubscribed = useMemo(() => {
    const status = state.billing?.subscription?.status?.toLowerCase?.();
    return status === "active" || status === "trialing" || status === "past_due";
  }, [state.billing?.subscription?.status]);

  const hasPaymentMethod = useMemo(
    () => Array.isArray(state.billing?.paymentMethods) && state.billing.paymentMethods.length > 0,
    [state.billing?.paymentMethods]
  );

  /* -------------------- Setters -------------------- */
  const setProfile = (profile) =>
    setState((s) => ({
      ...s,
      profile: {
        name: profile?.name ?? s.profile.name,
        email: profile?.email ?? s.profile.email,
        locale: profile?.locale ?? s.profile.locale,
      },
    }));

  const setFamily = (family) =>
    setState((s) => ({
      ...s,
      family: Array.isArray(family) ? family : [],
      // keep activeStudentId if still present; else default to first or null
      activeStudentId: (() => {
        const fam = Array.isArray(family) ? family : [];
        if (!fam.length) return null;
        // prefer existing selection if still present
        const stillThere = fam.find((x) => String(x.id) === String(s.activeStudentId));
        return stillThere ? s.activeStudentId : fam[0].id;
      })(),
    }));

  const upsertStudent = (student) =>
    setState((s) => {
      const fam = Array.isArray(s.family) ? [...s.family] : [];
      const idx = fam.findIndex((x) => String(x.id) === String(student.id));
      if (idx >= 0) fam[idx] = { ...fam[idx], ...student };
      else fam.push(student);
      return {
        ...s,
        family: fam,
        activeStudentId: s.activeStudentId ?? student.id, // select first if none
      };
    });

  const removeStudent = (studentId) =>
    setState((s) => {
      const fam = Array.isArray(s.family) ? s.family.filter((x) => String(x.id) !== String(studentId)) : [];
      const nextActive =
        String(s.activeStudentId) === String(studentId)
          ? fam[0]?.id ?? null
          : s.activeStudentId;
      return { ...s, family: fam, activeStudentId: nextActive };
    });

  const setActiveStudentId = (id) =>
    setState((s) => ({
      ...s,
      activeStudentId: id ?? null,
    }));

  // Billing setters (fine-grained)
  const setSubscription = (subscription) =>
    setState((s) => ({ ...s, billing: { ...s.billing, subscription: subscription || null } }));

  const setInvoices = (invoices) =>
    setState((s) => ({
      ...s,
      billing: { ...s.billing, invoices: Array.isArray(invoices) ? invoices : [] },
    }));

  const setUpcomingInvoice = (upcomingInvoice) =>
    setState((s) => ({ ...s, billing: { ...s.billing, upcomingInvoice: upcomingInvoice || null } }));

  const setPaymentMethods = (paymentMethods) =>
    setState((s) => ({
      ...s,
      billing: { ...s.billing, paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [] },
    }));

  const setCoupons = (coupons) =>
    setState((s) => ({
      ...s,
      billing: { ...s.billing, coupons: Array.isArray(coupons) ? coupons : [] },
    }));

  // Batch billing setter (handy for API hydrate)
  const setBilling = (bundle = {}) =>
    setState((s) => ({
      ...s,
      billing: {
        ...s.billing,
        ...bundle,
        invoices: Array.isArray(bundle.invoices) ? bundle.invoices : s.billing.invoices,
        paymentMethods: Array.isArray(bundle.paymentMethods)
          ? bundle.paymentMethods
          : s.billing.paymentMethods,
        coupons: Array.isArray(bundle.coupons) ? bundle.coupons : s.billing.coupons,
      },
    }));

  // One-shot hydrate helper (profile + family + billing)
  const hydrateFromApi = ({ profile, family, billing } = {}) => {
    setState((s) => {
      const next = { ...s };
      if (profile) {
        next.profile = {
          name: profile?.name ?? s.profile.name,
          email: profile?.email ?? s.profile.email,
          locale: profile?.locale ?? s.profile.locale,
        };
      }
      if (Array.isArray(family)) {
        next.family = family;
        // keep or select first
        const stillThere = family.find((x) => String(x.id) === String(s.activeStudentId));
        next.activeStudentId = stillThere ? s.activeStudentId : family[0]?.id ?? null;
      }
      if (billing && typeof billing === "object") {
        next.billing = {
          ...s.billing,
          ...billing,
          invoices: Array.isArray(billing.invoices) ? billing.invoices : s.billing.invoices,
          paymentMethods: Array.isArray(billing.paymentMethods)
            ? billing.paymentMethods
            : s.billing.paymentMethods,
          coupons: Array.isArray(billing.coupons) ? billing.coupons : s.billing.coupons,
        };
      }
      return next;
    });
  };

  /* -------------------- Context Value -------------------- */
  const value = useMemo(
    () => ({
      // Full state + raw setter (advanced)
      state,
      setState,

      // Core (ergonomic access)
      profile: state.profile,
      family: state.family,
      activeStudent,
      activeStudentId: state.activeStudentId,

      // Billing
      billing: state.billing,
      subscription: state.billing.subscription,
      invoices: state.billing.invoices,
      upcomingInvoice: state.billing.upcomingInvoice,
      paymentMethods: state.billing.paymentMethods,
      coupons: state.billing.coupons,

      // Derived
      isSubscribed,
      hasPaymentMethod,

      // Setters
      setProfile,
      setFamily,
      upsertStudent,
      removeStudent,
      setActiveStudentId,

      setSubscription,
      setInvoices,
      setUpcomingInvoice,
      setPaymentMethods,
      setCoupons,
      setBilling,

      hydrateFromApi,
    }),
    [state, activeStudent, isSubscribed, hasPaymentMethod]
  );

  return <ParentAppContext.Provider value={value}>{children}</ParentAppContext.Provider>;
}

ParentAppProvider.propTypes = {
  children: PropTypes.node,
};

/* -------------------- Hook -------------------- */
export function useParentApp() {
  const ctx = useContext(ParentAppContext);
  if (!ctx) throw new Error("useParentApp must be used within ParentAppProvider");
  return ctx;
}
