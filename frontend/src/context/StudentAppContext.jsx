// src/context/StudentAppContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
// Use the asset via Vite import (don't hardcode Windows paths in code)
import monster1 from "@/assets/buddies/monster1.png";
import { useStudentId } from "@/hooks/useStudentId";

const StudentAppContext = createContext(null);

// Base key - will be scoped per student
const LS_KEY_BASE = "student_app_state_v1";

// Default state (supports both new and legacy fields)
const DEFAULT_STATE = {
  buddy: { id: "monster1", name: "Monster", avatar: monster1, theme: "indigo" },
  interests: [],
  profile: { name: "", ttsEnabled: true, theme: "indigo" }, // new canonical place
  // legacy mirrors (kept to avoid breaking older components)
  ttsEnabled: true,
  colorTheme: "indigo",
};

function migrateFromLegacyKeys(studentId) {
  try {
    // Try scoped legacy keys first (for multi-child support)
    const scopedBuddyKey = studentId ? `kibundo_buddy::u:${studentId}` : null;
    const scopedInterestsKey = studentId ? `kibundo_interests::u:${studentId}` : null;
    const scopedProfileKey = studentId ? `kibundo_profile::u:${studentId}` : null;
    
    // Fallback to unscoped legacy keys
    const b = scopedBuddyKey ? localStorage.getItem(scopedBuddyKey) : null;
    const i = scopedInterestsKey ? localStorage.getItem(scopedInterestsKey) : null;
    const p = scopedProfileKey ? localStorage.getItem(scopedProfileKey) : null;
    
    // If no scoped keys found, try unscoped legacy keys
    const bUnscoped = b ? null : localStorage.getItem("kibundo_buddy");
    const iUnscoped = i ? null : localStorage.getItem("kibundo_interests");
    const pUnscoped = p ? null : localStorage.getItem("kibundo_profile");

    const buddy = (b ? JSON.parse(b) : null) || (bUnscoped ? JSON.parse(bUnscoped) : null);
    const interests = (i ? JSON.parse(i) : null) || (iUnscoped ? JSON.parse(iUnscoped) : null);
    const profile = (p ? JSON.parse(p) : null) || (pUnscoped ? JSON.parse(pUnscoped) : null);

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
  // Get the current student ID to scope storage per student
  const studentId = useStudentId();
  
  // Build scoped storage key
  const storageKey = studentId ?? "anon";
  
  // Initialize with default state - will be loaded from storage in useEffect
  const [state, setState] = useState(DEFAULT_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from scoped storage when studentId is available or changes
  useEffect(() => {
    const currentStorageKey = studentId ?? "anon";
    const scopedLS_KEY = `${LS_KEY_BASE}::u:${currentStorageKey}`;
    
    try {
      // 1) Try scoped unified key
      const raw = localStorage.getItem(scopedLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const buddy = parsed.buddy || DEFAULT_STATE.buddy;
        if (!buddy.avatar) buddy.avatar = monster1;
        const profile = parsed.profile || DEFAULT_STATE.profile;
        
        setState({
          ...DEFAULT_STATE,
          ...parsed,
          buddy,
          profile,
          ttsEnabled: typeof parsed.ttsEnabled === "boolean" ? parsed.ttsEnabled : profile.ttsEnabled,
          colorTheme: parsed.colorTheme || profile.theme || "indigo",
        });
        setIsInitialized(true);
        return;
      }
    } catch {}

    // 2) Try unscoped unified key (for backward compatibility - only on first load for anon)
    if (!isInitialized && !studentId) {
      try {
        const unscopedKey = LS_KEY_BASE;
        const raw = localStorage.getItem(unscopedKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const buddy = parsed.buddy || DEFAULT_STATE.buddy;
          if (!buddy.avatar) buddy.avatar = monster1;
          const profile = parsed.profile || DEFAULT_STATE.profile;
          
          setState({
            ...DEFAULT_STATE,
            ...parsed,
            buddy,
            profile,
            ttsEnabled: typeof parsed.ttsEnabled === "boolean" ? parsed.ttsEnabled : profile.ttsEnabled,
            colorTheme: parsed.colorTheme || profile.theme || "indigo",
          });
          setIsInitialized(true);
          return;
        }
      } catch {}
    }

    // 3) Migrate from legacy scattered keys (kibundo_*)
    const migrated = migrateFromLegacyKeys(studentId);
    if (migrated) {
      setState(migrated);
      setIsInitialized(true);
      return;
    }

    // 4) Default - reset to default for this student
    setState(DEFAULT_STATE);
    setIsInitialized(true);
  }, [studentId]); // Only depend on studentId - reload whenever it changes

  // Persist unified state to scoped key whenever state changes
  useEffect(() => {
    if (!isInitialized) return; // Don't persist until we've loaded initial state
    
    try {
      const currentStorageKey = studentId ?? "anon";
      const scopedLS_KEY = `${LS_KEY_BASE}::u:${currentStorageKey}`;
      localStorage.setItem(scopedLS_KEY, JSON.stringify(state));
    } catch {}
  }, [state, studentId, isInitialized]);

  // Convenience setters (keep legacy mirrors in sync)
  const setBuddy = (buddy) =>
    setState((s) => {
      // If buddy is null/undefined, reset to default
      if (!buddy) {
        return {
          ...s,
          buddy: DEFAULT_STATE.buddy,
        };
      }
      // Otherwise update with new buddy data
      return {
        ...s,
        buddy: {
          id: buddy.id ?? s.buddy.id,
          name: buddy.name ?? s.buddy.name,
          // Support both 'img' (from database) and 'avatar' (from context)
          avatar: buddy.avatar || buddy.img || monster1, // always fallback to our asset
          img: buddy.img || buddy.avatar, // Keep img for compatibility
          theme: buddy.theme ?? s.buddy.theme,
        },
      };
    });

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
