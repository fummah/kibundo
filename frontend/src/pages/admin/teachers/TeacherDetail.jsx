// src/pages/teachers/TeacherDetail.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Tag } from "antd";

const euro = (cents) => {
  const n = Number(cents);
  if (Number.isNaN(n)) return "-";
  return `${(n / 100).toFixed(2)} €`;
};

export default function TeacherDetail() {
  const location = useLocation();
  const prefill = location.state?.prefill || null;

  const cfg = {
    titleSingular: "Teacher",
    idField: "id",
    routeBase: "/admin/teacher", // your UI route base

    api: {
      // match Express (singular)
      getPath: (id) => `/teacher/${id}`,
      updateStatusPath: (id) => `/teacher/${id}/status`,
      removePath: (id) => `/teacher/${id}`,

      // same normalization style as student
      parseEntity: (payload) => {
        const t = payload?.data ?? payload ?? {};
        const u = t.user || {};
        const fb = (v) =>
          v === undefined || v === null || String(v).trim() === "" ? "-" : v;

        const name =
          t.name ||
          u.name ||
          [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
          "-";

        const email = t.email || u.email || "-";
        const phone = u.contact_number || u.phone || t.phone || "-";
        const className = t.class?.class_name || t.department || "-";
        const state = u.state || t.state || t.bundesland || "-";
        const status = t.status || u.status || "-";

        return {
          id: t.id,
          name: fb(name),
          email: fb(email),
          phone: fb(phone),
          className: fb(className),
          state: fb(state),
          status: fb(status),
          createdAt: t.createdAt || t.created_at || u.created_at || null,
          raw: t,
        };
      },
    },

    initialEntity: prefill || undefined,

    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Phone", name: "phone" },
      { label: "Class", name: "className" },
      { label: "State", name: "state" },
      { label: "Status", name: "status" },
      { label: "Date added", name: "createdAt" },
    ],

    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.state && e.state !== "-") chips.push(<Tag key="state">{e.state}</Tag>);
      if (e.className && e.className !== "-") chips.push(<Tag key="class">{e.className}</Tag>);
      return chips;
    },

    tabs: {
      related: {
        enabled: true,
        label: "Classes",
        idField: "id",
        // listPath: (id) => `/teacher/${id}/classes`, // add when backend exposes it
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 80, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
          { title: "Grade", dataIndex: "grade", key: "grade", width: 110, render: (v) => v ?? "-" },
          { title: "Room", dataIndex: "room", key: "room", width: 110, render: (v) => v ?? "-" },
          { title: "Students", dataIndex: "studentsCount", key: "studentsCount", width: 120, render: (v) => v ?? "-" },
        ],
        empty: "No classes for this teacher.",
      },
      audit: { enabled: true, label: "Audit Log", columns: [] },
      tasks: { enabled: true, label: "Tasks" },
      documents: { enabled: true, label: "Documents" },
      communication: { enabled: true, label: "Comments" },
      billing: {
        enabled: true,
        rows: (e) => {
          const sub = e?.subscription || {};
          return [
            { label: "Billing Type", value: e?.billing_type },
            { label: "Billing Email", value: e?.billing_email },
            { label: "Plan Name", value: sub?.name },
            { label: "Plan Interval", value: sub?.interval },
            { label: "Plan Price", value: sub?.priceCents != null ? euro(sub.priceCents) : "-" },
            { label: "Renews On", value: sub?.renewsOn },
            { label: "Subscription Status", value: sub?.status || "-" },
            { label: "Account Balance", value: e?.accountBalanceCents != null ? euro(e.accountBalanceCents) : "-" },
          ];
        },
      },
    },
  };

  return <EntityDetail cfg={cfg} />;
}
