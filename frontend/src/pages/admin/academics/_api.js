/**
 * Academics mock API (localStorage-backed) for:
 * - Curricula (with versions + resource linking)
 * - Quizzes (CRUD + questions)
 * - Worksheets (CRUD)
 *
 * Also provides stubbed search/link for Games & Reading so UI imports resolve.
 */

const LS_KEYS = {
  curricula: "mock_curricula_v1",
  quizzes: "mock_acad_quizzes_v1",
  versions: "mock_curr_versions_v1",
  worksheets: "mock_worksheets_v1",
  // (optional future)
  // games: "mock_games_v1",
  // reading: "mock_reading_v1",
};

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));
const matches = (v, q) =>
  String(v ?? "").toLowerCase().includes(String(q ?? "").toLowerCase());
const nextId = (list) =>
  list.length ? Math.max(...list.map((x) => Number(x.id))) + 1 : 1;
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function bumpMinor(v = "0.1") {
  const [maj, min] = String(v)
    .split(".")
    .map((n) => parseInt(n || "0", 10));
  return `${Number.isFinite(maj) ? maj : 0}.${Number.isFinite(min) ? min + 1 : 1}`;
}

/* --------------------------------- Seed --------------------------------- */
(function seedOnce() {
  if (!load(LS_KEYS.quizzes, null)) {
    save(LS_KEYS.quizzes, [
      {
        id: 1001,
        title: "Deutsch – Grammatik Basics",
        subject: "Deutsch",
        grade: 4,
        bundesland: "Bayern",
        status: "published",
        version: "1.0",
        tags: ["Grammatik", "A1"],
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
        questions: [
          {
            id: 1,
            type: "mcq",
            prompt: "Welche Wortart ist 'laufen'?",
            options: ["Nomen", "Verb", "Adjektiv", "Artikel"],
            answer: 1,
            points: 1,
          },
        ],
      },
      {
        id: 1002,
        title: "Mathematik – Brüche I",
        subject: "Mathematik",
        grade: 5,
        bundesland: "Baden-Württemberg",
        status: "review",
        version: "0.9",
        tags: ["Brüche"],
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
        questions: [
          {
            id: 1,
            type: "mcq",
            prompt: "1/2 + 1/4 = ?",
            options: ["1/6", "1/3", "3/4", "2/3"],
            answer: 2,
            points: 1,
          },
        ],
      },
      {
        id: 1003,
        title: "Sachunterricht – Wetter",
        subject: "Sachunterricht",
        grade: 3,
        bundesland: "Berlin",
        status: "draft",
        version: "0.2",
        tags: ["Wetter", "Erde"],
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 12, name: "Editor" },
        questions: [],
      },
      {
        id: 1004,
        title: "Deutsch – Lesen Verständnis",
        subject: "Deutsch",
        grade: 5,
        bundesland: "Hessen",
        status: "draft",
        version: "0.5",
        tags: ["Lesen"],
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
        questions: [],
      },
      {
        id: 1005,
        title: "Mathematik – Geometrie",
        subject: "Mathematik",
        grade: 6,
        bundesland: "Nordrhein-Westfalen",
        status: "draft",
        version: "0.3",
        tags: ["Geometrie"],
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 12, name: "Editor" },
        questions: [],
      },
      {
        id: 1006,
        title: "Informatik – Algorithmen",
        subject: "Informatik",
        grade: 8,
        bundesland: "Hamburg",
        status: "draft",
        version: "0.1",
        tags: ["Algorithmen"],
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 12, name: "Editor" },
        questions: [],
      },
    ]);
  }

  if (!load(LS_KEYS.curricula, null)) {
    save(LS_KEYS.curricula, [
      {
        id: 1,
        title: "Deutsch – Bayern – Grade 4",
        bundesland: "Bayern",
        subject: "Deutsch",
        grade: 4,
        version: "1.0",
        status: "published",
        tags: ["Sprache", "Grammatik"],
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
        content: { units: [{ title: "Nomen & Verben", outcomes: ["Formen", "Erkennen"] }] },
        quizzes: [1001, 1004],
        worksheets: [],
        games: [],
        reading: [],
      },
      {
        id: 2,
        title: "Mathematik – BW – Grade 5",
        bundesland: "Baden-Württemberg",
        subject: "Mathematik",
        grade: 5,
        version: "0.9",
        status: "review",
        tags: ["Mathe", "Brüche"],
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
        content: { units: [{ title: "Brüche I", outcomes: ["Addieren", "Subtrahieren"] }] },
        quizzes: [1002, 1005],
        worksheets: [],
        games: [],
        reading: [],
      },
      {
        id: 3,
        title: "Sachunterricht – Berlin – Grade 3",
        bundesland: "Berlin",
        subject: "Sachunterricht",
        grade: 3,
        version: "1.1",
        status: "draft",
        tags: [],
        updated_at: nowISO(),
        created_by: { id: 12, name: "Editor" },
        content: { units: [{ title: "Wetter & Klima", outcomes: ["Beobachten", "Dokumentieren"] }] },
        quizzes: [1003],
        worksheets: [],
        games: [],
        reading: [],
      },
      {
        id: 4,
        title: "Informatik – Hamburg – Grade 8",
        bundesland: "Hamburg",
        subject: "Informatik",
        grade: 8,
        version: "0.3",
        status: "archived",
        tags: ["IT", "Programmierung"],
        updated_at: nowISO(),
        created_by: { id: 12, name: "Editor" },
        content: { units: [{ title: "Algorithmisches Denken", outcomes: ["Pseudocode"] }] },
        quizzes: [1006],
        worksheets: [],
        games: [],
        reading: [],
      },
    ]);
  }

  if (!load(LS_KEYS.versions, null)) {
    save(LS_KEYS.versions, [
      {
        id: 5001,
        curriculum_id: 1,
        version: "0.9",
        status: "review",
        created_by: { id: 11, name: "Admin" },
        created_at: nowISO(),
        diff_summary: "Initial draft",
      },
      {
        id: 5002,
        curriculum_id: 1,
        version: "1.0",
        status: "published",
        created_by: { id: 11, name: "Admin" },
        created_at: nowISO(),
        diff_summary: "Published content",
      },
      {
        id: 5003,
        curriculum_id: 2,
        version: "0.8",
        status: "draft",
        created_by: { id: 12, name: "Editor" },
        created_at: nowISO(),
        diff_summary: "Added fractions",
      },
      {
        id: 5004,
        curriculum_id: 2,
        version: "0.9",
        status: "review",
        created_by: { id: 12, name: "Editor" },
        created_at: nowISO(),
        diff_summary: "Requested review",
      },
    ]);
  }

  if (!load(LS_KEYS.worksheets, null)) {
    save(LS_KEYS.worksheets, [
      {
        id: 9001,
        title: "Deutsch – Nomen vs Verben",
        description: "Arbeitsblatt zu Wortarten.",
        bundesland: "Bayern",
        subject: "Deutsch",
        grade: 4,
        difficulty: "easy",
        tags: ["Grammatik"],
        content: "—",
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
      },
      {
        id: 9002,
        title: "Mathematik – Brüche addieren",
        description: "Üben von Brüchen.",
        bundesland: "Baden-Württemberg",
        subject: "Mathematik",
        grade: 5,
        difficulty: "medium",
        tags: ["Brüche"],
        content: "—",
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 11, name: "Admin" },
      },
      {
        id: 9003,
        title: "Sachunterricht – Wetter Symbole",
        description: "Zuordnung von Wetter-Symbolen.",
        bundesland: "Berlin",
        subject: "Sachunterricht",
        grade: 3,
        difficulty: "easy",
        tags: ["Wetter"],
        content: "—",
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: { id: 12, name: "Editor" },
      },
    ]);
  }
})();

/* ------------------------------- Curricula ------------------------------- */
export async function listCurricula({
  page = 1,
  pageSize = 20,
  q = "",
  bundesland,
  subject,
  grade,
  status,
} = {}) {
  await delay();
  const all = load(LS_KEYS.curricula, []);
  const filtered = all.filter((c) => {
    const textOk =
      !q ||
      matches(c.title, q) ||
      matches(c.subject, q) ||
      (c.tags ?? []).some((t) => matches(t, q));
    const stateOk = !bundesland || c.bundesland === bundesland;
    const subjOk = !subject || matches(c.subject, subject);
    const gradeOk = !grade || Number(c.grade) === Number(grade);
    const statusOk = !status || c.status === status;
    return textOk && stateOk && subjOk && gradeOk && statusOk;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { items: clone(filtered.slice(start, start + pageSize)), total };
}

export async function getCurriculum(id) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const quizzes = load(LS_KEYS.quizzes, []);
  const worksheets = load(LS_KEYS.worksheets, []);
  const item = curricula.find((c) => String(c.id) === String(id));
  if (!item) return null;
  const full = clone(item);
  full.quizzes = (item.quizzes || [])
    .map((qid) => quizzes.find((q) => Number(q.id) === Number(qid)))
    .filter(Boolean);
  full.worksheets = (item.worksheets || [])
    .map((wid) => worksheets.find((w) => Number(w.id) === Number(wid)))
    .filter(Boolean);
  // games/reading stubs: only ids → simple titles
  full.games = Array.isArray(item.games)
    ? item.games.map((gid) => ({ id: gid, title: `Game #${gid}` }))
    : [];
  full.reading = Array.isArray(item.reading)
    ? item.reading.map((rid) => ({ id: rid, title: `Reading #${rid}` }))
    : [];
  return full;
}

export async function createCurriculum(payload) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const versions = load(LS_KEYS.versions, []);
  const id = nextId(curricula);
  const item = {
    id,
    title: payload.title || "",
    bundesland: payload.bundesland || "",
    subject: payload.subject || "",
    grade: Number(payload.grade ?? 1),
    version: "0.1",
    status: payload.status || "draft",
    tags: payload.tags || [],
    updated_at: nowISO(),
    created_by: { id: 11, name: "Admin" },
    content: payload.content || {},
    quizzes: [],
    worksheets: [],
    games: [],
    reading: [],
  };
  curricula.unshift(item);
  save(LS_KEYS.curricula, curricula);
  versions.push({
    id: nextId(versions),
    curriculum_id: id,
    version: item.version,
    status: item.status,
    created_by: { id: 11, name: "Admin" },
    created_at: nowISO(),
    diff_summary: "Initial create",
  });
  save(LS_KEYS.versions, versions);
  return clone(item);
}

export async function updateCurriculum(id, payload) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const versions = load(LS_KEYS.versions, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(id));
  if (idx < 0) throw new Error("Not found");
  const prev = curricula[idx];
  const updated = {
    ...prev,
    title: payload.title ?? prev.title,
    bundesland: payload.bundesland ?? prev.bundesland,
    subject: payload.subject ?? prev.subject,
    grade: payload.grade !== undefined ? Number(payload.grade) : prev.grade,
    status: payload.status ?? prev.status,
    tags: payload.tags ?? prev.tags,
    content: payload.content ?? prev.content,
    version: bumpMinor(prev.version),
    updated_at: nowISO(),
  };
  curricula[idx] = updated;
  save(LS_KEYS.curricula, curricula);
  versions.push({
    id: nextId(versions),
    curriculum_id: updated.id,
    version: updated.version,
    status: updated.status,
    created_by: { id: 11, name: "Admin" },
    created_at: nowISO(),
    diff_summary: "Edited fields",
  });
  save(LS_KEYS.versions, versions);
  return clone(updated);
}

export async function deleteCurriculum(id) {
  await delay();
  save(
    LS_KEYS.curricula,
    load(LS_KEYS.curricula, []).filter((c) => String(c.id) !== String(id))
  );
  return { ok: true };
}

export async function publishCurriculum(id, publish) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const versions = load(LS_KEYS.versions, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(id));
  if (idx < 0) throw new Error("Not found");
  curricula[idx] = {
    ...curricula[idx],
    status: publish ? "published" : "draft",
    version: bumpMinor(curricula[idx].version),
    updated_at: nowISO(),
  };
  save(LS_KEYS.curricula, curricula);
  versions.push({
    id: nextId(versions),
    curriculum_id: Number(id),
    version: curricula[idx].version,
    status: curricula[idx].status,
    created_by: { id: 11, name: "Admin" },
    created_at: nowISO(),
    diff_summary: publish ? "Published" : "Unpublished",
  });
  save(LS_KEYS.versions, versions);
  return clone(curricula[idx]);
}

export async function listVersions(curriculumId) {
  await delay();
  return clone(
    load(LS_KEYS.versions, []).filter(
      (v) => String(v.curriculum_id) === String(curriculumId)
    )
  );
}

export async function restoreVersion(curriculumId, versionId) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const versions = load(LS_KEYS.versions, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(curriculumId));
  if (idx < 0) throw new Error("Not found");
  const ver = versions.find(
    (v) =>
      String(v.id) === String(versionId) &&
      String(v.curriculum_id) === String(curriculumId)
  );
  if (!ver) throw new Error("Version not found");
  curricula[idx] = {
    ...curricula[idx],
    version: ver.version,
    status: ver.status,
    updated_at: nowISO(),
  };
  save(LS_KEYS.curricula, curricula);
  versions.push({
    id: nextId(versions),
    curriculum_id: Number(curriculumId),
    version: curricula[idx].version,
    status: curricula[idx].status,
    created_by: { id: 11, name: "Admin" },
    created_at: nowISO(),
    diff_summary: `Restored to ${ver.version}`,
  });
  save(LS_KEYS.versions, versions);
  return clone(curricula[idx]);
}

/* ------------------------------- Quiz linking ------------------------------ */
export async function searchQuizzes({
  bundesland = "",
  subject = "",
  grade = "",
  q = "",
} = {}) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  return clone(
    all.filter((x) => {
      const textOk =
        !q || matches(x.title, q) || (x.tags ?? []).some((t) => matches(t, q));
      const stateOk = !bundesland || x.bundesland === bundesland;
      const subjOk = !subject || matches(x.subject, subject);
      const gradeOk = !grade || Number(x.grade) === Number(grade);
      return textOk && stateOk && subjOk && gradeOk;
    })
  );
}

export async function linkQuizzes(curriculumId, quizIds = []) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(curriculumId));
  if (idx < 0) throw new Error("Curriculum not found");
  const set = new Set(curricula[idx].quizzes || []);
  quizIds.forEach((id) => set.add(Number(id)));
  curricula[idx].quizzes = Array.from(set);
  curricula[idx].updated_at = nowISO();
  save(LS_KEYS.curricula, curricula);
  return clone(curricula[idx]);
}

export async function unlinkQuiz(curriculumId, quizId) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(curriculumId));
  if (idx < 0) throw new Error("Curriculum not found");
  curricula[idx].quizzes = (curricula[idx].quizzes || []).filter(
    (id) => Number(id) !== Number(quizId)
  );
  curricula[idx].updated_at = nowISO();
  save(LS_KEYS.curricula, curricula);
  return clone(curricula[idx]);
}

/* ---------------------------------- Quizzes ---------------------------------- */
export async function listQuizzes({
  page = 1,
  pageSize = 20,
  q = "",
  bundesland,
  subject,
  grade,
  status,
} = {}) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const filtered = all.filter((x) => {
    const textOk =
      !q ||
      matches(x.title, q) ||
      matches(x.subject, q) ||
      (x.tags ?? []).some((t) => matches(t, q));
    const stateOk = !bundesland || x.bundesland === bundesland;
    const subjOk = !subject || matches(x.subject, subject);
    const gradeOk = !grade || Number(x.grade) === Number(grade);
    const statusOk = !status || x.status === status;
    return textOk && stateOk && subjOk && gradeOk && statusOk;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { items: clone(filtered.slice(start, start + pageSize)), total };
}

export async function getQuiz(id) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const it = all.find((q) => String(q.id) === String(id));
  return it ? clone(it) : null;
}

export async function createQuiz(payload) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const id = nextId(all);
  const quiz = {
    id,
    title: payload.title || "Untitled Quiz",
    subject: payload.subject || "",
    grade: Number(payload.grade ?? 1),
    bundesland: payload.bundesland || "",
    status: payload.status || "draft",
    version: "0.1",
    tags: payload.tags || [],
    created_at: nowISO(),
    updated_at: nowISO(),
    created_by: payload.created_by || { id: 11, name: "Admin" },
    questions: Array.isArray(payload.questions) ? payload.questions : [],
  };
  all.unshift(quiz);
  save(LS_KEYS.quizzes, all);
  return clone(quiz);
}

export async function updateQuiz(id, payload) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const idx = all.findIndex((q) => String(q.id) === String(id));
  if (idx < 0) throw new Error("Quiz not found");
  const prev = all[idx];
  all[idx] = {
    ...prev,
    title: payload.title ?? prev.title,
    subject: payload.subject ?? prev.subject,
    grade: payload.grade !== undefined ? Number(payload.grade) : prev.grade,
    bundesland: payload.bundesland ?? prev.bundesland,
    status: payload.status ?? prev.status,
    tags: payload.tags ?? prev.tags,
    questions: payload.questions ?? prev.questions,
    version: bumpMinor(prev.version),
    updated_at: nowISO(),
  };
  save(LS_KEYS.quizzes, all);
  return clone(all[idx]);
}

export async function deleteQuiz(id) {
  await delay();
  save(
    LS_KEYS.quizzes,
    load(LS_KEYS.quizzes, []).filter((q) => String(q.id) !== String(id))
  );
  return { ok: true };
}

export async function publishQuiz(id, publish) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const idx = all.findIndex((q) => String(q.id) === String(id));
  if (idx < 0) throw new Error("Quiz not found");
  all[idx] = {
    ...all[idx],
    status: publish ? "published" : "draft",
    version: bumpMinor(all[idx].version),
    updated_at: nowISO(),
  };
  save(LS_KEYS.quizzes, all);
  return clone(all[idx]);
}

export async function duplicateQuiz(id) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const src = all.find((q) => String(q.id) === String(id));
  if (!src) throw new Error("Quiz not found");
  const copy = clone(src);
  copy.id = nextId(all);
  copy.title = `${src.title} (Copy)`;
  copy.status = "draft";
  copy.version = "0.1";
  copy.created_at = nowISO();
  copy.updated_at = nowISO();
  all.unshift(copy);
  save(LS_KEYS.quizzes, all);
  return clone(copy);
}

export async function addQuestion(quizId, question) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const idx = all.findIndex((q) => String(q.id) === String(quizId));
  if (idx < 0) throw new Error("Quiz not found");
  const qz = all[idx];
  const newId = qz.questions?.length
    ? Math.max(...qz.questions.map((x) => x.id)) + 1
    : 1;
  const item = { id: newId, points: 1, ...question };
  qz.questions = [...(qz.questions || []), item];
  qz.updated_at = nowISO();
  qz.version = bumpMinor(qz.version);
  save(LS_KEYS.quizzes, all);
  return clone(item);
}

export async function removeQuestion(quizId, questionId) {
  await delay();
  const all = load(LS_KEYS.quizzes, []);
  const idx = all.findIndex((q) => String(q.id) === String(quizId));
  if (idx < 0) throw new Error("Quiz not found");
  const qz = all[idx];
  qz.questions = (qz.questions || []).filter(
    (x) => Number(x.id) !== Number(questionId)
  );
  qz.updated_at = nowISO();
  qz.version = bumpMinor(qz.version);
  save(LS_KEYS.quizzes, all);
  return { ok: true };
}

/* -------------------------------- Worksheets -------------------------------- */
export async function listWorksheets({
  page = 1,
  pageSize = 20,
  q = "",
  bundesland,
  subject,
  grade,
} = {}) {
  await delay();
  const all = load(LS_KEYS.worksheets, []);
  const filtered = all.filter((w) => {
    const textOk =
      !q ||
      matches(w.title, q) ||
      matches(w.description, q) ||
      matches(w.subject, q) ||
      (w.tags ?? []).some((t) => matches(t, q));
    const stateOk = !bundesland || w.bundesland === bundesland;
    const subjOk = !subject || matches(w.subject, subject);
    const gradeOk = !grade || Number(w.grade) === Number(grade);
    return textOk && stateOk && subjOk && gradeOk;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { items: clone(filtered.slice(start, start + pageSize)), total };
}

export async function searchWorksheets(filters = {}) {
  const { q = "", bundesland, subject, grade } = filters;
  const { items } = await listWorksheets({
    page: 1,
    pageSize: 1000,
    q,
    bundesland,
    subject,
    grade,
  });
  return items;
}

export async function createWorksheet(payload) {
  await delay();
  const all = load(LS_KEYS.worksheets, []);
  const id = nextId(all);
  const item = {
    id,
    title: payload.title || "Untitled Worksheet",
    description: payload.description || "",
    bundesland: payload.bundesland || "",
    subject: payload.subject || "",
    grade: Number(payload.grade ?? 1),
    difficulty: payload.difficulty || "easy",
    tags: payload.tags || [],
    content: payload.content || "",
    created_at: nowISO(),
    updated_at: nowISO(),
    created_by: payload.created_by || { id: 11, name: "Admin" },
  };
  all.unshift(item);
  save(LS_KEYS.worksheets, all);
  return clone(item);
}

export async function updateWorksheet(id, payload) {
  await delay();
  const all = load(LS_KEYS.worksheets, []);
  const idx = all.findIndex((w) => String(w.id) === String(id));
  if (idx < 0) throw new Error("Worksheet not found");
  const prev = all[idx];
  all[idx] = {
    ...prev,
    title: payload.title ?? prev.title,
    description: payload.description ?? prev.description,
    bundesland: payload.bundesland ?? prev.bundesland,
    subject: payload.subject ?? prev.subject,
    grade: payload.grade !== undefined ? Number(payload.grade) : prev.grade,
    difficulty: payload.difficulty ?? prev.difficulty,
    tags: payload.tags ?? prev.tags,
    content: payload.content ?? prev.content,
    updated_at: nowISO(),
  };
  save(LS_KEYS.worksheets, all);
  return clone(all[idx]);
}

export async function deleteWorksheet(id) {
  await delay();
  save(
    LS_KEYS.worksheets,
    load(LS_KEYS.worksheets, []).filter((w) => String(w.id) !== String(id))
  );
  return { ok: true };
}

export async function linkWorksheets(curriculumId, worksheetIds = []) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(curriculumId));
  if (idx < 0) throw new Error("Curriculum not found");
  const set = new Set(curricula[idx].worksheets || []);
  worksheetIds.forEach((id) => set.add(Number(id)));
  curricula[idx].worksheets = Array.from(set);
  curricula[idx].updated_at = nowISO();
  save(LS_KEYS.curricula, curricula);
  return clone(curricula[idx]);
}

/* ----------------------- Games / Reading (stubs) ----------------------- */
export async function searchGames(/* filters */) {
  await delay();
  return [];
}
export async function searchReading(/* filters */) {
  await delay();
  return [];
}
export async function linkGames(curriculumId, gameIds = []) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(curriculumId));
  if (idx < 0) throw new Error("Curriculum not found");
  const set = new Set(curricula[idx].games || []);
  gameIds.forEach((id) => set.add(Number(id)));
  curricula[idx].games = Array.from(set);
  curricula[idx].updated_at = nowISO();
  save(LS_KEYS.curricula, curricula);
  return clone(curricula[idx]);
}
export async function linkReading(curriculumId, readingIds = []) {
  await delay();
  const curricula = load(LS_KEYS.curricula, []);
  const idx = curricula.findIndex((c) => String(c.id) === String(curriculumId));
  if (idx < 0) throw new Error("Curriculum not found");
  const set = new Set(curricula[idx].reading || []);
  readingIds.forEach((id) => set.add(Number(id)));
  curricula[idx].reading = Array.from(set);
  curricula[idx].updated_at = nowISO();
  save(LS_KEYS.curricula, curricula);
  return clone(curricula[idx]);
}
