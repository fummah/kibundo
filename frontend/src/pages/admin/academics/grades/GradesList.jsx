// src/pages/admin/academics/grades/GradesList.jsx
import React, { useState, useEffect } from "react";
import EntityList from "@/components/EntityList.jsx";
import { StarOutlined, BookOutlined, TeamOutlined } from "@ant-design/icons";
import { Tag, Tooltip, message } from "antd";
import api from "@/api/axios";

const classLabel = (cls) => {
  if (!cls) return "-";
  return cls.name || cls.class_name || `Class #${cls.id}`;
};

export default function GradesList() {
  const [classes, setClasses] = useState({});

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data } = await api.get("/allclasses");
        const classesMap = {};
        data.forEach(cls => {
          classesMap[cls.id] = cls;
        });
        setClasses(classesMap);
      } catch (error) {
        console.error("Failed to load classes:", error);
        message.error("Failed to load classes");
      }
    };

    fetchClasses();
  }, []);

  const cfg = {
    entityKey: "classes",
    titlePlural: "Classes",
    titleSingular: "Class",
    routeBase: "/admin/academics/grades",
    idField: "id",
    statusFilter: false,
    billingFilter: false,

    api: {
      listPath: "/allclasses",
      removePath: (id) => `/classes/${id}`,
      parseList: (payload) => {
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        return list.map((c) => ({
          id: c?.id,
          name: c?.class_name || c?.name || "-",
          class_id: c?.id,
          class: c,
          created_by: c?.userCreated?.first_name && c?.userCreated?.last_name 
            ? `${c.userCreated.first_name} ${c.userCreated.last_name}` 
            : c?.userCreated?.username || c?.userCreated?.email || c?.created_by || "-",
          created_at: c?.created_at || c?.createdAt || null,
          raw: c,
        }));
      },
    },

    columnsMap: (_navigate, { dash, fmtDate }) => ({
      id: {
        title: "ID",
        key: "id",
        dataIndex: "id",
        width: 90,
        render: (v) => dash(v),
        sorter: (a, b) => (a?.id || 0) - (b?.id || 0),
        csv: (r) => r?.id ?? "-",
      },

      name: {
        title: "Class",
        key: "name",
        dataIndex: "name",
        ellipsis: true,
        render: (v) => (
          <div className="flex items-center gap-2 min-w-0">
            <StarOutlined />
            <span className="truncate font-medium">{dash(v)}</span>
          </div>
        ),
        sorter: (a, b) =>
          String(a?.name || "").localeCompare(String(b?.name || "")),
        csv: (r) => r?.name ?? "-",
      },

      created_by: {
        title: "Created By",
        key: "created_by",
        dataIndex: "created_by",
        width: 200,
        ellipsis: true,
        render: (v) => dash(v),
        sorter: (a, b) =>
          String(a?.created_by || "").localeCompare(String(b?.created_by || "")),
        csv: (r) => r?.created_by ?? "-",
      },

      created_at: {
        title: "Created",
        key: "created_at",
        dataIndex: "created_at",
        width: 180,
        render: (v) => fmtDate(v),
        sorter: (a, b) =>
          new Date(a?.created_at || 0) - new Date(b?.created_at || 0),
        csv: (r) => fmtDate(r?.created_at, { format: "YYYY-MM-DD" }),
      },
    }),

    // Define which columns are visible by default
    defaultVisible: ["id", "name", "created_by", "created_at"],

    breadcrumbs: [
      { title: "Admin", path: "/admin" },
      { title: "Academics", path: "/admin/academics" },
      { title: "Classes" },
    ],

    rowActions: (record, { navigate, remove, hasPermission }) => [
      {
        key: "view",
        label: "View Details",
        icon: <BookOutlined />,
        onClick: () => navigate(`/admin/academics/grades/${record.id}`),
      },
      {
        key: "edit",
        label: "Edit",
        icon: <span>✏️</span>,
        onClick: () => navigate(`/admin/academics/grades/${record.id}/edit`),
        disabled: !hasPermission("grades", "update"),
      },
      {
        key: "delete",
        label: "Delete",
        icon: <span>🗑️</span>,
        danger: true,
        confirm: `Are you sure you want to delete class "${record.name}"?`,
        onClick: () => remove(record.id, { name: record.name }),
        disabled: !hasPermission("classes", "delete"),
      },
    ],

    createButton: {
      text: "Add Class",
      onClick: (navigate) => navigate("/admin/academics/grades/new"),
      permission: "classes:create",
    },
  };

  return <EntityList cfg={cfg} />;
}
