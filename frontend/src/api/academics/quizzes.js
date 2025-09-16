// src/api/academics/quizzes.js
import api from "@/api/axios";

/** ---------- Helpers ---------- */
const errMsg = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

const normalizeQuiz = (q = {}) => {
  const rawItems = Array.isArray(q.items)
    ? q.items
    : Array.isArray(q.questions)
    ? q.questions
    : [];

  const items = rawItems
    .map((it) => ({
      ...it,
      position:
        typeof it?.position === "number"
          ? it.position
          : Number(it?.position) || 0,
    }))
    .sort((a, b) => a.position - b.position || (a.id || 0) - (b.id || 0));

  return {
    ...q,
    items,
    tags: toArray(q.tags),
    objectives: toArray(q.objectives),
  };
};

const unpackListPayload = (data) => {
  if (Array.isArray(data)) {
    return { items: data.map(normalizeQuiz), total: data.length };
  }
  if (data?.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(normalizeQuiz),
      total: typeof data.total === "number" ? data.total : data.items.length,
      page: data.page ?? data.current_page,
      per_page: data.per_page ?? data.limit ?? data.page_size,
    };
  }
  return { items: [], total: 0 };
};

/** ---------- Preferred REST paths + legacy fallbacks ---------- */
const PATH = {
  list: "/quizzes",
  item: (id) => `/quizzes/${id}`,
  // legacy (temporary fallback support)
  legacyGet: (id) => `/quiz/${id}`,
  legacyCreate: "/addquiz",
  legacyUpdate: "/addquiz", // legacy upsert
  legacyDelete: (id) => `/quiz/${id}`,
};

/** ---------- CRUD ---------- */
export async function listQuizzes(params = {}) {
  try {
    const { data } = await api.get(PATH.list, { params });
    return unpackListPayload(data);
  } catch (err) {
    throw new Error(
      errMsg(
        err,
        `Failed to load quizzes${params?.subject ? ` for ${params.subject}` : ""}.`
      )
    );
  }
}

export async function getQuiz(id) {
  if (!id) throw new Error("Quiz id is required");
  try {
    const { data } = await api.get(PATH.item(id));
    return normalizeQuiz(data);
  } catch (err) {
    // fallback to legacy /quiz/:id
    try {
      const { data } = await api.get(PATH.legacyGet(id));
      return normalizeQuiz(data);
    } catch (err2) {
      throw new Error(errMsg(err2, `Failed to load quiz #${id}.`));
    }
  }
}

export async function createQuiz(payload) {
  try {
    // Preferred REST
    const { data } = await api.post(PATH.list, payload);
    return normalizeQuiz(data);
  } catch (err) {
    // fallback to legacy /addquiz
    try {
      const { data } = await api.post(PATH.legacyCreate, payload);
      return normalizeQuiz(data);
    } catch (err2) {
      throw new Error(errMsg(err2, "Failed to create quiz."));
    }
  }
}

export async function updateQuiz(id, payload) {
  if (!id) throw new Error("Quiz id is required");
  try {
    // Preferred REST (PATCH; switch to PUT if your backend prefers)
    const { data } = await api.patch(PATH.item(id), payload);
    return normalizeQuiz(data);
  } catch (err) {
    // legacy fallback: /addquiz upsert style (requires { id, ...payload })
    try {
      const { data } = await api.post(PATH.legacyUpdate, { id, ...payload });
      return normalizeQuiz(data);
    } catch (err2) {
      throw new Error(errMsg(err2, `Failed to update quiz #${id}.`));
    }
  }
}

// Convenience helper: choose create vs update based on presence of id
export async function upsertQuiz(payload) {
  return payload?.id ? updateQuiz(payload.id, payload) : createQuiz(payload);
}

export async function deleteQuiz(id) {
  if (!id) throw new Error("Quiz id is required");
  try {
    await api.delete(PATH.item(id));
    return { ok: true };
  } catch (err) {
    // fallback to legacy /quiz/:id
    try {
      const { data } = await api.delete(PATH.legacyDelete(id));
      return data ?? { ok: true };
    } catch (err2) {
      throw new Error(errMsg(err2, `Failed to delete quiz #${id}.`));
    }
  }
}

/** ---------- Status / Publishing ---------- */
// Dedicated helper for publish/unpublish so we never hit create by mistake
export async function patchQuizStatus(id, status) {
  if (!id) throw new Error("Quiz id is required");
  try {
    const { data } = await api.patch(PATH.item(id), { status });
    return normalizeQuiz(data);
  } catch (err) {
    // legacy upsert fallback
    try {
      const { data } = await api.post(PATH.legacyUpdate, { id, status });
      return normalizeQuiz(data);
    } catch (err2) {
      throw new Error(errMsg(err2, `Failed to set status for quiz #${id}.`));
    }
  }
}

/** ---------- Linking to curricula ---------- */
export async function searchQuizzes(params = {}) {
  try {
    const { data } = await api.get(PATH.list, { params });
    const { items } = unpackListPayload(data);
    return items;
  } catch (err) {
    throw new Error(errMsg(err, "Failed to search quizzes."));
  }
}

export async function linkQuizzes(curriculumId, ids = []) {
  if (!curriculumId) throw new Error("curriculumId is required");
  try {
    const { data } = await api.post(
      `/curriculum/${curriculumId}/link-quizzes`,
      { ids }
    );
    return data;
  } catch (err) {
    throw new Error(
      errMsg(err, `Failed to link quizzes to curriculum #${curriculumId}.`)
    );
  }
}

export async function unlinkQuiz(curriculumId, quizId) {
  if (!curriculumId || !quizId) {
    throw new Error("curriculumId and quizId are required");
  }
  try {
    const { data } = await api.delete(
      `/curriculum/${curriculumId}/unlink-quiz/${quizId}`
    );
    return data ?? { ok: true };
  } catch (err) {
    throw new Error(
      errMsg(
        err,
        `Failed to unlink quiz #${quizId} from curriculum #${curriculumId}.`
      )
    );
  }
}
