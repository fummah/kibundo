// src/pages/students/StudentDetail.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Button, Space, Tag, message } from "antd";
import { LinkOutlined, UnorderedListOutlined } from "@ant-design/icons";
import api from "@/api/axios";

const euro = (cents) => {
  const n = Number(cents);
  if (Number.isNaN(n)) return "-";
  return `${(n / 100).toFixed(2)} €`;
};

// Reuse the same “pick parent/guardian” logic as the list
const pickParent = (student) => {
  const maybeArray =
    student.parents ??
    student.guardians ??
    student.parent ??
    student.guardian ??
    student.linked_parent;
  if (Array.isArray(maybeArray)) {
    const payer = maybeArray.find((g) => g?.is_payer);
    return payer || maybeArray[0];
  }
  return maybeArray || null;
};

export default function StudentDetail() {
  const location = useLocation();
  const prefill = location.state?.prefill || null;

  const cfg = {
    titleSingular: "Student",
    idField: "id",
    routeBase: "/admin/students",

    // We keep the shared avatar ON (configured in EntityDetail). Hide via ui.showAvatar=false if needed.
    ui: {
      // showAvatar: false,
    },

    api: {
      // singular routes to match your Express router
      getPath: (id) => `/student/${id}`,
      updateStatusPath: (id) => `/student/${id}/status`,
      removePath: (id) => `/student/${id}`,

      parseEntity: (payload) => {
        const s = payload?.data ?? payload ?? {};
        const user = s.user || {};
        const parent = s.parent || {};
        const parentUser = parent.user || {};
        const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : String(v).trim());

        const name = fb([user.first_name, user.last_name].filter(Boolean).join(" "));
        const email = fb(user.email);
        const grade = fb(s.class?.class_name || s.class_name || s.grade || user.grade);
        const school = fb(s.school?.name || s.school_name || s.school);
        const state = fb(user.state || s.state);

        const subjectsArray = Array.isArray(s.subjects)
          ? s.subjects
          : (Array.isArray(s.subject)
              ? s.subject.map((it) => it?.subject?.subject_name || it?.subject_name).filter(Boolean)
              : []);
        const subjectsText = subjectsArray.length > 0
          ? subjectsArray.map((it) => (typeof it === 'string' ? it : (it?.subject_name || it))).filter(Boolean).join(', ')
          : "-";

        const parentNameRaw = [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ");
        const parentName = parentNameRaw && parentNameRaw.trim().length > 0
          ? parentNameRaw.trim()
          : (s.parent_id ? `#${s.parent_id}` : "-");

        const status = fb(user.status || s.status);
        const createdAt = user.created_at || s.created_at || null;

        return {
          id: s.id,
          name,
          email,
          grade,
          subjectsText,
          parent_name: parentName,
          school,
          state,
          status,
          createdAt,
          raw: s,
        };
      },
    },

    // Show row data instantly while GET /student/:id runs
    initialEntity: prefill || undefined,

    // Minimal profile per spec (no phone/street/city/postal/country; location = School only)
    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Grade", name: "grade" },
      { label: "Subjects", name: "subjectsText" },
      { label: "Parent", name: "parent_name" },
      { label: "School", name: "school" },
      { label: "State", name: "state" },
      { label: "Status", name: "status" },
      { label: "Date added", name: "createdAt" },
    ],

    // Chips: include a clear parent-link status indicator
    topInfo: (e) => {
      const chips = [];
      if (!e) return chips;
      if (e.grade && e.grade !== "-") chips.push(<Tag key="grade">{e.grade}</Tag>);
      if (e.state && e.state !== "-") chips.push(<Tag key="state">{e.state}</Tag>);
      if (e.parent_name && e.parent_name !== "-") chips.push(<Tag key="parent">Parent: {e.parent_name}</Tag>);
      return chips;
    },

    tabs: {
      // The 'related' tab now sources its data directly from the entity
      related: {
        enabled: true,
        label: "Parents / Guardians",
        idField: "id",
        // No listPath needed; data comes from the main entity's 'parentSummary'
        rows: (entity) => (entity?.parentSummary ? [entity.parentSummary] : []),
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 80, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
          { title: "Email", dataIndex: "email", key: "email", render: (v) => v ?? "-" },
          {
            title: "Payer",
            dataIndex: "is_payer",
            key: "is_payer",
            width: 100,
            render: (v) => (v ? <Tag color="green">Payer</Tag> : <Tag>—</Tag>),
          },
        ],
        empty: "No parent linked to this student.",
      },

      // Activity view: timestamp, homework type, scan info
      activity: {
        enabled: true,
        label: "Activity",
        listPath: (id) => `/student/${id}/activity`,
        toolbar: () => (
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => message.info("Use the Reload button to refresh the activity list.")}
          >
            Refresh
          </Button>
        ),
        columns: [
          { title: "When", dataIndex: "timestamp", key: "timestamp", width: 200, render: (v) => v ?? "-" },
          { title: "Type", dataIndex: "homework_type", key: "homework_type", width: 160, render: (v) => v ?? "-" },
          { title: "Scan Info", dataIndex: "scan_info", key: "scan_info", render: (v) => v ?? "-" },
        ],
        empty: "No recent activity.",
      },

      audit: { enabled: false, label: "Audit Log" },
      tasks: { enabled: true, label: "Tasks" },
      documents: { enabled: true, label: "Documents" },
      communication: { enabled: true, label: "Comments" },

      // BILLING snapshot (optional)
      billing: {
        enabled: false,
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
