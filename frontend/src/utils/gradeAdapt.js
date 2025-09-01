// Simple grade → tone map (tweak freely)
const profiles = {
  2: { sentences: 1, words: 6, emoji: true, banJargon: true },
  3: { sentences: 2, words: 10, emoji: true, banJargon: true },
  4: { sentences: 3, words: 14, emoji: false, banJargon: true },
  5: { sentences: 4, words: 16, emoji: false, banJargon: false },
};

const easySubs = [
  "therefore", "however", "consequently", "utilize", "approximate",
  "fundamental", "conceptual", "hypothesis"
];

function simplify(text, maxWords) {
  return text
    .replace(/\((.*?)\)/g, "$1")                 // drop parentheses
    .replace(new RegExp(`\\b(${easySubs.join("|")})\\b`, "gi"), (m) => {
      const map = {
        therefore: "so", however: "but", consequently: "so",
        utilize: "use", approximate: "about", fundamental: "basic",
        conceptual: "idea", hypothesis: "guess"
      };
      return map[m.toLowerCase()] || m;
    })
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.split(/\s+/).slice(0, maxWords).join(" "))
    .join(". ") + ".";
}

/**
 * Adapt one assistant message to target grade (2–5).
 */
export function adaptTextForGrade(text, grade = 3) {
  const p = profiles[grade] || profiles[3];
  let out = simplify(text, p.words);
  // limit total sentences
  const parts = out.split(/[.!?]+/).filter(Boolean).slice(0, p.sentences);
  out = parts.join(". ") + ".";
  if (p.emoji) out += " 🙂";
  return out;
}

/**
 * Optional: build a system prompt string you can pass to your chat model.
 */
export function buildSystemPrompt(grade = 3) {
  const p = profiles[grade] || profiles[3];
  return [
    `You are a helpful tutor speaking to a Grade ${grade} child.`,
    `Use short sentences (max ~${p.words} words).`,
    p.emoji ? "You may add a friendly emoji occasionally." : "Do not use emojis.",
    p.banJargon ? "Avoid complex words and jargon; prefer simple words." : "",
    "Be encouraging and concrete. Give one step at a time."
  ].filter(Boolean).join(" ");
}
