// src/context/StudentAppContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
// Use the asset via Vite import (don’t hardcode Windows paths in code)
import monster1 from "@/assets/buddies/monster1.png";

const StudentAppContext = createContext(null);

// Persist everything under one key (we'll also migrate old keys on first load)
const LS_KEY = "student_app_state_v1";

// Default state (supports both new and legacy fields)
const DEFAULT_STATE = {
  buddy: { id: "monster1", name: "Monster", avatar: monster1, theme: "indigo" },
  interests: [],
  profile: { name: "", ttsEnabled: true, theme: "indigo" }, // new canonical place
  // legacy mirrors (kept to avoid breaking older components)
  ttsEnabled: true,
  colorTheme: "indigo",
};

function migrateFromLegacyKeys() {
  try {
    const b = localStorage.getItem("kibundo_buddy");
    const i = localStorage.getItem("kibundo_interests");
    const p = localStorage.getItem("kibundo_profile");

    const buddy = b ? JSON.parse(b) : null;
    const interests = i ? JSON.parse(i) : null;
    const profile = p ? JSON.parse(p) : null;

    if (!buddy && !interests && !profile) return null;

    const merged = { ...DEFAULT_STATE };

    if (buddy) {
      merged.buddy = {
        id: buddy.id ?? "monster1",
        name: buddy.name ?? "Monster",
        // prefer explicit avatar if present else our default
        avatar: buddy.avatar || monster1,
        theme: buddy.theme ?? "indigo",
      };
    }

    if (Array.isArray(interests)) merged.interests = interests;

    if (profile) {
      merged.profile = {
        name: profile.name || "",
        ttsEnabled: typeof profile.ttsEnabled === "boolean" ? profile.ttsEnabled : DEFAULT_STATE.profile.ttsEnabled,
        theme: profile.theme || DEFAULT_STATE.profile.theme,
      };
      // keep legacy mirrors in sync
      merged.ttsEnabled = merged.profile.ttsEnabled;
      merged.colorTheme = merged.profile.theme;
    }

    return merged;
  } catch {
    return null;
  }
}

export function StudentAppProvider({ children }) {
  const [state, setState] = useState(() => {
    // 1) Try unified key
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // ensure avatar always points to our asset if missing
        const buddy = parsed.buddy || DEFAULT_STATE.buddy;
        if (!buddy.avatar) buddy.avatar = monster1;

        // ensure profile mirrors are present
        const profile = parsed.profile || DEFAULT_STATE.profile;
        return {
          ...DEFAULT_STATE,
          ...parsed,
          buddy,
          profile,
          ttsEnabled: typeof parsed.ttsEnabled === "boolean" ? parsed.ttsEnabled : profile.ttsEnabled,
          colorTheme: parsed.colorTheme || profile.theme || "indigo",
        };
      }
    } catch {}

    // 2) Migrate from legacy scattered keys (kibundo_*)
    const migrated = migrateFromLegacyKeys();
    if (migrated) return migrated;

    // 3) Default
    return DEFAULT_STATE;
  });

  // Persist unified state
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Convenience setters (keep legacy mirrors in sync)
  const setBuddy = (buddy) =>
    setState((s) => ({
      ...s,
      buddy: {
        id: buddy?.id ?? s.buddy.id,
        name: buddy?.name ?? s.buddy.name,
        avatar: buddy?.avatar || monster1, // always fallback to our asset
        theme: buddy?.theme ?? s.buddy.theme,
      },
    }));

  const setInterests = (interests) =>
    setState((s) => ({
      ...s,
      interests: Array.isArray(interests) ? interests : [],
    }));

  const setProfile = (profile) =>
    setState((s) => {
      const nextProfile = {
        name: profile?.name ?? s.profile.name,
        ttsEnabled:
          typeof profile?.ttsEnabled === "boolean" ? profile.ttsEnabled : s.profile.ttsEnabled,
        theme: profile?.theme || s.profile.theme,
      };
      return {
        ...s,
        profile: nextProfile,
        // keep mirrors in sync
        ttsEnabled: nextProfile.ttsEnabled,
        colorTheme: nextProfile.theme,
      };
    });

  const setTtsEnabled = (ttsEnabled) =>
    setState((s) => ({
      ...s,
      profile: { ...s.profile, ttsEnabled: !!ttsEnabled },
      ttsEnabled: !!ttsEnabled,
    }));

  const setColorTheme = (colorTheme) =>
    setState((s) => ({
      ...s,
      profile: { ...s.profile, theme: colorTheme || s.profile.theme },
      colorTheme: colorTheme || s.colorTheme,
    }));

  const value = useMemo(
    () => ({
      state,
      setState,
      // direct fields (ergonomic access)
      buddy: state.buddy,
      interests: state.interests,
      profile: state.profile,
      ttsEnabled: state.ttsEnabled, // legacy mirror
      colorTheme: state.colorTheme, // legacy mirror
      // setters
      setBuddy,
      setInterests,
      setProfile,
      setTtsEnabled,
      setColorTheme,
    }),
    [state]
  );

  return <StudentAppContext.Provider value={value}>{children}</StudentAppContext.Provider>;
}

export function useStudentApp() {
  const ctx = useContext(StudentAppContext);
  if (!ctx) throw new Error("useStudentApp must be used within StudentAppProvider");
  return ctx;
}
