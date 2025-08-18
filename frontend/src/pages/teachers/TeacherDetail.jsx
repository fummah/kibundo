import React from "react";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Tag } from "antd";

const euro = (cents) => {
  const n = Number(cents);
  if (Number.isNaN(n)) return "-";
  return `${(n / 100).toFixed(2)} €`;
};

export default function TeacherDetail() {
  const cfg = {
    titleSingular: "Teacher",
    idField: "id",
    routeBase: "/admin/teachers",

    api: {
      getPath: (id) => `/teachers/${id}`,
      updateStatusPath: (id) => `/teachers/${id}/status`,
      removePath: (id) => `/teachers/${id}`,
      parseEntity: (raw) => {
        const subjectsText = Array.isArray(raw?.subjects) ? raw.subjects.join(", ") : raw?.subjects || "-";
        const classes = Array.isArray(raw?.classes) ? raw.classes : [];
        const totalStudents = classes.reduce((acc, c) => acc + Number(c?.studentsCount || 0), 0);
        const subscription = raw?.activePlan || raw?.subscription || {};
        return { ...raw, subjectsText, classesCount: classes.length, totalStudents, subscription };
      },
    },

    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Phone", name: "phone" },
      { label: "Department", name: "department" },
      { label: "City", name: "city" },
      { label: "Street", name: "street" },
      { label: "ZIP", name: "zip" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Subjects", name: "subjectsText" },
      { label: "Classes (Count)", name: "classesCount" },
      { label: "Students (Total)", name: "totalStudents" },
      { label: "Billing Email", name: "billing_email" },
      { label: "Billing Type", name: "billing_type" },
      { label: "Subscription Status", name: ["subscription", "status"] },
      { label: "Account Balance (EUR)", name: "accountBalanceCents" },
      { label: "Created", name: "createdAt" },
      { label: "Updated", name: "updatedAt" },
    ],

    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.department) chips.push(<Tag key="dept">{e.department}</Tag>);
      if (e.city) chips.push(<Tag key="city">{e.city}</Tag>);
      if (e?.subjectsText && e.subjectsText !== "-") chips.push(<Tag key="subjects">{e.subjectsText}</Tag>);
      return chips;
    },

    tabs: {
      related: {
        enabled: true,
        label: "Classes",
        idField: "id",
        // listPath: (id) => `/teachers/${id}/classes`,
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 80, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
          { title: "Grade", dataIndex: "grade", key: "grade", width: 110, render: (v) => v ?? "-" },
          { title: "Room", dataIndex: "room", key: "room", width: 110, render: (v) => v ?? "-" },
          { title: "Students", dataIndex: "studentsCount", key: "studentsCount", width: 120, render: (v) => v ?? "-" },
        ],
      },

      audit: {
        enabled: true,
        label: "Audit Log",
        columns: [
          { title: "Time", dataIndex: "created_at", key: "created_at", width: 180, render: (v) => v ?? "-" },
          { title: "Actor", dataIndex: "actor_id", key: "actor_id", width: 120, render: (v) => v ?? "-" },
          { title: "Role", dataIndex: "actor_role", key: "actor_role", width: 120, render: (v) => v ?? "-" },
          { title: "Action", dataIndex: "action", key: "action", width: 160, render: (v) => v ?? "-" },
          { title: "Target", dataIndex: "target_type", key: "target_type", width: 120, render: (v, r) => r?.target_type ?? "-" },
          { title: "Payload", dataIndex: "payload", key: "payload", render: (v) => (v ? JSON.stringify(v) : "-") },
        ],
      },

      // TASKS CRUD
      tasks: {
        enabled: true,
        label: "Tasks",
        // listPath: (id) => `/teachers/${id}/tasks`,
        // createPath: (id) => `/teachers/${id}/tasks`,
        // updatePath: (id, taskId) => `/teachers/${id}/tasks/${taskId}`,
        // deletePath: (id, taskId) => `/teachers/${id}/tasks/${taskId}`,
      },

      // DOCUMENTS
      documents: {
        enabled: true,
        label: "Documents",
        // listPath: (id) => `/teachers/${id}/documents`,
        // uploadPath: (id) => `/teachers/${id}/documents`,
        // deletePath: (id, docId) => `/teachers/${id}/documents/${docId}`,
        // commentListPath: (id, docId) => `/teachers/${id}/documents/${docId}/comments`,
        // commentCreatePath: (id, docId) => `/teachers/${id}/documents/${docId}/comments`,
      },

      // COMMENTS
      communication: {
        enabled: true,
        label: "Comments",
        // listPath: (id) => `/teachers/${id}/comments`,
        // createPath: (id) => `/teachers/${id}/comments`,
      },

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
