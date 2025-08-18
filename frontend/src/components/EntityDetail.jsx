import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Card,
  Typography,
  Space,
  Button,
  Tabs,
  Table,
  Tag,
  message,
  Modal,
  Divider,
  Empty,
  Select,
  Form,
  Input,
  DatePicker,
  Upload,
  List,
  Tooltip,     // AntD Tooltip
  Popconfirm,  // AntD Popconfirm
} from "antd";
import { Comment } from "@ant-design/compatible";


import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  InboxOutlined,
  DeleteTwoTone,
} from "@ant-design/icons";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip, // recharts tooltip (aliased)
} from "recharts";

import api from "@/api/axios";

const { Title, Text } = Typography;
const { Dragger } = Upload;


const dash = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "-" : v;

const statusTag = (s) => (
  <Tag color={s === "active" ? "green" : s === "suspended" ? "orange" : "red"}>
    {s || "-"}
  </Tag>
);

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[220px,1fr] gap-2 items-center">
      <div className="text-gray-500">{label}</div>
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800 px-3 py-2">
        {Array.isArray(value)
          ? value.length
            ? value.join(", ")
            : "-"
          : value ?? "-"}
      </div>
    </div>
  );
}

/** Safely read deep values from objects */
const readPath = (obj, path) => {
  if (!obj) return undefined;
  if (Array.isArray(path)) return path.reduce((a, k) => (a == null ? a : a[k]), obj);
  if (typeof path === "string" && path.includes(".")) {
    return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
  }
  return typeof path === "string" ? obj[path] : undefined;
};

/** Dummy generators (used if no API paths are provided) */
const genDummyTasks = (entityId) => [
  {
    id: `t${entityId}-1`,
    title: "Call parent",
    status: "open",
    priority: "medium",
    dueDate: null,
    created_at: new Date().toISOString(),
  },
  {
    id: `t${entityId}-2`,
    title: "Review homework",
    status: "in_progress",
    priority: "high",
    dueDate: null,
    created_at: new Date().toISOString(),
  },
];

const genDummyComments = (entityId) => [
  {
    id: `c${entityId}-1`,
    author: "Support Bot",
    text: "Welcome to Kibundo!",
    created_at: new Date().toISOString(),
  },
];

const genDummyDocuments = (entityId) => [
  {
    id: `d${entityId}-1`,
    title: "Consent Form",
    description: "Signed by guardian",
    status: "approved",
    date: new Date().toISOString().slice(0, 10),
    url: "#",
  },
];

/** Pretty format date (DD/MM/YYYY) */
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (!dt || isNaN(dt)) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function EntityDetail({ cfg }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [messageApi, ctx] = message.useMessage();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entity, setEntity] = useState(null);
  const [activeTab, setActiveTab] = useState("information");

  // Related list (e.g., children/guardians/classes)
  const [relatedRows, setRelatedRows] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Performance
  const [perfRange, setPerfRange] = useState("30d");
  const [perfLoading, setPerfLoading] = useState(false);
  const [performance, setPerformance] = useState([]);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Documents state + per-document comments
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docCommentMap, setDocCommentMap] = useState({}); // {docId: [comments]}
  const [docCommentLoadingId, setDocCommentLoadingId] = useState(null);
  const [docCommentModal, setDocCommentModal] = useState({ open: false, doc: null });

  // cfg plumbing
  const idField = cfg.idField || "id";
  const routeBase = cfg.routeBase || "";
  const apiObj = cfg.api || {};
  const { getPath, updateStatusPath, removePath, relatedListPath, performancePath } = apiObj;

  // ---- single-entity loader
  const load = useCallback(async () => {
    if (!getPath && typeof apiObj.loader !== "function") {
      // No endpoint and no loader: provide a placeholder record
      setEntity({ [idField]: id, name: "-", status: "active" });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let obj;
      if (typeof apiObj.loader === "function") {
        obj = await apiObj.loader(id);
      } else {
        const { data } = await api.get(getPath(id));
        const raw = data?.data ?? data ?? {};
        obj = typeof apiObj.parseEntity === "function" ? apiObj.parseEntity(raw) : raw;
      }
      setEntity(obj);
    } catch {
      messageApi.warning("Could not load details. Showing placeholder.");
      setEntity({ [idField]: id, name: "-", status: "active" });
    } finally {
      setLoading(false);
    }
  }, [id, getPath, apiObj, messageApi, idField]);

  // ---- related
  const loadRelated = useCallback(async () => {
    if (!cfg?.tabs?.related?.enabled) return;
    const listFn = cfg?.tabs?.related?.listPath || relatedListPath;
    setRelatedLoading(true);
    try {
      if (typeof listFn === "function") {
        const { data } = await api.get(listFn(id));
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setRelatedRows(list);
      } else {
        // dummy if no API
        setRelatedRows([]);
      }
    } catch {
      setRelatedRows([]); // silent
    } finally {
      setRelatedLoading(false);
    }
  }, [cfg?.tabs?.related, id, relatedListPath]);

  // ---- performance (optional small chart)
  const loadPerformance = useCallback(async () => {
    if (!performancePath) return;
    setPerfLoading(true);
    try {
      const path = typeof performancePath === "function" ? performancePath(id) : performancePath;
      const { data } = await api.get(path, { params: { range: perfRange } });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const norm = arr.map((it, i) => ({
        label: it.label ?? it.date ?? it.month ?? `P${i + 1}`,
        value: Number(it.value ?? it.score ?? it.progress ?? 0),
      }));
      setPerformance(norm);
    } catch {
      setPerformance([]);
    } finally {
      setPerfLoading(false);
    }
  }, [performancePath, id, perfRange]);

  // ---- TASKS CRUD (with fallbacks)
  const tasksCfg = cfg?.tabs?.tasks || {};
  const loadTasks = useCallback(async () => {
    if (!tasksCfg.enabled) return;
    setTasksLoading(true);
    try {
      if (typeof tasksCfg.listPath === "function") {
        const { data } = await api.get(tasksCfg.listPath(id));
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setTasks(list);
      } else {
        setTasks(genDummyTasks(id));
      }
    } catch {
      setTasks(genDummyTasks(id));
    } finally {
      setTasksLoading(false);
    }
  }, [tasksCfg.enabled, tasksCfg.listPath, id]);

  const createTask = async (payload) => {
    try {
      if (typeof tasksCfg.createPath === "function") {
        const { data } = await api.post(tasksCfg.createPath(id), payload);
        const created = data?.data ?? data ?? payload;
        setTasks((prev) => [created, ...prev]);
      } else {
        const local = { id: `t${id}-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
        setTasks((prev) => [local, ...prev]);
      }
      messageApi.success("Task added");
    } catch {
      messageApi.error("Failed to add task");
    }
  };

  const updateTask = async (taskId, patch) => {
    try {
      if (typeof tasksCfg.updatePath === "function") {
        await api.patch(tasksCfg.updatePath(id, taskId), patch);
      }
      setTasks((prev) => prev.map((t) => (String(t.id) === String(taskId) ? { ...t, ...patch } : t)));
    } catch {
      messageApi.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      if (typeof tasksCfg.deletePath === "function") {
        await api.delete(tasksCfg.deletePath(id, taskId));
      }
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
      messageApi.success("Task deleted");
    } catch {
      messageApi.error("Failed to delete task");
    }
  };

  // ---- COMMENTS (list/create with fallbacks)
  const commCfg = cfg?.tabs?.communication || {};
  const loadComments = useCallback(async () => {
    if (!commCfg?.enabled) return;
    setCommentsLoading(true);
    try {
      if (typeof commCfg.listPath === "function") {
        const { data } = await api.get(commCfg.listPath(id));
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setComments(list);
      } else {
        setComments(genDummyComments(id));
      }
    } catch {
      setComments(genDummyComments(id));
    } finally {
      setCommentsLoading(false);
    }
  }, [commCfg, id]);

  const addComment = async (payload) => {
    try {
      if (typeof commCfg?.createPath === "function") {
        const { data } = await api.post(commCfg.createPath(id), payload);
        const created = data?.data ?? data ?? payload;
        setComments((prev) => [created, ...prev]);
      } else {
        const local = { id: `c${id}-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
        setComments((prev) => [local, ...prev]);
      }
      messageApi.success("Comment added");
    } catch {
      messageApi.error("Failed to add comment");
    }
  };

  // ---- DOCUMENTS (list/upload/delete + per-doc comments)
  const docsCfg = cfg?.tabs?.documents || {};
  const loadDocuments = useCallback(async () => {
    if (!docsCfg?.enabled) return;
    setDocsLoading(true);
    try {
      if (typeof docsCfg.listPath === "function") {
        const { data } = await api.get(docsCfg.listPath(id));
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDocuments(list);
      } else {
        setDocuments(genDummyDocuments(id));
      }
    } catch {
      setDocuments(genDummyDocuments(id));
    } finally {
      setDocsLoading(false);
    }
  }, [docsCfg?.enabled, docsCfg?.listPath, id]);

  const uploadDocument = async (fileObj, meta) => {
    try {
      if (typeof docsCfg?.uploadPath === "function") {
        const form = new FormData();
        form.append("file", fileObj);
        Object.entries(meta || {}).forEach(([k, v]) => form.append(k, v ?? ""));
        const { data } = await api.post(docsCfg.uploadPath(id), form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const created =
          data?.data ?? data ?? { ...meta, title: meta?.title || fileObj?.name, id: `d${id}-${Date.now()}` };
        setDocuments((prev) => [created, ...prev]);
      } else {
        // local dummy
        const created = {
          id: `d${id}-${Date.now()}`,
          title: meta?.title || fileObj?.name,
          description: meta?.description || "-",
          status: meta?.status || "uploaded",
          date: meta?.date || new Date().toISOString().slice(0, 10),
          url: "#",
        };
        setDocuments((prev) => [created, ...prev]);
      }
      messageApi.success("Document uploaded");
    } catch {
      messageApi.error("Failed to upload document");
    }
  };

  const deleteDocument = async (docId) => {
    try {
      if (typeof docsCfg?.deletePath === "function") {
        await api.delete(docsCfg.deletePath(id, docId));
      }
      setDocuments((prev) => prev.filter((d) => String(d.id) !== String(docId)));
      messageApi.success("Document removed");
    } catch {
      messageApi.error("Failed to delete document");
    }
  };

  // Per-document comments (list/add, optional API)
  const loadDocComments = async (doc) => {
    if (!doc) return;
    setDocCommentLoadingId(doc.id);
    try {
      if (typeof docsCfg?.commentListPath === "function") {
        const { data } = await api.get(docsCfg.commentListPath(id, doc.id));
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDocCommentMap((m) => ({ ...m, [doc.id]: list }));
      } else {
        setDocCommentMap((m) => ({
          ...m,
          [doc.id]: [
            {
              id: `dc-${doc.id}-1`,
              author: "Support Bot",
              text: "Looks good!",
              created_at: new Date().toISOString(),
            },
          ],
        }));
      }
    } catch {
      setDocCommentMap((m) => ({
        ...m,
        [doc.id]: [
          {
            id: `dc-${doc.id}-1`,
            author: "Support Bot",
            text: "Looks good!",
            created_at: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setDocCommentLoadingId(null);
    }
  };

  const addDocComment = async (doc, payload) => {
    try {
      if (typeof docsCfg?.commentCreatePath === "function") {
        await api.post(docsCfg.commentCreatePath(id, doc.id), payload);
      }
      setDocCommentMap((m) => {
        const list = m[doc.id] || [];
        return {
          ...m,
          [doc.id]: [
            { id: `dc-${doc.id}-${Date.now()}`, created_at: new Date().toISOString(), ...payload },
            ...list,
          ],
        };
      });
      messageApi.success("Comment added");
    } catch {
      messageApi.error("Failed to add comment");
    }
  };

  // Effects
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === "related" && (cfg?.tabs?.related?.enabled || relatedListPath)) loadRelated();
  }, [activeTab, cfg?.tabs?.related?.enabled, loadRelated, relatedListPath]);

  useEffect(() => {
    if (activeTab === "information" && performancePath) loadPerformance();
  }, [activeTab, performancePath, loadPerformance, perfRange]);

  useEffect(() => {
    if (activeTab === "tasks" && tasksCfg.enabled) loadTasks();
  }, [activeTab, tasksCfg.enabled, loadTasks]);

  useEffect(() => {
    if (activeTab === "communication" && commCfg?.enabled) loadComments();
  }, [activeTab, commCfg?.enabled, loadComments]);

  useEffect(() => {
    if (activeTab === "documents" && docsCfg?.enabled) loadDocuments();
  }, [activeTab, docsCfg?.enabled, loadDocuments]);

  // Actions
  const goBack = () => navigate(-1);
  const goEdit = () => navigate(`${routeBase}/${id}/edit`);

  const onDelete = () => {
    if (!removePath) return;
    Modal.confirm({
      title: `Delete ${cfg.titleSingular || "record"}?`,
      content: (
        <>
          Are you sure you want to delete{" "}
          <strong>
            {dash(entity?.user?.name) !== "-"
              ? entity?.user?.name
              : dash(entity?.name) !== "-"
              ? entity?.name
              : `#${dash(entity?.[idField])}`}
          </strong>
          ?
        </>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await api.delete(removePath(id));
          messageApi.success("Deleted");
          navigate(routeBase || "/");
        } catch {
          messageApi.error("Failed to delete");
        }
      },
    });
  };

  const setStatus = async (next) => {
    if (!updateStatusPath) return;
    setSaving(true);
    try {
      await api.patch(updateStatusPath(id), { status: next });
      messageApi.success(`Status → ${next}`);
      await load();
    } catch {
      messageApi.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  // Title name
  const titleName = useMemo(() => {
    const e = entity || {};
    const fromUser = e?.user?.name;
    const fromSplit = [e?.first_name, e?.last_name].filter(Boolean).join(" ").trim();
    const best = fromUser || (fromSplit && fromSplit.trim()) || e?.name;
    return best && best.trim() ? best : `#${dash(e?.[idField])}`;
  }, [entity, idField]);

  // Top info chips
  const topInfoEls = useMemo(
    () => (typeof cfg.topInfo === "function" ? cfg.topInfo(entity) : []),
    [cfg, entity]
  );

  // Info rows
  const infoRows = useMemo(() => {
    const fields = Array.isArray(cfg.infoFields) ? cfg.infoFields : [];
    return fields.map((f) => ({
      key: Array.isArray(f.name) ? f.name.join(".") : f.name,
      label: f.label,
      value: dash(readPath(entity, f.name)),
    }));
  }, [cfg.infoFields, entity]);

  // Related columns
  const relatedColumns = useMemo(() => {
    const def = cfg.tabs?.related?.columns || [];
    return def.map((c) => ({ ...c }));
  }, [cfg.tabs]);

  // Performance card
  const PerformanceCard = performancePath ? (
    <Card
      className="!rounded-xl"
      title="Performance"
      extra={
        <Space>
          <Select
            size="small"
            value={perfRange}
            onChange={setPerfRange}
            options={[
              { value: "14d", label: "Last 14d" },
              { value: "30d", label: "Last 30d" },
              { value: "90d", label: "Last 90d" },
            ]}
            style={{ width: 120 }}
          />
          <Button size="small" icon={<ReloadOutlined />} onClick={loadPerformance} />
        </Space>
      }
    >
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={performance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1677ff" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1677ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={36} />
            <RTooltip
              formatter={(v) => [v, "Score"]}
              labelStyle={{ fontWeight: 600 }}
              contentStyle={{ borderRadius: 8 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#1677ff"
              fill="url(#perfGrad)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {(!performance || performance.length === 0) && !perfLoading ? (
        <div className="text-center text-gray-500">No performance data for this range.</div>
      ) : null}
    </Card>
  ) : null;

  /* ---------- Tab Panels ---------- */

  const informationTab = (
    <div className="space-y-3">
      <Card className="!rounded-xl" bodyStyle={{ padding: 12 }}>
        <div className="flex flex-wrap items-center gap-2">
          <Text strong>{titleName}</Text>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500">Status:</span> {statusTag(entity?.status)}
          {entity?.accountBalance != null ? (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">Account balance:</span>{" "}
              <Text type={Number(entity.accountBalance) < 0 ? "danger" : undefined}>
                {String(entity.accountBalance)}
              </Text>
            </>
          ) : null}
        </div>
      </Card>

      {topInfoEls?.length ? (
        <Card className="!rounded-xl" bodyStyle={{ padding: 12 }}>
          <Space wrap size={[8, 8]}>{topInfoEls}</Space>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="!rounded-xl" title="Main information">
          <div className="flex flex-col gap-3">
            {infoRows.map((r) => (
              <InfoRow key={r.key} label={r.label} value={r.value} />
            ))}
            <InfoRow label="Status" value={statusTag(entity?.status)} />
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="!rounded-xl" title="Comments / To-Dos">
            <div className="min-h-[200px] text-sm text-gray-500">No comments yet.</div>
          </Card>
          <Card className="!rounded-xl" title="Additional information">
            <Text type="secondary">No additional information.</Text>
          </Card>
        </div>
      </div>

      {PerformanceCard}
    </div>
  );

  const relatedTab =
    cfg.tabs?.related?.enabled && (
      <Card className="!rounded-xl" bodyStyle={{ padding: 0 }}>
        <div className="p-3 flex items-center justify-between">
          <Text strong>{cfg.tabs.related.label || "Related"}</Text>
          <Space>
            {typeof cfg.tabs.related.toolbar === "function" ? cfg.tabs.related.toolbar(entity) : null}
            <Button icon={<ReloadOutlined />} onClick={loadRelated} />
          </Space>
        </div>
        <div className="px-3 pb-3">
          <Table
            columns={relatedColumns}
            dataSource={relatedRows}
            loading={relatedLoading}
            rowKey={cfg.tabs.related.idField || "id"}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={cfg.tabs.related.empty || "No related records."}
                />
              ),
            }}
          />
        </div>
      </Card>
    );

  const billingTab =
    cfg.tabs?.billing?.enabled && (
      <Card className="!rounded-xl">
        {(() => {
          const rows = cfg.tabs?.billing?.rows && entity ? cfg.tabs.billing.rows(entity) : [];
          return rows.length ? (
            <div className="flex flex-col gap-3">
              {rows.map((r, i) => (
                <InfoRow key={i} label={r.label} value={dash(r.value)} />
              ))}
            </div>
          ) : (
            <Text type="secondary">No billing data.</Text>
          );
        })()}
      </Card>
    );

  /* ---- AUDIT LOG (optional: use tabs.audit) ---- */
  const auditCfg = cfg.tabs?.audit;
  const auditTab = auditCfg?.enabled && (
    <Card className="!rounded-xl" bodyStyle={{ padding: 0 }}>
      <div className="p-3 flex itemsCenter justify-between">
        <Text strong>{auditCfg.label || "Audit Log"}</Text>
      </div>
      <div className="px-3 pb-3">
        <Table
          columns={auditCfg.columns || []}
          dataSource={auditCfg.data || []}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={"No audit entries."} />,
          }}
        />
      </div>
    </Card>
  );

  /* ---- TASKS Tab (CRUD) ---- */
  const TasksTab = tasksCfg.enabled && (
    <Card className="!rounded-xl">
      <AddTaskForm onSubmit={createTask} />
      <Divider />
      <Table
        rowKey="id"
        loading={tasksLoading}
        dataSource={tasks}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 800 }}
        columns={[
          { title: "ID", dataIndex: "id", key: "id", width: 120, render: (v) => v ?? "-" },
          { title: "Title", dataIndex: "title", key: "title", render: (v) => v ?? "-" },
          { title: "Priority", dataIndex: "priority", key: "priority", width: 120, render: (v) => v ?? "-" },
          { title: "Status", dataIndex: "status", key: "status", width: 130, render: (v) => v ?? "-" },
          { title: "Due", dataIndex: "dueDate", key: "dueDate", width: 140, render: (v) => (v ? fmtDate(v) : "-") },
          {
            title: "",
            key: "actions",
            width: 160,
            render: (_, r) => (
              <Space>
                <Button
                  size="small"
                  onClick={() =>
                    updateTask(r.id, { status: r.status === "done" ? "open" : "done" })
                  }
                >
                  {r.status === "done" ? "Reopen" : "Mark Done"}
                </Button>
                <Popconfirm title="Delete task?" onConfirm={() => deleteTask(r.id)}>
                  <Button size="small" danger>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks yet." />,
        }}
      />
    </Card>
  );

  /* ---- COMMENTS Tab (list + add) ---- */
  const CommunicationTab = commCfg?.enabled && (
    <Card className="!rounded-xl">
      <AddCommentForm
        onSubmit={(vals) => addComment({ author: vals.author || "You", text: vals.text })}
      />
      <Divider />
      <List
        loading={commentsLoading}
        dataSource={comments}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No comments yet." />,
        }}
        renderItem={(item) => (
          <li key={item.id}>
            <Comment
              author={<span>{dash(item.author)}</span>}
              content={<p className="whitespace-pre-wrap">{dash(item.text)}</p>}
              datetime={<Tooltip title={item.created_at}>{fmtDate(item.created_at)}</Tooltip>}
            />
          </li>
        )}
      />
    </Card>
  );

  /* ---- DOCUMENTS Tab (upload + list + per-doc comments) ---- */
  const DocumentsTab = docsCfg?.enabled && (
    <Card className="!rounded-xl">
      <UploadDocumentForm onUpload={uploadDocument} />
      <Divider />
      <Table
        rowKey="id"
        loading={docsLoading}
        dataSource={documents}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 800 }}
        columns={[
          { title: "ID", dataIndex: "id", key: "id", width: 120, render: (v) => v ?? "-" },
          { title: "Title", dataIndex: "title", key: "title", render: (v) => v ?? "-" },
          { title: "Description", dataIndex: "description", key: "description", render: (v) => v ?? "-" },
          { title: "Status", dataIndex: "status", key: "status", width: 120, render: (v) => v ?? "-" },
          { title: "Date", dataIndex: "date", key: "date", width: 130, render: (v) => (v ? fmtDate(v) : "-") },
          {
            title: "File",
            dataIndex: "url",
            key: "url",
            width: 110,
            render: (v) => (v ? <a href={v} target="_blank" rel="noreferrer">Open</a> : "-"),
          },
          {
            title: "",
            key: "actions",
            width: 200,
            render: (_, r) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setDocCommentModal({ open: true, doc: r });
                    loadDocComments(r);
                  }}
                >
                  Comments
                </Button>
                <Popconfirm title="Delete document?" onConfirm={() => deleteDocument(r.id)}>
                  <Button size="small" danger icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents uploaded." />
          ),
        }}
      />

      <Modal
        title={
          docCommentModal.doc ? `Comments — ${docCommentModal.doc.title || "-"}` : "Comments"
        }
        open={docCommentModal.open}
        onCancel={() => setDocCommentModal({ open: false, doc: null })}
        footer={null}
        width={720}
      >
        <div className="mb-3">
          <AddCommentForm
            onSubmit={(vals) =>
              docCommentModal.doc &&
              addDocComment(docCommentModal.doc, { author: vals.author || "You", text: vals.text })
            }
          />
        </div>
        <List
          loading={docCommentLoadingId === (docCommentModal.doc && docCommentModal.doc.id)}
          dataSource={(docCommentModal.doc && docCommentMap[docCommentModal.doc.id]) || []}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No comments yet." /> }}
          renderItem={(item) => (
            <li key={item.id}>
              <Comment
                author={<span>{dash(item.author)}</span>}
                content={<p className="whitespace-pre-wrap">{dash(item.text)}</p>}
                datetime={<Tooltip title={item.created_at}>{fmtDate(item.created_at)}</Tooltip>}
              />
            </li>
          )}
        />
      </Modal>
    </Card>
  );

  // Tabs assemble
  const tabItems = useMemo(() => {
    const items = [{ key: "information", label: "Information", children: informationTab }];
    if (relatedTab) items.push({ key: "related", label: cfg.tabs.related.label || "Related", children: relatedTab });
    if (billingTab) items.push({ key: "billing", label: "Billing", children: billingTab });
    if (cfg.tabs?.audit?.enabled) items.push({ key: "audit", label: cfg.tabs.audit.label || "Audit Log", children: auditTab });
    if (tasksCfg.enabled) items.push({ key: "tasks", label: tasksCfg.label || "Tasks", children: TasksTab });
    if (docsCfg?.enabled) items.push({ key: "documents", label: docsCfg.label || "Documents", children: DocumentsTab });
    if (commCfg?.enabled) items.push({ key: "communication", label: commCfg.label || "Comments", children: CommunicationTab });
    return items;
  }, [informationTab, relatedTab, billingTab, auditTab, tasksCfg.enabled, docsCfg?.enabled, commCfg?.enabled, cfg.tabs]);

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      {ctx}

      <div className="flex items-center justify-between mb-3">
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={goBack}>
            Back
          </Button>
          <Title level={3} className="!mb-0">
            {cfg.titleSingular || "Detail"} — <span className="font-normal">{titleName}</span>
          </Title>
          <span>{statusTag(entity?.status)}</span>
        </Space>

        <Space wrap>
          {updateStatusPath ? (
            <>
              <Button icon={<CheckCircleOutlined />} onClick={() => setStatus("active")} loading={saving}>
                Activate
              </Button>
              <Button icon={<StopOutlined />} onClick={() => setStatus("suspended")} loading={saving}>
                Suspend
              </Button>
              <Button danger icon={<CloseCircleOutlined />} onClick={() => setStatus("disabled")} loading={saving}>
                Block
              </Button>
              <Divider type="vertical" />
            </>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={load} />
          <Button type="primary" icon={<EditOutlined />} onClick={goEdit}>
            Edit
          </Button>
          {removePath ? (
            <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </Space>
      </div>

      <Card className="!rounded-2xl" loading={loading}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}

/* ---------- Small Forms (Tasks / Comments / Document Upload) ---------- */

function AddTaskForm({ onSubmit }) {
  const [form] = Form.useForm();
  return (
    <Form
      form={form}
      layout="inline"
      onFinish={(vals) => {
        const payload = {
          title: vals.title?.trim() || "-",
          priority: vals.priority || "medium",
          status: "open",
          dueDate: vals.dueDate ? vals.dueDate.toISOString() : null,
        };
        onSubmit(payload);
        form.resetFields();
      }}
    >
      <Form.Item
        name="title"
        rules={[{ required: true, message: "Enter task title" }]}
        style={{ minWidth: 260 }}
      >
        <Input placeholder="Task title" />
      </Form.Item>
      <Form.Item name="priority" initialValue="medium">
        <Select
          style={{ width: 130 }}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </Form.Item>
      <Form.Item name="dueDate">
        <DatePicker placeholder="Due date" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
          Add Task
        </Button>
      </Form.Item>
    </Form>
  );
}

function AddCommentForm({ onSubmit }) {
  const [form] = Form.useForm();
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(vals) => {
        const payload = {
          author: (vals.author || "You").trim(),
          text: (vals.text || "").trim(),
        };
        if (!payload.text) return;
        onSubmit(payload);
        form.resetFields(["text"]);
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[200px,1fr,auto] gap-2">
        <Form.Item name="author" className="!mb-0">
          <Input placeholder="Author (optional)" />
        </Form.Item>
        <Form.Item
          name="text"
          className="!mb-0"
          rules={[{ required: true, message: "Enter a comment" }]}
        >
          <Input.TextArea placeholder="Add a comment…" autoSize={{ minRows: 1, maxRows: 6 }} />
        </Form.Item>
        <Form.Item className="!mb-0">
          <Button type="primary" htmlType="submit">
            Comment
          </Button>
        </Form.Item>
      </div>
    </Form>
  );
}

function UploadDocumentForm({ onUpload }) {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(vals) => {
        if (!file) return message.warning("Choose a file first");
        const meta = {
          title: vals.title || file.name,
          description: vals.description || "",
          status: vals.status || "uploaded",
          date: vals.date ? vals.date.format("YYYY-MM-DD") : undefined,
        };
        onUpload(file, meta);
        form.resetFields();
        setFile(null);
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Form.Item label="Title" name="title">
          <Input placeholder="Document title (optional)" />
        </Form.Item>
        <Form.Item label="Status" name="status" initialValue="uploaded">
          <Select
            options={[
              { value: "uploaded", label: "Uploaded" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Description" name="description" className="md:col-span-2">
          <Input.TextArea
            placeholder="Description (optional)"
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        </Form.Item>
        <Form.Item label="Date" name="date">
          <DatePicker className="w-full" />
        </Form.Item>
        <div className="md:col-span-2">
          <Dragger
            multiple={false}
            beforeUpload={() => false}
            fileList={file ? [file] : []}
            onRemove={() => setFile(null)}
            onChange={({ file: f }) => setFile(f.originFileObj || f)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">Files are kept in-memory unless you provide an API path.</p>
          </Dragger>
        </div>
      </div>
      <Form.Item className="!mb-0">
        <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
          Upload
        </Button>
      </Form.Item>
    </Form>
  );
}
