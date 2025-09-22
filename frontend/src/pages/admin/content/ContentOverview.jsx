import { Tag, Button, message } from "antd"; // removed Space
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as CF } from "@/components/entityList/columnFactories.jsx";
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
  const [messageApi, contextHolder] = message.useMessage();
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/users");
        if (Array.isArray(data)) {
          const map = {};
          data.forEach((u) => {
            const first = u.first_name || "";
            const last = u.last_name || "";
            const full = (first + " " + last).trim();
            map[u.id] = full || u.email || `#${u.id}`;
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
        className="!px-0 whitespace-normal break-words text-left"
        style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: 250 }}
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
    // ⬇️ Tags column removed (hidden for now)
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
      messageApi.success("Post marked as published");
    } catch (err) {
      console.error(err);
      messageApi.error("Failed to mark as published");
    }
  };

  return (
    <>
      {contextHolder}
      <EntityList
      cfg={{
        entityKey: "blogposts",
        titlePlural: "Blog Posts",
        titleSingular: "Blog Post",
        routeBase: "/admin/content/edit",
        idField: "id",
        api: {
          listPath: "/blogposts",
          removePath: (id) => `/blogpost/${id}`,
          parseList: (raw) => (Array.isArray(raw) ? raw : []),
        },
        pathBuilders: {
          view: (id) => `/admin/content/edit/${id}`,
          edit: (id) => `/admin/content/edit/${id}`,
        },
        statusFilter: true,
        billingFilter: false,
        columnsMap,
        // removed "tags" from defaults
        defaultVisible: ["id", "title", "slug", "author_id", "audience", "status"],
        rowClassName: () => "",
        rowActions: {
          extraItems: [{ key: "mark-published", label: "Mark as Published" }],
          onClick: (key, row, ctx) => {
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
    </>
  );
}
