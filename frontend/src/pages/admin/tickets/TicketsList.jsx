import React from "react";
import { Tag } from "antd";
import { useNavigate } from "react-router-dom";

import EntityList from "@/components/EntityList.jsx";
import { columnFactories } from "@/components/entityList/columnFactories.jsx";

export default function TicketsList() {
  const navigate = useNavigate();

  const cfg = {
    entityKey: "tickets",
    titlePlural: "Tickets",
    titleSingular: "Ticket",
    routeBase: "/admin/tickets",

    api: {
      // ✅ Adjust if your backend path differs
      listPath: "/tickets",
      // Optional: normalize server response structure
      parseList: (raw) => {
        // accept: [], {items:[]}, {data:[]}
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.items)) return raw.items;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      },
    },

    // not using RBAC status bulk here; keep off
    statusFilter: false,
    billingFilter: false,

    // Columns factory
    columnsMap: (navigateFn, { dash, fmtDate }) => ({
      id: columnFactories.idLink("ID", "/admin/tickets"),
      subject: {
        title: "Subject",
        key: "subject",
        dataIndex: "subject",
        render: (v, r) => (
          <button
            className="text-blue-600 hover:underline"
            onClick={() => navigate(`/admin/tickets/${r.id}`)}
          >
            {dash(v)}
          </button>
        ),
        csv: (row) => dash(row?.subject),
      },
      priority: {
        title: "Priority",
        key: "priority",
        dataIndex: "priority",
        width: 120,
        render: (v) => <Tag>{dash(v)}</Tag>,
        csv: (row) => dash(row?.priority),
      },
      status: {
        title: "Status",
        key: "status",
        dataIndex: "status",
        width: 120,
        render: (v) => (
          <Tag color={v === "open" ? "geekblue" : v === "pending" ? "gold" : v === "closed" ? "green" : ""}>
            {dash(v)}
          </Tag>
        ),
        csv: (row) => dash(row?.status),
      },
      tags: {
        title: "Tags",
        key: "tags",
        dataIndex: "tags",
        render: (tags) =>
          Array.isArray(tags) && tags.length
            ? tags.map((t) => <Tag key={String(t)}>{dash(t)}</Tag>)
            : "-",
        csv: (row) => (Array.isArray(row?.tags) ? row.tags.join("|") : "-"),
      },
      updated_at: columnFactories.date("Updated", "updated_at"),
    }),

    // Which columns are visible (and persisted) by default
    defaultVisible: ["id", "subject", "priority", "status", "tags", "updated_at"],
  };

  return <EntityList cfg={cfg} />;
}
