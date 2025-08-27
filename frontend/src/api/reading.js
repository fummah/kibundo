// src/api/reading.js

// --- tiny utils ---
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Text bank by level (1=beginner, 2=intermediate, 3=advanced)
const BANK = {
  1: [
    "The cat sits on the warm mat. It purrs softly and closes its eyes.",
    "A small red kite flies in the blue sky. Tim holds the string and smiles.",
  ],
  2: [
    "Mina picked three lemons from the tree and squeezed them into a glass for lemonade.",
    "A gentle wind moved the tall grass as the puppy chased a bright yellow ball.",
  ],
  3: [
    "The curious fox paused at the riverbank, listening to the steady rush of water.",
    "Under the silver moon, the cabin windows glowed with the warmth of a crackling fire.",
  ],
};

/* ------------------------------------------------------------------ */
/* Reading Text (for AI Reading Text flow)                            */
/* ------------------------------------------------------------------ */
export async function generateReadingText({ level = 1 } = {}) {
  await wait(150); // mock latency
  const pool = BANK[level] || BANK[1];
  const text = pick(pool);
  try {
    localStorage.setItem("mock_reading_text", text);
  } catch {}
  return text;
}

/* ------------------------------------------------------------------ */
/* Back-compat alias using string levels                              */
/* ------------------------------------------------------------------ */
export async function getAiReadingText({ level = "beginner" } = {}) {
  const map = { beginner: 1, intermediate: 2, advanced: 3 };
  const text = await generateReadingText({ level: map[level] ?? 1 });
  return { level, text };
}

/* ------------------------------------------------------------------ */
/* Mock STT capture (used by Read Aloud + AI Reading Text)            */
/* ------------------------------------------------------------------ */
export async function sttCaptureMock() {
  await wait(600); // pretend to record/transcribe

  let base = "";
  try {
    base = localStorage.getItem("mock_reading_text") || "";
  } catch {}

  if (!base) {
    return "The cat sits on the mat and purrs softly with closed eyes.";
  }

  const words = base.split(/\s+/);
  const out = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const r = Math.random();
    if (r < 0.06) {
      // omit a word
      continue;
    }
    if (r < 0.10) {
      // subtle mismatch
      out.push(
        w.replace(/[a-z]/gi, (c, idx) => (idx % 2 ? c.toLowerCase() : c)).slice(0, Math.max(2, w.length - 1))
      );
      continue;
    }
    out.push(w);
  }

  return out.join(" ");
}

/* ------------------------------------------------------------------ */
/* Mock OCR (used by Read Aloud flow)                                 */
/* ------------------------------------------------------------------ */
export async function ocrImage(file) {
  await wait(800);

  // Read the file to surface dev-time issues (permissions, etc.)
  await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve();
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const sample =
    "In the park, a bright orange butterfly landed on a yellow flower. " +
    "Lara watched quietly and counted to five before it flew away again.";
  try {
    localStorage.setItem("mock_reading_text", sample);
  } catch {}
  return sample;
}

/* ------------------------------------------------------------------ */
/* Reading Quiz (used by ReadingQuizFlow)                             */
/* ------------------------------------------------------------------ */
const QUIZ_PASSAGES = {
  1: [
    {
      passage:
        "Ben has a small red ball. He rolls it to his dog. The dog runs fast and brings the ball back to Ben.",
      questions: [
        { q: "What color is the ball?", correct: "red", distractors: ["blue", "green", "yellow"] },
        { q: "Who brings the ball back?", correct: "the dog", distractors: ["Ben", "a cat", "his sister"] },
        { q: "What does Ben do with the ball?", correct: "rolls it", distractors: ["throws it", "kicks it", "hides it"] },
      ],
    },
  ],
  2: [
    {
      passage:
        "Mina picked three lemons from the tree and squeezed them into a glass for lemonade. She added water and a spoon of sugar, then stirred until it tasted just right.",
      questions: [
        { q: "How many lemons did Mina pick?", correct: "three", distractors: ["two", "four", "five"] },
        { q: "What did she add to the lemon juice?", correct: "water and sugar", distractors: ["milk and honey", "salt and water", "tea and honey"] },
        { q: "When did she stop stirring?", correct: "when it tasted just right", distractors: ["when it boiled", "after ten minutes", "when it cooled"] },
      ],
    },
    {
      passage:
        "A gentle wind moved the tall grass as the puppy chased a bright yellow ball. It tumbled over a small hill, and the puppy barked happily.",
      questions: [
        { q: "What moved the tall grass?", correct: "a gentle wind", distractors: ["the rain", "a bicycle", "a cat"] },
        { q: "What color was the ball?", correct: "yellow", distractors: ["red", "green", "blue"] },
        { q: "How did the puppy feel?", correct: "happy", distractors: ["angry", "sleepy", "scared"] },
      ],
    },
  ],
  3: [
    {
      passage:
        "Under the silver moon, the cabin windows glowed with the warmth of a crackling fire. A soft hush fell over the forest as snow gathered along the branches.",
      questions: [
        { q: "What made the windows glow?", correct: "a crackling fire", distractors: ["the sunrise", "lanterns", "a lightning flash"] },
        { q: "Where did the snow gather?", correct: "along the branches", distractors: ["on the lake", "inside the cabin", "on the path only"] },
        { q: "What kind of moon was mentioned?", correct: "silver", distractors: ["golden", "red", "full (only)"] },
      ],
    },
  ],
};

/**
 * fetchReadingQuiz({ level }) -> { passage, items: [{ q, options[], correct }] }
 * - correct is the INDEX in options[]
 */
export async function fetchReadingQuiz({ level = 1 } = {}) {
  await wait(250); // mock latency
  const pools = QUIZ_PASSAGES[level] || QUIZ_PASSAGES[1];
  const picked = pick(pools);
  const items = picked.questions.map(({ q, correct, distractors }) => {
    const options = shuffle([correct, ...distractors]);
    const correctIndex = options.findIndex((o) => o === correct);
    return { q, options, correct: correctIndex };
  });
  return { passage: picked.passage, items };
}
