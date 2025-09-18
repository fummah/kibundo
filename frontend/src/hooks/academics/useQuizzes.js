// src/hooks/academics/useQuizzes.js
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { MoreOutlined } from "@ant-design/icons";

import {
  listQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  patchQuizStatus,
} from "@/api/academics/quizzes.js";
import { SafeText, SafeTags } from "@/utils/safe";

/* ---------------- helpers ---------------- */
function formatDateTime(input) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleString();
}

const getItemsCount = (r) =>
  Array.isArray(r?.items)
    ? r.items.length
    : Array.isArray(r?.questions)
    ? r.questions.length
    : 0;

const cmpStr = (a = "", b = "") => String(a).localeCompare(String(b));
const cmpNum = (a = 0, b = 0) => (Number(a) || 0) - (Number(b) || 0);
const cmpDate = (a, b) => new Date(a || 0) - new Date(b || 0);

/* ---------------- hook ---------------- */
export function useQuizzes({
  page,
  pageSize,
  filters,
  screens,
  onView,
  onEdit,
  onDelete,
  onTogglePublish,
}) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["quizzes", { page, pageSize, ...filters }],
    queryFn: async () => {
      try {
        return await listQuizzes({ page, pageSize, ...filters });
      } catch {
        return { items: [], total: 0 };
      }
    },
    keepPreviousData: true,
  });

  const save = useMutation({
    mutationFn: (payload) =>
      payload?.id ? updateQuiz(payload.id, payload) : createQuiz(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  const remove = useMutation({
    mutationFn: (id) => deleteQuiz(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  const publish = useMutation({
    mutationFn: ({ id, publish }) =>
      patchQuizStatus(id, publish ? "live" : "draft"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  // Column visibility
  const [visible, setVisible] = useState({
    id: true,
    title: true,
    subject: true,
    grade: true,
    bundesland: true,
    difficulty: true,
    items: true,
    status: true,
    tags: true,
    created_at: true,
    updated_at: true,
    actions: true,
  });
  const toggle = (k) => setVisible((p) => ({ ...p, [k]: !p[k] }));

  // Column defs (no JSX)
  const defs = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 160,
        render: (v) => React.createElement(SafeText, { value: v }),
        sorter: (a, b) => cmpStr(a?.id, b?.id),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Title",
        dataIndex: "title",
        key: "title",
        render: (v) => React.createElement(SafeText, { value: v }),
        sorter: (a, b) => cmpStr(a?.title, b?.title),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Subject",
        dataIndex: "subject",
        key: "subject",
        width: 140,
        render: (v) => React.createElement(SafeText, { value: v }),
        sorter: (a, b) => cmpStr(a?.subject, b?.subject),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Grade",
        dataIndex: "grade",
        key: "grade",
        width: 90,
        render: (v) => React.createElement(SafeText, { value: v }),
        sorter: (a, b) => cmpNum(a?.grade, b?.grade),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "State",
        dataIndex: "bundesland",
        key: "bundesland",
        width: 180,
        render: (v) => React.createElement(SafeText, { value: v }),
        sorter: (a, b) => cmpStr(a?.bundesland, b?.bundesland),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Difficulty",
        dataIndex: "difficulty",
        key: "difficulty",
        width: 120,
        render: (d) =>
          React.createElement(
            Tag,
            { color: d === "easy" ? "green" : d === "hard" ? "volcano" : "geekblue" },
            React.createElement(SafeText, { value: d })
          ),
        sorter: (a, b) => cmpStr(a?.difficulty, b?.difficulty),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Items",
        dataIndex: "items",
        key: "items",
        width: 90,
        render: (arr, r) =>
          React.createElement(SafeText, { value: getItemsCount(r) }),
        sorter: (a, b) => cmpNum(getItemsCount(a), getItemsCount(b)),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (s) =>
          React.createElement(
            Tag,
            { color: s === "live" ? "green" : s === "review" ? "geekblue" : "default" },
            React.createElement(SafeText, { value: s })
          ),
        sorter: (a, b) => cmpStr(a?.status, b?.status),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Tags",
        dataIndex: "tags",
        key: "tags",
        render: (tags) => React.createElement(SafeTags, { value: tags }),
        sorter: (a, b) =>
          cmpStr(
            Array.isArray(a?.tags) ? a.tags.join(",") : a?.tags ?? "",
            Array.isArray(b?.tags) ? b.tags.join(",") : b?.tags ?? ""
          ),
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "Added",
        dataIndex: "created_at",
        key: "created_at",
        width: 200,
        defaultSortOrder: "ascend", // initial ascending order
        sorter: (a, b) =>
          cmpDate(a?.created_at ?? a?.createdAt, b?.created_at ?? b?.createdAt),
        sortDirections: ["ascend", "descend"],
        render: (_, r) =>
          React.createElement(SafeText, {
            value: formatDateTime(r?.created_at ?? r?.createdAt),
          }),
      },
      {
        title: "Updated",
        dataIndex: "updated_at",
        key: "updated_at",
        width: 200,
        sorter: (a, b) =>
          cmpDate(a?.updated_at ?? a?.updatedAt, b?.updated_at ?? b?.updatedAt),
        sortDirections: ["ascend", "descend"],
        render: (_, r) =>
          React.createElement(SafeText, {
            value: formatDateTime(r?.updated_at ?? r?.updatedAt),
          }),
      },
      {
        title: "Actions",
        key: "actions",
        width: 80,
        fixed: screens?.md ? "right" : undefined,
        render: (_, r) => {
          const isLive = r.status === "live";
          const menu = {
            items: [
              { key: "view", label: "View" },
              { type: "divider" },
              { key: "edit", label: "Edit" },
              { key: "toggle", label: isLive ? "Unpublish" : "Publish (live)" },
              {
                key: "delete",
                label: React.createElement(
                  "span",
                  { style: { color: "#ff4d4f" } },
                  "Delete"
                ),
              },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent?.stopPropagation?.();
              if (key === "view") onView?.(r);
              if (key === "edit") onEdit?.(r);
              if (key === "toggle") onTogglePublish?.(r);
              if (key === "delete") onDelete?.(r);
            },
          };
          return React.createElement(
            Dropdown,
            { menu, trigger: ["click"], placement: "bottomRight" },
            React.createElement(Button, {
              size: "small",
              type: "text",
              icon: React.createElement(MoreOutlined, null),
              onClick: (e) => e.stopPropagation(),
            })
          );
        },
      },
    ],
    [screens?.md]
  );

  const columns = useMemo(
    () => defs.filter((c) => visible[c.key || c.dataIndex] !== false),
    [defs, visible]
  );

  const columnMenuItems = Object.entries({
    id: "ID",
    title: "Title",
    subject: "Subject",
    grade: "Grade",
    bundesland: "State",
    difficulty: "Difficulty",
    items: "Items",
    status: "Status",
    tags: "Tags",
    created_at: "Added",
    updated_at: "Updated",
    actions: "Actions",
  }).map(([k, label]) => ({
    key: k,
    label: React.createElement(
      "label",
      { style: { cursor: "pointer" } },
      React.createElement("input", {
        type: "checkbox",
        checked: !!visible[k],
        onChange: () => toggle(k),
        style: { marginRight: 8 },
      }),
      label
    ),
  }));

  return { list, save, remove, publish, columns, columnMenuItems };
}
