export const INTRO_LS_KEY = "kib_intro_seen_v1";
export const TOUR_LS_KEY  = "kibundo_tour_done";

export const hasSeenIntro = () => {
  try { return localStorage.getItem(INTRO_LS_KEY) === "1"; } catch { return false; }
};

export const markIntroSeen = () => {
  try { localStorage.setItem(INTRO_LS_KEY, "1"); } catch {}
};

export const hasDoneTour = () => {
  try { return localStorage.getItem(TOUR_LS_KEY) === "1"; } catch { return false; }
};

export const markTourDone = () => {
  try { localStorage.setItem(TOUR_LS_KEY, "1"); } catch {}
};
