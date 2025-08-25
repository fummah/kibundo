// src/pages/parents/ParentDetail.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import { Button, Space, Tag, message } from "antd";
import { LinkOutlined, DisconnectOutlined } from "@ant-design/icons";
import EntityDetail from "@/components/EntityDetail.jsx";
import api from "@/api/axios";

export default function ParentDetail() {
  const location = useLocation();
  const prefill = location.state?.prefill || null; // ← comes from list

  const cfg = {
    titleSingular: "Parent",
    idField: "id",
    routeBase: "/admin/parents", // plural route base for pages list consistency

    ui: {
      // Avatar rendered globally by EntityDetail; keep default (show)
      // showAvatar: false,
    },

    api: {
      getPath: (id) => `/parent/${id}`,
      updateStatusPath: (id) => `/parent/${id}/status`,
      removePath: (id) => `/parent/${id}`,

      // Children linking from the parent account (selection)
      linkStudentByIdPath: (id) => `/parent/${id}/children`, // POST { student_id }
      linkStudentByEmailPath: (id) => `/parent/${id}/children/link-by-email`, // POST { email }
      unlinkStudentPath: (id, studentId) => `/parent/${id}/children/${studentId}`,

      // Accept either raw or { data: raw }
      parseEntity: (payload) => {
        const p = payload?.data ?? payload ?? {};
        const u = p.user || {};
        const fb = (v) =>
          v === undefined || v === null || String(v).trim() === "" ? "-" : v;

        const name =
          p.name ||
          u.name ||
          [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
          "-";

        const email = p.email || u.email || p.contact_email || "-";
        const status = p.status || u.status || "-";
        const school = p.school?.name || p.school_name || p.location || "-";

        return {
          id: p.id,
          name: fb(name),
          email: fb(email),
          status: fb(status),
          school: fb(school),          // Location = School only
          bundesland: fb(p.bundesland),
          created_at: p.created_at || u.created_at || null,
          user_id: p.user_id,
          raw: p,
        };
      },
    },

    // Use prefill immediately while fetch runs
    initialEntity: prefill || undefined,

    // Minimal set: no phone/street/city/postal/country
    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "School", name: "school" },       // Location = School only
      { label: "Bundesland", name: "bundesland" },
      { label: "Status", name: "status" },
      { label: "Date added", name: "created_at" },
    ],

    topInfo: (e) => {
      if (!e) return [];
      const chips = [];
      if (e.status && e.status !== "-") {
        const s = String(e.status).toLowerCase();
        chips.push(
          <Tag
            key="status"
            color={s === "active" ? "green" : s === "suspended" ? "gold" : "default"}
          >
            {e.status}
          </Tag>
        );
      }
      if (e.school && e.school !== "-") chips.push(<Tag key="school">{e.school}</Tag>);
      if (e.bundesland && e.bundesland !== "-")
        chips.push(<Tag key="state">{e.bundesland}</Tag>);
      // helper chip to highlight that students can be linked from here
      chips.push(<Tag key="linking" color="blue">Can link students</Tag>);
      return chips;
    },

    tabs: {
      related: {
        enabled: true,
        label: "Children",
        idField: "id",
        listPath: (id) => `/parent/${id}/children`, // singular route

        // Toolbar to link/unlink students from the parent account
        toolbar: (parent) => (
          <Space size="small">
            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={async () => {
                const studentId = window.prompt("Enter Student ID to link to this parent:");
                if (!studentId) return;
                try {
                  await api.post(cfg.api.linkStudentByIdPath(parent?.id), { student_id: String(studentId) });
                  message.success("Student linked by ID");
                } catch {
                  message.error("Failed to link student by ID");
                }
              }}
            >
              Link Student by ID
            </Button>

            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={async () => {
                const email = window.prompt("Enter Student Email to link to this parent:");
                if (!email) return;
                try {
                  await api.post(cfg.api.linkStudentByEmailPath(parent?.id), { email });
                  message.success("Student linked by email");
                } catch {
                  message.error("Failed to link student by email");
                }
              }}
            >
              Link Student by Email
            </Button>
          </Space>
        ),

        columns: [
          { title: "Child ID", dataIndex: "id", key: "id", width: 110, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
          { title: "Grade", dataIndex: "grade", key: "grade", width: 90, render: (v) => v ?? "-" },
          { title: "Bundesland", dataIndex: "bundesland", key: "bundesland", width: 140, render: (v) => v ?? "-" },
          { title: "Status", dataIndex: "status", key: "status", width: 120, render: (v) => v ?? "-" },
          // If you later add an unlink endpoint, you can add an action button like below:
          // {
          //   title: "",
          //   key: "actions",
          //   width: 140,
          //   render: (_, r) => (
          //     <Button
          //       size="small"
          //       danger
          //       icon={<DisconnectOutlined />}
          //       onClick={async () => {
          //         try {
          //           await api.delete(cfg.api.unlinkStudentPath(parent?.id, r.id));
          //           message.success("Unlinked");
          //         } catch {
          //           message.error("Failed to unlink");
          //         }
          //       }}
          //     >
          //       Unlink
          //     </Button>
          //   ),
          // },
        ],

        empty: "No children linked to this parent.",
      },

      billing: { enabled: true, rows: () => [] },
      audit: { enabled: true, label: "Audit Log", columns: [] },
      documents: { enabled: true, label: "Documents" },
      communication: { enabled: true, label: "Comments" },
      tasks: { enabled: true, label: "Tasks" },
    },
  };

  return <EntityDetail cfg={cfg} />;
}
