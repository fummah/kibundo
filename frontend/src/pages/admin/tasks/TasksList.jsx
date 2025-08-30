import React from "react";
import { Tag } from "antd";
import { useNavigate } from "react-router-dom";

import EntityList, { columnFactories } from "@/components/EntityList.jsx";

export default function TasksList() {
  const navigate = useNavigate();

  const cfg = {
    entityKey: "tasks",
    titlePlural: "Tasks",
    titleSingular: "Task",
    routeBase: "/admin/tasks",

    api: {
      listPath: "/tasks",
      parseList: (raw) => {
        // accept: [], {items:[]}, {data:[]}
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.items)) return raw.items;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      },
    },

    statusFilter: false,
    billingFilter: false,

    columnsMap: (navigateFn, { dash }) => ({
      id: columnFactories.idLink("ID", "/admin/tasks"),
      title: {
        title: "Title",
        key: "title",
        dataIndex: "title",
        render: (v, r) => (
          <button
            className="text-blue-600 hover:underline"
            onClick={() => navigate(`/admin/tasks/${r.id}`)}
          >
            {dash(v)}
          </button>
        ),
        csv: (row) => dash(row?.title),
      },
      assignee: {
        title: "Assignee",
        key: "assignee",
        dataIndex: "assignee_name", // or "assignee"
        render: (v, r) => dash(v || r?.assignee || r?.assignee_id),
        csv: (row) => dash(row?.assignee_name || row?.assignee || row?.assignee_id),
      },
      status: {
        title: "Status",
        key: "status",
        dataIndex: "status",
        width: 120,
        render: (v) => (
          <Tag color={v === "done" ? "green" : v === "in_progress" ? "geekblue" : v === "blocked" ? "volcano" : ""}>
            {dash(v)}
          </Tag>
        ),
        csv: (row) => dash(row?.status),
      },
      due_at: columnFactories.date("Due", "due_at"),
      updated_at: columnFactories.date("Updated", "updated_at"),
    }),

    defaultVisible: ["id", "title", "assignee", "status", "due_at", "updated_at"],
  };

  return <EntityList cfg={cfg} />;
}
