// src/pages/admin/parents/ParentDetail.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tag, Button } from "antd";
import EntityDetail from "@/components/EntityDetail.jsx";
import BillingTab from './BillingTab';

export default function ParentDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state?.prefill || null; // ← comes from list

  const cfg = {
    titleSingular: "Parent",
    idField: "id",
    routeBase: "/admin/parents",

    api: {
      getPath: (id) => `/parent/${id}`,
      updateStatusPath: (id, entity) => `/users/${entity?.raw?.user_id}/status`,
      removePath: (id) => `/parents/${id}`,
      linkStudentByIdPath: (id) => `/parents/${id}/children`,
      linkStudentByEmailPath: (id) => `/parents/${id}/children/link-by-email`,
      unlinkStudentPath: (id, studentId) => `/parents/${id}/children/${studentId}`,

      parseEntity: (payload) => {
        const p = payload?.data ?? payload ?? {};
        const u = p.user || {};
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
        const member_since = u.created_at
          ? new Date(u.created_at).toLocaleDateString()
          : "-";

        return {
          id: p.id,
          user_id: u.id,
          name,
          email: u.email,
          status: u.status,
          created_at: u.created_at, // raw (kept)
          member_since,             // formatted (used in info panel)
          contact_number: u.contact_number,
          bundesland: u.state,
          students: p.students || [],
          subscriptions: p.subscriptions || [],
          raw: p,
        };
      },
    },

    // Prefill row from list view (if present)
    initialEntity: prefill || undefined,

    // NOTE: EntityDetail will automatically prepend an "ID" row.
    // We also include an explicit "Parent ID" line here if you want it
    // duplicated in the main info list. Remove this line if you prefer
    // to show ID only once.
    infoFields: [
  
      { label: "Full Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Phone Number", name: "contact_number" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Member Since", name: "member_since" }, // preformatted in parseEntity
    ],

    tabs: {
      related: {
        enabled: true,
        label: "Children",
        idField: "id",
        listPath: (id) => `/parents/${id}/children`,
        toolbar: (parent) => (
          <Button 
            onClick={() => navigate('/admin/students/new', { 
              state: { 
                prefill: { 
                  parent_id: parent.id, 
                  parent_name: parent.name 
                } 
              }
            })}
          >
            Add Child
          </Button>
        ),
        columns: [
          { title: "ID", dataIndex: "id", key: "id" },
          {
            title: "Name",
            key: "name",
            render: (_, r) => `${r.user?.first_name || ""} ${r.user?.last_name || ""}`.trim() || r.name,
          },
          {
            title: "Grade",
            dataIndex: "grade",
            key: "grade",
            render: (v) => v || "N/A",
          },
          {
            title: "State",
            dataIndex: "bundesland",
            key: "bundesland",
            render: (v) => v || "N/A",
          },
          {
            title: "Status",
            dataIndex: "status", // Status is directly on the student/child record
            key: "status",
            render: (status) => {
              let color = "default";
              if (status === "active") color = "success";
              if (status === "completed") color = "blue";
              if (status === "locked") color = "error";
              return <Tag color={color}>{status || "N/A"}</Tag>;
            },
          },
        ],
      },
      billing: { 
        enabled: true, 
        label: "Billing",
        render: (entity) => <BillingTab entity={entity} />
      },
      communication: { enabled: true, label: "Comments" },
      tasks: { enabled: true, label: "Tasks" },
      documents: { enabled: true, label: "Documents" },
      audit: { enabled: true, label: "Audit Log" },
    },
  };

  return <EntityDetail cfg={cfg} />;
}
