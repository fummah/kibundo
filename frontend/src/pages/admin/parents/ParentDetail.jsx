// src/pages/admin/parents/ParentDetail.jsx
import React, { useMemo, useCallback, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tag, Button, App, Space, Dropdown } from "antd";
import { KeyOutlined, EllipsisOutlined } from "@ant-design/icons";
import EntityDetail from "@/components/EntityDetail.jsx";
import BillingTab from "./BillingTab";
import EditCredentialsModal from "@/components/common/EditCredentialsModal";
import api from "@/api/axios";

export default function ParentDetail() {
  // Freeze any prefill coming via router state so later URL/tab changes don't clobber it
  const location = useLocation();
  const navigate = useNavigate();
  const prefillRef = useRef(location.state?.prefill || null);
  const { message, modal } = App.useApp();
  
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [currentEntity, setCurrentEntity] = useState(null);

  // Normalizer: makes sure we always have a top-level `email`, etc.
  const coerceParent = useCallback((src) => {
    const p = src?.data ?? src ?? {};
    const u = p?.user ?? {};
    const firstName = u.first_name ?? "";
    const lastName = u.last_name ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    const member_since = u.created_at
      ? new Date(u.created_at).toLocaleDateString()
      : "-";

    const result = {
      id: p.id,
      user_id: u.id ?? p.user_id ?? null,
      firstName,
      lastName,
      name,
      email: u.email ?? p.email ?? null, // <— ensure top-level email
      status: u.status || "Active",
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
          const firstTwo = firstName.substring(0, 2).toLowerCase();          const firstLetter = lastName.substring(0, 1).toLowerCase();
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
    (entity) => <BillingTab entity={entity} parent={entity} />,
    []
  );

  const handleDeleteStudent = useCallback(
    (student) => {
      if (!student?.id) return;
      const user = student?.user || {};
      const fullName = [user.first_name || "", user.last_name || ""].filter(Boolean).join(" ").trim();
      const displayName = fullName || user.email || `Student #${student.id}`;
      modal.confirm({
        title: "Delete student?",
        content: (
          <>
            Are you sure you want to permanently delete{" "}
            <strong>
              {displayName}
            </strong>
            ?
          </>
        ),
        okText: "Delete student",
        okButtonProps: { danger: true },
        cancelText: "Cancel",
        async onOk() {
          try {
            await api.delete(`/student/${student.id}`);
            message.success("Student deleted.");
            setTimeout(() => {
              window.location.reload();
            }, 400);
          } catch (error) {
            console.error("Failed to delete student:", error);
            message.error(
              error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to delete student. Please try again."
            );
          }
        },
      });
    },
    [message, modal]
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

        updateStatusPath: (id) => `/parent/${id}/status`,

        removePath: (id) => `/parent/${id}`,
        updatePath: (id) => `/parents/${id}`,
        linkStudentByIdPath: (id) => `/parents/${id}/children`,
        linkStudentByEmailPath: (id) => `/parents/${id}/children/link-by-email`,
      },

      // Provide normalized prefill (if any)
      initialEntity,

      infoFields: [
        {
          label: "Status",
          name: "status",
          render: (v) => {
            let color = "default";
            if (v?.toLowerCase() === "active") color = "success";
            if (v?.toLowerCase() === "suspended") color = "error";
            return <Tag color={color}>{v || "unknown"}</Tag>;
          },
        },
        { label: "First Name", name: "firstName" },
        { label: "Last Name", name: "lastName" },
        {
          label: "Email",
          name: "email",
          // Graceful fallback if something slips past normalization
          render: (val, entity) =>
            val ?? entity?.raw?.user?.email ?? entity?.raw?.email ?? "-",
        },
        { label: "Phone Number", name: "contact_number" },
        { label: "Bundesland", name: "bundesland" },
        { 
          label: "Portal Login (Email)", 
          name: "username", 
          editable: true,
          // For parents, username should be the email. Show email if username is not set.
          render: (val, entity) => val || entity?.email || entity?.raw?.user?.email || "-"
        },
        { label: "Portal Password", name: "plain_pass", editable: true, type: "password" },
        { label: "Member Since", name: "member_since", editable: false },
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
                if (studentStatus?.toLowerCase() === "active") color = "success";
                if (studentStatus?.toLowerCase() === "suspended") color = "error";
                return <Tag color={color}>{studentStatus || "N/A"}</Tag>;
              },
              width: 140,
            },
            {
              title: "Actions",
              key: "actions",
              fixed: "right",
              width: 80,
              render: (_, record) => (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "view",
                        label: "View",
                        onClick: () => navigate(`/admin/students/${record.id}`),
                      },
                      {
                        key: "delete",
                        danger: true,
                        label: "Delete",
                        onClick: () => handleDeleteStudent(record),
                      },
                    ],
                  }}
                >
                  <Button
                    type="text"
                    icon={<EllipsisOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              ),
            },
          ],
        },

        billing: { enabled: true, label: "Billing", render: renderBillingTab },
        audit: { enabled: true, label: "Audit Log" },
        documents: { enabled: true, label: "Documents" },
      },
    }),
    [coerceParent, handleDeleteStudent, initialEntity, navigate, renderBillingTab]
  );

  return (
    <App>
      <EntityDetail 
        cfg={cfg}
        onEntityLoad={(entity) => setCurrentEntity(entity)}
        extraHeaderButtons={(entity) => (
          <Button
            type="default"
            icon={<KeyOutlined />}
            onClick={() => setCredentialsModalVisible(true)}
            disabled={!entity?.user_id}
          >
            Edit Login Credentials
          </Button>
        )}
      />
      
      {/* Edit Credentials Modal */}
      <EditCredentialsModal
        visible={credentialsModalVisible}
        onCancel={() => setCredentialsModalVisible(false)}
        userId={currentEntity?.user_id}
        userName={currentEntity?.name || 'Parent'}
        onSuccess={() => {
          message.success('Credentials updated successfully');
        }}
      />
    </App>
  );
}

