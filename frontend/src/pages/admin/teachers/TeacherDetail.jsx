// src/pages/admin/teachers/TeacherDetail.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Tag, Form, Select, Button, Spin } from "antd";
import EntityDetail from "@/components/EntityDetail.jsx";
import api from "@/api/axios";

// Component to render the Add Class modal content
function AddClassModal({ id, onSuccess, onClose, messageApi }) {
  const [form] = Form.useForm();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/allclasses");
        const classList = Array.isArray(data) ? data : (data?.data || []);
        setClasses(classList);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
        messageApi.error("Failed to load classes");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [messageApi]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // Update teacher's class_id
      await api.patch(`/teacher/${id}`, {
        class_id: values.class_id,
      });
      
      messageApi.success("Class assigned successfully!");
      onSuccess();
    } catch (error) {
      console.error("Failed to assign class:", error);
      if (error?.errorFields) {
        messageApi.error("Please select a class");
      } else {
        messageApi.error(error?.response?.data?.message || "Failed to assign class");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        name="class_id"
        label="Select Class"
        rules={[{ required: true, message: "Please select a class" }]}
      >
        <Select
          placeholder="Choose a class to assign"
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          options={classes.map((cls) => ({
            value: cls.id,
            label: cls.class_name || `Class ${cls.id}`,
          }))}
        />
      </Form.Item>
      
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Assign Class
        </Button>
      </div>
    </Form>
  );
}

export default function TeacherDetail() {
  // Read location once, but freeze the prefill so later URL/tab changes don't trigger work
  const location = useLocation();
  const prefillRef = useRef(location.state?.prefill || null);

  // Stable config object (does not depend on location)
  const cfg = useMemo(() => ({
    titleSingular: "Teacher",
    idField: "id",
    routeBase: "/admin/teachers",

    // Optional: give EntityDetail a hint to keep tab panes mounted (if it supports it)
    tabsProps: { destroyOnHidden: false, animated: false },

    api: {
      getPath: (id) => `/teacher/${id}`,
      updateStatusPath: (id, entity) => `/users/${entity?.raw?.user_id}/status`,
      removePath: (id) => `/teacher/${id}`,

      parseEntity: (payload) => {
        const t = payload?.data ?? payload ?? {};
        const u = t?.user ?? {};
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
        const member_since = u.created_at
          ? new Date(u.created_at).toLocaleDateString()
          : "-";

        return {
          id: t.id,
          user_id: u.id,
          name: name || "-",
          email: u.email || "-",
          status: u.status || "-",
          created_at: u.created_at,
          member_since,
          contact_number: u.contact_number ?? null,
          bundesland: u.state ?? null,
          className: t.class?.class_name || t.department || "-",
          class_id: t.class_id,
          raw: t,
        };
      },
    },

    // Freeze the initial entity so routing/tab changes don't bounce the UI
    initialEntity: prefillRef.current || undefined,

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
      { label: "Class", name: "className" },
      { label: "Bundesland", name: "bundesland" },
      { label: "Member Since", name: "member_since" },
    ],

    tabs: {
      related: {
        enabled: true,
        label: "Classes",
        idField: "id",
        showAddButton: false, // Disabled until backend endpoint is ready
        // listPath: (id) => `/teacher/${id}/classes`, // add when backend exposes it
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 80, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
          { title: "Grade", dataIndex: "grade", key: "grade", width: 110, render: (v) => v ?? "-" },
          { title: "Room", dataIndex: "room", key: "room", width: 110, render: (v) => v ?? "-" },
          { title: "Students", dataIndex: "studentsCount", key: "studentsCount", width: 120, render: (v) => v ?? "-" },
        ],
        empty: "No classes for this teacher.",
      },

      audit: { enabled: true, label: "Audit Log" },
      documents: { enabled: true, label: "Documents" },
    },
  }), []);

  return <EntityDetail cfg={cfg} />;
}
