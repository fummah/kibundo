import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Tabs, 
  Table, 
  Tag, 
  List, 
  Avatar, 
  Dropdown, 
  Grid, 
  Spin,
  Tooltip,
  Upload,
  Form,
  Modal,
  Input,
  DatePicker,
  Empty,
  Image,
  message,
  Divider,
  Select
} from "antd";
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
  MoreOutlined, 
  PushpinOutlined, 
  DownloadOutlined, 
  SearchOutlined, 
  FileOutlined, 
  FilePdfOutlined, 
  FileWordOutlined, 
  FileExcelOutlined, 
  FilePptOutlined, 
  FileImageOutlined, 
  FileTextOutlined, 
  EyeOutlined, 
  CommentOutlined, 
  UserOutlined,
  SaveOutlined,
  PaperClipOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
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
import StudentForm from "@/pages/admin/students/StudentForm";
import AddCommentForm from "@/components/AddCommentForm";

const { Text } = Typography;
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
  const first =
    e?.user?.first_name ||
    e?.first_name ||
    (e?.name ? String(e.name).trim().split(/\s+/)[0] : "") ||
    "";
  const last =
    e?.user?.last_name ||
    e?.last_name ||
    (e?.name ? String(e.name).trim().split(/\s+/)[1] : "") ||
    "";
  return `${first.charAt(0).toUpperCase() || ""}${last.charAt(0).toUpperCase() || ""}`;
};
const relativeTime = (input) => {
  const d = input ? new Date(input) : null;
  if (!d || isNaN(d)) return "-";
  const ms = Date.now() - d.getTime();
  const sec = Math.max(1, Math.floor(ms / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mon = Math.floor(day / 30);
  const yr = Math.floor(day / 365);
  if (yr >= 1) return yr === 1 ? "about a year ago" : `${yr} years ago`;
  if (mon >= 1) return mon === 1 ? "about a month ago" : `${mon} months ago`;
  if (day >= 1) return day === 1 ? "yesterday" : `${day} days ago`;
  if (hr >= 1) return hr === 1 ? "an hour ago" : `${hr} hours ago`;
  if (min >= 1) return min === 1 ? "a minute ago" : `${min} minutes ago`;
  return "just now";
};

/* ---------- REQUIRED BACKEND ROUTES ---------- */
const REQUIRED_GET_PATH = {
  students: (id) => `/student/${id}`,
  teachers: (id) => `/teacher/${id}`,
  parents: (id) => `/parent/${id}`,
  subjects: (id) => `/subject/${id}`,
  products: (id) => `/product/${id}`,
  subscriptions: (id) => `/subscription/${id}`,
  blogposts: (id) => `/blogpost/${id}`,
  invoices: (id) => `/invoice/${id}`,
};
const REQUIRED_REMOVE_PATH = {
  parents: (id) => `/parent/${id}`,
  subjects: (id) => `/subject/${id}`,
  products: (id) => `/product/${id}`,
  subscriptions: (id) => `/subscription/${id}`,
  blogposts: (id) => `/blogpost/${id}`,
  invoices: (id) => `/invoice/${id}`,
};

export default function EntityDetail({ cfg }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [messageApi, ctx] = message.useMessage();
  const screens = Grid.useBreakpoint();

  const safeCfg = cfg || {};
  const entityKey = safeCfg.entityKey;
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

  const getPath = getPathFromCfg || (entityKey && REQUIRED_GET_PATH[entityKey]);
  const removePath = removePathFromCfg || (entityKey && REQUIRED_REMOVE_PATH[entityKey]);

  // Tab configs (hoisted)
  const commCfg = safeCfg?.tabs?.communication || {};
  const docsCfg = safeCfg?.tabs?.documents || {};
  const tasksCfg = safeCfg?.tabs?.tasks || {};

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
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [linkChildModalOpen, setLinkChildModalOpen] = useState(false);

  const [relatedRows, setRelatedRows] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [perfRange, setPerfRange] = useState("30d");
  const [perfLoading, setPerfLoading] = useState(false);
  const [performance, setPerformance] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docCommentMap, setDocCommentMap] = useState({});
  const docCommentLoadingId = useRef(null);
  const [docCommentModal, setDocCommentModal] = useState({ open: false, doc: null });
  const prevEntityRef = useRef();
  const [docSearch, setDocSearch] = useState("");
  const [docType, setDocType] = useState("All");
  const [docPageSize, setDocPageSize] = useState(100);
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docEditOpen, setDocEditOpen] = useState(false);
  const [docEditing, setDocEditing] = useState(null);

  useEffect(() => {
    if (parsedPrefill && JSON.stringify(parsedPrefill) !== JSON.stringify(prevEntityRef.current)) {
      setEntity(parsedPrefill);
      prevEntityRef.current = parsedPrefill;
    }
  }, [parsedPrefill]);

  /* -------- load main entity -------- */
  const load = useCallback(async () => {
    if (!getPath && typeof apiObj.loader !== "function") {
      if (!entity) {
        const defaultEntity = { [idField]: id, name: "-", status: "active" };
        setEntity(defaultEntity);
        prevEntityRef.current = defaultEntity;
      }
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
      
      if (JSON.stringify(obj) !== JSON.stringify(entity)) {
        setEntity(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(obj)) {
            return obj || {};
          }
          return prev;
        });
      }
    } catch (err) {
      if (!entity) {
        const defaultEntity = { [idField]: id, name: "-", status: "active" };
        setEntity(defaultEntity);
        prevEntityRef.current = defaultEntity;
      }
      const s = err?.response?.status;
      if (s === 404) {
        messageApi.error("Record not found (404)");
      } else {
        messageApi.warning("Could not load details. Showing cached row.");
      }
    } finally {
      setLoading(false);
    }
  }, [id, getPath, apiObj, messageApi, idField, entity]);

  /* -------- related -------- */
  const loadRelated = useCallback(async () => {
    if (!safeCfg?.tabs?.related?.enabled) return;
    const rel = safeCfg?.tabs?.related || {};
    const listFn = rel.listPath || relatedListPath;
    const refetchFn = rel.refetchPath;
    const extract = rel.extractList;

    setRelatedLoading(true);
    try {
      // 1) Preferred: explicit listPath returning an array
      if (typeof listFn === "function") {
        const { data } = await api.get(listFn(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setRelatedRows(list);
        return;
      }

      // 2) Fallback: refetchPath + extractList to derive array from payload
      if (typeof refetchFn === "function") {
        const path = refetchFn(id);
        const { data } = await api.get(path, { withCredentials: true });
        if (typeof extract === "function") {
          const list = extract(data);
          setRelatedRows(Array.isArray(list) ? list : []);
        } else {
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setRelatedRows(list);
        }
        return;
      }

      // 3) Last resort: prefetch from current entity
      if (typeof rel.prefetchRowsFromEntity === "function" && entity) {
        const list = rel.prefetchRowsFromEntity(entity);
        setRelatedRows(Array.isArray(list) ? list : []);
        return;
      }

      // If nothing configured, clear
      setRelatedRows([]);
    } catch {
      setRelatedRows([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [safeCfg?.tabs?.related, id, relatedListPath, entity]);

  // Prefill related rows from entity when available
  useEffect(() => {
    const rel = safeCfg?.tabs?.related || {};
    if (!rel.enabled) return;
    if (typeof rel.prefetchRowsFromEntity === "function" && entity) {
      const rows = rel.prefetchRowsFromEntity(entity);
      if (Array.isArray(rows)) setRelatedRows(rows);
    }
  }, [entity, safeCfg?.tabs?.related]);

  /* --- Info edit state --- */
  const [editingField, setEditingField] = useState(null);
  const [fieldValue, setFieldValue] = useState("");
  const [savingField, setSavingField] = useState(false);
  const [infoForm] = Form.useForm();
  const isEditingInfo = true;

  const handleFieldUpdate = useCallback(async (field) => {
    if (!field.editable || savingField) return;

    setSavingField(true);
    try {
      const updateData = { [field.name]: fieldValue };
      const updatePath = safeCfg.api?.updatePath || ((id) => `/${safeCfg.routeBase || "entities"}/${id}`);
      await api.patch(updatePath(id), updateData, { withCredentials: true });
      setEntity(prev => ({ ...prev, ...updateData }));
      messageApi.success(`${field.label} updated successfully`);
      setEditingField(null);
    } catch (error) {
      console.error("Error updating field:", error);
      messageApi.error(`Failed to update ${field.label}`);
    } finally {
      setSavingField(false);
    }
  }, [fieldValue, id, messageApi, safeCfg.api?.updatePath, safeCfg.routeBase, savingField]);

  const handleKeyPress = useCallback((e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFieldUpdate(field);
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  }, [handleFieldUpdate]);

  const editableInfoFields = useMemo(() => {
    const configuredFields = (safeCfg.infoFields || [])
      .filter(field => {
        const name = Array.isArray(field.name) ? field.name.join(".") : field.name;
        return name !== "parent_id" && !name.includes("parent.id");
      })
      .map(field => {
        const name = Array.isArray(field.name) ? field.name.join(".") : field.name;
        const isIp = ["ip", "ip_address", "ipAddress"].some(ip => 
          name.toLowerCase().includes(ip.toLowerCase())
        );
        const isDateAdded = ["date_added", "created_at", "createdAt", "member_since"]
          .some(dateField => name.toLowerCase().includes(dateField.toLowerCase()));
        const isReadOnly = isIp || isDateAdded || name.toLowerCase().includes("id");

        return {
          ...field,
          name,
          editable: !isReadOnly,
          type: field.type || field.input || "text"
        };
      });

    return [
      { name: idField, label: "ID", editable: false, type: "text" },
      ...configuredFields,
    ];
  }, [safeCfg.infoFields, idField]);

  const saveInfo = async () => {
    try {
      const values = await infoForm.validateFields();
      delete values[idField];

      for (const k of Object.keys(values)) {
        const v = values[k];
        if (v && typeof v === "object" && v.$isDayjsObject) {
          values[k] = v.toISOString();
        }
      }

      if (typeof apiObj.updatePath === "function") {
        await api.patch(apiObj.updatePath(id), values, { withCredentials: true });
        messageApi.success("Saved");
        await load();
      } else {
        setEntity((prev) => ({ ...(prev || {}), ...values }));
      }
    } catch (err) {
      if (err?.errorFields) {
        messageApi.error("Please fix the highlighted fields.");
      } else {
        messageApi.error("Failed to save");
      }
    }
  };

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

  /* -------- tasks -------- */
  const loadTasks = useCallback(async () => {
    if (!tasksCfg.enabled) return;
    setTasksLoading(true);
    try {
      if (typeof tasksCfg.listPath === "function") {
        const { data } = await api.get(tasksCfg.listPath(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setTasks(list);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [id, tasksCfg.enabled, tasksCfg.listPath]);

  const createTask = async (payload) => {
    try {
      if (typeof tasksCfg.createPath === "function") {
        const { data } = await api.post(tasksCfg.createPath(id), payload, { withCredentials: true });
        const created = data?.data ?? data ?? payload;
        setTasks((prev) => [created, ...prev]);
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

  /* -------- comments -------- */
  const loadComments = useCallback(async () => {
    if (!commCfg?.enabled) return;
    setCommentsLoading(true);
    try {
      if (typeof commCfg.listPath === "function") {
        const { data } = await api.get(commCfg.listPath(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setComments(list);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
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
      }
      messageApi.success("Comment added");
    } catch {
      messageApi.error("Failed to add comment");
    }
  };

  /* -------- documents -------- */
  const loadDocuments = useCallback(async () => {
    if (!docsCfg?.enabled) return;
    setDocsLoading(true);
    try {
      if (typeof docsCfg.listPath === "function") {
        const { data } = await api.get(docsCfg.listPath(id), { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDocuments(list);
      } else {
        setDocuments([]);
      }
    } catch {
      setDocuments([]);
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
          withCredentials: true,
        });
        const created = data?.data ?? data ?? { ...meta, title: meta?.title || fileObj?.name, id: `d${id}-${Date.now()}` };
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

  const updateDocument = async (docId, payload) => {
    try {
      if (typeof docsCfg?.updatePath === "function") {
        await api.patch(docsCfg.updatePath(id, docId), payload, { withCredentials: true });
      }
      setDocuments((prev) =>
        prev.map((d) => (String(d.id) === String(docId) ? { ...d, ...payload } : d))
      );
      messageApi.success("Document updated");
    } catch {
      messageApi.error("Failed to update document");
    }
  };

  const loadDocComments = useCallback(async (doc) => {
    if (!doc) return;
    const currentDocId = doc.id;
    docCommentLoadingId.current = currentDocId;
    try {
      let commentsList;
      if (typeof docsCfg?.commentListPath === "function") {
        const { data } = await api.get(docsCfg.commentListPath(id, currentDocId), { withCredentials: true });
        commentsList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      } else {
        commentsList = [];
      }
      if (docCommentLoadingId.current === currentDocId) {
        setDocCommentMap(prev => {
          if (JSON.stringify(prev[currentDocId]) !== JSON.stringify(commentsList)) {
            return { ...prev, [currentDocId]: commentsList };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Failed to load document comments:", error);
      const fallbackComments = [];
      if (docCommentLoadingId.current === currentDocId) {
        setDocCommentMap(prev => ({ ...prev, [currentDocId]: fallbackComments }));
      }
    } finally {
      if (docCommentLoadingId.current === currentDocId) {
        docCommentLoadingId.current = null;
      }
    }
  }, [id, docsCfg?.commentListPath]);

  const addDocComment = async (doc, payload) => {
    if (!doc) return;
    try {
      if (typeof docsCfg?.commentCreatePath === "function") {
        const { data } = await api.post(docsCfg.commentCreatePath(id, doc.id), payload, { withCredentials: true });
        const created = data?.data ?? data ?? { ...payload, id: `dc-${doc.id}-${Date.now()}`, created_at: new Date().toISOString() };
        setDocCommentMap((m) => ({ ...m, [doc.id]: [created, ...(m[doc.id] || [])] }));
      }
      messageApi.success("Comment added");
    } catch {
      messageApi.error("Failed to add comment");
    }
  };

  // Initial load
  useEffect(() => {
    load();
    if (activeTab === "information" && performancePath) {
      loadPerformance();
    }
    if ((activeTab === "communication" || activeTab === "information") && commCfg?.enabled) {
      loadComments();
    }
  }, [load, activeTab, performancePath, commCfg?.enabled, loadPerformance, loadComments]);

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

  const relatedColumns = useMemo(() => {
    const def = safeCfg.tabs?.related?.columns || [];
    const cols = def.map((c) => ({ ...c }));

    if (apiObj.unlinkStudentPath) {
      cols.push({
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 100,
        render: (_, record) => (
          <Button
            type="link"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/students/${record.id}`);
            }}
          >
            View
          </Button>
        ),
      });
    }

    return cols;
  }, [safeCfg.tabs, apiObj.unlinkStudentPath, id, loadRelated, messageApi, navigate]);

  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    switch (key) {
      case "related":
        if (safeCfg?.tabs?.related?.enabled || relatedListPath) loadRelated();
        break;
      case "information":
        if (performancePath) loadPerformance();
        if (commCfg?.enabled) loadComments();
        break;
      case "tasks":
        if (tasksCfg.enabled) loadTasks();
        break;
      case "documents":
        if (docsCfg?.enabled) loadDocuments();
        break;
      // custom tabs (e.g., 'subjects') generally don't need loaders here unless you add one
      default:
        break;
    }
  }, [safeCfg?.tabs?.related?.enabled, relatedListPath, performancePath, commCfg?.enabled, tasksCfg.enabled, docsCfg?.enabled, loadRelated, loadPerformance, loadComments, loadTasks, loadDocuments]);

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
        <div className="p-3 text-gray-500">No performance data available.</div>
      ) : null}
    </Card>
  ) : null;

  const CommunicationPanel =
    commCfg?.enabled && (
      <Card className="!rounded-xl" title="Comments / Notes" styles={{ body: { padding: 0 } }}>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <List
            dataSource={comments}
            loading={commentsLoading}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notes yet." /> }}
            footer={<AddCommentForm onSubmit={addComment} />}
            renderItem={(item, idx) => (
              <div key={item.id || idx}>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium">{dash(item.author)}</div>
                      <div className="text-xs text-gray-500">
                        {relativeTime(item.created_at)}{" "}
                        <span className="opacity-70">
                          ({fmtDate(item.created_at)} {item.created_at ? new Date(item.created_at).toTimeString().slice(0, 8) : ""})
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-gray-400">
                      <PushpinOutlined />
                    </div>
                  </div>
                  {item.text ? <div className="mt-1 text-[14px]">{typeof item.text === "string" ? item.text : dash(item.text)}</div> : null}
                </div>
                <div className="border-t border-gray-200" />
              </div>
            )}
          />
        </div>
        <Modal title="Add Comment" open={addCommentOpen} onCancel={() => setAddCommentOpen(false)} footer={null} destroyOnClose>
          <AddCommentForm
            onSubmit={async (vals) => {
              await addComment({ author: vals.author || "You", text: vals.text });
              setAddCommentOpen(false);
            }}
          />
        </Modal>
      </Card>
    );

  const informationTab = (
    <Card title="Main information">
      <Form form={infoForm} layout="vertical" initialValues={entity}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {editableInfoFields.map((field) => (
            <Form.Item label={field.label} key={field.name} name={field.name}>
              {field.type === "select" ? (
                <Select placeholder={`Select ${field.label}`} options={field.options || []} disabled={!field.editable} />
              ) : field.type === "date" ? (
                <DatePicker className="w-full" disabled={!field.editable} />
              ) : (
                <Input placeholder={field.label} disabled={!field.editable} />
              )}
            </Form.Item>
          ))}
        </div>
      </Form>
    </Card>
  );

  const relatedTab =
    safeCfg?.tabs?.related?.enabled &&
    (function () {
      return (
        <Card className="!rounded-xl" styles={{ body: { padding: 0 } }}>
          <div className="p-3 flex items-center justify-between">
            <Text strong>{safeCfg.tabs.related.label || "Related"}</Text>
            <Space>
              <Button icon={<PlusOutlined />} onClick={() => setLinkChildModalOpen(true)} disabled={false}>
                Add Student
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadRelated} />
            </Space>
          </div>
          <div className="px-3 pb-3">
            <Table
              rowKey={(r) => r.id ?? r.name}
              loading={relatedLoading}
              columns={relatedColumns}
              dataSource={relatedRows}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing related." /> }}
            />
          </div>
        </Card>
      );
    })();

  const TasksTab =
    tasksCfg.enabled &&
    (function () {
      return (
        <Card className="!rounded-xl" styles={{ body: { padding: 16 } }}>
          <AddTaskForm onSubmit={createTask} />
          <Divider />
          <Table
            rowKey={(r) => r.id}
            loading={tasksLoading}
            dataSource={tasks}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: "ID", dataIndex: "id" },
              { title: "Title", dataIndex: "title" },
              { title: "Priority", dataIndex: "priority", render: (p) => <Tag>{p}</Tag> },
              {
                title: "Status",
                dataIndex: "status",
                render: (s) => (
                  <Tag color={s === "open" ? "orange" : s === "in_progress" ? "blue" : "green"}>{s}</Tag>
                ),
              },
              { title: "Due", dataIndex: "dueDate", render: (d) => fmtDate(d) },
              {
                title: "Actions",
                render: (_, r) => (
                  <Space>
                    <Button size="small" onClick={() => updateTask(r.id, { status: "done" })}>
                      Mark done
                    </Button>
                    <Button size="small" danger onClick={() => deleteTask(r.id)}>
                      Delete
                    </Button>
                  </Space>
                ),
              },
            ]}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks." /> }}
          />
        </Card>
      );
    })();

  const DocumentsTab =
    docsCfg?.enabled &&
    (function () {
      const typeOptions = useMemo(() => {
        const base = ["All"];
        const provided = docsCfg?.typeOptions || [];
        if (provided.length) return ["All", ...provided];
        const set = new Set(documents.map((d) => d?.type || d?.status || "Uploaded"));
        return ["All", ...Array.from(set)];
      }, [documents, docsCfg?.typeOptions]);

      const filteredDocs = useMemo(() => {
        const q = docSearch.trim().toLowerCase();
        return (documents || []).filter((d) => {
          const matchesType = docType === "All" || (d?.type || d?.status || "Uploaded") === docType;
          if (!q) return matchesType;
          const hay = [
            d?.id,
            d?.title,
            d?.description,
            d?.status,
            d?.type,
            d?.source,
            d?.added_by,
            d?.updated_by,
            d?.date,
          ].map((x) => (x == null ? "" : String(x).toLowerCase()));
          return matchesType && hay.some((t) => t.includes(q));
        });
      }, [documents, docSearch, docType]);

      const columns = [
        {
          title: "Added (updated) by",
          dataIndex: "added_by",
          render: (v, r) => r.updated_by || r.added_by || "Administrator",
        },
        {
          title: "Status",
          dataIndex: "status",
          render: (v) => <Tag>{v || "Uploaded"}</Tag>,
          filters: Array.from(new Set(documents.map((d) => d.status || "Uploaded"))).map((v) => ({
            text: v,
            value: v,
          })),
          onFilter: (val, rec) => (rec.status || "Uploaded") === val,
        },
        { title: "Source", dataIndex: "source", render: (v) => v || "Uploaded" },
        { title: "Title", dataIndex: "title", ellipsis: true },
        {
          title: "Date",
          dataIndex: "date",
          sorter: (a, b) => new Date(a.date || 0) - new Date(b.date || 0),
          render: (v) => (v ? new Date(v).toLocaleString() : "-"),
        },
        { title: "Description", dataIndex: "description", ellipsis: true },
        {
          title: "Actions",
          fixed: "right",
          width: 110,
          render: (_, doc) => (
            <Space>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  setDocEditing(doc);
                  setDocEditOpen(true);
                }}
                title="Edit"
              />
              <Button
                size="small"
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => window.open(doc.url || "#", "_blank")}
                title="Download"
              />
              <Button
                size="small"
                type="text"
                danger
                onClick={() => deleteDocument(doc.id)}
                title="Delete"
              />
            </Space>
          ),
        },
      ];

      return (
        <Card className="!rounded-xl" styles={{ body: { padding: 16 } }}>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Space size={8} className="mr-2">
              <span className="text-gray-500">Show</span>
              <Select
                value={String(docPageSize)}
                onChange={(v) => setDocPageSize(Number(v))}
                options={["10", "25", "50", "100"].map((n) => ({ value: n, label: n }))}
                style={{ width: 160 }}
                className="w-24"
              />
              <span className="text-gray-500">entries</span>
            </Space>

            <div className="ml-auto flex items-center gap-2">
              <Select
                value={docType}
                onChange={setDocType}
                options={typeOptions.map((t) => ({ value: t, label: t }))}
                style={{ width: 160 }}
                placeholder="Type"
              />
              <Button onClick={() => setDocUploadOpen(true)}>Upload</Button>
              <Button icon={<ReloadOutlined />} onClick={loadDocuments} />
              <Input
                allowClear
                placeholder="Table search"
                prefix={<SearchOutlined />}
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                style={{ width: 220 }}
              />
            </div>
          </div>

          {/* Table */}
          <Table
            rowKey={(r) => r.id}
            loading={docsLoading}
            columns={columns}
            dataSource={filteredDocs}
            pagination={{
              pageSize: docPageSize,
              showSizeChanger: false,
              showTotal: (total, [start, end]) => `Showing ${start} to ${end} of ${total} entries`,
            }}
            scroll={{ x: 960 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents." />,
            }}
          />

          {/* Upload Modal */}
          <Modal
            title="Upload Document"
            open={docUploadOpen}
            onCancel={() => setDocUploadOpen(false)}
            footer={null}
            destroyOnClose
          >
            <UploadDocumentForm
              onUpload={async (file, meta) => {
                await uploadDocument(file, meta);
                setDocUploadOpen(false);
              }}
            />
          </Modal>

          {/* Edit Modal */}
          <Modal
            title={docEditing ? `Edit — ${docEditing.title || docEditing.id}` : "Edit Document"}
            open={docEditOpen}
            onCancel={() => {
              setDocEditOpen(false);
              setDocEditing(null);
            }}
            footer={null}
            destroyOnClose
          >
            <EditDocumentForm
              doc={docEditing}
              onSubmit={async (vals) => {
                await updateDocument(docEditing.id, vals);
                setDocEditOpen(false);
                setDocEditing(null);
              }}
            />
          </Modal>
        </Card>
      );
    })();

  const billingTab =
    safeCfg.tabs?.billing?.enabled &&
    (typeof safeCfg.tabs.billing.render === "function" ? (
      safeCfg.tabs.billing.render({ entity })
    ) : (
      <Card className="!rounded-xl">
        <Text type="secondary">Billing tab is enabled but no renderer was provided.</Text>
      </Card>
    ));

  const auditTab =
    safeCfg.tabs?.audit?.enabled &&
    (function () {
      return (
        <Card className="!rounded-xl" styles={{ body: { padding: 0 } }}>
          <div className="p-3 flex items-center justify-between">
            <Text strong>{safeCfg.tabs.audit.label || "Audit Log"}</Text>
            <Button icon={<ReloadOutlined />} />
          </div>
          <div className="px-3 pb-3">
            <Table
              columns={safeCfg.tabs.audit.columns || []}
              dataSource={safeCfg.tabs.audit.data || []}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No audit events." /> }}
            />
          </div>
        </Card>
      );
    })();

  /* ---------- NEW: custom tab plumbing (subjects, etc.) ---------- */
  const BUILTIN_KEYS = ["information", "related", "billing", "audit", "tasks", "documents", "communication", "activity"];

  // discover custom tabs present in cfg.tabs (enabled + has render function)
  const customTabKeys = useMemo(() => {
    const t = safeCfg.tabs || {};
    return Object.keys(t)
      .filter((k) => !BUILTIN_KEYS.includes(k))
      .filter((k) => t[k]?.enabled && typeof t[k]?.render === "function");
  }, [safeCfg.tabs]);

  // compute the final order
  const explicitOrder = useMemo(() => {
    const order1 = Array.isArray(safeCfg.tabsOrder) ? safeCfg.tabsOrder : null;
    const order2 = Array.isArray(safeCfg.tabs?.order) ? safeCfg.tabs.order : null;
    const base = order1 || order2;
    if (base && base.length) return base;

    // default order: builtins then customs (append)
    return ["information", "related", ...customTabKeys, "activity", "tasks", "documents", "communication", "billing", "audit"];
  }, [safeCfg.tabsOrder, safeCfg.tabs, customTabKeys]);

  // build a map of all available panels
  const panelByKey = useMemo(() => {
    const map = {
      information: informationTab,
      related: relatedTab,
      billing: billingTab,
      audit: auditTab,
      tasks: tasksCfg.enabled ? TasksTab : null,
      documents: docsCfg?.enabled ? DocumentsTab : null,
      communication: commCfg?.enabled ? CommunicationPanel : null,
      activity:
        safeCfg.tabs?.activity?.enabled
          ? (
            <Card className="!rounded-xl" styles={{ body: { padding: 0 } }}>
              <div className="p-3 flex items-center justify-between">
                <Text strong>{safeCfg.tabs.activity.label || "Activity"}</Text>
                <Space>
                  {typeof safeCfg.tabs.activity.toolbar === "function" ? safeCfg.tabs.activity.toolbar(entity) : null}
                  <Button icon={<ReloadOutlined />} onClick={() => {}} />
                </Space>
              </div>
              <div className="px-3 pb-3">
                <Table
                  columns={safeCfg.tabs.activity.columns || []}
                  dataSource={safeCfg.tabs.activity.data || []}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={safeCfg.tabs.activity.empty || "No activity."} /> }}
                />
              </div>
            </Card>
          )
          : null,
    };

    // add custom tabs (e.g., 'subjects')
    (customTabKeys || []).forEach((key) => {
      const cfgTab = safeCfg.tabs[key];
      map[key] = (
        <Card className="!rounded-xl" styles={{ body: { padding: 16 } }}>
          {cfgTab.render(entity || {})}
        </Card>
      );
    });

    return map;
  }, [informationTab, relatedTab, billingTab, auditTab, TasksTab, DocumentsTab, CommunicationPanel, safeCfg.tabs, entity, customTabKeys, tasksCfg.enabled, docsCfg?.enabled, commCfg?.enabled]);

  // turn map + order into Tabs items
  const tabItems = useMemo(() => {
    const items = [];
    explicitOrder.forEach((key) => {
      const panel = panelByKey[key];
      if (!panel) return;
      // label from cfg if available
      const label =
        (safeCfg.tabs?.[key]?.label) ||
        (key.charAt(0).toUpperCase() + key.slice(1));
      items.push({ key, label, children: panel });
    });
    // ensure at least 'information' exists
    if (!items.find((it) => it.key === "information")) {
      items.unshift({ key: "information", label: "Information", children: informationTab });
    }
    return items;
  }, [explicitOrder, panelByKey, safeCfg.tabs, informationTab]);

  /* ---------- Render ---------- */
  const actionsMenu = {
    items: [
      ...(updateStatusPath
        ? [
            { key: "activate", label: "Activate" },
            { key: "block", label: "Block", danger: true },
          ]
        : []),
      ...(updateStatusPath && removePath ? [{ type: "divider" }] : []),
      ...(removePath ? [{ key: "delete", label: "Delete", danger: true }] : []),
    ],
    onClick: async ({ key }) => {
      if (key === "activate") return setStatus("active");
      if (key === "block") return setStatus("disabled");
      if (key === "delete" && removePath) return onDelete();
    },
  };

  if (loading && !entity) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      {ctx}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <Space wrap className="min-w-0">
          {safeCfg?.ui?.showAvatar !== false ? (
            <Avatar size={screens.md ? "large" : "default"} style={{ backgroundColor: "#1677ff", fontWeight: 600 }}>
              {getInitials(entity) || "•"}
            </Avatar>
          ) : null}

          <div className="min-w-0">
            <div className="truncate font-semibold text-xl leading-6 md:text-2xl md:leading-7">
              {safeCfg.titleSingular || "Detail"} — <span className="font-normal">{titleName}</span>
            </div>
            <div className="mt-0.5">{statusTag(entity?.status)}</div>
          </div>
        </Space>

        {screens.md ? (
          <Space wrap>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveInfo} disabled={!isEditingInfo} size="middle">
              Save
            </Button>
            <Dropdown menu={actionsMenu} trigger={["click"]}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        ) : (
          <Dropdown menu={actionsMenu} trigger={["click"]} placement="bottomRight">
            <Button shape="circle" aria-label="More actions" className="!flex !items-center !justify-center" icon={<MoreOutlined className="transform rotate-90" />} />
          </Dropdown>
        )}
      </div>

      <Card className="!rounded-2xl" loading={loading} styles={{ body: { padding: screens.md ? 24 : 16 } }}>
        <Tabs
          size={screens.md ? "large" : "small"}
          tabBarGutter={screens.md ? 24 : 8}
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="[&_.ant-tabs-tab-btn]:text-[13px] md:[&_.ant-tabs-tab-btn]:text-[14px]"
        />
      </Card>

      {/* Modal to Add Child */}
      <Modal
        open={linkChildModalOpen}
        onCancel={() => setLinkChildModalOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <StudentForm
          isModal
          initialValues={{ parent_id: id }}
          onSuccess={async () => {
            try {
              messageApi.success("Student created successfully!");
              setLinkChildModalOpen(false);
              loadRelated();
            } catch (err) {
              messageApi.error(err?.response?.data?.message || "Failed to create student.");
            }
          }}
        />
      </Modal>
    </div>
  );
}

/* ---------- Small Forms (tasks / Comments / Document Upload) ---------- */

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

function EditDocumentForm({ doc, onSubmit }) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (doc) {
      form.setFieldsValue({
        title: doc.title,
        description: doc.description,
        status: doc.status || "Uploaded",
        source: doc.source || "Uploaded",
        date: doc.date ? dayjs(doc.date) : null,
      });
    }
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(vals) => {
        const payload = {
          title: vals.title,
          description: vals.description,
          status: vals.status,
          source: vals.source,
          date: vals.date ? vals.date.toISOString() : doc?.date,
        };
        onSubmit(payload);
      }}
    >
      <Form.Item label="Title" name="title" rules={[{ required: true, message: "Title is required" }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Status" name="status">
        <Select
          options={[
            { value: "Uploaded", label: "Uploaded" },
            { value: "Approved", label: "Approved" },
            { value: "Rejected", label: "Rejected" },
          ]}
        />
      </Form.Item>
      <Form.Item label="Source" name="source">
        <Input />
      </Form.Item>
      <Form.Item label="Date" name="date">
        <DatePicker className="w-full" showTime />
      </Form.Item>
      <Form.Item label="Description" name="description">
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
      </Form.Item>
      <Space>
        <Button htmlType="submit" type="primary">
          Save
        </Button>
      </Space>
    </Form>
  );
}
