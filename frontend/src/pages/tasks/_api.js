// LocalStorage-backed stub API so Tasks pages work without a backend.
// Replace with real fetch/axios calls later and keep the same function names.

const STORAGE_KEY = "demo_tasks";

function sleep(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // seed with a few items
  const seed = [
    {
      id: 1001,
      title: "Welcome task",
      description: "This is a demo task stored in localStorage.",
      status: "todo",
      priority: "normal",
      assignee_id: "T-01",
      assignee_name: "Demo User",
      due_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 1002,
      title: "Prepare newsletter segment",
      description: "Segment parents in BW Grade 2.",
      status: "in_progress",
      priority: "high",
      assignee_id: "T-02",
      assignee_name: "Support Agent",
      due_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function writeStore(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function listTasks(params = {}) {
  await sleep();
  const {
    page = 1,
    pageSize = 20,
    q = "",
    status,
    assignee, // id
  } = params;

  const all = readStore();

  const filtered = all.filter((t) => {
    const matchesQ =
      !q ||
      String(t.title || "").toLowerCase().includes(String(q).toLowerCase()) ||
      String(t.description || "").toLowerCase().includes(String(q).toLowerCase()) ||
      String(t.id).includes(String(q));
    const matchesStatus = !status || t.status === status;
    const matchesAssignee = !assignee || String(t.assignee_id) === String(assignee);
    return matchesQ && matchesStatus && matchesAssignee;
  });

  const start = (Number(page) - 1) * Number(pageSize);
  const items = filtered.slice(start, start + Number(pageSize));
  return { items, total: filtered.length };
}

export async function getTask(id) {
  await sleep();
  const all = readStore();
  const item = all.find((t) => String(t.id) === String(id));
  if (!item) return {}; // return empty to avoid crashes
  return item;
}

export async function createTask(payload) {
  await sleep();
  const all = readStore();
  const now = new Date().toISOString();
  const id = Date.now();
  const newItem = {
    id,
    title: payload.title || "",
    description: payload.description || "",
    status: payload.status || "todo",
    priority: payload.priority || "normal",
    assignee_id: payload.assignee_id || "",
    assignee_name: payload.assignee_name || "", // optional
    due_at: payload.due_at || null,
    created_at: now,
    updated_at: now,
  };
  all.unshift(newItem);
  writeStore(all);
  return newItem;
}

export async function updateTask(id, payload) {
  await sleep();
  const all = readStore();
  const idx = all.findIndex((t) => String(t.id) === String(id));
  if (idx === -1) return {};
  const now = new Date().toISOString();
  all[idx] = { ...all[idx], ...payload, updated_at: now };
  writeStore(all);
  return all[idx];
}

export async function deleteTask(id) {
  await sleep();
  const all = readStore();
  const next = all.filter((t) => String(t.id) !== String(id));
  writeStore(next);
  return { ok: true };
}
