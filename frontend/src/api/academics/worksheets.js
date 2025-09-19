/*
  Worksheets API — dual mode.
  - Real backend when VITE_USE_MOCK_WORKSHEETS !== 'true'
  - LocalStorage mock when VITE_USE_MOCK_WORKSHEETS === 'true'
*/

import api from "@/api/axios";

const USE_MOCK = (import.meta?.env?.VITE_USE_MOCK_WORKSHEETS ?? "true") === "true";
const STORAGE_KEY = "mock_worksheets";

const readStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeStore = (arr) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
};

const matches = (val, q) =>
  String(val ?? "").toLowerCase().includes(String(q ?? "").toLowerCase());

/* ----------------------------- CRUD (dual) ----------------------------- */

export async function listWorksheets(params = {}) {
  if (!USE_MOCK) {
    const { data } = await api.get("/worksheets", { params });
    if (Array.isArray(data)) return { items: data, total: data.length };
    if (data?.items) return { items: data.items, total: data.total ?? data.items.length };
    return { items: [], total: 0 };
  }

  const { page = 1, pageSize = 20, q = "", bundesland, subject, grade } = params || {};
  const all = readStore();
  const filtered = all.filter((w) => {
    if (q && !(matches(w.title, q) || matches(w.subject, q) || (w.tags || []).some((t) => matches(t, q)))) return false;
    if (bundesland && w.bundesland !== bundesland) return false;
    if (subject && !matches(w.subject, subject)) return false;
    if (grade != null && String(w.grade) !== String(grade)) return false;
    return true;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, total };
}

export async function createWorksheet(payload) {
  if (!USE_MOCK) {
    const { data } = await api.post("/addworksheet", payload);
    return data;
  }
  const all = readStore();
  const now = new Date().toISOString();
  const rec = {
    id: Date.now(),
    title: "Untitled",
    description: "",
    bundesland: "",
    subject: "",
    grade: 1,
    difficulty: "easy",
    tags: [],
    content: "",
    created_at: now,
    updated_at: now,
    ...payload,
  };
  all.unshift(rec);
  writeStore(all);
  return rec;
}

export async function updateWorksheet(id, payload) {
  if (!USE_MOCK) {
    const { data } = await api.put(`/worksheet/${id}`, payload);
    return data;
  }
  const all = readStore();
  const idx = all.findIndex((w) => String(w.id) === String(id));
  if (idx === -1) throw new Error("Worksheet not found");
  const now = new Date().toISOString();
  all[idx] = { ...all[idx], ...payload, updated_at: now };
  writeStore(all);
  return all[idx];
}

export async function deleteWorksheet(id) {
  if (!USE_MOCK) {
    const { data } = await api.delete(`/worksheet/${id}`);
    return data ?? { ok: true };
  }
  const all = readStore();
  const next = all.filter((w) => String(w.id) !== String(id));
  writeStore(next);
  return { ok: true };
}

/* ----------------- Linking worksheets to curricula ----------------- */

export async function searchWorksheets(params = {}) {
  if (!USE_MOCK) {
    const { data } = await api.get("/worksheets", { params });
    if (Array.isArray(data)) return data;
    if (data?.items) return data.items;
    return [];
  }
  const { items } = await listWorksheets(params);
  return items;
}

export async function linkWorksheets(curriculumId, ids = []) {
  if (!USE_MOCK) {
    const { data } = await api.post(`/curriculum/${curriculumId}/link-worksheets`, { ids });
    return data;
  }
  return { ok: true, curriculumId, ids };
}

/* ----------------- Seeding helper ----------------- */
export async function seedWorksheets() {
  const samples = [
    { title: "Reading Comprehension A1", subject: "Deutsch", bundesland: "Bayern", grade: 1, difficulty: "easy", tags: ["reading"] },
    { title: "Math Drill – Addition", subject: "Mathematik", bundesland: "Berlin", grade: 2, difficulty: "medium", tags: ["math"] },
    { title: "Science: Plants", subject: "Sachkunde", bundesland: "Hamburg", grade: 3, difficulty: "easy", tags: ["science"] },
  ];
  for (const s of samples) {
    await createWorksheet(s);
  }
  return { count: samples.length };
}
