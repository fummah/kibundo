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
      removePath: (id) => `/class/${id}`,
      parseList: (payload) => {
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        return list.map((c) => ({
          id: c?.id,
          name: c?.class_name || c?.name || "-",
          code: c?.class_code || c?.code || "-",
          description: c?.description || "",
          class_id: c?.id,
          class: c,
          created_by: c?.userCreated?.username || c?.created_by || "-",
          created_at: c?.created_at || c?.createdAt || null,
          is_active: c?.is_active ?? true,
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

      code: {
        title: "Code",
        key: "code",
        dataIndex: "code",
        width: 100,
        render: (v) => <Tag className="!m-0">{dash(v)}</Tag>,
        sorter: (a, b) => String(a?.code || "").localeCompare(String(b?.code || "")),
        csv: (r) => r?.code ?? "-",
      },
      
      class: {
        title: "Class",
        key: "class",
        dataIndex: ["class", "name"],
        width: 200,
        render: (_, record) => {
          const classInfo = record.class || (record.class_id && classes[record.class_id]);
          if (!classInfo) return "-";
          
          return (
            <div className="flex items-center gap-2">
              <TeamOutlined className="text-blue-500" />
              <Tooltip title={`Class ID: ${classInfo.id}`}>
                <span>{classLabel(classInfo)}</span>
              </Tooltip>
            </div>
          );
        },
        sorter: (a, b) => {
          const aClass = a.class || (a.class_id && classes[a.class_id]);
          const bClass = b.class || (b.class_id && classes[b.class_id]);
          return String(classLabel(aClass) || "").localeCompare(String(classLabel(bClass) || ""));
        },
        csv: (r) => {
          const classInfo = r.class || (r.class_id && classes[r.class_id]);
          return classLabel(classInfo) || "-";
        },
      },

      description: {
        title: "Description",
        key: "description",
        dataIndex: "description",
        ellipsis: true,
        render: (v) => dash(v),
        csv: (r) => r?.description ?? "",
      },

      is_active: {
        title: "Status",
        key: "is_active",
        dataIndex: "is_active",
        width: 120,
        render: (v) =>
          v ? (
            <Tag color="green" className="!m-0">
              Active
            </Tag>
          ) : (
            <Tag color="default" className="!m-0">
              Inactive
            </Tag>
          ),
        sorter: (a, b) => Number(!!a?.is_active) - Number(!!b?.is_active),
        csv: (r) => (r?.is_active ? "Active" : "Inactive"),
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
