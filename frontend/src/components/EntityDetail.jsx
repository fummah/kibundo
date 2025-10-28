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
  Select,
  App,
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
  PaperClipOutlined,
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
const dash = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "-" : v;
const statusTag = (s) => (
  <Tag color={s === "active" ? "green" : s === "suspended" ? "orange" : "red"}>
    {s || "-"}
  </Tag>
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
  return `${first.charAt(0).toUpperCase() || ""}${
    last.charAt(0).toUpperCase() || ""
  }`;
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

export default function EntityDetail({ cfg, extraHeaderButtons, onEntityLoad }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [messageApi, ctx] = message.useMessage();
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  // Create a unique ID generator that ensures uniqueness across renders
  const uniqueIdGenerator = useRef(0);
  const getUniqueId = (fieldName) => {
    uniqueIdGenerator.current += 1;
    return `${fieldName}-${id}-${uniqueIdGenerator.current}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const safeCfg = cfg || {};
  const entityKey = safeCfg.entityKey;

  // Determine entity type from URL if not provided in config
  const getEntityTypeFromUrl = () => {
    const pathname = window.location.pathname;
    if (pathname.includes("/admin/students/")) return "students";
    if (pathname.includes("/admin/parents/")) return "parents";
    if (pathname.includes("/admin/teachers/")) return "teachers";
    return entityKey || "customers";
  };

  const currentEntityType = getEntityTypeFromUrl();
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
  const removePath =
    removePathFromCfg || (entityKey && REQUIRED_REMOVE_PATH[entityKey]);

  // Tab configs (hoisted)
  const commCfg = safeCfg?.tabs?.communication || {};
  const docsCfg = safeCfg?.tabs?.documents || {};
  const tasksCfg = safeCfg?.tabs?.tasks || {};

  // --- Prefill support (freeze once to avoid URL/tab-triggered recalculation) ---
  const initialPrefillRef = useRef(
    safeCfg.initialEntity ?? location.state?.prefill ?? null
  );
  const rawPrefill = initialPrefillRef.current;

  const parsedPrefill = useMemo(() => {
    const p = rawPrefill;
    if (!p) return null;
    try {
      return typeof apiObj.parseEntity === "function" ? apiObj.parseEntity(p) : p;
    } catch {
      return p;
    }
  }, [apiObj, rawPrefill]);

  // State
  const [loading, setLoading] = useState(!parsedPrefill);
  const [saving, setSaving] = useState(false);
  const [entity, setEntity] = useState(parsedPrefill || null);
  const [activeTab, setActiveTab] = useState("information");
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [linkChildModalOpen, setLinkChildModalOpen] = useState(false);

  // Call onEntityLoad callback when entity changes
  useEffect(() => {
    if (entity && onEntityLoad) {
      onEntityLoad(entity);
    }
  }, [entity, onEntityLoad]);

  // Track if initial load is done to prevent flicker
  const [initialLoadDone, setInitialLoadDone] = useState(!!parsedPrefill);

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
  const [docCommentModal, setDocCommentModal] = useState({
    open: false,
    doc: null,
  });
  const prevEntityRef = useRef();
  const [docSearch, setDocSearch] = useState("");
  const [docType, setDocType] = useState("All");
  const [docPageSize, setDocPageSize] = useState(100);
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docEditOpen, setDocEditOpen] = useState(false);
  const [docEditing, setDocEditing] = useState(null);

  // Store load and messageApi in refs to provide stable access to custom tabs
  const loadRef = useRef(null);
  const messageApiRef = useRef(null);

  // Create a stable context object for custom tabs
  const tabContext = useMemo(
    () => ({
      get reload() {
        return loadRef.current;
      },
      get messageApi() {
        return messageApiRef.current;
      },
    }),
    []
  );

  useEffect(() => {
    if (
      parsedPrefill &&
      JSON.stringify(parsedPrefill) !== JSON.stringify(prevEntityRef.current)
    ) {
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
        obj =
          typeof apiObj.parseEntity === "function" ? apiObj.parseEntity(raw) : raw;
      }

      setEntity((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(obj)) return obj || {};
        return prev;
      });
      setInitialLoadDone(true);
      formManuallyUpdatedRef.current = false; // Reset manual update flag on fresh load
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
      setInitialLoadDone(true);
      formManuallyUpdatedRef.current = false; // Reset manual update flag on error load
    } finally {
      setLoading(false);
    }
  }, [id, getPath, apiObj, messageApi, idField]);

  // Keep refs up to date
  useEffect(() => {
    loadRef.current = load;
    messageApiRef.current = messageApi;
  }, [load, messageApi]);

  /* -------- related -------- */
  const loadRelated = useCallback(async () => {
    if (!safeCfg?.tabs?.related?.enabled) return;
    const rel = safeCfg?.tabs?.related || {};
    const listFn = rel.listPath || relatedListPath;
    const refetchFn = rel.refetchPath;
    const extract = rel.extractList;

    setRelatedLoading(true);
    try {
      if (typeof listFn === "function") {
        const { data } = await api.get(listFn(id), { withCredentials: true });
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setRelatedRows(list);
        return;
      }

      if (typeof refetchFn === "function") {
        const path = refetchFn(id);
        const { data } = await api.get(path, { withCredentials: true });
        if (typeof extract === "function") {
          const list = extract(data);
          setRelatedRows(Array.isArray(list) ? list : []);
        } else {
          const list = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];
          setRelatedRows(list);
        }
        return;
      }

      if (typeof rel.prefetchRowsFromEntity === "function" && entity) {
        const list = rel.prefetchRowsFromEntity(entity);
        setRelatedRows(Array.isArray(list) ? list : []);
        return;
      }

      setRelatedRows([]);
    } catch {
      setRelatedRows([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [safeCfg?.tabs?.related, id, relatedListPath, entity]);

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
  const [passwordVisible, setPasswordVisible] = useState({});
  const [states, setStates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const formManuallyUpdatedRef = useRef(false);

  /* --- Load dropdown data --- */
  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        // Load states
        const statesResponse = await api.get("/states", { withCredentials: true });
        const statesData = Array.isArray(statesResponse.data) ? statesResponse.data : [];
        const processedStates = statesData.map(state => {
          // Handle State objects with state_name, id, created_at, created_by
          if (state && typeof state === 'object') {
            const value = state.state_name || state.name || state.id;
            const label = state.state_name || state.name || state.id;
            return { 
              value: String(value), 
              label: String(label)
            };
          }
          return { value: String(state), label: String(state) };
        });
        setStates(processedStates);

        // Load classes
        const classesResponse = await api.get("/allclasses", { withCredentials: true });
        const classesData = Array.isArray(classesResponse.data) ? classesResponse.data : [];
        const processedClasses = classesData.map(cls => {
          // Handle Class objects with class_name, id, etc.
          if (cls && typeof cls === 'object') {
            const value = cls.id;
            const label = cls.class_name || cls.name || `Class ${cls.id}`;
            return { 
              value: String(value), 
              label: String(label)
            };
          }
          return { value: String(cls), label: String(cls) };
        });
        setClasses(processedClasses);
      } catch (error) {
        // console.error("Failed to load dropdown data:", error);
        // Set empty arrays as fallback
        setStates([]);
        setClasses([]);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadDropdownData();
  }, []);

  /* --- Optimized change handlers --- */
  const handleFieldChange = useCallback((fieldName, value) => {
    // Prevent unnecessary updates if value hasn't changed
    if (entity?.[fieldName] === value) return;
    
    const newEntity = {
      ...entity,
      [fieldName]: value,
    };
    setEntity(newEntity);
    infoForm.setFieldValue(fieldName, value);
    formManuallyUpdatedRef.current = true; // Mark form as manually updated
  }, [entity, infoForm]);

  const handleInputChange = useCallback((fieldName, event) => {
    const newValue = event.target.value;
    // Prevent unnecessary updates if value hasn't changed
    if (entity?.[fieldName] === newValue) return;
    
    const newEntity = {
      ...entity,
      [fieldName]: newValue,
    };
    setEntity(newEntity);
    infoForm.setFieldValue(fieldName, newValue);
    formManuallyUpdatedRef.current = true; // Mark form as manually updated
  }, [entity, infoForm]);

  /* --- Auto-generate portal credentials --- */
  const generatePassword = useCallback(() => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  useEffect(() => {
    if (entity && infoForm && id) {
      const formValues = {
        ...entity,
        username:
          entity.username ||
          (() => {
            const firstName =
              entity.first_name || entity.user?.first_name || "";
            const lastName = entity.last_name || entity.user?.last_name || "";
            const entityId = entity.id || entity[idField];

            if (firstName && lastName && entityId) {
              const firstTwo = firstName.substring(0, 2).toLowerCase();
              const firstLetter = lastName.substring(0, 1).toLowerCase();
              return `${firstTwo}${firstLetter}${entityId}`;
            }
            return "";
          })(),
        plain_pass:
          entity.plain_pass || "testpass1234",
      };

      // Only set form values if they haven't been manually changed
      setTimeout(() => {
        try {
          if (!formManuallyUpdatedRef.current) {
            infoForm.setFieldsValue(formValues);
          }
        } catch (error) {}
      }, 100);

      const updates = {};
      if (!entity.username && formValues.username) {
        updates.username = formValues.username;
      }
      if (!entity.plain_pass) {
        updates.plain_pass = formValues.plain_pass;
      }

      if (Object.keys(updates).length > 0) {
        setEntity((prev) => ({ ...prev, ...updates }));
        const saveToDb = async () => {
          try {
            if (typeof apiObj.updatePath === "function") {
              await api.put(apiObj.updatePath(id), updates, {
                withCredentials: true,
              });
            }
          } catch (error) {}
        };
        saveToDb();
      }
    }
  }, [entity, infoForm, id, apiObj, idField]);

  const handleFieldUpdate = useCallback(
    async (field) => {
      if (!field.editable || savingField) return;

      setSavingField(true);
      try {
        const updateData = { [field.name]: fieldValue };
        const updatePath =
          safeCfg.api?.updatePath ||
          ((id) => `/${safeCfg.routeBase || "entities"}/${id}`);
        await api.put(updatePath(id), updateData, { withCredentials: true });
        setEntity((prev) => ({ ...prev, ...updateData }));
        messageApi.success(`${field.label} updated successfully`);
        setEditingField(null);
      } catch (error) {
        messageApi.error(`Failed to update ${field.label}`);
      } finally {
        setSavingField(false);
      }
    },
    [
      fieldValue,
      id,
      messageApi,
      safeCfg.api?.updatePath,
      safeCfg.routeBase,
      savingField,
    ]
  );

  const handleKeyPress = useCallback(
    (e, field) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleFieldUpdate(field);
      } else if (e.key === "Escape") {
        setEditingField(null);
      }
    },
    [handleFieldUpdate]
  );

  const editableInfoFields = useMemo(() => {
    const configuredFields = (safeCfg.infoFields || [])
      .filter((field) => {
        const name = Array.isArray(field.name)
          ? field.name.join(".")
          : field.name;
        return (
          name !== "parent_id" &&
          !name.includes("parent.id")
        );
      })
      .map((field) => {
        const name = Array.isArray(field.name)
          ? field.name.join(".")
          : field.name;
        const isIp = ["ip", "ip_address", "ipAddress"].some((ip) =>
          name.toLowerCase().includes(ip.toLowerCase())
        );
        const isDateAdded = ["date_added", "created_at", "createdAt", "member_since"].some(
          (dateField) => name.toLowerCase().includes(dateField.toLowerCase())
        );
        // Allow specific "id" fields to be editable (class_id, parent_id, etc.)
        const isEditableId = ["class_id", "parent_id", "user_id", "role_id"].includes(name);
        const isReadOnly =
          isIp || isDateAdded || (name.toLowerCase().includes("id") && !isEditableId && !field.type) || field.editable === false;

        // Determine field type based on name
        let fieldType = field.type || field.input || "text";
        if (name.toLowerCase().includes("grade") || name.toLowerCase().includes("class")) {
          fieldType = "grade";
        } else if (name.toLowerCase().includes("state") || name.toLowerCase().includes("bundesland")) {
          fieldType = "state";
        } else if (name.toLowerCase().includes("status")) {
          fieldType = "status";
        }

        return {
          ...field,
          name,
          editable: !isReadOnly,
          type: fieldType,
        };
      });

    const baseFields = [
      { name: idField, label: "ID", editable: false, type: "text" },
    ];

    return [...baseFields, ...configuredFields];
  }, [safeCfg.infoFields, idField, entity, entityKey]);

  const saveInfo = async () => {
    try {
      const values = await infoForm.validateFields();
      delete values[idField];
      
      // Add class_id from entity if it exists (for grade field handling)
      if (entity?.class_id !== undefined && values.class_id === undefined) {
        values.class_id = entity.class_id;
      }

      for (const k of Object.keys(values)) {
        const v = values[k];
        if (v && typeof v === "object" && v.$isDayjsObject) {
          values[k] = v.toISOString();
        }
      }

      // Transform field names to match backend expectations
      const transformedValues = { ...values };
      
      // Map firstName to first_name and lastName to last_name for backend
      if (transformedValues.firstName) {
        transformedValues.first_name = transformedValues.firstName;
        delete transformedValues.firstName;
      }
      if (transformedValues.lastName) {
        transformedValues.last_name = transformedValues.lastName;
        delete transformedValues.lastName;
      }
      
      // Map bundesland to state for backend
      if (transformedValues.bundesland) {
        transformedValues.state = transformedValues.bundesland;
        delete transformedValues.bundesland;
      }
      
      // Capitalize status to match database enum (Active, Inactive, Pending, Suspended)
      if (transformedValues.status) {
        transformedValues.status = transformedValues.status.charAt(0).toUpperCase() + transformedValues.status.slice(1).toLowerCase();
      }
      
      // Remove read-only fields that shouldn't be sent to backend
      delete transformedValues.createdAt; // read-only field
      
      // Grade is display-only text - always delete it as it doesn't need to be sent
      // class_id is the actual field that should be sent to backend
      // Delete grade field since it's just display text
      delete transformedValues.grade;

      if (typeof apiObj.updatePath === "function") {
        console.log("🚀 Frontend sending to backend:", {
          ...transformedValues,
          plain_pass: transformedValues.plain_pass ? '***' : undefined
        });
        await api.put(apiObj.updatePath(id), transformedValues, { withCredentials: true });
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
      const path =
        typeof performancePath === "function" ? performancePath(id) : performancePath;
      const { data } = await api.get(path, {
        params: { range: perfRange },
        withCredentials: true,
      });
      const arr = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
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
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
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
        const { data } = await api.post(tasksCfg.createPath(id), payload, {
          withCredentials: true,
        });
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
        await api.patch(tasksCfg.updatePath(id, taskId), patch, {
          withCredentials: true,
        });
      }
      setTasks((prev) =>
        prev.map((t) => (String(t.id) === String(taskId) ? { ...t, ...patch } : t))
      );
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
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
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
        const { data } = await api.post(commCfg.createPath(id), payload, {
          withCredentials: true,
        });
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
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
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
        const created =
          data?.data ??
          data ??
          { ...meta, title: meta?.title || fileObj?.name, id: `d${id}-${Date.now()}` };
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
        await api.patch(docsCfg.updatePath(id, docId), payload, {
          withCredentials: true,
        });
      }
      setDocuments((prev) =>
        prev.map((d) => (String(d.id) === String(docId) ? { ...d, ...payload } : d))
      );
      messageApi.success("Document updated");
    } catch {
      messageApi.error("Failed to update document");
    }
  };

  const loadDocComments = useCallback(
    async (doc) => {
      if (!doc) return;
      const currentDocId = doc.id;
      docCommentLoadingId.current = currentDocId;
      try {
        let commentsList;
        if (typeof docsCfg?.commentListPath === "function") {
          const { data } = await api.get(docsCfg.commentListPath(id, currentDocId), {
            withCredentials: true,
          });
          commentsList = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];
        } else {
          commentsList = [];
        }
        if (docCommentLoadingId.current === currentDocId) {
          setDocCommentMap((prev) => {
            if (JSON.stringify(prev[currentDocId]) !== JSON.stringify(commentsList)) {
              return { ...prev, [currentDocId]: commentsList };
            }
            return prev;
          });
        }
      } catch (error) {
        const fallbackComments = [];
        if (docCommentLoadingId.current === currentDocId) {
          setDocCommentMap((prev) => ({ ...prev, [currentDocId]: fallbackComments }));
        }
      } finally {
        if (docCommentLoadingId.current === currentDocId) {
          docCommentLoadingId.current = null;
        }
      }
    },
    [id, docsCfg?.commentListPath]
  );

  const addDocComment = async (doc, payload) => {
    if (!doc) return;
    try {
      if (typeof docsCfg?.commentCreatePath === "function") {
        const { data } = await api.post(docsCfg.commentCreatePath(id, doc.id), payload, {
          withCredentials: true,
        });
        const created =
          data?.data ??
          data ??
          {
            ...payload,
            id: `dc-${doc.id}-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
        setDocCommentMap((m) => ({ ...m, [doc.id]: [created, ...(m[doc.id] || [])] }));
      }
      messageApi.success("Comment added");
    } catch {
      messageApi.error("Failed to add comment");
    }
  };

  // --- Effects: initial load + per-tab loaders ---
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === "information" && performancePath) {
      loadPerformance();
    }
  }, [activeTab, performancePath, loadPerformance]);

  useEffect(() => {
    if (
      (activeTab === "communication" || activeTab === "information") &&
      commCfg?.enabled
    ) {
      loadComments();
    }
  }, [activeTab, commCfg?.enabled, loadComments]);

  /* -------- actions -------- */
  const goBack = () => navigate(-1);
  const goEdit = () =>
    navigate(
      `${routeBase || location.pathname.replace(/\/[^/]+$/, "")}/${id}/edit`
    );
  const onDelete = () => {
    if (!removePath) {
      // console.log("❌ No removePath configured");
      return;
    }
    
    // console.log(`🗑️ Delete requested for ID: ${id}`);
    // console.log(`🗑️ removePath function: ${removePath}`);
    // console.log(`🗑️ removePath result: ${removePath(id)}`);
    // console.log(`🗑️ safeCfg.titleSingular: ${safeCfg.titleSingular}`);
    // console.log(`🗑️ entity:`, entity);
    
    modal.confirm({
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
          // console.log(`🗑️ Attempting to delete: ${removePath(id)}`);
          await api.delete(removePath(id), { withCredentials: true });
          // console.log(`✅ Successfully deleted: ${id}`);
          messageApi.success("Deleted");
          // Navigate to list and reload to refresh the data
          navigate(routeBase || "/");
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (error) {
          // console.error(`❌ Delete failed:`, error);
          // console.error(`❌ Error response:`, error?.response);
          messageApi.error("Failed to delete");
        }
      },
    });
  };
  const setStatus = async (next) => {
    if (!updateStatusPath) return;
    setSaving(true);
    try {
      await api.patch(
        updateStatusPath(id),
        { status: next },
        { withCredentials: true }
      );
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
  }, [
    safeCfg.tabs,
    apiObj.unlinkStudentPath,
    id,
    loadRelated,
    messageApi,
    navigate,
  ]);

  const handleTabChange = useCallback(
    (key) => {
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
        default:
          break;
      }
    },
    [
      safeCfg?.tabs?.related?.enabled,
      relatedListPath,
      performancePath,
      commCfg?.enabled,
      tasksCfg.enabled,
      docsCfg?.enabled,
      loadRelated,
      loadPerformance,
      loadComments,
      loadTasks,
      loadDocuments,
    ]
  );

  /* ---------- Cards/Tab Panels ---------- */
  const PerformanceCard = useMemo(() => {
    if (!performancePath) return null;

    return (
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
            <AreaChart
              data={performance}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
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
          <div className="p-3 text-gray-500">No performance data available.</div>
        ) : null}
      </Card>
    );
  }, [performancePath, perfRange, performance, perfLoading, loadPerformance]);

  const CommunicationPanel = useMemo(() => {
    if (!commCfg?.enabled) return null;

    return (
      <Card
        className="!rounded-xl"
        title="Comments / Notes"
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <List
            dataSource={comments}
            loading={commentsLoading}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No notes yet."
                />
              ),
            }}
            footer={<AddCommentForm onSubmit={addComment} />}
            renderItem={(item, idx) => (
              <div key={item.id || idx}>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium">
                        {dash(item.author)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {relativeTime(item.created_at)}{" "}
                        <span className="opacity-70">
                          ({fmtDate(item.created_at)}{" "}
                          {item.created_at
                            ? new Date(item.created_at)
                                .toTimeString()
                                .slice(0, 8)
                            : ""}
                          )
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-gray-400">
                      <PushpinOutlined />
                    </div>
                  </div>
                  {item.text ? (
                    <div className="mt-1 text-[14px]">
                      {typeof item.text === "string" ? item.text : dash(item.text)}
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-gray-200" />
              </div>
            )}
          />
        </div>
        <Modal
          title="Add Comment"
          open={addCommentOpen}
          onCancel={() => setAddCommentOpen(false)}
          footer={null}
          destroyOnHidden
        >
          <AddCommentForm
            onSubmit={async (vals) => {
              await addComment({ author: vals.author || "You", text: vals.text });
              setAddCommentOpen(false);
            }}
          />
        </Modal>
      </Card>
    );
  }, [commCfg?.enabled, comments, commentsLoading, addComment, addCommentOpen]);

  const informationTab = useMemo(() => {
    let portalLogin = entity?.username;

    if (!portalLogin) {
      const firstName = entity?.first_name || entity?.user?.first_name || "";
      const lastName = entity?.last_name || entity?.user?.last_name || "";
      const entityId = entity?.id || entity?.[idField];

      if (firstName && lastName && entityId) {
        const firstTwo = firstName.substring(0, 2).toLowerCase();
        const firstLetter = lastName.substring(0, 1).toLowerCase();
        portalLogin = `${firstTwo}${firstLetter}${entityId}`;
      }
    }

    const formInitialValues = {
      ...entity,
      username: portalLogin || "",
      plain_pass:
        entity?.plain_pass || "testpass1234",
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Information */}
        <div className="lg:col-span-2">
          <Card title="Main information" className="!rounded-xl">
            <Form
              form={infoForm}
              layout="horizontal"
              initialValues={formInitialValues}
              id={`entity-form-${id}-${Math.random().toString(36).substr(2, 9)}`}
              preserve={false}
              key={`form-${id}-${entity?.id || "loading"}`}
            >
              <div className="space-y-3">
                {editableInfoFields.map((field, index) => {
                  const isPassword = field.name?.toLowerCase().includes("password") || 
                                     field.name?.toLowerCase().includes("plain_pass") ||
                                     field.type === "password";
                  const isEmail = field.name?.toLowerCase().includes("email");
                  const isPhone = field.name?.toLowerCase().includes("phone");
                  const isStatus = field.name?.toLowerCase() === "status";
                  
                  // Create a more unique ID using the generator
                  const uniqueId = getUniqueId(field.name);

                  return (
                    <div
                      key={`${field.name}-${index}`}
                      className="flex items-center py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-40 text-right pr-6 shrink-0">
                        <Text strong className="text-gray-700 text-sm">
                          {field.label}
                        </Text>
                      </div>
                      <div className="flex-1">
                        <Form.Item
                          name={field.name}
                          className="!mb-0"
                          rules={
                            field.required
                              ? [
                                  {
                                    required: true,
                                    message: `${field.label} is required`,
                                  },
                                ]
                              : []
                          }
                        >
                          {isPassword ? (
                            <Input.Password
                              placeholder={field.label}
                              disabled={!field.editable}
                              className="max-w-md flex-1"
                              id={uniqueId}
                            />
                          ) : isEmail ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder={field.label}
                                disabled={!field.editable}
                                className="flex-1"
                                id={`input-${uniqueId}`}
                                value={entity?.[field.name] || ""}
                                onChange={(e) => handleInputChange(field.name, e)}
                              />
                              <Button
                                type="text"
                                icon={<span className="text-lg">✉</span>}
                                className="!p-2 !h-8 !w-8 border border-gray-300 rounded"
                              />
                            </div>
                          ) : isPhone ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder={field.label}
                                disabled={!field.editable}
                                className="flex-1"
                                id={`input-${uniqueId}`}
                              />
                              <Button
                                type="text"
                                icon={<span className="text-lg">📞</span>}
                                className="!p-2 !h-8 !w-8 border border-gray-300 rounded"
                              />
                            </div>
                          ) : isStatus ? (
                            <div className="flex items-center gap-2">
                              <Select
                                placeholder="Active"
                                value={(entity?.[field.name] || entity?.status || "Active").toLowerCase()}
                                options={
                                  field.options || [
                                    { value: "active", label: "Active" },
                                    { value: "suspended", label: "Suspended" },
                                  ]
                                }
                                disabled={!field.editable}
                                className="flex-1"
                                id={`select-${uniqueId}`}
                                onChange={(value) => handleFieldChange(field.name, value)}
                              />
                              <Button
                                type="text"
                                icon={<span className="text-lg">📅</span>}
                                className="!p-2 !h-8 !w-8 border border-gray-300 rounded"
                              />
                            </div>
                          ) : field.type === "grade" ? (
                            <Select
                              placeholder={`Select ${field.label}`}
                              options={classes || []}
                              disabled={!field.editable}
                              className="w-full"
                              id={`select-${uniqueId}`}
                              loading={loadingDropdowns}
                              showSearch
                              optionFilterProp="label"
                              value={entity?.class_id}
                              onChange={(value) => {
                                // Only update class_id, not the grade display field
                                handleFieldChange("class_id", value);
                              }}
                              filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                            />
                          ) : field.type === "state" ? (
                            <Select
                              placeholder={`Select ${field.label}`}
                              options={states || []}
                              disabled={!field.editable}
                              className="w-full"
                              id={`select-${uniqueId}`}
                              loading={loadingDropdowns}
                              showSearch
                              optionFilterProp="label"
                              value={entity?.[field.name]}
                              onChange={(value) => handleFieldChange(field.name, value)}
                              filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                            />
                          ) : field.type === "select" ? (
                            <Select
                              placeholder={`Select ${field.label}`}
                              options={field.options || []}
                              disabled={!field.editable}
                              className="w-full"
                              id={`select-${uniqueId}`}
                            />
                          ) : field.type === "date" ? (
                            <DatePicker
                              className="w-full"
                              disabled={!field.editable}
                              id={`date-${uniqueId}`}
                            />
                          ) : (
                            <Input
                              placeholder={field.label}
                              disabled={!field.editable}
                              className="w-full"
                              id={`input-${field.name}-${id}-${Math.random()
                                .toString(36)
                                .substr(2, 9)}`}
                              value={entity?.[field.name] || ""}
                              onChange={(e) => handleInputChange(field.name, e)}
                            />
                          )}
                        </Form.Item>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Form>
          </Card>
        </div>

        {/* Right Column - Comments and Additional Info */}
        <div className="space-y-4">
          {/* Comments / To-Dos Section */}
          <Card
            title="Comments / To-Dos"
            className="!rounded-xl"
            extra={
              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={() => setAddCommentOpen(true)}
                className="!p-1"
              />
            }
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {commCfg?.enabled && comments && comments.length > 0 ? (
                <List
                  dataSource={comments}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No comments yet."
                      />
                    ),
                  }}
                  renderItem={(item, idx) => (
                    <div key={item.id || idx}>
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-800">
                              {dash(item.author)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {relativeTime(item.created_at)} ({fmtDate(item.created_at)}{" "}
                              {item.created_at
                                ? new Date(item.created_at)
                                    .toTimeString()
                                    .slice(0, 5)
                                : ""}
                              )
                            </div>
                            {item.text ? (
                              <div className="mt-2 text-sm text-gray-700">
                                {typeof item.text === "string"
                                  ? item.text
                                  : dash(item.text)}
                              </div>
                            ) : null}
                          </div>
                          <Button
                            type="text"
                            icon={<PushpinOutlined className="text-gray-400" />}
                            size="small"
                          />
                        </div>
                      </div>
                      {idx < comments.length - 1 && (
                        <Divider className="!my-0" />
                      )}
                    </div>
                  )}
                />
              ) : (
                <div className="p-4 text-center text-gray-400">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No comments yet"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Additional Information Section */}
          <Card
            title="Additional information"
            className="!rounded-xl"
            styles={{ body: { padding: 16 } }}
          >
            <div className="space-y-3">
              <div>
                <Text type="secondary" className="text-xs">
                  Labels
                </Text>
                <Input placeholder="Start typing label name" className="mt-1" />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  Category
                </Text>
                <Select
                  placeholder="Select category"
                  options={[
                    { value: "individual", label: "Individual" },
                    { value: "business", label: "Business" },
                    { value: "enterprise", label: "Enterprise" },
                  ]}
                  className="w-full mt-1"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }, [
    entity,
    editableInfoFields,
    infoForm,
    commCfg?.enabled,
    comments,
    addCommentOpen,
    passwordVisible,
    generatePassword,
    states,
    classes,
    loadingDropdowns,
  ]);

  const relatedTab = useMemo(() => {
    if (!safeCfg?.tabs?.related?.enabled) return null;

    const showAddBtn = safeCfg.tabs.related.showAddButton !== false;
    const addButtonLabel = safeCfg.tabs.related.addButtonLabel || "Add Student";
    const buttons = [];

    if (showAddBtn) {
      buttons.push(
        <Button
          key="add-related"
          icon={<PlusOutlined />}
          onClick={() => setLinkChildModalOpen(true)}
          disabled={false}
        >
          {addButtonLabel}
        </Button>
      );
    }

    buttons.push(<Button key="reload" icon={<ReloadOutlined />} onClick={loadRelated} />);

    return (
      <Card className="!rounded-xl" styles={{ body: { padding: 0 } }}>
        <div className="p-3 flex items-center justify-between">
          <Text strong>{safeCfg.tabs.related.label || "Related"}</Text>
          <Space>{buttons}</Space>
        </div>
        <div className="px-3 pb-3">
          <Table
            rowKey={safeCfg.tabs?.related?.rowKey || ((r) => r.id ?? r.name)}
            loading={relatedLoading}
            columns={relatedColumns}
            dataSource={relatedRows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Nothing related."
                />
              ),
            }}
          />
        </div>
      </Card>
    );
  }, [
    safeCfg?.tabs?.related?.enabled,
    safeCfg?.tabs?.related?.showAddButton,
    safeCfg?.tabs?.related?.addButtonLabel,
    safeCfg?.tabs?.related?.label,
    safeCfg?.tabs?.related?.rowKey,
    relatedLoading,
    relatedColumns,
    relatedRows,
    loadRelated,
  ]);

  const TasksTab = useMemo(() => {
    if (!tasksCfg.enabled) return null;

    return (
      <Card className="!rounded-xl" styles={{ body: { padding: 16 } }}>
        <AddTaskForm onSubmit={createTask} id={id} />
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
                <Tag color={s === "open" ? "orange" : s === "in_progress" ? "blue" : "green"}>
                  {s}
                </Tag>
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
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks." />
            ),
          }}
        />
      </Card>
    );
  }, [tasksCfg.enabled, createTask, tasksLoading, tasks, updateTask, deleteTask]);

  const docTypeOptions = useMemo(() => {
    if (!docsCfg?.enabled) return [];
    const base = ["All"];
    const provided = docsCfg?.typeOptions || [];
    if (provided.length) return ["All", ...provided];
    const set = new Set(documents.map((d) => d?.type || d?.status || "Uploaded"));
    return ["All", ...Array.from(set)];
  }, [docsCfg?.enabled, documents, docsCfg?.typeOptions]);

  const filteredDocs = useMemo(() => {
    if (!docsCfg?.enabled) return [];
    const q = docSearch.trim().toLowerCase();
    return (documents || []).filter((d) => {
      const matchesType =
        docType === "All" || (d?.type || d?.status || "Uploaded") === docType;
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
  }, [docsCfg?.enabled, documents, docSearch, docType]);

  const docColumns = useMemo(() => {
    if (!docsCfg?.enabled) return [];
    return [
      {
        title: "Added (updated) by",
        dataIndex: "added_by",
        render: (v, r) => r.updated_by || r.added_by || "Administrator",
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (v) => <Tag>{v || "Uploaded"}</Tag>,
        filters: Array.from(
          new Set(documents.map((d) => d.status || "Uploaded"))
        ).map((v) => ({
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
  }, [docsCfg?.enabled, documents, deleteDocument]);

  const DocumentsTab = useMemo(() => {
    if (!docsCfg?.enabled) return null;

    return (
      <Card className="!rounded-xl" styles={{ body: { padding: 16 } }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Space size={8} className="mr-2">
            <span className="text-gray-500">Show</span>
            <Select
              value={String(docPageSize)}
              onChange={(v) => setDocPageSize(Number(v))}
              options={["10", "25", "50", "100"].map((n) => ({
                value: n,
                label: n,
              }))}
              style={{ width: 160 }}
              className="w-24"
            />
            <span className="text-gray-500">entries</span>
          </Space>

          <div className="ml-auto flex items-center gap-2">
            <Select
              value={docType}
              onChange={setDocType}
              options={docTypeOptions.map((t) => ({ value: t, label: t }))}
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
          columns={docColumns}
          dataSource={filteredDocs}
          pagination={{
            pageSize: docPageSize,
            showSizeChanger: false,
            showTotal: (total, [start, end]) =>
              `Showing ${start} to ${end} of ${total} entries`,
          }}
          scroll={{ x: 960 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No documents."
              />
            ),
          }}
        />

        {/* Upload Modal */}
        <Modal
          title="Upload Document"
          open={docUploadOpen}
          onCancel={() => setDocUploadOpen(false)}
          footer={null}
          destroyOnHidden
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
          title={
            docEditing
              ? `Edit — ${docEditing.title || docEditing.id}`
              : "Edit Document"
          }
          open={docEditOpen}
          onCancel={() => {
            setDocEditOpen(false);
            setDocEditing(null);
          }}
          footer={null}
          destroyOnHidden
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
  }, [
    docsCfg?.enabled,
    docPageSize,
    docType,
    docTypeOptions,
    docSearch,
    docsLoading,
    docColumns,
    filteredDocs,
    loadDocuments,
    docUploadOpen,
    uploadDocument,
    docEditOpen,
    docEditing,
    updateDocument,
  ]);

  const billingTab = useMemo(() => {
    if (!safeCfg.tabs?.billing?.enabled) return null;

    return typeof safeCfg.tabs.billing.render === "function" ? (
      safeCfg.tabs.billing.render({ entity }, tabContext)
    ) : (
      <Card className="!rounded-xl">
        <Text type="secondary">
          Billing tab is enabled but no renderer was provided.
        </Text>
      </Card>
    );
  }, [safeCfg.tabs?.billing?.enabled, safeCfg.tabs?.billing?.render, entity, tabContext]);

  const auditTab = useMemo(() => {
    if (!safeCfg.tabs?.audit?.enabled) return null;

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
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No audit events."
                />
              ),
            }}
          />
        </div>
      </Card>
    );
  }, [
    safeCfg.tabs?.audit?.enabled,
    safeCfg.tabs?.audit?.label,
    safeCfg.tabs?.audit?.columns,
    safeCfg.tabs?.audit?.data,
  ]);

  /* ---------- NEW: custom tab plumbing (subjects, etc.) ---------- */
  const BUILTIN_KEYS = [
    "information",
    "related",
    "billing",
    "audit",
    "tasks",
    "documents",
    "communication",
    "activity",
  ];

  const customTabKeys = useMemo(() => {
    try {
      const t = safeCfg.tabs || {};
      const keys = Object.keys(t)
        .filter((k) => !BUILTIN_KEYS.includes(k))
        .filter((k) => t[k]?.enabled && typeof t[k]?.render === "function");
      console.log("customTabKeys computed:", keys);
      return keys;
    } catch (error) {
      console.error("Error computing customTabKeys:", error);
      return [];
    }
  }, [safeCfg.tabs]);

  const explicitOrder = useMemo(() => {
    try {
      const order1 = Array.isArray(safeCfg.tabsOrder) ? safeCfg.tabsOrder : null;
      const order2 = Array.isArray(safeCfg.tabs?.order) ? safeCfg.tabs.order : null;
      const base = order1 || order2;
      if (Array.isArray(base) && base.length > 0) {
        console.log("explicitOrder using base:", base);
        return base;
      }
      
      // Safety check for customTabKeys
      const safeCustomKeys = Array.isArray(customTabKeys) ? customTabKeys : [];
      console.log("explicitOrder custom keys:", safeCustomKeys);
      
      const result = [
        "information",
        "related",
        ...safeCustomKeys,
        "activity",
        "tasks",
        "documents",
        "communication",
        "billing",
        "audit",
      ];
      console.log("explicitOrder result:", result);
      return result;
    } catch (error) {
      console.error("Error computing explicitOrder:", error);
      return ["information", "related"];
    }
  }, [safeCfg.tabsOrder, safeCfg.tabs, customTabKeys]);

  const ActivityTab = useMemo(() => {
    if (!safeCfg.tabs?.activity?.enabled) return null;

    return (
      <Card className="!rounded-xl" styles={{ body: { padding: 0 } }}>
        <div className="p-3 flex items-center justify-between">
          <Text strong>{safeCfg.tabs.activity.label || "Activity"}</Text>
          <Space>
            {typeof safeCfg.tabs.activity.toolbar === "function"
              ? safeCfg.tabs.activity.toolbar(entity)
              : null}
            <Button icon={<ReloadOutlined />} onClick={() => {}} />
          </Space>
        </div>
        <div className="px-3 pb-3">
          <Table
            columns={safeCfg.tabs.activity.columns || []}
            dataSource={safeCfg.tabs.activity.data || []}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={safeCfg.tabs.activity.empty || "No activity."}
                />
              ),
            }}
          />
        </div>
      </Card>
    );
  }, [
    safeCfg.tabs?.activity?.enabled,
    safeCfg.tabs?.activity?.label,
    safeCfg.tabs?.activity?.toolbar,
    safeCfg.tabs?.activity?.columns,
    safeCfg.tabs?.activity?.data,
    safeCfg.tabs?.activity?.empty,
    entity,
  ]);

  const customTabPanels = useMemo(() => {
    const panels = {};
    (customTabKeys || []).forEach((key) => {
      const cfgTab = safeCfg.tabs[key];
      if (cfgTab?.render) {
        panels[key] = (
          <Card key={key} className="!rounded-xl" styles={{ body: { padding: 16 } }}>
            {cfgTab.render(entity || {}, tabContext)}
          </Card>
        );
      }
    });
    return panels;
  }, [customTabKeys, safeCfg.tabs, entity, tabContext]);

  const panelByKey = useMemo(() => {
    const map = {
      information: informationTab,
      related: relatedTab,
      billing: billingTab,
      audit: auditTab,
      tasks: tasksCfg.enabled ? TasksTab : null,
      documents: docsCfg?.enabled ? DocumentsTab : null,
      communication: commCfg?.enabled ? CommunicationPanel : null,
      activity: ActivityTab,
    };
    
    // Safety check for customTabPanels
    if (customTabPanels && typeof customTabPanels === 'object') {
      Object.keys(customTabPanels).forEach((key) => {
        map[key] = customTabPanels[key];
      });
    }
    
    return map;
  }, [
    informationTab,
    relatedTab,
    billingTab,
    auditTab,
    TasksTab,
    DocumentsTab,
    CommunicationPanel,
    ActivityTab,
    customTabPanels,
    tasksCfg.enabled,
    docsCfg?.enabled,
    commCfg?.enabled,
  ]);

  const tabItems = useMemo(() => {
    try {
      const items = [];
      const seenKeys = new Set();

      // Safety check for explicitOrder
      const safeOrder = Array.isArray(explicitOrder) ? explicitOrder : [];
      console.log("tabItems - processing order:", safeOrder);
      
      safeOrder.forEach((key) => {
        const panel = panelByKey[key];
        if (!panel || seenKeys.has(key)) return;

        seenKeys.add(key);
        const label =
          safeCfg.tabs?.[key]?.label ||
          (key.charAt(0).toUpperCase() + key.slice(1));

        items.push({
          key,
          label,
          children: <div key={`tab-content-${key}`}>{panel}</div>,
          forceRender: true,
        });
      });

      if (!seenKeys.has("information")) {
        items.unshift({
          key: "information",
          label: "Information",
          children: <div key="tab-content-information">{informationTab}</div>,
          forceRender: true,
        });
      }

      console.log("tabItems generated:", items.map(i => i.key));
      return items;
    } catch (error) {
      console.error("Error generating tabItems:", error);
      return [{
        key: "information",
        label: "Information",
        children: <div>Error loading tabs. Please refresh the page.</div>,
        forceRender: true,
      }];
    }
  }, [explicitOrder, panelByKey, safeCfg.tabs, informationTab]);

  /* ---------- Login as customer handler (SSO; Student/Parent/Teacher) ---------- */
  const handleLoginAsCustomer = useCallback(async () => {
    const portalUrl =
      currentEntityType === "students"
        ? "/student/home"
        : currentEntityType === "parents"
        ? "/parent/home"
        : currentEntityType === "teachers"
        ? "/teacher/home"
        : "/dashboard";

    const ssoUrl = "/sso";
    const ssoWin = window.open(ssoUrl, "_blank");
    if (!ssoWin) {
      messageApi.error("Popup blocked. Please allow popups for this site.");
      return;
    }

    try {
      setSaving(true);

      let username = entity?.username;
      if (!username) {
        const firstName = entity?.first_name || entity?.user?.first_name || "";
        const lastName = entity?.last_name || entity?.user?.last_name || "";
        const entityId = entity?.id || entity?.[idField];
        const firstTwo = firstName.substring(0, 2).toLowerCase();
        const firstOne = lastName.substring(0, 1).toLowerCase();
        username = `${firstTwo}${firstOne}${entityId}`;
      }
      const password =
        entity?.plain_pass || entity?.password || "testpass1234";

      if (!username || !password) {
        try {
          ssoWin.close();
        } catch {}
        messageApi.error("Missing portal credentials for this user.");
        return;
      }

      const { data } = await api.post(
        "/auth/login",
        { username, password },
        { withCredentials: true }
      );
      const token = data?.token;
      if (!token) {
        try {
          ssoWin.close();
        } catch {}
        messageApi.error("Login failed: no token returned.");
        return;
      }

      const ORIGIN = window.location.origin;
      const payload = {
        type: "KIBUNDO_SSO",
        token,
        user: data?.user || null,
        storageKey: "kibundo.portal.token",
        redirect: portalUrl,
      };

      // Try to postMessage a few times while the new tab loads
      let tries = 0;
      const maxTries = 20;
      const iv = setInterval(() => {
        if (ssoWin.closed) {
          clearInterval(iv);
          return;
        }
        try {
          ssoWin.postMessage(payload, ORIGIN);
          tries++;
          if (tries >= maxTries) clearInterval(iv);
        } catch {
          tries++;
          if (tries >= maxTries) clearInterval(iv);
        }
      }, 200);

      // Hash fallback: /sso reads token & redirects
      const encodedToken = encodeURIComponent(token);
      const encodedRedir = encodeURIComponent(portalUrl);
      ssoWin.location.replace(`${ssoUrl}#token=${encodedToken}&redirect=${encodedRedir}`);

      const who =
        currentEntityType === "students"
          ? "student"
          : currentEntityType === "parents"
          ? "parent"
          : currentEntityType === "teachers"
          ? "teacher"
          : "user";
      messageApi.success(`Opened ${who} portal for (${username})`);
    } catch (error) {
      // console.error("SSO error:", error);
      try {
        ssoWin.close();
      } catch {}
      messageApi.error(error?.response?.data?.message || "Failed to open portal");
    } finally {
      setSaving(false);
    }
  }, [entity, idField, messageApi, currentEntityType]);

  /* ---------- Render ---------- */
  const actionsMenu = useMemo(() => {
    return {
      items: [
        ...(updateStatusPath
          ? [
              { key: "activate", label: "Activate" },
              { key: "suspend", label: "Suspend", danger: true },
            ]
          : []),
        ...(updateStatusPath && removePath ? [{ type: "divider" }] : []),
        ...(removePath ? [{ key: "delete", label: "Delete", danger: true }] : []),
      ],
      onClick: async ({ key }) => {
        if (key === "activate") return setStatus("active");
        if (key === "suspend") return setStatus("suspended");
        if (key === "delete" && removePath) return onDelete();
      },
    };
  }, [
    updateStatusPath,
    removePath,
    setStatus,
    onDelete,
    currentEntityType,
  ]);

  if (loading && !entity) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-3 md:px-4 py-4">
      {ctx}

      {/* Breadcrumb & Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="hover:text-blue-600 cursor-pointer">
            {safeCfg.titlePlural || "Items"}
          </span>
          <span>/</span>
          <span className="hover:text-blue-600 cursor-pointer" onClick={goBack}>
            List
          </span>
          <span>/</span>
        </div>
        <div className="flex items-center gap-3">
          {safeCfg?.ui?.showAvatar !== false ? (
            <Avatar
              size={screens.md ? 56 : 48}
              style={{ backgroundColor: "#1677ff", fontWeight: 600 }}
            >
              {getInitials(entity) || "•"}
            </Avatar>
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold m-0">
              {titleName} (
              {entity?.login ||
                entity?.username ||
                `${safeCfg.entityKey || "ID"} - ${entity?.[idField]}`}
              )
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button icon={<ArrowLeftOutlined />} onClick={goBack} />
            <Button icon={<span>→</span>} />
          </div>
        </div>
      </div>

      {/* Entity Summary Bar */}
      <Card className="!rounded-xl mb-4" styles={{ body: { padding: "16px 24px" } }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Text strong className="text-base">
              {currentEntityType === "students"
                ? "Student"
                : currentEntityType === "parents"
                ? "Parent"
                : currentEntityType === "teachers"
                ? "Teacher"
                : "Entity"}
            </Text>
            
            
            {entity?.balance !== undefined && (
              <>
                <Text type="secondary" className="mx-2">|</Text>
                <Text type="secondary">
                  Account balance:{" "}
                  <Text
                    strong
                    className={entity.balance < 0 ? "text-red-600" : ""}
                  >
                    {entity.balance}
                  </Text>
                </Text>
              </>
            )}
          </div>
          <Space wrap>
            {/* Custom Actions */}
            {safeCfg.customActions && safeCfg.customActions(entity)}
            {/* Extra Header Buttons (from prop) */}
            {extraHeaderButtons && typeof extraHeaderButtons === 'function' && extraHeaderButtons(entity)}
            <Dropdown menu={actionsMenu} trigger={["click"]}>
              <Button>
                Actions <span className="ml-1">▼</span>
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: "create-task", label: "Create new task" },
                  { key: "list-tasks", label: "List of tasks" },
                ],
              }}
              trigger={["click"]}
            >
              <Button>
                Tasks <span className="ml-1">▼</span>
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: "create-ticket", label: "Create ticket" },
                  { key: "list-tickets", label: "List of tickets" },
                ],
              }}
              trigger={["click"]}
            >
              <Button>
                Tickets <span className="ml-1">▼</span>
              </Button>
            </Dropdown>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveInfo}>
              Save
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        {tabItems && tabItems.length > 0 && (
          <Tabs
            key={`tabs-${entityKey}-${id}`}
            size="large"
            tabBarGutter={32}
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            animated={false}
            className="[&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-nav]:px-6 [&_.ant-tabs-nav]:pt-4 [&_.ant-tabs-content-holder]:p-6 [&_.ant-tabs-tab]:!text-base [&_.ant-tabs-tab]:!font-normal [&_.ant-tabs-tab-active]:!font-semibold"
          />
        )}
      </div>

      {/* Modal to Add Related (Student/Class/etc) */}
      <Modal
        open={linkChildModalOpen}
        onCancel={() => setLinkChildModalOpen(false)}
        footer={null}
        width={800}
        destroyOnHidden
        title={safeCfg.tabs?.related?.addModalTitle || "Add"}
      >
        {safeCfg.tabs?.related?.renderAddModal ? (
          safeCfg.tabs.related.renderAddModal({
            entity,
            id,
            onClose: () => setLinkChildModalOpen(false),
            onSuccess: async () => {
              setLinkChildModalOpen(false);
              await loadRelated();
            },
            messageApi,
          })
        ) : (
          <StudentForm
            isModal
            initialValues={{
              parent_id: id,
              parent_name: entity?.name || `Parent #${id}`,
            }}
            onSuccess={async () => {
              try {
                messageApi.success("Student created successfully!");
                setLinkChildModalOpen(false);
                // Reload the related data
                await loadRelated();
              } catch (err) {
                messageApi.error(
                  err?.response?.data?.message || "Failed to create student."
                );
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ---------- Small Forms (tasks / Comments / Document Upload) ---------- */

function AddTaskForm({ onSubmit, id }) {
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
      <Form.Item
        name="title"
        rules={[{ required: true, message: "Enter task title" }]}
        style={{ minWidth: 220 }}
      >
        <Input
          placeholder="Task title"
          id={`title-${id}-${Math.random().toString(36).substr(2, 9)}`}
        />
      </Form.Item>
      <Form.Item name="priority" initialValue="medium">
        <Select
          style={{ width: 120 }}
          id={`priority-${id}-${Math.random().toString(36).substr(2, 9)}`}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </Form.Item>
      <Form.Item name="dueDate">
        <DatePicker
          placeholder="Due date"
          id={`dueDate-${id}-${Math.random().toString(36).substr(2, 9)}`}
        />
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
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Files are kept in-memory unless you provide an API path.
            </p>
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
      <Form.Item
        label="Title"
        name="title"
        rules={[{ required: true, message: "Title is required" }]}
      >
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
