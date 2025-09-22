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

      // Parent data is now included in the main GET /student/:id response.

      // Normalize/flatten for UI
      parseEntity: (payload) => {
        const s = payload?.data ?? payload ?? {};
        const fallback = (v) => (v === undefined || v === null || String(v).trim() === "") ? "-" : String(v).trim();

        const user = s.user || {};
        const parent = s.parent || {};
        const parentUser = parent.user || {};

        const name = fallback([user.first_name, user.last_name].filter(Boolean).join(' '));
        const school = fallback(s.school?.name || s.school_name || s.school);
        const grade = fallback(s.class?.class_name || s.class_name || s.grade || user.grade);
        const status = fallback(user.status || s.status);
        const bundesland = fallback(user.userBundesland?.name || user.state || s.bundesland);
        
        const parentName = fallback([parentUser.first_name, parentUser.last_name].filter(Boolean).join(' '));
        const parentEmail = fallback(parentUser.email);

        const subjectsText = Array.isArray(s.subjects) && s.subjects.length > 0
          ? s.subjects.map(sub => sub.subject_name).join(', ')
          : "-";

        const subscription = s.activePlan || s.subscription || {};

        return {
          id: s.id,
          name,
          email: fallback(user.email),
          grade,
          school,
          bundesland,
          status,
          subjectsText,
          interests: Array.isArray(s.interests) ? s.interests : [],
          billing_email: s.billing_email,
          billing_type: s.billing_type,
          accountBalanceCents: s.accountBalanceCents,
          subscription,
          createdAt: user.created_at || s.created_at || null,
          updatedAt: s.updated_at || null,
          parentSummary: parent.id
            ? {
                id: parent.id,
                name: parentName,
                email: parentEmail,
                is_payer: parent.is_payer,
              }
            : undefined,
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
      { label: "School", name: "school" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Subjects", name: "subjectsText" },
      { label: "Interests", name: "interests" },

      // Parent info is now shown in the 'Parents / Guardians' tab.

      { label: "Created", name: "createdAt" },
    ],

    // Chips: include a clear parent-link status indicator
    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.grade && e.grade !== "-") chips.push(<Tag key="grade">Grade: {e.grade}</Tag>);
      if (e.bundesland && e.bundesland !== "-") chips.push(<Tag key="bundesland">{e.bundesland}</Tag>);
      if (Array.isArray(e?.interests) && e.interests.length)
        chips.push(<Tag key="interests">Interests: {e.interests.join(", ")}</Tag>);
      if (e?.parentSummary?.id) {
        chips.push(<Tag key="plink" color="green">Parent linked</Tag>);
      } else {
        chips.push(<Tag key="plink-missing" color="red">Parent not linked</Tag>);
      }
      // Optional: show if email is coming from parent
      if (e.emailSource === "parent") chips.push(<Tag key="email-src" color="blue">Email from parent</Tag>);
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
