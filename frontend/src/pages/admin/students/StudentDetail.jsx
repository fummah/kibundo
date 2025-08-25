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

      // guardians linking
      linkGuardianByEmailPath: (id) => `/student/${id}/guardians/link-by-email`,
      linkGuardianPath: (id) => `/student/${id}/guardians`,
      unlinkGuardianPath: (id, guardianId) => `/student/${id}/guardians/${guardianId}`,

      // Normalize/flatten for UI
      parseEntity: (payload) => {
        const s = payload?.data ?? payload ?? {};
        const u = s.user || {};
        const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

        const name =
          s.name ||
          u.name ||
          [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
          "-";

        const school = s.school?.name || s.school_name || s.school || s.location || "-";
        const grade = s.grade ?? u.grade;
        const bundesland = s.bundesland || "-";
        const status = s.status || u.status || "-";

        // Parent linkage (email must be linked to parent)
        const parent =
          s.parent ??
          s.guardian ??
          (Array.isArray(s.guardians) ? s.guardians[0] : null) ??
          null;

        const parentEmail =
          parent?.email || parent?.user?.email || parent?.contact_email || null;

        // subjects text (supports array or progress map)
        const subjectsFromArray = Array.isArray(s.subjects) ? s.subjects : null;
        const subjectsFromProgress =
          s?.progress && s.progress.subjects && typeof s.progress.subjects === "object"
            ? Object.keys(s.progress.subjects)
            : null;
        const subjectsText =
          (subjectsFromArray && subjectsFromArray.join(", ")) ||
          (subjectsFromProgress && subjectsFromProgress.join(", ")) ||
          "-";

        const subscription = s.activePlan || s.subscription || {};

        return {
          id: s.id,
          name: fb(name),
          // Email shown in profile comes from linked parent (requirement)
          email: fb(parentEmail || s.email || u.email || "-"),
          emailSource: parentEmail ? "parent" : (s.email || u.email ? "student" : "none"),
          grade: fb(grade),
          school: fb(school),
          bundesland: fb(bundesland),
          status: fb(status),

          subjectsText,
          interests: Array.isArray(s.interests) ? s.interests : [],

          billing_email: s.billing_email,
          billing_type: s.billing_type,
          accountBalanceCents: s.accountBalanceCents,
          subscription,

          createdAt: s.createdAt || s.created_at || u.created_at || null,
          updatedAt: s.updatedAt || s.updated_at || null,

          parentSummary: parent
            ? {
                id: parent.id,
                name:
                  parent.name ||
                  [parent.first_name, parent.last_name].filter(Boolean).join(" ") ||
                  [parent?.user?.first_name, parent?.user?.last_name].filter(Boolean).join(" "),
                email: parentEmail || undefined,
                is_payer: parent?.is_payer,
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
      // The Email field reflects the parent-linked email per requirement
      { label: "Email (Parent-linked)", name: "email" },
      { label: "Grade", name: "grade" },
      { label: "School", name: "school" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Subjects", name: "subjectsText" },
      { label: "Interests", name: "interests" },

      // Explicit parent linkage shown in profile
      { label: "Parent ID", name: ["parentSummary", "id"] },
      { label: "Parent Name", name: ["parentSummary", "name"] },
      { label: "Parent Email", name: ["parentSummary", "email"] },

      // Billing snapshot (optional if present)
      { label: "Billing Email", name: "billing_email" },
      { label: "Billing Type", name: "billing_type" },
      { label: "Subscription Status", name: ["subscription", "status"] },
      { label: "Plan Interval", name: ["subscription", "interval"] },
      { label: "Account Balance", name: "accountBalanceCents" },

      { label: "Created", name: "createdAt" },
      { label: "Updated", name: "updatedAt" },
    ],

    // Chips: include a clear parent-link status indicator
    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.grade && e.grade !== "-") chips.push(<Tag key="grade">Grade: {e.grade}</Tag>);
      if (e.bundesland && e.bundesland !== "-") chips.push(<Tag key="state">{e.bundesland}</Tag>);
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
      // Parents/Guardians linkage with “link by email” flow
      related: {
        enabled: true,
        label: "Parents / Guardians",
        idField: "id",
        listPath: (id) => `/student/${id}/guardians`,
        toolbar: (student) => (
          <Space size="small">
            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={async () => {
                const email = window.prompt("Enter parent/guardian email to link:");
                if (!email) return;
                try {
                  const path =
                    cfg.api.linkGuardianByEmailPath?.(student?.id) ??
                    cfg.api.linkGuardianPath(student?.id);
                  await api.post(path, { email, is_payer: true });
                  message.success("Parent linked by email");
                } catch {
                  message.error("Failed to link by email");
                }
              }}
            >
              Link Parent by Email
            </Button>
          </Space>
        ),
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
          { title: "Status", dataIndex: "status", key: "status", width: 120, render: (v) => v ?? "-" },
        ],
        empty: "No parents/guardians linked.",
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

      audit: { enabled: true, label: "Audit Log", columns: [] },
      tasks: { enabled: true, label: "Tasks" },
      documents: { enabled: true, label: "Documents" },
      communication: { enabled: true, label: "Comments" },

      // BILLING snapshot (optional)
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
