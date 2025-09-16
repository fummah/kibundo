// Pure transforms & small helpers (no UI imports)

/** Question type options for selects */
export const qTypes = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "short", label: "Short Answer" },
  { value: "true_false", label: "True / False" },
];

// Factories
export const newQuestion = (type = "mcq") => {
  if (type === "mcq") return { type, prompt: "", points: 1, choices: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }], answerIndex: 0, tags: [] };
  if (type === "short") return { type, prompt: "", points: 1, answerText: "", tags: [] };
  return { type: "true_false", prompt: "", points: 1, answerBool: true, tags: [] };
};

// internals
const toStr = (v) => (v == null ? "" : String(v));
const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const arr = (v) => (Array.isArray(v) ? v : []);

// API -> Editor
export const fromApiItem = (it = {}) => {
  const t = toStr(it.type).toLowerCase();

  if (t === "multiple-choice" || t === "multiple_choice") {
    const options = arr(it.options).map((o) => toStr(o));
    const answerStr = arr(it.answer_key)[0];
    const idx = Math.max(0, options.findIndex((o) => o === toStr(answerStr)));
    return {
      type: "mcq",
      prompt: toStr(it.prompt),
      points: toNum(it.points, 1),
      choices: options.map((o) => ({ text: o })),
      answerIndex: idx >= 0 ? idx : 0,
      tags: [],
    };
  }

  if (t === "true-false" || t === "true_false") {
    const answerStr = toStr(arr(it.answer_key)[0] ?? "true").toLowerCase();
    return {
      type: "true_false",
      prompt: toStr(it.prompt),
      points: toNum(it.points, 1),
      answerBool: answerStr === "true",
      tags: [],
    };
  }

  const ans = toStr(arr(it.answer_key)[0] ?? "");
  return { type: "short", prompt: toStr(it.prompt), points: toNum(it.points, 1), answerText: ans, tags: [] };
};

// Editor -> API
export const toApiItem = (q = {}, idx = 0) => {
  const base = {
    prompt: toStr(q.prompt),
    hints: arr(q.hints),
    position: idx + 1,
    points: toNum(q.points, 1),
  };

  if (q.type === "mcq") {
    const options = arr(q.choices).map((c) => toStr(c?.text));
    const i = Math.max(0, Math.min(options.length - 1, toNum(q.answerIndex, 0)));
    const answer = options[i] ?? "";
    return { ...base, type: "multiple-choice", options, answer_key: [answer] };
  }

  if (q.type === "true_false") {
    return { ...base, type: "true-false", options: ["true", "false"], answer_key: [q.answerBool ? "true" : "false"] };
  }

  return { ...base, type: "short-answer", options: [], answer_key: q.answerText ? [String(q.answerText)] : [""] };
};

// Batch helpers
export const fromApiItems = (items) => arr(items).map(fromApiItem);
export const toApiItems = (editorItems) => arr(editorItems).map(toApiItem);

// Editor list ops
export const swap = (list, i, j) => {
  const a = arr(list).slice();
  if (i < 0 || j < 0 || i >= a.length || j >= a.length) return a;
  const t = a[i]; a[i] = a[j]; a[j] = t;
  return a;
};
export const duplicateAt = (list, i) => {
  const a = arr(list).slice();
  if (i < 0 || i >= a.length) return a;
  a.splice(i + 1, 0, JSON.parse(JSON.stringify(a[i])));
  return a;
};

// Type guards
export const isMcq = (q) => q?.type === "mcq";
export const isShort = (q) => q?.type === "short";
export const isTrueFalse = (q) => q?.type === "true_false";
