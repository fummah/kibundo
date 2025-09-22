// Uses the required backend routes you posted (no REST refactor)
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card, Typography, Input, Select, Tag, Table, Button, Space,
  Modal, Dropdown, Tabs, Tooltip, Checkbox, Divider, message
} from "antd";
import {
  PlusOutlined, SearchOutlined,
  SettingOutlined, MoreOutlined, TeamOutlined, DownOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
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
const statusChip = (s) => {
  const norm = String(s || "").toLowerCase();
  const baseCls = "!m-0 !px-3 !py-[2px] !rounded";
  if (!norm) return <Tag className={baseCls}>-</Tag>;

  // Treat pending-like states as Active
  if (norm === "active" || norm === "pending" || norm === "invited" || norm === "invite_sent") {
    return <Tag color="green" className={baseCls}>{i18next.t("entityList.status.active")}</Tag>;
  }
  if (norm === "suspended") return <Tag color="orange" className={baseCls}>{i18next.t("entityList.status.suspended")}</Tag>;
  if (norm === "disabled" || norm === "blocked" || norm === "inactive") return <Tag color="red" className={baseCls}>{i18next.t("entityList.status.blocked")}</Tag>;

  // Fallback: show the actual status text with a neutral/blue tag
  return <Tag color="blue" className={baseCls}>{s}</Tag>;
};
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
  blogposts: "/blogposts",
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
  // students, teachers, classes: no delete routes listed
};

/**
 * cfg = {
 *  entityKey: "...",
 *  titleSingular?, titlePlural, routeBase, idField = "id",
 *  api: { listPath?, removePath?(id)?, updateStatusPath?(id)?, parseList?(raw) },
 *  statusFilter?: boolean,
 *  billingFilter?: boolean,
 *  columnsMap: (navigate, helpers)=> ({ key -> antd column (optional: csv(row)) }),
 *  defaultVisible: string[],
 *  rowClassName?: (row)=>string,
 *  rowActions?: { extraItems?: [], onClick?: (key,row,ctx)=>void },
 *  pathBuilders?: { view?: (id)=>string, edit?: (id)=>string }
 * }
 */
export default function EntityList({ cfg }) {
  const { t } = useTranslation();
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
    pathBuilders = {},
    iconNode,
  } = cfg;

  // Lock to required endpoints by default
  const listPath = apiCfg.listPath || REQUIRED_LIST_PATHS[entityKey] || `/${entityKey}`;
  const removePathBuilder = apiCfg.removePath || REQUIRED_REMOVE_PATH[entityKey] || null;

  const navigate = useNavigate();

  // Path helpers (can be overridden per list)
  const buildViewPath = pathBuilders.view || ((rid) => `${routeBase}/${rid}`);
  const buildEditPath = pathBuilders.edit || ((rid) => `${routeBase}/${rid}/edit`);

  /* --------- persistence keys --------- */
  const COLS_LS_KEY = `${entityKey}.visibleCols.v1`;
  const PAGE_SIZE_LS_KEY = `${entityKey}.pageSize.v1`;
  const BILLING_FILTER_LS_KEY = `${entityKey}.billingFilter.v1`;
  const DENSITY_LS_KEY = `${entityKey}.density.v1`;

  const readCols = () => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      const parsed = JSON.parse(raw || "null");
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return (defaultVisible || []).slice();
  };

  // Unified table change handler to track sort and billing filter
  const handleTableChange = (_pagination, filters, sorter) => {
    if (billingFilter) {
      const f = filters?.billingStatus;
      setBilling(Array.isArray(f) && f.length ? f[0] : null);
    }

    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s && s.field) {
      const field = Array.isArray(s.field) ? s.field.join('.') : String(s.field);
      setSortState({ field, order: s.order || undefined });
      if (s.order) setHasSorted(true);
    } else {
      setSortState(null);
    }
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

  const readDensity = () => {
    try {
      const v = localStorage.getItem(DENSITY_LS_KEY);
      return v === "default" || v === "compact" ? v : "compact"; // default to compact per design
    } catch {
      return "compact";
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
  const [density, setDensity] = useState(readDensity);
  const [sortState, setSortState] = useState(null); // { field, order } after user sorts
  const [hasSorted, setHasSorted] = useState(false);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => setQ(typedQ), 300);
    return () => clearTimeout(t);
  }, [typedQ]);

  /* persist visible columns */
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

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_LS_KEY, density);
    } catch {}
  }, [density]);

  // Ensure toasts appear below top nav and above overlays
  useEffect(() => {
    try {
      message.config({ top: 80, zIndex: 2000 });
    } catch {}
  }, []);

  /* loader */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveStatus = tab === "active" ? "active" : status;

      // benign query params; backend can ignore
      const normalizedStatusParam =
        statusFilter && effectiveStatus !== "All"
          ? String(effectiveStatus).toLowerCase()
          : undefined;

      const { data } = await api.get(listPath, {
        params: {
          q,
          status: normalizedStatusParam,
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

      // Pre-sort by ID ascending without showing sort highlight on the header
      const arr = Array.isArray(list) ? list.slice() : [];
      try {
        arr.sort((a, b) => {
          const av = a?.[idField];
          const bv = b?.[idField];
          const an = Number(av);
          const bn = Number(bv);
          if (!isNaN(an) && !isNaN(bn)) return an - bn;
          return String(av ?? "").localeCompare(String(bv ?? ""));
        });
      } catch {}
      setRows(arr);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, tab, billing, listPath, statusFilter, billingFilter, apiCfg, idField]);

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

  const goToDetail = (rid) => navigate(buildViewPath(rid));
  const goToEdit   = (rid) => navigate(buildEditPath(rid));

  let columns = [...visibleCols.map((k) => ALL_COLUMNS_MAP[k]).filter(Boolean)];
  // Apply controlled sort order only after user interacts
  if (sortState && sortState.field) {
    columns = columns.map((c) => {
      const fieldKey = Array.isArray(c.dataIndex)
        ? c.dataIndex.join('.')
        : (typeof c.dataIndex === 'string' && c.dataIndex) || c.key;
      return {
        ...c,
        sortOrder: fieldKey === sortState.field ? sortState.order : undefined,
      };
    });
  }
  if (!columns.length) {
    columns = [{ title: "—", key: "__placeholder__", render: () => "-" }];
  }

  // Actions column has been removed as per user request.
  /*
  // Actions column (delete only where allowed by your API)
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
            { key: "view", label: t("actions.view", "View") },
            { key: "edit", label: t("actions.edit") },
            ...(canDelete ? [{ key: "delete", label: t("actions.delete"), danger: true }] : []),
            ...(cfg.rowActions?.extraItems || []),
          ],
          onClick: async ({ key, domEvent }) => {
            if (domEvent) domEvent.stopPropagation();
            if (key === "view") return goToDetail(r[idField]);
            if (key === "edit") return goToEdit(r[idField]);

            if (key === "delete" && canDelete) {
              Modal.confirm({
                title: t("entityList.confirm.deleteTitle", { what: cfg.titleSingular || titleSingular || t("entityList.record") }),
                content: (
                  <>
                    {t("entityList.confirm.deleteContent")} <strong>{dash(r?.name) !== "-" ? r?.name : `#${dash(r?.[idField])}`}</strong>
                  </>
                ),
                okText: t("actions.delete"),
                okButtonProps: { danger: true },
                cancelText: t("common.cancel", "Cancel"),
                onOk: async () => {
                  try {
                    await api.delete(removePathBuilder(r[idField]), { withCredentials: true });
                    load();
                  } catch {  }
                },
              });
            }

            if (typeof cfg.rowActions?.onClick === "function") {
              cfg.rowActions.onClick(key, r, { reload: load, domEvent });
            }
          },
        }}
      >
        <Button icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
      </Dropdown>
    ),
  });
  */

  /* bulk actions (status updates optional; your API doesn't expose them by default) */
  const bulkMenu = {
    items: [
      ...(statusFilter
        ? [
            { key: "reactivate", label: t("entityList.bulk.setActive") },
            { key: "suspend", label: t("entityList.bulk.setSuspended") },
            { key: "disable", label: t("entityList.bulk.setBlocked") },
            { type: "divider" },
          ]
        : []),
      { key: "export_all", label: t("actions.exportCsv") },
      { type: "divider" },
      { key: "reset", label: t("actions.reset") },
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

      if (!selectedRowKeys.length || !apiCfg.updateStatusPath) return;
      const newStatus = key === "reactivate" ? "active" : key === "suspend" ? "suspended" : "disabled";
      try {
        await Promise.all(
          selectedRowKeys.map((id) =>
            api.patch(apiCfg.updateStatusPath(id), { status: newStatus }, { withCredentials: true })
          )
        );
        setSelectedRowKeys([]);
        load();
      } catch {}
    },
  };

  const effectiveRows = useMemo(() => {
    let out = rows;

    // Apply billing filter (if enabled)
    if (billingFilter && billing) {
      const norm = String(billing).toLowerCase();
      out = out.filter((r) =>
        String(r?.billingStatus || r?.activePlan?.interval || "").toLowerCase() === norm
      );
    }

    // Apply tab filter: Active only
    if (tab === "active") {
      const activeSet = new Set(["active", "pending", "invited", "invite_sent"]);
      out = out.filter((r) => activeSet.has(String(r?.status || "").toLowerCase()));
    } else if (statusFilter && status && status !== "All") {
      // Apply status dropdown filter only when not on 'Active only' tab
      const s = String(status).toLowerCase();
      let wanted;
      if (s === "active") wanted = new Set(["active", "pending", "invited", "invite_sent"]);
      else if (s === "suspended") wanted = new Set(["suspended"]);
      else if (s === "disabled") wanted = new Set(["disabled", "blocked", "inactive"]);
      else wanted = null;
      if (wanted) out = out.filter((r) => wanted.has(String(r?.status || "").toLowerCase()));
    }

    // Apply client-side search across visible columns
    const query = String(q || "").trim().toLowerCase();
    if (query) {
      const searchableCols = (columns || [])
        .filter(Boolean)
        .filter((c) => c.key !== "actions");

      const getCellString = (c, r) => {
        const di = c.dataIndex;
        let raw;
        if (Array.isArray(di) || typeof di === "string") raw = getByPath(r, di);
        else if (c.key && r && Object.prototype.hasOwnProperty.call(r, c.key)) raw = r[c.key];
        else raw = undefined;

        if (raw == null) return "";
        if (typeof raw === "object") {
          try { return JSON.stringify(raw).toLowerCase(); } catch { return ""; }
        }
        return String(raw).toLowerCase();
      };

      out = out.filter((r) =>
        searchableCols.some((c) => getCellString(c, r).includes(query))
      );
    }

    return out;
  }, [rows, billing, billingFilter, q, columns, tab, status, statusFilter]);

  // highlight by status
  const defaultRowHighlight = (r) => {
    const s = String(r?.status || "").toLowerCase();
    if (["active", "pending", "invited", "invite_sent"].includes(s)) return "row-status-active";
    if (s === "suspended") return "row-status-suspended";
    if (s === "disabled") return "row-status-disabled";
    return "";
  };

  const appliedRowClassName = (r) => {
    const custom = typeof rowClassName === "function" ? rowClassName(r) : (rowClassName || "");
    const def = defaultRowHighlight(r);
    return [custom || def, "row-clickable"].filter(Boolean).join(" ");
  };

  const exportCurrentTable = () => {
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
  };

  const moreMenu = {
    items: [
      { key: "columns", icon: <SettingOutlined />, label: t("entityList.more.columns") },
    ],
    onClick: ({ key }) => {
      if (key === "columns") return setColModalOpen(true);
    },
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    const display = val === "disabled"
      ? t("entityList.status.blocked")
      : val === "All"
      ? t("entityList.status.allSelected")
      : t(`entityList.status.${String(val).toLowerCase()}`, String(val));
    try { message.success(t("entityList.toast.statusChanged", { status: display })); } catch {}
  };

  const statusSelect = (
    <div className="hidden sm:flex items-center gap-2">
      <Text type="secondary">{t("entityList.status.label")}</Text>
      <Select
        value={status}
        onChange={handleStatusChange}
        options={[
          { value: "All", label: t("entityList.status.allSelected") },
          { value: "active", label: t("entityList.status.active") },
          { value: "suspended", label: t("entityList.status.suspended") },
          { value: "disabled", label: t("entityList.status.blocked") },
        ]}
        style={{ width: 160 }}
      />
    </div>
  );

  return (
    <div className={`entitylist-container w-full h-[calc(100vh-6.5rem)] px-2 md:px-3 ${density === 'compact' ? 'density-compact' : ''} ${hasSorted ? '' : 'no-initial-sort'}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7C4DFF] text-white flex items-center justify-center">
          {iconNode || <TeamOutlined />}
        </div>
        <div className="leading-tight">
          <div className="text-gray-500 text-sm">{titlePlural} /</div>
          <Title level={3} className="!m-0">{t("entityList.header.list")}</Title>
        </div>
      </div>

      <Card variant="borderless" className="!rounded-2xl h-[calc(100%-3rem)] flex flex-col !bg-transparent !shadow-none" styles={{ body: { background: "transparent", border: "none" } }} style={{ background: "transparent", border: "none", boxShadow: "none" }}>
        {/* Tabs + right controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: "all", label: t("entityList.tabs.all", { name: titlePlural.toLowerCase() }) },
              { key: "active", label: t("entityList.tabs.activeOnly") },
            ]}
          />
          <Space wrap>
            {statusFilter && statusSelect}
            <Tooltip title={t("entityList.addTooltip", { singular: titleSingular || cfg.titleSingular || t("entityList.record") })}>
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={() => navigate(`${routeBase}/new`)}
              />
            </Tooltip>
          </Space>
        </div>

        {/* Toolbar row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <Space wrap>
            <Dropdown menu={bulkMenu}><Button>{t("entityList.actions.label")} <DownOutlined /></Button></Dropdown>
            <div className="inline-flex items-center gap-2">
              <Text type="secondary">{t("entityList.show")}</Text>
              <Select
                value={pageSize}
                onChange={onChangePageSize}
                options={[10, 25, 50, 100].map((n) => ({ value: n, label: n }))}
                style={{ width: 90 }}
              />
              <Text type="secondary">{t("entityList.entries")}</Text>
            </div>
          </Space>

          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t("entityList.searchPh")}
              allowClear
              value={typedQ}
              onChange={(e) => setTypedQ(e.target.value)}
              onPressEnter={() => setQ(typedQ)}
              className="w-full lg:w-[320px]"
            />
            <Dropdown menu={moreMenu} placement="bottomRight" trigger={["click"]}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-lg">
          <Table
            columns={columns}
            dataSource={effectiveRows || []}
            loading={loading}
            rowKey={idField}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys, preserveSelectedRowKeys: true }}
            pagination={{ pageSize, showSizeChanger: false }}
            size={density === 'compact' ? 'small' : 'middle'}
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
            onChange={handleTableChange}
          />
        </div>
      </Card>

      {/* Column modal */}
      <Modal
        title={t("entityList.modal.columnsTitle")}
        open={colModalOpen}
        onCancel={() => setColModalOpen(false)}
        onOk={() => setColModalOpen(false)}
        okText={t("entityList.modal.done")}
      >
        <div className="mb-2">
          <Space wrap>
            <Button onClick={() => setVisibleCols(Object.keys(ALL_COLUMNS_MAP))}>{t("entityList.modal.selectAll")}</Button>
            <Button onClick={() => setVisibleCols((defaultVisible || []).slice())}>{t("entityList.modal.reset")}</Button>
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
          filter: none;
        }

        .row-clickable { cursor: pointer; }
        .row-clickable:hover { /* keep original background color */ }

        /* Prevent AntD default hover grey */
        .entitylist-container .ant-table-tbody > tr:hover > td {
          background-color: transparent !important;
        }
        .entitylist-container .ant-table-row:hover { background-color: transparent !important; }
        .entitylist-container .ant-table-cell-row-hover { background-color: transparent !important; }

        /* Ensure colored rows keep color even on hover by setting TR/TDs */
        .entitylist-container .ant-table-tbody > tr.row-status-active,
        .entitylist-container .ant-table-tbody > tr.row-status-active:hover { background-color: #d9f7be !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-suspended,
        .entitylist-container .ant-table-tbody > tr.row-status-suspended:hover { background-color: #fff7e6 !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-disabled,
        .entitylist-container .ant-table-tbody > tr.row-status-disabled:hover { background-color: #ffd6d6 !important; }

        .entitylist-container .ant-table-tbody > tr.row-status-active > td,
        .entitylist-container .ant-table-row.row-status-active > td { background-color: #d9f7be !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-suspended > td,
        .entitylist-container .ant-table-row.row-status-suspended > td { background-color: #fff7e6 !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-disabled > td,
        .entitylist-container .ant-table-row.row-status-disabled > td { background-color: #ffd6d6 !important; }

        .entitylist-container .ant-table-tbody > tr.row-status-active:hover > td,
        .entitylist-container .ant-table-row.row-status-active:hover > td,
        .entitylist-container .ant-table-tbody > tr.row-status-active.ant-table-row-selected > td { background-color: #d9f7be !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-suspended:hover > td,
        .entitylist-container .ant-table-row.row-status-suspended:hover > td,
        .entitylist-container .ant-table-tbody > tr.row-status-suspended.ant-table-row-selected > td { background-color: #fff7e6 !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-disabled:hover > td,
        .entitylist-container .ant-table-row.row-status-disabled:hover > td,
        .entitylist-container .ant-table-tbody > tr.row-status-disabled.ant-table-row-selected > td { background-color: #ffd6d6 !important; }

        /* Fix sticky cells so they inherit row color */
        .entitylist-container .ant-table-tbody > tr.row-status-active > td.ant-table-cell-fix-left,
        .entitylist-container .ant-table-tbody > tr.row-status-active > td.ant-table-cell-fix-right { background-color: #d9f7be !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-suspended > td.ant-table-cell-fix-left,
        .entitylist-container .ant-table-tbody > tr.row-status-suspended > td.ant-table-cell-fix-right { background-color: #fff7e6 !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-disabled > td.ant-table-cell-fix-left,
        .entitylist-container .ant-table-tbody > tr.row-status-disabled > td.ant-table-cell-fix-right { background-color: #ffd6d6 !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-active > td.ant-table-cell-fix-left::before,
        .entitylist-container .ant-table-tbody > tr.row-status-active > td.ant-table-cell-fix-right::before { background-color: #d9f7be !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-suspended > td.ant-table-cell-fix-left::before,
        .entitylist-container .ant-table-tbody > tr.row-status-suspended > td.ant-table-cell-fix-right::before { background-color: #fff7e6 !important; }
        .entitylist-container .ant-table-tbody > tr.row-status-disabled > td.ant-table-cell-fix-left::before,
        .entitylist-container .ant-table-tbody > tr.row-status-disabled > td.ant-table-cell-fix-right::before { background-color: #ffd6d6 !important; }

        /* Compact density paddings */
        .density-compact .ant-table-thead > tr > th,
        .density-compact .ant-table-tbody > tr > td {
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .density-compact .ant-table-tbody > tr > td {
          font-size: 12.5px;
        }

        /* Transparent, borderless card within EntityList only */
        .entitylist-container .ant-card,
        .entitylist-container .ant-card-body {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        /* Hide any accidental initial active-sort highlight until user sorts */
        .entitylist-container.no-initial-sort .ant-table-column-sorter-up.active .anticon,
        .entitylist-container.no-initial-sort .ant-table-column-sorter-down.active .anticon {
          color: rgba(0,0,0,0.45) !important;
        }
        .entitylist-container.no-initial-sort th.ant-table-column-sort {
          background: transparent !important;
        }
      `}</style>

    </div>
  );
}
