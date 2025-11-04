// src/pages/academics/subjects/SubjectsList.jsx
import React from "react";
import EntityList from "@/components/EntityList.jsx";
import { BookOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { Tag } from "antd";

const classLabel = (rec) =>
  rec?.class?.class_name ||
  rec?.class?.name ||
  rec?.class_name ||
  (rec?.class_id ? `Class #${rec.class_id}` : "-");

export default function SubjectsList() {
  const cfg = {
    entityKey: "subjects",
    titlePlural: "Subjects",
    titleSingular: "Subject",
    routeBase: "/admin/academics/subjects",
    idField: "id",
    statusFilter: false,
    billingFilter: false,

    api: {
      listPath: "/allsubjects",
      removePath: (id) => `/subject/${id}`,
      parseList: (payload) => {
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        // Clarify → list of offered subjects: mark as offered (true) unless backend provides something else
        return list.map((s) => ({
          id: s?.id,
          subject_name: s?.subject_name || s?.name || "-",
          class_id: s?.class_id ?? s?.class?.id,
          class: s?.class,
          created_by:
            s?.userCreated?.name ||
            s?.userCreated?.fullName ||
            s?.created_by_name ||
            s?.created_by ||
            "-",
          created_at: s?.created_at || s?.createdAt || null,
          offered: s?.offered ?? true, // default to true to indicate it’s in the offered list
          raw: s,
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

      offered: {
        title: "Offered",
        key: "offered",
        dataIndex: "offered",
        width: 120,
        render: (v) =>
          v ? (
            <Tag color="blue" className="!m-0">Yes</Tag>
          ) : (
            <Tag className="!m-0">No</Tag>
          ),
        sorter: (a, b) => Number(!!a?.offered) - Number(!!b?.offered),
        csv: (r) => (r?.offered ? "Yes" : "No"),
      },

      subject: {
        title: "Subject",
        key: "subject",
        dataIndex: "subject_name",
        ellipsis: true,
        render: (v) => (
          <div className="flex items-center gap-2 min-w-0">
            <BookOutlined />
            <span className="truncate font-medium">{dash(v)}</span>
          </div>
        ),
        sorter: (a, b) =>
          String(a?.subject_name || "").localeCompare(String(b?.subject_name || "")),
        csv: (r) => r?.subject_name ?? "-",
      },

      class: {
        title: "Class",
        key: "class",
        dataIndex: "class_id",
        width: 240,
        ellipsis: true,
        render: (_v, r) => classLabel(r),
        csv: (r) => classLabel(r),
        sorter: (a, b) => String(classLabel(a)).localeCompare(String(classLabel(b))),
      },

      created_at: {
        title: "Created At",
        key: "created_at",
        dataIndex: "created_at",
        width: 160,
        render: (v) => dash(fmtDate(v)),
        sorter: (a, b) =>
          new Date(a?.created_at || 0) - new Date(b?.created_at || 0),
        csv: (r) => r?.created_at ?? "-",
      },
    }),

    // Order of columns in the table (ID & Offered now “on top” in the header row)
    defaultVisible: ["id", "offered", "subject", "class", "created_at"],

    rowActions: {
      extraItems: [
        { key: "assign", label: (<><UserSwitchOutlined /> Assign to class</>) },
      ],
      onClick: (key, row) => {
        if (key === "assign") {
          // Navigate to detail (or open your assign modal if you prefer)
          window.location.href = `/admin/academics/subjects/${row.id}`;
        }
      },
    },
  };

  return <EntityList cfg={cfg} />;
}
