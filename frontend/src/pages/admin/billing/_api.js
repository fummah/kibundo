const API = (p) => `/api${p}`;

export async function listProducts(params = {}) {
  const url = new URL(API("/products"), window.location.origin);
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && url.searchParams.set(k, String(v)));
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}
export async function getProduct(id) {
  const res = await fetch(API(`/products/${id}`), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}
export async function createProduct(payload) {
  const res = await fetch(API(`/products`), {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}
export async function updateProduct(id, payload) {
  const res = await fetch(API(`/products/${id}`), {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}
export async function listInvoices(params = {}) {
  const url = new URL(API("/invoices"), window.location.origin);
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && url.searchParams.set(k, String(v)));
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load invoices");
  return res.json();
}
