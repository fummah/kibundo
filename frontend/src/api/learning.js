// src/api/learning.js
// Lightweight mock "API" for adaptive learning plans and exercises

// pretend this comes from your DB/profile
const MOCK_PROFILE = {
  userId: "student-1",
  skills: {
    // lower score = bigger gap
    addition: 0.55,
    subtraction: 0.62,
    multiplication: 0.38,
    division: 0.31,
    word_problems: 0.47,
  },
  recent: [], // recent exercise summaries
};

const BANK = {
  math: [
    {
      id: "ex-add-1",
      skill: "addition",
      difficulty: 1,
      title: "Add within 20",
      prompt: "Solve: 8 + 7 = ?",
      type: "numeric",
      answer: 15,
      hint: "Try counting on from 8 by 7.",
      thumbnail: "https://picsum.photos/seed/add1/400/220",
    },
    {
      id: "ex-sub-1",
      skill: "subtraction",
      difficulty: 1,
      title: "Subtract within 20",
      prompt: "Solve: 14 − 6 = ?",
      type: "numeric",
      answer: 8,
      hint: "Think: 6 + ? = 14",
      thumbnail: "https://picsum.photos/seed/sub1/400/220",
    },
    {
      id: "ex-mul-1",
      skill: "multiplication",
      difficulty: 1,
      title: "Intro to Multiplication",
      prompt: "How many in 3 groups of 4?",
      type: "numeric",
      answer: 12,
      hint: "3 groups of 4 is 4 + 4 + 4.",
      thumbnail: "https://picsum.photos/seed/mul1/400/220",
    },
    {
      id: "ex-div-1",
      skill: "division",
      difficulty: 1,
      title: "Equal Sharing",
      prompt: "12 cookies shared equally by 3 kids. Each gets?",
      type: "numeric",
      answer: 4,
      hint: "Think: 3 groups make 12 → 12 ÷ 3.",
      thumbnail: "https://picsum.photos/seed/div1/400/220",
    },
    {
      id: "ex-wp-1",
      skill: "word_problems",
      difficulty: 1,
      title: "Mini Word Problem",
      prompt: "Lena has 5 apples and gets 3 more. How many now?",
      type: "numeric",
      answer: 8,
      hint: "Add the extra apples.",
      thumbnail: "https://picsum.photos/seed/wp1/400/220",
    },
  ],
};

export async function getSubjectPlan({ subject = "math" }) {
  // Fake latency
  await new Promise((r) => setTimeout(r, 300));

  const all = BANK[subject] || [];
  // Pick 3 exercises leaning toward lower-skill areas
  const ranked = [...all].sort((a, b) => {
    const ga = MOCK_PROFILE.skills[a.skill] ?? 0.5;
    const gb = MOCK_PROFILE.skills[b.skill] ?? 0.5;
    return ga - gb; // smaller score = bigger gap → earlier
  });
  return {
    subject,
    suggestions: ranked.slice(0, 3),
    profile: MOCK_PROFILE,
  };
}

export async function getExerciseById(id, subject = "math") {
  await new Promise((r) => setTimeout(r, 180));
  return (BANK[subject] || []).find((e) => e.id === id) || null;
}

export async function submitExerciseResult({ id, correct }) {
  await new Promise((r) => setTimeout(r, 220));
  // Update mock profile — nudge the skill score
  const subj = "math";
  const ex = (BANK[subj] || []).find((e) => e.id === id);
  if (ex) {
    const skill = ex.skill;
    const current = MOCK_PROFILE.skills[skill] ?? 0.5;
    // If correct, raise skill score toward 1; else reduce slightly.
    const next = correct ? Math.min(1, current + 0.06) : Math.max(0, current - 0.03);
    MOCK_PROFILE.skills[skill] = next;
    MOCK_PROFILE.recent.push({ id, skill, correct, ts: Date.now() });
  }
  return { ok: true, profile: MOCK_PROFILE };
}
