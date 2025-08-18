// Dummy Tickets API – stores data in localStorage so UI works without backend
// Replace with real fetch calls when you have an API server

const STORAGE_KEY = "demo_tickets";

function sleep(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = [
    {
      id: 1,
      title: "Login issue",
      description: "User cannot log in with correct password.",
      status: "open",
      priority: "high",
      reporter: "Alice",
      assignee: "Bob",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: "Bug in report export",
      description: "Exported CSV shows garbled characters.",
      status: "in_progress",
      priority: "normal",
      reporter: "Charlie",
      assignee: "Dana",
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

export async function listTickets(params = {}) {
  await sleep();
  const { q = "", status, page = 1, pageSize = 20 } = params;
  const all = readStore();

  const filtered = all.filter((t) => {
    const matchesQ =
      !q ||
      String(t.title).toLowerCase().includes(q.toLowerCase()) ||
      String(t.description).toLowerCase().includes(q.toLowerCase()) ||
      String(t.id).includes(q);
    const matchesStatus = !status || t.status === status;
    return matchesQ && matchesStatus;
  });

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total: filtered.length };
}

export async function getTicket(id) {
  await sleep();
  const all = readStore();
  return all.find((t) => String(t.id) === String(id)) || {};
}

export async function createTicket(payload) {
  await sleep();
  const all = readStore();
  const id = Date.now();
  const now = new Date().toISOString();
  const newItem = {
    id,
    title: payload.title || "",
    description: payload.description || "",
    status: payload.status || "open",
    priority: payload.priority || "normal",
    reporter: payload.reporter || "—",
    assignee: payload.assignee || "—",
    created_at: now,
    updated_at: now,
  };
  all.unshift(newItem);
  writeStore(all);
  return newItem;
}

export async function updateTicket(id, payload) {
  await sleep();
  const all = readStore();
  const idx = all.findIndex((t) => String(t.id) === String(id));
  if (idx === -1) return {};
  all[idx] = { ...all[idx], ...payload, updated_at: new Date().toISOString() };
  writeStore(all);
  return all[idx];
}

export async function deleteTicket(id) {
  await sleep();
  const all = readStore();
  const next = all.filter((t) => String(t.id) !== String(id));
  writeStore(next);
  return { ok: true };
}
