import React from "react";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Tag } from "antd";

const euro = (cents) => {
  const n = Number(cents);
  if (Number.isNaN(n)) return "-";
  return `${(n / 100).toFixed(2)} €`;
};

export default function StudentDetail() {
  const cfg = {
    titleSingular: "Student",
    idField: "id",
    routeBase: "/admin/students",

    api: {
      getPath: (id) => `/students/${id}`,
      updateStatusPath: (id) => `/students/${id}/status`,
      removePath: (id) => `/students/${id}`,
      parseEntity: (raw) => {
        const subjectsFromArray = Array.isArray(raw?.subjects) ? raw.subjects : null;
        const subjectsFromProgress =
          raw?.progress && raw.progress.subjects && typeof raw.progress.subjects === "object"
            ? Object.keys(raw.progress.subjects)
            : null;
        const subjectsText =
          (subjectsFromArray && subjectsFromArray.join(", ")) ||
          (subjectsFromProgress && subjectsFromProgress.join(", ")) ||
          "-";

        const parent = raw?.parent || {};
        const siblings = Array.isArray(raw?.siblings) ? raw.siblings : [];
        const subscription = raw?.activePlan || raw?.subscription || parent?.activePlan || {};

        return {
          ...raw,
          subjectsText,
          parentSummary: {
            id: parent?.id,
            name: parent?.name,
            email: parent?.email,
            bundesland: parent?.bundesland,
          },
          siblingsCount: siblings.length,
          subscription,
        };
      },
    },

    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Phone", name: "phone" },
      { label: "Grade", name: "grade" },
      { label: "School", name: "school" },
      { label: "City", name: "city" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Subjects", name: "subjectsText" },
      { label: "Interests", name: "interests" },

      // Relationships
      { label: "Parent ID", name: ["parentSummary", "id"] },
      { label: "Parent Name", name: ["parentSummary", "name"] },
      { label: "Parent Email", name: ["parentSummary", "email"] },
      { label: "Parent State", name: ["parentSummary", "bundesland"] },
      { label: "Siblings (Count)", name: "siblingsCount" },

      // Billing (if present)
      { label: "Billing Email", name: "billing_email" },
      { label: "Billing Type", name: "billing_type" },
      { label: "Subscription Status", name: ["subscription", "status"] },
      { label: "Plan Interval", name: ["subscription", "interval"] },
      { label: "Account Balance (EUR)", name: "accountBalanceCents" },

      { label: "Created", name: "createdAt" },
      { label: "Updated", name: "updatedAt" },
    ],

    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.grade) chips.push(<Tag key="grade">Grade: {e.grade}</Tag>);
      if (e.bundesland) chips.push(<Tag key="state">{e.bundesland}</Tag>);
      if (Array.isArray(e?.interests) && e.interests.length) chips.push(<Tag key="interests">Interests: {e.interests.join(", ")}</Tag>);
      if (e?.subscription?.status) {
        const s = String(e.subscription.status).toLowerCase();
        chips.push(<Tag key="sub" color={s === "active" ? "green" : s === "past_due" ? "gold" : "red"}>{e.subscription.status}</Tag>);
      }
      return chips;
    },

    tabs: {
      related: {
        enabled: true,
        label: "Guardians",
        idField: "id",
        // listPath: (id) => `/students/${id}/guardians`,
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 80, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
          { title: "Relationship", dataIndex: "relationship", key: "relationship", render: (v) => v ?? "-" },
          { title: "Email", dataIndex: "email", key: "email", render: (v) => v ?? "-" },
          { title: "Phone", dataIndex: "phone", key: "phone", render: (v) => v ?? "-" },
        ],
      },

      // AUDIT slot (add listPath & data loader if desired)
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
        // listPath: (id) => `/students/${id}/tasks`,
        // createPath: (id) => `/students/${id}/tasks`,
        // updatePath: (id, taskId) => `/students/${id}/tasks/${taskId}`,
        // deletePath: (id, taskId) => `/students/${id}/tasks/${taskId}`,
      },

      // DOCUMENTS
      documents: {
        enabled: true,
        label: "Documents",
        // listPath: (id) => `/students/${id}/documents`,
        // uploadPath: (id) => `/students/${id}/documents`,
        // deletePath: (id, docId) => `/students/${id}/documents/${docId}`,
        // commentListPath: (id, docId) => `/students/${id}/documents/${docId}/comments`,
        // commentCreatePath: (id, docId) => `/students/${id}/documents/${docId}/comments`,
      },

      // COMMENTS
      communication: {
        enabled: true,
        label: "Comments",
        // listPath: (id) => `/students/${id}/comments`,
        // createPath: (id) => `/students/${id}/comments`,
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
