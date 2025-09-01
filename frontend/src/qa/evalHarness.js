/**
 * Tiny, dependency-free evaluator to sanity-check responses
 * during KB / prompt tuning. It isn't “AI grading”, just heuristics.
 */

function norm(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * scoreAnswer:
 * - keyword coverage (requiredKeywords)
 * - banned words (banned)
 * - length window (min/max)
 * Returns { score: 0..100, passed: boolean, reasons: [] }
 */
export function scoreAnswer(answer, cfg = {}) {
  const a = norm(answer);
  const reasons = [];
  let score = 100;

  const req = (cfg.requiredKeywords || []).map(norm);
  const miss = req.filter(k => !a.includes(k));
  if (miss.length) {
    reasons.push(`Missing keywords: ${miss.join(", ")}`);
    score -= Math.min(60, miss.length * 15);
  }

  const banned = (cfg.banned || []).map(norm);
  const hits = banned.filter(k => a.includes(k));
  if (hits.length) {
    reasons.push(`Banned terms present: ${hits.join(", ")}`);
    score -= Math.min(50, hits.length * 20);
  }

  const len = a.split(" ").length;
  if (cfg.minWords && len < cfg.minWords) {
    reasons.push(`Too short (${len} < ${cfg.minWords})`);
    score -= 15;
  }
  if (cfg.maxWords && len > cfg.maxWords) {
    reasons.push(`Too long (${len} > ${cfg.maxWords})`);
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  const passed = score >= (cfg.passAt || 70);
  return { score, passed, reasons };
}

/**
 * runSuite:
 * cases = [{ id, question, expected: { requiredKeywords, banned, minWords, maxWords, passAt } }]
 * answers = map id -> model answer
 */
export function runSuite(cases = [], answers = {}) {
  const results = cases.map((c) => {
    const ans = answers[c.id] || "";
    const res = scoreAnswer(ans, c.expected || {});
    return { id: c.id, question: c.question, answer: ans, ...res };
  });
  const passed = results.filter(r => r.passed).length;
  return {
    summary: `${passed}/${results.length} passed`,
    results
  };
}

// Example:
// const suite = [
//   { id:"1", question:"What is 2+2?", expected:{ requiredKeywords:["4"], maxWords:20 } },
//   { id:"2", question:"Explain a noun.", expected:{ requiredKeywords:["person","place","thing"], maxWords:60 } },
// ];
// const answers = { "1":"2+2 = 4.", "2":"A noun names a person, place, or thing." };
// console.log(runSuite(suite, answers));
