import React from "react";
import { Tag } from "antd";

const DEFAULT_COLOR_MAP = {
  active: "green",
  trialing: "blue",
  canceled: "red",
  cancelled: "red",
  past_due: "orange",
  inactive: "default",
};

function normalize(raw) {
  if (typeof raw === "boolean") return raw ? "active" : "inactive";
  if (typeof raw === "number") return raw === 1 ? "active" : "inactive";
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if (["true", "1", "active"].includes(s)) return "active";
  if (["false", "0", "inactive"].includes(s)) return "inactive";
  return s;
}

function labelize(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusTag({ value, colorMap = DEFAULT_COLOR_MAP }) {
  const key = normalize(value);
  if (!key) return <Tag>—</Tag>;
  const color = colorMap[key] || "default";
  return <Tag color={color}>{labelize(key)}</Tag>;
}
