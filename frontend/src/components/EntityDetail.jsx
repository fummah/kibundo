import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  Tooltip,
  Popconfirm,
  Avatar,
  Dropdown,
  Grid,
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
  MoreOutlined,
} from "@ant-design/icons";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { Dragger } = Upload;

/* ---------------- helpers ---------------- */
const dash = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);
const statusTag = (s) => (
  <Tag color={s === "active" ? "green" : s === "suspended" ? "orange" : "red"}>{s || "-"}</Tag>
);
const readPath = (obj, path) => {
  if (!obj) return undefined;
  if (Array.isArray(path)) return path.reduce((a, k) => (a == null ? a : a[k]), obj);
  if (typeof path === "string" && path.includes(".")) {
    return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
  }
  return typeof path === "string" ? obj[path] : undefined;
};
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (!dt || isNaN(dt)) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
const getInitials = (e) => {
  if (!e) return "";
  const first = e?.user?.first_name || e?.first_name || (e?.name ? String(e.name).trim().split(/\s+/)[0] : "") || "";
  const last  = e?.user?.last_name  || e?.last_name  || (e?.name ? String(e.name).trim().split(/\s+/)[1] : "") || "";
  return `${first.charAt(0).toUpperCase() || ""}${last.charAt(0).toUpperCase() || ""}`;
};

/* ---------- REQUIRED BACKEND ROUTES (from your Express router) ---------- */
const REQUIRED_GET_PATH = {
  students:      (id) => `/student/${id}`,
  teachers:      (id) => `/teacher/${id}`,
  parents:       (id) => `/parent/${id}`,
  subjects:      (id) => `/subject/${id}`,
  products:      (id) => `/product/${id}`,
  subscriptions: (id) => `/subscription/${id}`,
  blogposts:     (id) => `/blogpost/${id}`,   // public GET allowed
  invoices:      (id) => `/invoice/${id}`,
  // classes: no /class/:id route → leave undefined
};
const REQUIRED_REMOVE_PATH = {
  parents:       (id) => `/parent/${id}`,
  subjects:      (id) => `/subject/${id}`,
  products:      (id) => `/product/${id}`,
  subscriptions: (id) => `/subscription/${id}`,
  blogposts:     (id) => `/blogpost/${id}`,
  invoices:      (id) => `/invoice/${id}`,
  // students/teachers/classes: not exposed in router → no delete
};

export default function EntityDetail({ cfg }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [messageApi, ctx] = message.useMessage();
  const screens = Grid.useBreakpoint();

  const safeCfg = cfg || {};
  const entityKey = safeCfg.entityKey; // "students" | "teachers" | "parents" | ...
  const idField = safeCfg.idField || "id";
  const routeBase = safeCfg.routeBase || "";
  const apiObj = safeCfg.api || {};
  const {
    getPath: getPathFromCfg,
    updateStatusPath,
    removePath: removePathFromCfg,
    relatedListPath,
    performancePath,
  } = apiObj;

  // defaults to required routes if cfg.api doesn't provide them
  const getPath    = getPathFromCfg    || (entityKey && REQUIRED_GET_PATH[entityKey]);
  const removePath = removePathFromCfg || (entityKey && REQUIRED_REMOVE_PATH[entityKey]);

  // Prefill support
  const rawPrefill = useMemo(
    () => safeCfg.initialEntity ?? location.state?.prefill ?? null,
    [safeCfg.initialEntity, location.state]
  );
  const parsedPrefill = useMemo(() => {
    if (!rawPrefill) return null;
    try {
      return typeof apiObj.parseEntity === "function" ? apiObj.parseEntity(rawPrefill) : rawPrefill;
    } catch {
      return rawPrefill;
    }
  }, [rawPrefill, apiObj]);

  // State
  const [loading, setLoading] = useState(!parsedPrefill);
  const [saving, setSaving] = useState(false);
  const [entity, setEntity] = useState(parsedPrefill || null);
  const [activeTab, setActiveTab] = useState("information");

  const [relatedRows, setRelatedRows] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [perfRange, setPerfRange] = useState("30d");
  const [perfLoading, setPerfLoading] = useState(false);
  const [performance, setPerformance] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const commCfg = safeCfg?.tabs?.communication || {}; // ✅ declare BEFORE using it anywhere
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const docsCfg = safeCfg?.tabs?.documents || {};
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docCommentMap, setDocCommentMap] = useState({});
  const [docCommentLoadingId, setDocCommentLoadingId] = useState(null);
  const [docCommentModal, setDocCommentModal] = useState({ open: false, doc: null });

  const didInitRef = useRef(false);

  useEffect(() => {
    if (parsedPrefill) setEntity(parsedPrefill);
  }, [parsedPrefill]);

  /* -------- load main entity -------- */
  const load = useCallback(async () => {
    if (!getPath && typeof apiObj.loader !== "function") {
      if (!entity) setEntity({ [idField]: id, name: "-", status: "active" });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let obj;
      if (typeof apiObj.loader === "function") {
        obj = await apiObj.loader(id);
      } else {
        const { data } = await api.get(getPath(id), { withCredentials: true });
        const raw = data?.data ?? data ?? {};
        obj = typeof apiObj.parseEntity === "function" ? apiObj.parseEntity(raw) : raw;
      }
      setEntity((prev) => ({ ...(prev || {}), ...(obj || {}) }));
    } catch (err) {
      if (!entity) setEntity({ [idField]: id, name: "-", status: "active" });
      const s = err?.response?.status;
      if (s === 404) messageApi.error("Record not found (404)");
      else messageApi.warning("Could not load details. Showing cached row.");
    } finally {
      setLoading(false);
    }
  }, [id, getPath, apiObj, messageApi, idField, entity]);

  /* -------- related -------- */
  const loadRelated = useCallback(async () => {
    if (!safeCfg?.tabs?.related?.enabled) return;
    const listFn = safeCfg?.tabs?.related?.listPath || relatedListPath;
    if (typeof listFn !== "function") {
      setRelatedRows([]);
      return;
    }
    setRelatedLoading(true);
    try {
      const { data } = await api.get(listFn(id), { withCredentials: true });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setRelatedRows(list);
    } catch {
      setRelatedRows([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [safeCfg?.tabs?.related, id, relatedListPath]);

  /* -------- performance -------- */
  const loadPerformance = useCallback(async () => {
    if (!performancePath) return;
    setPerfLoading(true);
    try {
      const path = typeof performancePath === "function" ? performancePath(id) : performancePath;
      const { data } = await api.get(path, { params: { range: perfRange }, withCredentials: true });
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

  /* -------- tasks (optional cfg) -------- */
  const tasksCfg = safeCfg?.tabs?.tasks || {};
  const loadTasks = useCallback(async () => {
    if (!tasksCfg.enabled) return;
    setTasksLoading(true);
    try {
      if (typeof tasksCfg.listPath === "function") {
        const { data } = await api.get(tasksCfg.listPath(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setTasks(list);
      } else {
        setTasks([
          { id: `t${id}-1`, title: "Call parent", status: "open", priority: "medium", dueDate: null, created_at: new Date().toISOString() },
          { id: `t${id}-2`, title: "Review homework", status: "in_progress", priority: "high", dueDate: null, created_at: new Date().toISOString() },
        ]);
      }
    } catch {
      setTasks([
        { id: `t${id}-1`, title: "Call parent", status: "open", priority: "medium", dueDate: null, created_at: new Date().toISOString() },
        { id: `t${id}-2`, title: "Review homework", status: "in_progress", priority: "high", dueDate: null, created_at: new Date().toISOString() },
      ]);
    } finally {
      setTasksLoading(false);
    }
  }, [tasksCfg.enabled, tasksCfg.listPath, id]);

  const createTask = async (payload) => {
    try {
      if (typeof tasksCfg.createPath === "function") {
        const { data } = await api.post(tasksCfg.createPath(id), payload, { withCredentials: true });
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
        await api.patch(tasksCfg.updatePath(id, taskId), patch, { withCredentials: true });
      }
      setTasks((prev) => prev.map((t) => (String(t.id) === String(taskId) ? { ...t, ...patch } : t)));
    } catch {
      messageApi.error("Failed to update task");
    }
  };
  const deleteTask = async (taskId) => {
    try {
      if (typeof tasksCfg.deletePath === "function") {
        await api.delete(tasksCfg.deletePath(id, taskId), { withCredentials: true });
      }
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
      messageApi.success("Task deleted");
    } catch {
      messageApi.error("Failed to delete task");
    }
  };

  /* -------- comments (optional cfg) -------- */
  const loadComments = useCallback(async () => {
    if (!commCfg?.enabled) return;
    setCommentsLoading(true);
    try {
      if (typeof commCfg.listPath === "function") {
        const { data } = await api.get(commCfg.listPath(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setComments(list);
      } else {
        setComments([{ id: `c${id}-1`, author: "Support Bot", text: "Welcome!", created_at: new Date().toISOString() }]);
      }
    } catch {
      setComments([{ id: `c${id}-1`, author: "Support Bot", text: "Welcome!", created_at: new Date().toISOString() }]);
    } finally {
      setCommentsLoading(false);
    }
  }, [commCfg, id]);

  const addComment = async (payload) => {
    try {
      if (typeof commCfg?.createPath === "function") {
        const { data } = await api.post(commCfg.createPath(id), payload, { withCredentials: true });
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

  /* -------- documents (optional cfg) -------- */
  const loadDocuments = useCallback(async () => {
    if (!docsCfg?.enabled) return;
    setDocsLoading(true);
    try {
      if (typeof docsCfg.listPath === "function") {
        const { data } = await api.get(docsCfg.listPath(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDocuments(list);
      } else {
        setDocuments([{ id: `d${id}-1`, title: "Consent Form", description: "Signed by guardian", status: "approved", date: new Date().toISOString().slice(0, 10), url: "#" }]);
      }
    } catch {
      setDocuments([{ id: `d${id}-1`, title: "Consent Form", description: "Signed by guardian", status: "approved", date: new Date().toISOString().slice(0, 10), url: "#" }]);
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
          headers: { "Content-Type": "multipart/form-data" }, withCredentials: true
        });
        const created = data?.data ?? data ?? { ...meta, title: meta?.title || fileObj?.name, id: `d${id}-${Date.now()}` };
        setDocuments((prev) => [created, ...prev]);
      } else {
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
        await api.delete(docsCfg.deletePath(id, docId), { withCredentials: true });
      }
      setDocuments((prev) => prev.filter((d) => String(d.id) !== String(docId)));
      messageApi.success("Document removed");
    } catch {
      messageApi.error("Failed to delete document");
    }
  };

  const loadDocComments = async (doc) => {
    if (!doc) return;
    setDocCommentLoadingId(doc.id);
    try {
      if (typeof docsCfg?.commentListPath === "function") {
        const { data } = await api.get(docsCfg.commentListPath(id, doc.id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDocCommentMap((m) => ({ ...m, [doc.id]: list }));
      } else {
        setDocCommentMap((m) => ({
          ...m,
          [doc.id]: [{ id: `dc-${doc.id}-1`, author: "Support Bot", text: "Looks good!", created_at: new Date().toISOString() }],
        }));
      }
    } catch {
      setDocCommentMap((m) => ({
        ...m,
        [doc.id]: [{ id: `dc-${doc.id}-1`, author: "Support Bot", text: "Looks good!", created_at: new Date().toISOString() }],
      }));
    } finally {
      setDocCommentLoadingId(null);
    }
  };

  const addDocComment = async (doc, payload) => {
    if (!doc) return;
    try {
      let created = { id: `dc-${doc.id}-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      if (typeof docsCfg?.commentCreatePath === "function") {
        const { data } = await api.post(docsCfg.commentCreatePath(id, doc.id), payload, { withCredentials: true });
        created = data?.data ?? data ?? created;
      }
      setDocCommentMap((m) => ({ ...m, [doc.id]: [created, ...(m[doc.id] || [])] }));
      messageApi.success("Comment added");
    } catch {
      messageApi.error("Failed to add comment");
    }
  };

  /* -------- effects -------- */
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === "related" && (safeCfg?.tabs?.related?.enabled || relatedListPath)) loadRelated();
  }, [activeTab, safeCfg?.tabs?.related?.enabled, loadRelated, relatedListPath]);

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

  /* -------- actions -------- */
  const goBack = () => navigate(-1);
  const goEdit = () =>
    navigate(`${routeBase || location.pathname.replace(/\/[^/]+$/, "")}/${id}/edit`);
  const onDelete = () => {
    if (!removePath) return;
    Modal.confirm({
      title: `Delete ${safeCfg.titleSingular || "record"}?`,
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
          await api.delete(removePath(id), { withCredentials: true });
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
      await api.patch(updateStatusPath(id), { status: next }, { withCredentials: true });
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
    () => (typeof safeCfg.topInfo === "function" ? safeCfg.topInfo(entity) : []),
    [safeCfg, entity]
  );

  // Info rows
  const infoRows = useMemo(() => {
    const fields = Array.isArray(safeCfg.infoFields) ? safeCfg.infoFields : [];
    return fields.map((f) => ({
      key: Array.isArray(f.name) ? f.name.join(".") : f.name,
      label: f.label,
      value: dash(readPath(entity, f.name)),
    }));
  }, [safeCfg.infoFields, entity]);

  // Related columns
  const relatedColumns = useMemo(() => {
    const def = safeCfg.tabs?.related?.columns || [];
    return def.map((c) => ({ ...c }));
  }, [safeCfg.tabs]);

  /* -------- responsive actions menu (mobile) -------- */
  const actionsMenu = {
    items: [
      ...(updateStatusPath
        ? [
            { key: "activate", label: "Activate" },
            { key: "suspend", label: "Suspend" },
            { key: "block", label: "Block", danger: true },
            { type: "divider" },
          ]
        : []),
      { key: "refresh", label: "Refresh" },
      { key: "edit", label: "Edit" },
      ...(removePath ? [{ key: "delete", label: "Delete", danger: true }] : []),
    ],
    onClick: async ({ key }) => {
      if (key === "activate") return setStatus("active");
      if (key === "suspend") return setStatus("suspended");
      if (key === "block") return setStatus("disabled");
      if (key === "refresh") return load();
      if (key === "edit") return goEdit();
      if (key === "delete" && removePath) return onDelete();
    },
  };

  /* ---------- Cards/Tab Panels ---------- */
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
            <RTooltip formatter={(v) => [v, "Score"]} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke="#1677ff" fill="url(#perfGrad)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {(!performance || performance.length === 0) && !perfLoading ? (
        <div className="text-center text-gray-500">No performance data for this range.</div>
      ) : null}
    </Card>
  ) : null;

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
    safeCfg.tabs?.related?.enabled && (
      <Card className="!rounded-xl" bodyStyle={{ padding: 0 }}>
        <div className="p-3 flex items-center justify-between">
          <Text strong>{safeCfg.tabs.related.label || "Related"}</Text>
          <Space>
            {typeof safeCfg.tabs.related.toolbar === "function" ? safeCfg.tabs.related.toolbar(entity) : null}
            <Button icon={<ReloadOutlined />} onClick={loadRelated} />
          </Space>
        </div>
        <div className="px-3 pb-3">
          <Table
            columns={safeCfg.tabs.related.columns || []}
            dataSource={relatedRows}
            loading={relatedLoading}
            rowKey={safeCfg.tabs.related.idField || "id"}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={safeCfg.tabs.related.empty || "No related records."} />
              ),
            }}
          />
        </div>
      </Card>
    );

  const billingTab =
    safeCfg.tabs?.billing?.enabled && (
      <Card className="!rounded-xl">
        {(() => {
          const rows = safeCfg.tabs?.billing?.rows && entity ? safeCfg.tabs.billing.rows(entity) : [];
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

  const auditCfg = safeCfg.tabs?.audit;
  const auditTab = auditCfg?.enabled && (
    <Card className="!rounded-xl" bodyStyle={{ padding: 0 }}>
      <div className="p-3 flex items-center justify-between">
        <Text strong>{auditCfg.label || "Audit Log"}</Text>
      </div>
      <div className="px-3 pb-3">
        <Table
          columns={auditCfg.columns || []}
          dataSource={auditCfg.data || []}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={"No audit entries."} /> }}
        />
      </div>
    </Card>
  );

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
                <Button size="small" onClick={() => updateTask(r.id, { status: r.status === "done" ? "open" : "done" })}>
                  {r.status === "done" ? "Reopen" : "Mark Done"}
                </Button>
                <Popconfirm title="Delete task?" onConfirm={() => deleteTask(r.id)}>
                  <Button size="small" danger>Delete</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks yet." /> }}
      />
    </Card>
  );

  const CommunicationTab = commCfg?.enabled && (
    <Card className="!rounded-xl">
      <AddCommentForm onSubmit={(vals) => addComment({ author: vals.author || "You", text: vals.text })} />
      <Divider />
      <List
        loading={commentsLoading}
        dataSource={comments}
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
    </Card>
  );

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
          { title: "File", dataIndex: "url", key: "url", width: 110, render: (v) => (v ? <a href={v} target="_blank" rel="noreferrer">Open</a> : "-") },
          {
            title: "",
            key: "actions",
            width: 200,
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => { setDocCommentModal({ open: true, doc: r }); loadDocComments(r); }}>
                  Comments
                </Button>
                <Popconfirm title="Delete document?" onConfirm={() => deleteDocument(r.id)}>
                  <Button size="small" danger icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}>Delete</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents uploaded." /> }}
      />

      <Modal
        title={docCommentModal.doc ? `Comments — ${docCommentModal.doc.title || "-"}` : "Comments"}
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
    if (relatedTab) items.push({ key: "related", label: safeCfg.tabs.related.label || "Related", children: relatedTab });
    if (billingTab) items.push({ key: "billing", label: safeCfg.tabs.billing.label || "Billing", children: billingTab });
    if (safeCfg.tabs?.audit?.enabled) items.push({ key: "audit", label: safeCfg.tabs.audit.label || "Audit Log", children: auditTab });
    if (tasksCfg.enabled) items.push({ key: "tasks", label: tasksCfg.label || "Tasks", children: TasksTab });
    if (docsCfg?.enabled) items.push({ key: "documents", label: docsCfg.label || "Documents", children: DocumentsTab });
    if (commCfg?.enabled) items.push({ key: "communication", label: commCfg.label || "Comments", children: CommunicationTab });
    if (safeCfg.tabs?.activity?.enabled) {
      items.push({
        key: "activity",
        label: safeCfg.tabs.activity.label || "Activity",
        children: (
          <Card className="!rounded-xl" bodyStyle={{ padding: 0 }}>
            <div className="p-3 flex items-center justify-between">
              <Text strong>{safeCfg.tabs.activity.label || "Activity"}</Text>
              <Space>
                {typeof safeCfg.tabs.activity.toolbar === "function" ? safeCfg.tabs.activity.toolbar(entity) : null}
                <Button icon={<ReloadOutlined />} onClick={() => { /* external refresh via toolbar */ }} />
              </Space>
            </div>
            <div className="px-3 pb-3">
              <Table
                columns={safeCfg.tabs.activity.columns || []}
                dataSource={[]} // provide via cfg if needed
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={safeCfg.tabs.activity.empty || "No activity."} /> }}
              />
            </div>
          </Card>
        ),
      });
    }
    return items;
  }, [informationTab, relatedTab, billingTab, auditTab, tasksCfg.enabled, docsCfg?.enabled, commCfg?.enabled, safeCfg.tabs, entity]);

  /* -------- render -------- */
  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      {ctx}

      {/* Responsive header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <Space wrap className="min-w-0">
          <Button size={screens.md ? "middle" : "small"} icon={<ArrowLeftOutlined />} onClick={goBack}>
            <span className="hidden sm:inline">Back</span>
          </Button>

          {safeCfg?.ui?.showAvatar !== false ? (
            <Avatar size={screens.md ? "large" : "default"} style={{ backgroundColor: "#1677ff", fontWeight: 600 }}>
              {getInitials(entity) || "•"}
            </Avatar>
          ) : null}

          {/* smaller, friendlier title on mobile */}
          <div className="min-w-0">
            <div className="truncate font-semibold text-xl leading-6 md:text-2xl md:leading-7">
              {safeCfg.titleSingular || "Detail"} — <span className="font-normal">{titleName}</span>
            </div>
            <div className="mt-0.5">{statusTag(entity?.status)}</div>
          </div>
        </Space>

        {/* Desktop actions */}
        {screens.md ? (
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
            <Button icon={<ReloadOutlined />} onClick={load}>
              Refresh
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={goEdit}>
              Edit
            </Button>
            {removePath ? (
              <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </Space>
        ) : (
          // Mobile: vertical dotted (⋮) menu with all actions
          <Dropdown menu={actionsMenu} trigger={["click"]} placement="bottomRight">
            <Button
              shape="circle"
              aria-label="More actions"
              className="!flex !items-center !justify-center"
              icon={<MoreOutlined className="transform rotate-90" />}
            />
          </Dropdown>
        )}
      </div>

      <Card className="!rounded-2xl" loading={loading} bodyStyle={{ padding: screens.md ? 24 : 16 }}>
        <Tabs
          size={screens.md ? "large" : "small"}
          tabBarGutter={screens.md ? 24 : 8}
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="[&_.ant-tabs-tab-btn]:text-[13px] md:[&_.ant-tabs-tab-btn]:text-[14px]"
        />
      </Card>
    </div>
  );
}

/* ---------- Small Forms (Tasks / Comments / Document Upload) ---------- */

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[220px,1fr] gap-2 items-center">
      <div className="text-gray-500">{label}</div>
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800 px-3 py-2">
        {Array.isArray(value) ? (value.length ? value.join(", ") : "-") : value ?? "-"}
      </div>
    </div>
  );
}

function AddTaskForm({ onSubmit }) {
  const [form] = Form.useForm();
  return (
    <Form
      form={form}
      layout="inline"
      onFinish={(vals) => {
        const toIso = (d) => {
          if (!d) return null;
          const jsDate = d?.toDate ? d.toDate() : new Date(d);
          return isNaN(jsDate) ? null : jsDate.toISOString();
        };
        const payload = {
          title: vals.title?.trim() || "-",
          priority: vals.priority || "medium",
          status: "open",
          dueDate: toIso(vals.dueDate),
        };
        onSubmit(payload);
        form.resetFields();
      }}
    >
      <Form.Item name="title" rules={[{ required: true, message: "Enter task title" }]} style={{ minWidth: 220 }}>
        <Input placeholder="Task title" />
      </Form.Item>
      <Form.Item name="priority" initialValue="medium">
        <Select
          style={{ width: 120 }}
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
        const payload = { author: (vals.author || "You").trim(), text: (vals.text || "").trim() };
        if (!payload.text) return;
        onSubmit(payload);
        form.resetFields(["text"]);
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[200px,1fr,auto] gap-2">
        <Form.Item name="author" className="!mb-0">
          <Input placeholder="Author (optional)" />
        </Form.Item>
        <Form.Item name="text" className="!mb-0" rules={[{ required: true, message: "Enter a comment" }]}>
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
          <Input.TextArea placeholder="Description (optional)" autoSize={{ minRows: 2, maxRows: 6 }} />
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
