// src/utils/diffTranscript.js

// Tokenize while preserving original display text, but also compute a
// normalized form for matching (case/punct insensitive, Unicode aware).
function tokenize(s) {
  const rawWords = (s || "").split(/\s+/).filter(Boolean);
  return rawWords.map((w) => ({
    display: w,
    norm: w
      .toLowerCase()
      .replace(/[^\p{L}\p{N}']/gu, ""), // keep letters, numbers, apostrophes
  }));
}

function normalizeAll(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein distance (iterative, O(mn))
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev; // no-op
      } else {
        dp[j] = Math.min(
          prev + 1,     // substitute
          dp[j] + 1,    // delete
          dp[j - 1] + 1 // insert
        );
      }
      prev = tmp;
    }
  }
  return dp[n];
}

// Similarity in [0,1], 1 = exact
function similarity(a, b) {
  if (!a && !b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

/**
 * diffTranscript(expected, spoken)
 * Returns:
 * {
 *   score: number in [0,1], // proportion of exact matches
 *   tokens: Array<{ text: string, type: "ok" | "missing" | "mismatch" }>
 * }
 *
 * Notes:
 * - "ok": exact word match (after normalization)
 * - "mismatch": spoken had a nearby/similar word or extra word around this position
 * - "missing": expected word not found/aligned in spoken
 * - We render expected words only to keep layout consistent with your UIs
 */
export function diffTranscript(expected, spoken) {
  // Fast-path: empty cases
  const expNormStr = normalizeAll(expected);
  const spkNormStr = normalizeAll(spoken);

  const expToks = tokenize(expected); // [{display, norm}]
  const spkToks = tokenize(spoken);   // [{display, norm}]

  const tokens = [];
  let i = 0; // index in expected tokens
  let j = 0; // index in spoken tokens
  let ok = 0;

  // Heuristics
  const SIM_THRESHOLD = 0.75; // treat as mismatch (near-miss) if >= 0.75 similar

  while (i < expToks.length || j < spkToks.length) {
    const ew = expToks[i]?.norm ?? null;
    const sw = spkToks[j]?.norm ?? null;

    // Both present and exact match
    if (ew && sw && ew === sw) {
      tokens.push({ text: expToks[i].display, type: "ok" });
      ok++; i++; j++;
      continue;
    }

    // Lookahead heuristics to detect simple insertions/omissions
    const ewNext = expToks[i + 1]?.norm ?? null;
    const swNext = spkToks[j + 1]?.norm ?? null;

    // Spoken has an extra word: expected matches the next spoken
    if (ew && swNext && ew === swNext) {
      // mark current expected as ok (will be handled next loop), but current spoken is "extra"
      // Instead of adding an 'extra' token (your UI doesn't render extras),
      // we advance spoken pointer and mark current expected as mismatch to cue attention.
      tokens.push({ text: expToks[i].display, type: "mismatch" });
      i++; j += 2; // skip the extra spoken word
      continue;
    }

    // Expected missing: spoken matches next expected
    if (ewNext && sw && ewNext === sw) {
      tokens.push({ text: expToks[i].display, type: "missing" });
      i++; // skip this expected; keep spoken for next loop
      continue;
    }

    // Fuzzy match (near-miss) when both present
    if (ew && sw) {
      const sim = similarity(ew, sw);
      if (sim >= SIM_THRESHOLD) {
        tokens.push({ text: expToks[i].display, type: "mismatch" });
        i++; j++;
        continue;
      }
      // Not similar enough → decide which side to advance:
      // Prefer to mark expected as missing to guide the child to that word.
      tokens.push({ text: expToks[i].display, type: "missing" });
      i++;
      continue;
    }

    // Only expected remains
    if (ew && !sw) {
      tokens.push({ text: expToks[i].display, type: "missing" });
      i++;
      continue;
    }

    // Only spoken remains (extra words at the end) — ignore extra, but nudge next expected as mismatch
    if (!ew && sw) {
      // Advance spoken, keep marking nothing (we only render expected tokens)
      j++;
      continue;
    }
  }

  const score = expToks.length ? ok / expToks.length : 0;
  return { score, tokens };
}
