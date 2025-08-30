// Uses the required backend routes you posted (no REST refactor)
// import path unchanged
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card, Typography, Input, Select, Tag, Table, Button, Space,
  Modal, Dropdown, Tabs, Tooltip, Breadcrumb, Checkbox, Divider
} from "antd";
import {
  PlusOutlined, ReloadOutlined, DownOutlined, SearchOutlined,
  SettingOutlined, ColumnHeightOutlined, MoreOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

const { Title, Text } = Typography;

/* ---------- helpers ---------- */
const dash = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = (typeof d === "string" || typeof d === "number") ? new Date(d) : d;
  if (!dt || isNaN(dt)) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
const statusChip = (s) => (
  <Tag color={s === "active" ? "green" : s === "suspended" ? "orange" : "red"} className="!m-0 !px-3 !py-[2px] !rounded">
    {s === "active" ? "Active" : s === "disabled" ? "Blocked" : s ? "Suspended" : "-"}
  </Tag>
);
const getByPath = (obj, path) => {
  if (!obj) return undefined;
  if (Array.isArray(path)) return path.reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  if (typeof path === "string" && path.includes(".")) {
    return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }
  return typeof path === "string" ? obj[path] : undefined;
};

/* ---------- Required routes map (matches your Express file) ---------- */
const REQUIRED_LIST_PATHS = {
  students: "/allstudents",
  teachers: "/allteachers",
  parents: "/parents",
  subjects: "/allsubjects",
  products: "/products",
  subscriptions: "/subscriptions",
  blogposts: "/blogposts",     // public in your router
  invoices: "/invoices",
  classes: "/allclasses",
};

// Only resources that HAVE delete endpoints in your router:
const REQUIRED_REMOVE_PATH = {
  parents: (id) => `/parent/${id}`,
  subjects: (id) => `/subject/${id}`,
  products: (id) => `/product/${id}`,
  subscriptions: (id) => `/subscription/${id}`,
  blogposts: (id) => `/blogpost/${id}`,
  invoices: (id) => `/invoice/${id}`,
  // NOTE: students, teachers, classes do NOT have delete routes in your list
};

/**
 * cfg = {
 *  entityKey: "parents"|"students"|"teachers"|"subjects"|"products"|"subscriptions"|"blogposts"|"invoices"|"classes",
 *  titleSingular?: "Parent",
 *  titlePlural: "Parents",
 *  routeBase: "/admin/parents" (frontend route base for view/edit),
 *  idField: "id",
 *  api: {
 *    listPath?,          // optional override; defaults to REQUIRED_LIST_PATHS[entityKey]
 *    removePath?(id)?,   // optional override; defaults to REQUIRED_REMOVE_PATH[entityKey]
 *    updateStatusPath?(id)?, // optional; your backend doesn’t expose this by default
 *    parseList?(raw)
 *  },
 *  statusFilter: true|false,
 *  billingFilter: true|false,
 *  columnsMap: (navigate, helpers)=> ({ key -> antd column (optional: csv(row)) }),
 *  defaultVisible: [keys],
 *  rowClassName?: (row)=>string,
 *  rowActions?: { extraItems?: [], onClick?: (key,row,ctx)=>void }
 * }
 */
export default function EntityList({ cfg }) {
  const {
    entityKey,
    titlePlural,
    titleSingular,
    routeBase,
    idField = "id",
    api: apiCfg = {},
    statusFilter = true,
    billingFilter = false,
    columnsMap,
    defaultVisible,
    rowClassName,
  } = cfg;

  // Lock to your required endpoints by default
  const listPath = apiCfg.listPath || REQUIRED_LIST_PATHS[entityKey] || `/${entityKey}`;
  const removePathBuilder = apiCfg.removePath || REQUIRED_REMOVE_PATH[entityKey] || null;

  const navigate = useNavigate();

  /* --------- persistence keys --------- */
  const COLS_LS_KEY = `${entityKey}.visibleCols.v1`;
  const PAGE_SIZE_LS_KEY = `${entityKey}.pageSize.v1`;
  const BILLING_FILTER_LS_KEY = `${entityKey}.billingFilter.v1`;

  const readCols = () => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      const parsed = JSON.parse(raw || "null");
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return (defaultVisible || []).slice();
  };
  const readPageSize = () => {
    try {
      const v = parseInt(localStorage.getItem(PAGE_SIZE_LS_KEY) || "", 10);
      return [10, 25, 50, 100].includes(v) ? v : 100;
    } catch {
      return 100;
    }
  };
  const readBillingFilter = () => {
    if (!billingFilter) return null;
    try {
      const v = localStorage.getItem(BILLING_FILTER_LS_KEY);
      return v === "monthly" || v === "annually" ? v : null;
    } catch {
      return null;
    }
  };

  /* --------- state --------- */
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("All");
  const [typedQ, setTypedQ] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pageSize, setPageSize] = useState(readPageSize);

  const [visibleCols, setVisibleCols] = useState(readCols);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [billing, setBilling] = useState(readBillingFilter);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => setQ(typedQ), 300);
    return () => clearTimeout(t);
  }, [typedQ]);

  /* persist */
  useEffect(() => {
    try {
      const uniq = Array.from(new Set(visibleCols));
      localStorage.setItem(COLS_LS_KEY, JSON.stringify(uniq));
    } catch {}
  }, [visibleCols]);

  const onChangePageSize = (n) => {
    setPageSize(n);
    try {
      localStorage.setItem(PAGE_SIZE_LS_KEY, String(n));
    } catch {}
  };

  useEffect(() => {
    if (!billingFilter) return;
    try {
      if (billing) localStorage.setItem(BILLING_FILTER_LS_KEY, billing);
      else localStorage.removeItem(BILLING_FILTER_LS_KEY);
    } catch {}
  }, [billing, billingFilter]);

  /* loader */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveStatus = tab === "active" ? "active" : status;

      // Your current backend doesn't document q/status/billing params,
      // but keeping them as benign query params (backend can ignore).
      const { data } = await api.get(listPath, {
        params: {
          q,
          status: statusFilter && effectiveStatus !== "All" ? effectiveStatus : undefined,
          billingStatus: billingFilter ? billing || undefined : undefined,
          pageSize: 1000,
          sort: "createdAt:desc",
        },
        withCredentials: true,
      });

      const rawList = data?.data ?? data;
      const list = typeof apiCfg.parseList === "function"
        ? (apiCfg.parseList(rawList) || [])
        : (Array.isArray(rawList) ? rawList : []);
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, tab, billing, listPath, statusFilter, billingFilter, apiCfg]);

  useEffect(() => {
    load();
  }, [load]);

  const resetAll = () => {
    setTypedQ("");
    setQ("");
    setStatus("All");
    setSelectedRowKeys([]);
    onChangePageSize(100);
    setTab("all");
    setBilling(null);
    load();
  };

  /* columns */
  let ALL_COLUMNS_MAP = {};
  try {
    ALL_COLUMNS_MAP = columnsMap(navigate, { dash, fmtDate, statusChip, getByPath }) || {};
  } catch {
    ALL_COLUMNS_MAP = {};
  }

  // Use the routeBase from props
  const goToDetail = (rid) => navigate(`${routeBase}/${rid}`);
  const goToEdit   = (rid) => navigate(`${routeBase}/${rid}/edit`);

  let columns = [...visibleCols.map((k) => ALL_COLUMNS_MAP[k]).filter(Boolean)];
  if (!columns.length) {
    columns = [{ title: "—", key: "__placeholder__", render: () => "-" }];
  }

  // Actions column (delete only where allowed by your API list)
  const canDelete = Boolean(removePathBuilder);
  columns.push({
    title: "",
    key: "actions",
    width: 64,
    fixed: "right",
    render: (_, r) => (
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "view", label: "View" },
            { key: "edit", label: "Edit" },
            ...(canDelete ? [{ key: "delete", label: "Delete", danger: true }] : []),
            ...(cfg.rowActions?.extraItems || []),
          ],
          onClick: async ({ key, domEvent }) => {
            if (domEvent) domEvent.stopPropagation();
            if (key === "view") return goToDetail(r[idField]);
            if (key === "edit") return goToEdit(r[idField]);

            if (key === "delete" && canDelete) {
              Modal.confirm({
                title: `Delete ${cfg.titleSingular || titleSingular || "record"}?`,
                content: (
                  <>
                    Are you sure you want to delete{" "}
                    <strong>{dash(r?.name) !== "-" ? r?.name : `#${dash(r?.[idField])}`}</strong>?
                  </>
                ),
                okText: "Delete",
                okButtonProps: { danger: true },
                cancelText: "Cancel",
                onOk: async () => {
                  try {
                    await api.delete(removePathBuilder(r[idField]), { withCredentials: true });
                    load();
                  } catch { /* silent */ }
                },
              });
            }
          },
        }}
      >
        <Button icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
      </Dropdown>
    ),
  });

  /* bulk actions (status updates are optional; your API doesn't expose them by default) */
  const bulkMenu = {
    items: [
      ...(statusFilter
        ? [
            { key: "reactivate", label: "Set status: Active" },
            { key: "suspend", label: "Set status: Suspended" },
            { key: "disable", label: "Set status: Blocked" },
            { type: "divider" },
          ]
        : []),
      { key: "export_all", label: "Export current table to CSV" },
      { type: "divider" },
      { key: "reset", label: "Reset filters" },
    ],
    onClick: async ({ key }) => {
      if (key === "export_all") {
        const visible = columns.filter(Boolean).filter((c) => c.key !== "actions");
        const cellValue = (c, r) => {
          try { if (typeof c.csv === "function") return c.csv(r); } catch {}
          const di = c.dataIndex;
          let raw;
          if (Array.isArray(di) || typeof di === "string") raw = getByPath(r, di);
          else if (c.key && r && Object.prototype.hasOwnProperty.call(r, c.key)) raw = r[c.key];
          if (raw == null) return "-";
          if (typeof raw === "object") { try { return JSON.stringify(raw); } catch { return "-"; } }
          return String(raw);
        };
        const header = visible.length ? visible.map((c) => c.title || c.key) : ["-"];
        const safeRows = rows.length ? rows : [{}];
        const lines = safeRows.map((r) =>
          (visible.length ? visible : [{ key: "__placeholder__" }]).map((c) => dash(cellValue(c, r)))
        );
        const esc = (v) => `"${String(v ?? "-").replace(/"/g, '""')}"`;
        const csv = [header, ...lines].map((row) => row.map(esc).join(",")).join("\n") + "\n";
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${entityKey}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (key === "reset") return resetAll();

      // status updates only if cfg provides an updateStatusPath
      if (!selectedRowKeys.length || !apiCfg.updateStatusPath) return;
      const newStatus = key === "reactivate" ? "active" : key === "suspend" ? "suspended" : "disabled";
      try {
        await Promise.all(
          selectedRowKeys.map((id) => api.patch(apiCfg.updateStatusPath(id), { status: newStatus }, { withCredentials: true }))
        );
        setSelectedRowKeys([]);
        load();
      } catch {}
    },
  };

  const statusSelect = (
    <div className="hidden sm:flex items-center gap-2">
      <Text type="secondary">Status</Text>
      <Select
        value={status}
        onChange={setStatus}
        options={[
          { value: "All", label: "All selected" },
          { value: "active", label: "Active" },
          { value: "suspended", label: "Suspended" },
          { value: "disabled", label: "Blocked" },
        ]}
        style={{ width: 160 }}
      />
    </div>
  );

  const effectiveRows = useMemo(() => {
    if (!billingFilter || !billing) return rows;
    const norm = String(billing).toLowerCase();
    return rows.filter((r) =>
      String(r?.billingStatus || r?.activePlan?.interval || "").toLowerCase() === norm
    );
  }, [rows, billing, billingFilter]);

  // highlight by status
  const defaultRowHighlight = (r) => {
    const s = String(r?.status || "").toLowerCase();
    return s === "active"
      ? "row-status-active"
      : s === "suspended"
      ? "row-status-suspended"
      : s === "disabled"
      ? "row-status-disabled"
      : "";
  };

  const appliedRowClassName = (r) => {
    const custom = typeof rowClassName === "function" ? rowClassName(r) : (rowClassName || "");
    const def = defaultRowHighlight(r);
    return [custom || def, "row-clickable"].filter(Boolean).join(" ");
  };

  return (
    <div className="w-full h-[calc(100vh-6.5rem)] px-2 md:px-3">
      <div className="mb-2">
        <Breadcrumb items={[{ title: titlePlural }, { title: "List" }]} />
        <Title level={3} className="!mb-0">List</Title>
      </div>

      <Card className="!rounded-2xl h-[calc(100%-3rem)] flex flex-col">
        {/* Tabs + right controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[{ key: "all", label: `All ${titlePlural.toLowerCase()}` }, { key: "active", label: "Active only" }]}
          />
          <Space wrap>
            {statusFilter && statusSelect}

            <Tooltip title={`Add ${titleSingular || cfg.titleSingular || "record"}`}>
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={() => navigate("new")}
              />
            </Tooltip>

            <Tooltip title="Reload">
              <Button shape="circle" icon={<ReloadOutlined />} onClick={load} />
            </Tooltip>
          </Space>
        </div>

        {/* Toolbar row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <Space wrap>
            <Dropdown menu={bulkMenu}><Button>Actions <DownOutlined /></Button></Dropdown>
            <div className="inline-flex items-center gap-2">
              <Text type="secondary">Show</Text>
              <Select
                value={pageSize}
                onChange={onChangePageSize}
                options={[10, 25, 50, 100].map((n) => ({ value: n, label: n }))}
                style={{ width: 90 }}
              />
              <Text type="secondary">entries</Text>
            </div>
          </Space>

          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Table search"
              allowClear
              value={typedQ}
              onChange={(e) => setTypedQ(e.target.value)}
              onPressEnter={() => setQ(typedQ)}
              className="w-full lg:w-[320px]"
            />
            <Tooltip title="Row density"><Button icon={<ColumnHeightOutlined />} /></Tooltip>
            <Tooltip title="Show / Hide columns"><Button icon={<SettingOutlined />} onClick={() => setColModalOpen(true)} /></Tooltip>
          </Space>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-lg border">
          <Table
            columns={columns}
            dataSource={effectiveRows || []}
            loading={loading}
            rowKey={idField}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys, preserveSelectedRowKeys: true }}
            pagination={{ pageSize, showSizeChanger: false }}
            scroll={{ x: 1200, y: "calc(100vh - 310px)" }}
            sticky
            childrenColumnName="__none__"
            expandable={{ showExpandColumn: false, rowExpandable: () => false, expandIcon: () => null }}
            onRow={(record) => ({
              onClick: () => goToDetail(record[idField]),
              tabIndex: 0,
              role: "link",
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToDetail(record[idField]);
                }
              },
            })}
            rowClassName={appliedRowClassName}
            locale={{ emptyText: <div className="text-gray-400">-</div> }}
            {...(billingFilter
              ? {
                  onChange: (_, filters) => {
                    const f = filters?.billingStatus;
                    setBilling(Array.isArray(f) && f.length ? f[0] : null);
                  },
                }
              : {})}
          />
        </div>
      </Card>

      {/* Column modal */}
      <Modal
        title="Show / Hide columns"
        open={colModalOpen}
        onCancel={() => setColModalOpen(false)}
        onOk={() => setColModalOpen(false)}
        okText="Done"
      >
        <div className="mb-2">
          <Space wrap>
            <Button onClick={() => setVisibleCols(Object.keys(ALL_COLUMNS_MAP))}>Select all</Button>
            <Button onClick={() => setVisibleCols((defaultVisible || []).slice())}>Reset</Button>
          </Space>
        </div>

        {(() => {
          const entries = Object.keys(ALL_COLUMNS_MAP)
            .filter((k) => !!ALL_COLUMNS_MAP[k])
            .map((k) => ({ key: k, title: ALL_COLUMNS_MAP[k].title || k }));

          const counts = entries.reduce((acc, e) => {
            acc[e.title] = (acc[e.title] || 0) + 1;
            return acc;
          }, {});

          const options = entries.map((e) => ({
            value: e.key,
            label: counts[e.title] > 1 ? `${e.title} (${e.key})` : e.title,
          }));

          return (
            <Checkbox.Group
              value={Array.from(new Set(visibleCols))}
              onChange={(vals) => setVisibleCols(Array.from(new Set(vals)))}
              className="grid grid-cols-1 sm:grid-cols-2 gap-y-2"
              options={options}
            />
          );
        })()}

        <Divider />
        <Text type="secondary" className="block">“Actions” is always visible.</Text>
      </Modal>

      {/* Row highlights + clickable row visuals */}
      <style>{`
        .row-status-active    { background-color: #d9f7be !important; }
        .row-status-suspended { background-color: #fff7e6 !important; }
        .row-status-disabled  { background-color: #ffd6d6 !important; }

        .row-status-active:hover,
        .row-status-suspended:hover,
        .row-status-disabled:hover {
          filter: brightness(0.97);
        }

        .row-clickable { cursor: pointer; }
        .row-clickable:hover { background-color: rgba(0,0,0,0.03) !important; }
      `}</style>
    </div>
  );
}

/* ---------- Common column factories ---------- */
export const columnFactories = {
  status: (dataIndex = "status") => ({
    title: "Status",
    dataIndex,
    key: "status",
    width: 120,
    render: statusChip,
  }),

  idLink: (title, routeBase, idField = "id", navigateFn) => ({
    title,
    dataIndex: idField,
    key: "id",
    width: 90,
    sorter: (a, b) => (a[idField] || 0) - (b[idField] || 0),
    render: (v, r) => (
      <Button
        type="link"
        className="!px-0"
        onClick={() =>
          navigateFn ? navigateFn(`${r[idField]}`) : (window.location.href = `${routeBase}/${r[idField]}`)
        }
      >
        {dash(v)}
      </Button>
    ),
  }),

  text: (title, key, dataIndex = key, sorter = true) => ({
    title,
    dataIndex,
    key,
    render: (v) => dash(v),
    ...(sorter
      ? { sorter: (a, b) => String(getByPath(a, dataIndex) || "").localeCompare(String(getByPath(b, dataIndex) || "")) }
      : {}),
  }),

  email: (key = "email") => ({
    title: "Email",
    dataIndex: key,
    key,
    render: (v) => <span className="truncate block max-w-[260px]">{dash(v)}</span>,
    sorter: (a, b) => String(getByPath(a, key) || "").localeCompare(String(getByPath(b, key) || "")),
  }),

  date: (title, key = "createdAt") => ({
    title,
    dataIndex: key,
    key,
    width: 130,
    render: (v) => dash(fmtDate(v)),
    sorter: (a, b) => new Date(getByPath(a, key) || 0) - new Date(getByPath(b, key) || 0),
  }),
};
