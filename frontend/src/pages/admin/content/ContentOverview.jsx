import { Tag, Space, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import EntityList, { columnFactories as CF } from "@/components/EntityList.jsx";
import api from "@/api/axios";

const dash = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "-" : v;

const StatusTag = (s) => (
  <Tag color={s === "published" ? "green" : s === "pending_review" ? "orange" : "default"}>
    {dash(s)}
  </Tag>
);

const AudienceTag = (a) => (
  <Tag color={a === "parents" ? "blue" : a === "teachers" ? "purple" : "geekblue"}>
    {dash(a)}
  </Tag>
);

const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

const hasSlug = (row) => !!row?.slug && String(row.slug).trim() !== "";
const isPublished = (row) => row?.status === "published";

export default function ContentOverview() {
  const navigate = useNavigate();
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/users");
        if (Array.isArray(data)) {
          const map = {};
          data.forEach((u) => {
            map[u.id] = u.name || u.email || `#${u.id}`;
          });
          setUsersMap(map);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    })();
  }, []);

  const columnsMap = (nav, helpers) => ({
    id: CF.idLink("ID", "/admin/content/edit", "id", (id) =>
      navigate(`/admin/content/edit/${id}`)
    ),
    title: {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (v, r) =>
        v ? (
          <Button
            type="link"
            className="!px-0"
            onClick={() => navigate(`/admin/content/edit/${r.id}`)}
          >
            {v}
          </Button>
        ) : (
          "-"
        ),
      sorter: (a, b) =>
        String(a.title || "").localeCompare(String(b.title || "")),
    },
    slug: CF.text("Slug", "slug"),
    author_id: {
      title: "Author",
      dataIndex: "author_id",
      key: "author_id",
      width: 140,
      render: (v) => dash(usersMap[v]),
      csv: (r) => usersMap[r.author_id] ?? "-",
      sorter: (a, b) =>
        String(usersMap[a.author_id] || "").localeCompare(
          String(usersMap[b.author_id] || "")
        ),
    },
    audience: {
      title: "Audience",
      dataIndex: "audience",
      key: "audience",
      width: 120,
      render: (v) => AudienceTag(v),
      csv: (r) => r.audience ?? "-",
    },
    status: {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (v) => StatusTag(v),
      csv: (r) => r.status ?? "-",
      sorter: (a, b) =>
        String(a.status || "").localeCompare(String(b.status || "")),
    },
    tags: {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: (arr) =>
        Array.isArray(arr) && arr.length ? (
          <Space wrap size={[4, 4]}>
            {arr.map((t, i) => (
              <Tag key={i}>{t}</Tag>
            ))}
          </Space>
        ) : (
          "-"
        ),
      csv: (r) => (Array.isArray(r.tags) ? r.tags.join("|") : "-"),
    },
    scheduled_for: {
      title: "Scheduled",
      dataIndex: "scheduled_for",
      key: "scheduled_for",
      render: fmtDateTime,
    },
    published_at: {
      title: "Published",
      dataIndex: "published_at",
      key: "published_at",
      render: fmtDateTime,
    },
    created_at: {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: fmtDateTime,
    },
    updated_at: {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      render: fmtDateTime,
    },
  });

  const markAsPublished = async (id) => {
    try {
      await api.put(`/blogpost/${id}`, { status: "published" });
      message.success("Post marked as published");
    } catch (err) {
      console.error(err);
      message.error("Failed to mark as published");
    }
  };

  return (
<EntityList
  cfg={{
    entityKey: "blogposts",
    titlePlural: "Blog Posts",
    titleSingular: "Blog Post",
    routeBase: "/admin/content/edit", // base reflects the edit route
    idField: "id",
    api: {
      listPath: "/blogposts",
      removePath: (id) => `/blogpost/${id}`,
      parseList: (raw) => (Array.isArray(raw) ? raw : []),
    },
    // force where row click & default "View" go:
    pathBuilders: {
      view: (id) => `/admin/content/edit/${id}`,
      edit: (id) => `/admin/content/edit/${id}`,
    },
    statusFilter: true,
    billingFilter: false,
    columnsMap,
    defaultVisible: ["id", "title", "slug", "author_id", "audience", "status", "tags"],
    rowClassName: () => "",
    rowActions: {
      extraItems: [
        
        { key: "mark-published", label: "Mark as Published" },
      ],
      onClick: (key, row, ctx) => {
        // Stop the row's own click/navigation from firing
        const ev = ctx?.domEvent || ctx?.event;
        if (ev && typeof ev.stopPropagation === "function") {
          ev.preventDefault?.();
          ev.stopPropagation();
        }

        if (key === "view-post") {
          if (isPublished(row) && hasSlug(row)) {
            window.location.href = `/blog/${row.slug}`;
          } else {
            window.location.href = `/blog/preview/${row.id}`;
          }
          return;
        }

        if (key === "open-editor") {
          // explicit edit action (same as pathBuilders, but explicit here)
          window.location.href = `/admin/content/edit/${row.id}`;
          return;
        }

        if (key === "mark-published") {
          markAsPublished(row.id).then(() => ctx?.reload?.());
        }
      },
    },
  }}
/>

  );
}
