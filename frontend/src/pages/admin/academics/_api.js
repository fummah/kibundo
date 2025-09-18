// src/pages/academics/_api.js
import api from "@/api/axios";

/** Normalize so UI can rely on .items even if backend returns .questions */
const normalizeQuiz = (q) => {
  if (!q || typeof q !== "object") return q;
  const items = Array.isArray(q.items)
    ? q.items
    : (Array.isArray(q.questions) ? q.questions : []);
  return { ...q, items };
};

/** GET /quizzes  (your axios baseURL resolves to /api → /api/quizzes) */
export async function listQuizzes(params = {}) {
  const { data } = await api.get("/quizzes", { params });
  if (Array.isArray(data)) {
    const items = data.map(normalizeQuiz);
    return { items, total: items.length };
  }
  if (data && Array.isArray(data.items)) {
    return {
      items: data.items.map(normalizeQuiz),
      total: Number.isFinite(data.total) ? data.total : data.items.length,
    };
  }
  return { items: [], total: 0 };
}

/** GET /quiz/:id */
export async function getQuiz(id) {
  const { data } = await api.get(`/quiz/${id}`);
  return normalizeQuiz(data);
}

/** POST /addquiz */
export async function createQuiz(payload) {
  const { data } = await api.post("/addquiz", payload);
  return normalizeQuiz(data);
}

/** PUT /quiz/:id  (only if your backend supports updates) */
export async function updateQuiz(id, payload) {
  const { data } = await api.put(`/quiz/${id}`, payload);
  return normalizeQuiz(data);
}

/** DELETE /quiz/:id */
export async function deleteQuiz(id) {
  const { data } = await api.delete(`/quiz/${id}`);
  return data ?? { ok: true };
}
