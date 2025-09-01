export async function kbSearch(query, topK = 5) {
  const r = await fetch(`/api/kb/search?q=${encodeURIComponent(query)}&k=${topK}`);
  return r.ok ? r.json() : [];
}

export async function kbIngest({ id, title, text, tags = {} }) {
  const r = await fetch(`/api/kb/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title, text, tags }),
  });
  return r.ok;
}
