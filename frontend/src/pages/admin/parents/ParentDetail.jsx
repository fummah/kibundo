// src/pages/admin/parents/ParentDetail.jsx
import React, { useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Tag } from "antd";
import EntityDetail from "@/components/EntityDetail.jsx";
import BillingTab from "./BillingTab";

export default function ParentDetail() {
  // Freeze any prefill coming via router state so later URL/tab changes don't clobber it
  const location = useLocation();
  const prefillRef = useRef(location.state?.prefill || null);

  // Normalizer: makes sure we always have a top-level `email`, etc.
  const coerceParent = useCallback((src) => {
    const p = src?.data ?? src ?? {};
    const u = p?.user ?? {};
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    const member_since = u.created_at
      ? new Date(u.created_at).toLocaleDateString()
      : "-";

    const result = {
      id: p.id,
      user_id: u.id ?? p.user_id ?? null,
      name,
      email: u.email ?? p.email ?? null, // <— ensure top-level email
      status: u.status || "active",
      created_at: u.created_at ?? null,
      member_since,
      contact_number: u.contact_number ?? p.contact_number ?? null,
      bundesland: u.state ?? p.state ?? null,
      students: Array.isArray(p.student) ? p.student : [],
      subscriptions: p.subscriptions || [],
      // Include portal credentials from backend, generate username if not provided
      username: u.username || p.username || (() => {
        const firstName = u.first_name || "";
        const lastName = u.last_name || "";
        const userId = u.id || p.user_id || p.id;
        if (firstName && lastName && userId) {
          const firstTwo = firstName.substring(0, 2).toLowerCase();
          const firstLetter = lastName.substring(0, 1).toLowerCase();
          return `${firstTwo}${firstLetter}${userId}`;
        }
        return undefined;
      })(),
      plain_pass: u.plain_pass || p.plain_pass,
      raw: p,
    };
    
    return result;
  }, []);

  // Normalize any prefill so infoFields can read `email` immediately
  const initialEntity = useMemo(
    () => (prefillRef.current ? coerceParent(prefillRef.current) : undefined),
    [coerceParent]
  );

  const renderBillingTab = useCallback(
    (entity) => <BillingTab entity={entity} />,
    []
  );

  const cfg = useMemo(
    () => ({
      titleSingular: "Parent",
      idField: "id",
      routeBase: "/admin/parents",

      // If EntityDetail supports these, it helps keep panes mounted
      tabsProps: { destroyOnHidden: false, animated: false },

      api: {
        // NOTE: If your backend is /parents/:id (plural), change to `/parents/${id}`
        getPath: (id) => `/parent/${id}`,

        // Use the same normalizer for fetched payloads
        parseEntity: coerceParent,

        // Safer user id resolution for status updates
        updateStatusPath: (id, entity) =>
          `/users/${entity?.raw?.user?.id ?? entity?.user_id}/status`,

        removePath: (id) => `/parents/${id}`,
        linkStudentByIdPath: (id) => `/parents/${id}/children`,
        linkStudentByEmailPath: (id) => `/parents/${id}/children/link-by-email`,
        unlinkStudentPath: (id, studentId) => `/parents/${id}/children/${studentId}`,
      },

      // Provide normalized prefill (if any)
      initialEntity,

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
        {
          label: "Email",
          name: "email",
          // Graceful fallback if something slips past normalization
          render: (val, entity) =>
            val ?? entity?.raw?.user?.email ?? entity?.raw?.email ?? "-",
        },
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

          // Refetch path to get updated children list after adding/removing a student
          refetchPath: (id) => `/parent/${id}`, // switch to `/parents/${id}` if needed

          extractList: (payload) => {
            const root = payload?.data ?? payload ?? {};
            const students = Array.isArray(root.student) ? root.student : [];
            return students.filter((s) => s && s.id); // ensure rowKey stability
          },

          rowKey: (row) => `student-${row?.id}`,

          columns: [
            { title: "ID", dataIndex: "id", key: "id", width: 90 },
            {
              title: "Name",
              key: "name",
              render: (_, r) => {
                const user = r?.user || {};
                const fn = user.first_name || "";
                const ln = user.last_name || "";
                const full = `${fn} ${ln}`.trim();
                return full || `Student #${r?.id ?? "-"}`;
              },
            },
            {
              title: "Grade",
              dataIndex: "grade",
              key: "grade",
              render: (_, r) =>
                r?.class?.class_name ??
                r?.class?.name ??
                r?.class_name ??
                r?.class_id ??
                "N/A",
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

        billing: { enabled: true, label: "Billing", render: renderBillingTab },
        audit: { enabled: true, label: "Audit Log" },
        documents: { enabled: true, label: "Documents" },
      },
    }),
    [coerceParent, initialEntity, renderBillingTab]
  );

  return <EntityDetail cfg={cfg} />;
}
