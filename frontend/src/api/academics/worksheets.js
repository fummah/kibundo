import api from "@/api/axios";

/* ----------------------------- CRUD ----------------------------- */

/** GET /worksheets */
export async function listWorksheets(params = {}) {
  const { data } = await api.get("/worksheets", { params });
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  if (data?.items) {
    return { items: data.items, total: data.total ?? data.items.length };
  }
  return { items: [], total: 0 };
}

/** POST /addworksheet */
export async function createWorksheet(payload) {
  const { data } = await api.post("/addworksheet", payload);
  return data;
}

/** PUT /worksheet/:id */
export async function updateWorksheet(id, payload) {
  const { data } = await api.put(`/worksheet/${id}`, payload);
  return data;
}

/** DELETE /worksheet/:id */
export async function deleteWorksheet(id) {
  const { data } = await api.delete(`/worksheet/${id}`);
  return data ?? { ok: true };
}

/* ----------------- Linking worksheets to curricula ----------------- */

/** Search worksheets for linking */
export async function searchWorksheets(params = {}) {
  const { data } = await api.get("/worksheets", { params });
  if (Array.isArray(data)) return data;
  if (data?.items) return data.items;
  return [];
}

/** Link worksheets to a curriculum */
export async function linkWorksheets(curriculumId, ids = []) {
  const { data } = await api.post(`/curriculum/${curriculumId}/link-worksheets`, { ids });
  return data;
}
