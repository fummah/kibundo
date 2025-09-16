// src/api/academics/curricula.js
import api from "@/api/axios";

/* ------------ Core CRUD ------------ */
export async function listCurricula(params = {}) {
  const { data } = await api.get("/curricula", { params });
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (data?.items) return { items: data.items, total: data.total ?? data.items.length };
  return { items: [], total: 0 };
}

export async function getCurriculum(id) {
  const { data } = await api.get(`/curriculum/${id}`);
  return data;
}

export async function createCurriculum(payload) {
  const { data } = await api.post("/addcurriculum", payload);
  return data;
}

export async function updateCurriculum(id, payload) {
  const { data } = await api.put(`/curriculum/${id}`, payload);
  return data;
}

export async function deleteCurriculum(id) {
  const { data } = await api.delete(`/curriculum/${id}`);
  return data ?? { ok: true };
}

export async function publishCurriculum(id, publish = true) {
  const { data } = await api.post(`/curriculum/${id}/publish`, { publish });
  return data ?? { ok: true };
}

/* ------------ Versions ------------ */
export async function listVersions(curriculumId) {
  const { data } = await api.get(`/curriculum/${curriculumId}/versions`);
  return data;
}

export async function restoreVersion(curriculumId, versionId) {
  const { data } = await api.post(`/curriculum/${curriculumId}/restore/${versionId}`);
  return data;
}

/* ------------ Linking stubs (Games & Reading for now) ------------ */
export async function searchGames(params = {}) {
  const { data } = await api.get("/games", { params });
  return data?.items ?? [];
}

export async function linkGames(curriculumId, ids) {
  const { data } = await api.post(`/curriculum/${curriculumId}/link-games`, { ids });
  return data;
}

export async function searchReading(params = {}) {
  const { data } = await api.get("/reading", { params });
  return data?.items ?? [];
}

export async function linkReading(curriculumId, ids) {
  const { data } = await api.post(`/curriculum/${curriculumId}/link-reading`, { ids });
  return data;
}
