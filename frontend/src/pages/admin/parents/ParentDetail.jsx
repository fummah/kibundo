// src/pages/admin/parents/ParentDetail.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import { Tag } from "antd";
import EntityDetail from "@/components/EntityDetail.jsx";
import BillingTab from "./BillingTab";

export default function ParentDetail() {
  const location = useLocation();
  const prefill = location.state?.prefill || null;

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
        const u = p?.user ?? {};
      
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
          created_at: u.created_at,
          member_since,
          contact_number: u.contact_number ?? null,
          bundesland: u.state ?? null,
          students: Array.isArray(p.student) ? p.student : [],  
          subscriptions: p.subscriptions || [],
          raw: p,
        };
      },
    },

    initialEntity: prefill || undefined,

    infoFields: [
      {
        label: "Status",
        name: "status",
        render: (v) => {
          let color = "default";
          if (v === "active") color = "success";
          if (v === "inactive") color = "warning";
          if (v === "locked") color = "error";
          return <Tag color={color}>{v || "unknown"}</Tag>;
        },
      },
      { label: "Full Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Phone Number", name: "contact_number" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Member Since", name: "member_since" },
    ],

    tabs: {
      related: {
        enabled: true,
        label: "Children",
        idField: "id",
        
        // Use already-fetched parent entity
        prefetchRowsFromEntity: (entity) =>
          Array.isArray(entity?.students)
            ? entity.students
            : Array.isArray(entity?.student)
            ? entity.student
            : [],
    
        // Enable refresh to re-hit /parent/:id and re-extract students
        refetchPath: (id) => `/parent/${id}`,
        extractList: (payload) => {
          const root = payload?.data ?? payload ?? {};
          return Array.isArray(root.student) ? root.student : [];  
        },
    
        rowKey: (row) => row?.id?.toString(),  // Ensure ID is a string for the key
    
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 90 },
          {
            title: "Name",
            key: "name",
            render: (_, r) => {
              const user = r?.user || {};
              const fn = user.first_name || '';
              const ln = user.last_name || '';
              const full = `${fn} ${ln}`.trim();
              return full || `Student #${r?.id ?? "-"}`;
            },
          },
          {
            title: "Grade",
            dataIndex: "grade",
            key: "grade",
            render: (_, r) => r?.class?.class_name ?? r?.class?.name ?? r?.class_name ?? r?.class_id ?? "N/A",
            width: 120,
          },
          {
            title: "State",
            key: "bundesland",
            render: (_, r) => r?.user?.state ?? "N/A",
            width: 140,
          },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status, record) => {
              const studentStatus = status || record?.user?.status;
              let color = "default";
              if (studentStatus === "active") color = "success";
              if (studentStatus === "completed") color = "blue";
              if (studentStatus === "locked") color = "error";
              return <Tag color={color}>{studentStatus || "N/A"}</Tag>;
            },
            width: 140,
          },
        ],
      },

      billing: {
        enabled: true,
        label: "Billing",
        render: (entity) => <BillingTab entity={entity} />,
      },
      audit: { enabled: true, label: "Audit Log" },
      documents: { enabled: true, label: "Documents" },
    },
  };

  return <EntityDetail cfg={cfg} />;
}
