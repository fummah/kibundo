export const INTRO_LS_KEY = "kib_intro_seen_v1";
export const TOUR_LS_KEY  = "kibundo_tour_done";

// Get user-specific keys
const getIntroKey = (userId) => userId ? `${INTRO_LS_KEY}::u:${userId}` : INTRO_LS_KEY;
const getTourKey = (userId) => userId ? `${TOUR_LS_KEY}::u:${userId}` : TOUR_LS_KEY;

export const hasSeenIntro = (userId = null) => {
  try { 
    const key = getIntroKey(userId);
    return localStorage.getItem(key) === "1"; 
  } catch { return false; }
};

export const markIntroSeen = (userId = null) => {
  try { 
    const key = getIntroKey(userId);
    localStorage.setItem(key, "1"); 
  } catch {}
};

export const hasDoneTour = (userId = null) => {
  try { 
    const key = getTourKey(userId);
    return localStorage.getItem(key) === "1"; 
  } catch { return false; }
};

export const markTourDone = (userId = null) => {
  try { 
    const key = getTourKey(userId);
    localStorage.setItem(key, "1"); 
  } catch {}
};

// Clear onboarding flags for a specific user (useful when logging out)
export const clearOnboardingFlags = (userId = null) => {
  try {
    if (userId) {
      localStorage.removeItem(getIntroKey(userId));
      localStorage.removeItem(getTourKey(userId));
    } else {
      // Clear legacy keys if no userId provided
      localStorage.removeItem(INTRO_LS_KEY);
      localStorage.removeItem(TOUR_LS_KEY);
    }
  } catch {}
};
