// Safe display helpers — always show “–” for missing values
export const P = "–";

export function isNil(v) {
  return v === null || v === undefined;
}

export function safe(v, placeholder = P) {
  if (isNil(v)) return placeholder;
  if (typeof v === "string") return v.trim() === "" ? placeholder : v;
  if (Array.isArray(v)) return v.length ? v : placeholder;
  if (typeof v === "number" && Number.isNaN(v)) return placeholder;
  return v;
}

export function safeJoin(arr, sep = ", ", placeholder = P) {
  if (!Array.isArray(arr) || !arr.length) return placeholder;
  return arr.filter(Boolean).join(sep) || placeholder;
}

export function safeDate(iso, placeholder = P) {
  if (!iso) return placeholder;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? placeholder : d.toLocaleString();
}

// React helpers
import React from "react";
import { Tag } from "antd";

export function SafeText({ value, placeholder = P, children }) {
  if (children !== undefined) return <>{safe(children, placeholder)}</>;
  return <>{safe(value, placeholder)}</>;
}

export function SafeDate({ value, placeholder = P }) {
  return <>{safeDate(value, placeholder)}</>;
}

export function SafeTags({ value, placeholder = P }) {
  if (!Array.isArray(value) || value.length === 0) return <>{placeholder}</>;
  return value.map((t) => <Tag key={String(t)}>{safe(t)}</Tag>);
}
