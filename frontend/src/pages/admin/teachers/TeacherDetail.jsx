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
      // ✅ match Express (singular)
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

        // Location = School
        const school =
          t.school?.name || t.school_name || t.school || t.location || "-";

        const email = t.email || u.email || "-";
        const bundesland = t.bundesland || "-";
        const status = t.status || u.status || "-";

        const subjectsText = Array.isArray(t.subjects)
          ? t.subjects.join(", ")
          : t.subjects || "-";

        const classes = Array.isArray(t.classes) ? t.classes : [];
        const classesCount = classes.length;
        const totalStudents = classes.reduce(
          (acc, c) => acc + Number(c?.studentsCount || 0),
          0
        );

        const subscription = t.activePlan || t.subscription || {};

        return {
          id: t.id,
          name: fb(name),
          email: fb(email),
          school: fb(school),
          bundesland: fb(bundesland),
          status: fb(status),
          subjectsText,
          classesCount,
          totalStudents,
          billing_email: t.billing_email,
          billing_type: t.billing_type,
          accountBalanceCents: t.accountBalanceCents,
          subscription,
          createdAt: t.createdAt || t.created_at || u.created_at || null,
          updatedAt: t.updatedAt || t.updated_at || null,
          raw: t,
        };
      },
    },

    initialEntity: prefill || undefined,

    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "School", name: "school" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Subjects", name: "subjectsText" },
      { label: "Classes (Count)", name: "classesCount" },
      { label: "Students (Total)", name: "totalStudents" },
      { label: "Billing Email", name: "billing_email" },
      { label: "Billing Type", name: "billing_type" },
      { label: "Subscription Status", name: ["subscription", "status"] },
      { label: "Plan Interval", name: ["subscription", "interval"] },
      { label: "Account Balance", name: "accountBalanceCents" },
      { label: "Created", name: "createdAt" },
      { label: "Updated", name: "updatedAt" },
    ],

    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.school && e.school !== "-") chips.push(<Tag key="school">{e.school}</Tag>);
      if (e.bundesland && e.bundesland !== "-") chips.push(<Tag key="state">{e.bundesland}</Tag>);
      if (e?.subjectsText && e.subjectsText !== "-")
        chips.push(<Tag key="subjects">{e.subjectsText}</Tag>);
      if (e?.subscription?.status) {
        const s = String(e.subscription.status).toLowerCase();
        chips.push(
          <Tag key="sub" color={s === "active" ? "green" : s === "past_due" ? "gold" : "red"}>
            {e.subscription.status}
          </Tag>
        );
      }
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
