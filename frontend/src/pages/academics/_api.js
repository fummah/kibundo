// src/pages/academics/_api.js

const API = (p) => `/api${p}`;

// ---------- Helper for query params ----------
function buildUrl(path, params = {}) {
  const url = new URL(API(path), window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((val) => url.searchParams.append(k, val));
    else if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, String(v));
  });
  return url;
}

// ---------- Curricula ----------
export async function listCurricula(params = {}) {
  const res = await fetch(buildUrl("/academics/curricula", params), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load curricula");
  return res.json();
}

export async function getCurriculum(id) {
  const res = await fetch(API(`/academics/curricula/${id}`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load curriculum");
  return res.json();
}

export async function createCurriculum(payload) {
  const res = await fetch(API(`/academics/curricula`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create curriculum");
  return res.json();
}

export async function updateCurriculum(id, payload) {
  const res = await fetch(API(`/academics/curricula/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update curriculum");
  return res.json();
}

export async function publishCurriculum(id, publish) {
  const res = await fetch(API(`/academics/curricula/${id}/${publish ? "publish" : "unpublish"}`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to change publish state");
  return res.json();
}

export async function deleteCurriculum(id) {
  const res = await fetch(API(`/academics/curricula/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete curriculum");
}

export async function listVersions(id) {
  const res = await fetch(API(`/academics/curricula/${id}/versions`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load versions");
  return res.json();
}

export async function restoreVersion(id, versionId) {
  const res = await fetch(API(`/academics/curricula/${id}/versions/${versionId}/restore`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to restore version");
  return res.json();
}

// ---------- Curricula ↔ Quizzes linking ----------
export async function linkQuizzes(curriculumId, quizIds = []) {
  const res = await fetch(API(`/academics/curricula/${curriculumId}/links/quizzes`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz_ids: quizIds }),
  });
  if (!res.ok) throw new Error("Failed to link quizzes to curriculum");
  return res.json();
}

export async function unlinkQuiz(curriculumId, quizId) {
  const res = await fetch(API(`/academics/curricula/${curriculumId}/links/quizzes/${quizId}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to unlink quiz from curriculum");
}

// (Optional convenience) list quizzes linked to a curriculum
export async function listCurriculumQuizzes(curriculumId) {
  const res = await fetch(API(`/academics/curricula/${curriculumId}/links/quizzes`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load curriculum quizzes");
  return res.json();
}

// ---------- Subjects ----------
export async function listSubjects(params = {}) {
  const res = await fetch(buildUrl("/academics/subjects", params), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load subjects");
  return res.json();
}

export async function getSubject(id) {
  const res = await fetch(API(`/academics/subjects/${id}`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load subject");
  return res.json();
}

export async function createSubject(payload) {
  const res = await fetch(API(`/academics/subjects`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create subject");
  return res.json();
}

export async function updateSubject(id, payload) {
  const res = await fetch(API(`/academics/subjects/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update subject");
  return res.json();
}

export async function deleteSubject(id) {
  const res = await fetch(API(`/academics/subjects/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete subject");
}

// ---------- Quizzes ----------
export async function listQuizzes(params = {}) {
  const res = await fetch(buildUrl("/quizzes", params), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load quizzes");
  return res.json();
}

export async function getQuiz(id) {
  const res = await fetch(API(`/quizzes/${id}`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load quiz");
  return res.json();
}

export async function createQuiz(payload) {
  const res = await fetch(API(`/quizzes`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create quiz");
  return res.json();
}

export async function updateQuiz(id, payload) {
  const res = await fetch(API(`/quizzes/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update quiz");
  return res.json();
}

export async function deleteQuiz(id) {
  const res = await fetch(API(`/quizzes/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete quiz");
}

export async function publishQuiz(id, publish) {
  const res = await fetch(API(`/quizzes/${id}/${publish ? "publish" : "unpublish"}`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to change quiz state");
  return res.json();
}

// Search helper used by Curricula linking (aliases the same /quizzes endpoint)
export async function searchQuizzes(params = {}) {
  // Accepts filters like: { bundesland: 'BY', subject: 'math', grade: 3, tags: ['fractions','geometry'], q: 'title substring' }
  const res = await fetch(buildUrl("/quizzes", params), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to search quizzes");
  return res.json();
}

// ---------- Subject–Quiz Linking ----------
export async function listSubjectQuizzes(subjectId) {
  const res = await fetch(API(`/academics/subjects/${subjectId}/links/quizzes`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load subject quizzes");
  return res.json();
}

export async function linkQuizToSubject(subjectId, quizId) {
  const res = await fetch(API(`/academics/subjects/${subjectId}/links/quizzes`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz_ids: [quizId] }),
  });
  if (!res.ok) throw new Error("Failed to link quiz to subject");
  return res.json();
}

export async function unlinkQuizFromSubject(subjectId, quizId) {
  const res = await fetch(API(`/academics/subjects/${subjectId}/links/quizzes/${quizId}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to unlink quiz from subject");
}

// ---------- Worksheets ----------
export async function listWorksheets(params = {}) {
  const res = await fetch(buildUrl("/worksheets", params), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load worksheets");
  return res.json();
}

export async function getWorksheet(id) {
  const res = await fetch(API(`/worksheets/${id}`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load worksheet");
  return res.json();
}

export async function createWorksheet(payload) {
  const res = await fetch(API(`/worksheets`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create worksheet");
  return res.json();
}

export async function updateWorksheet(id, payload) {
  const res = await fetch(API(`/worksheets/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update worksheet");
  return res.json();
}

export async function deleteWorksheet(id) {
  const res = await fetch(API(`/worksheets/${id}`), { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to delete worksheet");
}

// ---------- AI Agent ----------
export async function listPromptProfiles() {
  const res = await fetch(API(`/agent/prompts`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load prompt profiles");
  return res.json();
}

export async function createPromptProfile(payload) {
  const res = await fetch(API(`/agent/prompts`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create prompt profile");
  return res.json();
}

export async function updatePromptProfile(id, payload) {
  const res = await fetch(API(`/agent/prompts/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update prompt profile");
  return res.json();
}

export async function deletePromptProfile(id) {
  const res = await fetch(API(`/agent/prompts/${id}`), { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to delete prompt profile");
}

export async function setPromptProfileStage(id, stage) {
  const res = await fetch(API(`/agent/prompts/${id}/stage`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error("Failed to change stage");
  return res.json();
}

export async function testAgent(payload) {
  const res = await fetch(API(`/agent/test`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Agent test failed");
  return res.json();
}

export async function recommendForChild(payload) {
  const res = await fetch(API(`/agent/recommend`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Recommendation failed");
  return res.json();
}
