// src/pages/billing/Coupons.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message,
  Skeleton,
  Typography,
  Grid,
  Row,
  Col,
  Dropdown,
  Tooltip,
  Space,
  Button,
  Drawer,
  Descriptions,
  Segmented,
  DatePicker,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownloadOutlined,
  SearchOutlined,
  EyeOutlined,
  SafetyOutlined,
  MailOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";

import BillingEntityList from "@/components/billing/BillingEntityList";
import ConfirmDrawer from "@/components/common/ConfirmDrawer";
import StatusTag from "@/components/common/StatusTag";
import useResponsiveDrawerWidth from "@/hooks/useResponsiveDrawerWidth";

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

/* keep drawers under fixed header */
const HEADER_OFFSET = 64;

/* ----------------------------- helpers ----------------------------- */
const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  (typeof api.isCancel === "function" && api.isCancel(err));

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const fmtDT = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—");
const toISOorNull = (v) => (v ? dayjs(v).toISOString() : null);
const validEmail = (s) => /\S+@\S+\.\S+/.test(String(s || "").trim());

/* ------------------------ adapters (API ↔ form) ------------------------ */
function toFormValues(apiCoupon) {
  if (!apiCoupon) return {};
  return {
    code: apiCoupon.code || "",
    description: apiCoupon.description || "",
    trialDays: apiCoupon.trialDays ?? 0,
    scope:
      apiCoupon.scope ||
      (Array.isArray(apiCoupon.emails) && apiCoupon.emails.length ? "email" : "general"),
    emails: Array.isArray(apiCoupon.emails) ? apiCoupon.emails : [],
    affiliate: !!apiCoupon.affiliate,
    active: !!apiCoupon.active,
    maxRedemptions: apiCoupon.maxRedemptions ?? null,
    range: [
      apiCoupon.startAt ? dayjs(apiCoupon.startAt) : null,
      apiCoupon.endAt ? dayjs(apiCoupon.endAt) : null,
    ],
  };
}

function toApiPayload(form, id) {
  const [start, end] = form.range || [];
  const payload = {
    id,
    code: String(form.code || "").trim().toUpperCase(),
    description: form.description || "",
    trialDays: Number(form.trialDays || 0),
    scope: form.scope || "general",
    emails: form.scope === "email" ? (form.emails || []).filter(Boolean) : [],
    affiliate: !!form.affiliate,
    active: !!form.active,
    maxRedemptions:
      form.maxRedemptions == null || form.maxRedemptions === ""
        ? null
        : Number(form.maxRedemptions),
    startAt: start ? toISOorNull(start) : null,
    endAt: end ? toISOorNull(end) : null,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}

/* --------------------------------- page --------------------------------- */
export default function Coupons() {
  const screens = useBreakpoint();
  const isMdUp = screens.md;

  const drawerWidth = useResponsiveDrawerWidth();
  const [messageApi, contextHolder] = message.useMessage();

  const [coupons, setCoupons] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);

  // Add/Edit modal
  const [open, setOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Coupon");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form] = Form.useForm();

  // selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // View drawer
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  // Confirm drawers
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchCoupons = async () => {
    try {
      setLoadingTable(true);
      const res = await api.get("/coupons");
      setCoupons(res.data || []);
    } catch (err) {
      console.error("Failed to load coupons", err);
      messageApi.error("Failed to load coupons.");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const debouncedSetQ = useMemo(() => debounce(setQ, 250), []);

  const filteredCoupons = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (coupons || []).filter((c) => {
      if (statusFilter !== "all") {
        const act = !!c.active;
        if (statusFilter === "active" && !act) return false;
        if (statusFilter === "inactive" && act) return false;
      }
      if (scopeFilter !== "all") {
        const sc = c.scope || (Array.isArray(c.emails) && c.emails.length ? "email" : "general");
        if (scopeFilter !== sc) return false;
      }
      if (!query) return true;
      const hay = `${c.code || ""} ${c.description || ""} ${(c.emails || []).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [coupons, statusFilter, scopeFilter, q]);

  /* ------------------------------ View logic ------------------------------ */
  const openView = useCallback(
    async (idOrRecord) => {
      const id = typeof idOrRecord === "object" ? idOrRecord.id : idOrRecord;
      setViewOpen(true);
      setViewLoading(true);
      try {
        const { data } = await api.get(`/coupon/${id}`);
        setViewRec(data || null);
      } catch (err) {
        if (!isCanceled(err)) {
          const fallback = (coupons || []).find((p) => String(p.id) === String(id));
          setViewRec(fallback || null);
          if (!fallback) messageApi.error("Failed to load coupon.");
        }
      } finally {
        setViewLoading(false);
      }
    },
    [coupons]
  );

  const closeView = () => {
    setViewOpen(false);
    setViewRec(null);
  };

  /* ------------------------------- actions ------------------------------- */
  const genCode = () =>
    "TRIAL-" +
    Math.random().toString(36).slice(2, 7).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 4).toUpperCase();

  const openAdd = () => {
    setEditingId(null);
    setModalTitle("Add Coupon");
    setOpen(true);
    setLoadingForm(false);
    form.resetFields();
    form.setFieldsValue({
      code: genCode(),
      description: "",
      trialDays: 14,
      scope: "general",
      emails: [],
      affiliate: false,
      active: true,
      maxRedemptions: null,
      range: [null, null],
    });
  };

  const openEdit = async (id) => {
    setEditingId(id);
    setModalTitle("Edit Coupon");
    setOpen(true);
    setLoadingForm(true);
    try {
      const { data } = await api.get(`/coupon/${id}`);
      form.setFieldsValue(toFormValues(data));
    } catch (err) {
      if (!isCanceled(err)) {
        console.error(err);
        message.error("Failed to load coupon.");
        setOpen(false);
      }
    } finally {
      setLoadingForm(false);
    }
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      if (values.scope === "email") {
        const bad = (values.emails || []).find((e) => !validEmail(e));
        if (bad) {
          messageApi.error(`Invalid email: ${bad}`);
          return;
        }
      }
      const payload = toApiPayload(values, editingId || undefined);
      setSaving(true);
      await api.post("/addcoupon", payload);
      messageApi.success(editingId ? "Coupon saved." : "Coupon created.");
      setOpen(false);
      fetchCoupons();
      if (viewOpen && viewRec?.id && viewRec?.id === editingId) {
        openView(viewRec.id);
      }
    } catch (err) {
      if (err?.errorFields) return;
      if (!isCanceled(err)) {
        console.error(err);
        messageApi.error("Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/coupon/${id}`);
      messageApi.success("Coupon deleted.");
      setSelectedRowKeys((ks) => ks.filter((k) => k !== id));
      fetchCoupons();
      if (viewOpen && viewRec?.id === id) closeView();
    } catch (err) {
      if (!isCanceled(err)) {
        console.error(err);
        messageApi.error("Delete failed.");
      }
    }
  };

  const onBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await Promise.all(selectedRowKeys.map((id) => api.delete(`/coupon/${id}`)));
      messageApi.success("Selected coupons deleted.");
      setSelectedRowKeys([]);
      fetchCoupons();
      if (viewOpen && viewRec && selectedRowKeys.includes(viewRec.id)) closeView();
    } catch (e) {
      console.error(e);
      messageApi.error("Bulk delete failed.");
    }
  };

  const askDelete = (record) => {
    setConfirmTarget(record);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget?.id) return;
    try {
      setConfirmLoading(true);
      await onDelete(confirmTarget.id);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmBulk = async () => {
    try {
      setBulkLoading(true);
      await onBulkDelete();
      setBulkOpen(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setScopeFilter("all");
    setQ("");
    fetchCoupons();
  };

  /* ----------------------------- columns map ----------------------------- */
  const COLUMNS_MAP = useMemo(() => {
    const idCol = {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      sorter: (a, b) => (a.id || 0) - (b.id || 0),
      render: (val) => <Text strong>{val}</Text>,
    };
    const codeCol = {
      title: "Code",
      dataIndex: "code",
      key: "code",
      ellipsis: true,
      sorter: (a, b) => String(a.code || "").localeCompare(String(b.code || "")),
      render: (val, record) =>
        val ? (
          <Button type="link" className="!px-0" onClick={() => openView(record.id)}>
            <Text strong>{val}</Text>
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    };
    const typeCol = {
      title: "Type",
      key: "type",
      width: 200,
      render: (r) => {
        const scope = r.scope || (Array.isArray(r.emails) && r.emails.length ? "email" : "general");
        return (
          <Space size="small" wrap>
            <Tag
              icon={scope === "email" ? <MailOutlined /> : undefined}
              color={scope === "email" ? "gold" : "blue"}
            >
              {scope === "email" ? "Per Email" : "General"}
            </Tag>
            {r.affiliate ? (
              <Tag icon={<SafetyOutlined />} color="purple" title="Affiliate: new users only">
                Affiliate
              </Tag>
            ) : null}
          </Space>
        );
      },
    };
    const trialCol = {
      title: "Trial Days",
      dataIndex: "trialDays",
      key: "trialDays",
      width: 120,
      sorter: (a, b) => (a.trialDays || 0) - (b.trialDays || 0),
      render: (v) =>
        v != null ? <Tag color="green">{v} day{v !== 1 ? "s" : ""}</Tag> : "—",
    };
    const windowCol = {
      title: "Validity",
      key: "window",
      width: 260,
      render: (r) => (
        <div className="leading-tight">
          <div><Text type="secondary">Start:</Text> {fmtDT(r.startAt)}</div>
          <div><Text type="secondary">End:</Text> {fmtDT(r.endAt)}</div>
        </div>
      ),
      responsive: ["sm"],
    };
    const limitsCol = {
      title: "Limits / Usage",
      key: "limits",
      width: 220,
      render: (r) => (
        <Space size="small" wrap>
          <Tag>{r.maxRedemptions != null ? `Max ${r.maxRedemptions}` : "No limit"}</Tag>
          <Tag color="geekblue">Used {r.redemptionsCount ?? 0}</Tag>
        </Space>
      ),
      responsive: ["sm"],
    };
    const statusCol = {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, r) => <StatusTag value={r.active ? "active" : "inactive"} />,
    };

    return { id: idCol, code: codeCol, type: typeCol, trial: trialCol, window: windowCol, limits: limitsCol, status: statusCol };
  }, [openView]);

  // actions menu
  const actionsRender = (record) => (
    <Dropdown
      menu={{
        items: [
          { key: "view", label: "View", icon: <EyeOutlined /> },
          { key: "edit", label: "Edit", icon: <EditOutlined /> },
          { key: "delete", label: <span className="text-red-600">Delete</span>, icon: <DeleteOutlined /> },
        ],
        onClick: ({ key }) => {
          if (key === "view") return openView(record.id);
          if (key === "edit") return openEdit(record.id);
          if (key === "delete") return askDelete(record);
        },
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );

  // toolbars
  const toolbarLeft = (
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search code, description or email…"
        onChange={(e) => debouncedSetQ(e.target.value)}
        style={{ width: 260 }}
      />
      <Segmented
        options={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        size={isMdUp ? "middle" : "small"}
      />
      <Segmented
        options={[
          { label: "General", value: "general" },
          { label: "Per Email", value: "email" },
        ]}
        value={scopeFilter}
        onChange={setScopeFilter}
        size={isMdUp ? "middle" : "small"}
      />
    </Space>
  );

  const toolbarRight = (
    <Space wrap>
      {selectedRowKeys.length > 0 && (
        <Button danger onClick={() => setBulkOpen(true)} icon={<DeleteOutlined />}>
          Delete selected
        </Button>
      )}
      <Tooltip title="Export current view">
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const rows = [
              ["ID", "Code", "Active", "Affiliate", "Scope", "Emails", "Trial Days", "Start", "End", "Max Redemptions", "Used", "Created"],
              ...filteredCoupons.map((c) => [
                c.id,
                c.code || "",
                String(!!c.active),
                String(!!c.affiliate),
                c.scope || (Array.isArray(c.emails) && c.emails.length ? "email" : "general"),
                (c.emails || []).join("|"),
                c.trialDays ?? "",
                c.startAt ? dayjs(c.startAt).format("YYYY-MM-DD") : "",
                c.endAt ? dayjs(c.endAt).format("YYYY-MM-DD") : "",
                c.maxRedemptions ?? "",
                c.redemptionsCount ?? 0,
                c.createdAt ? dayjs(c.createdAt).format("YYYY-MM-DD HH:mm") : "",
              ]),
            ];
            const csv = rows
              .map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "coupons.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
      </Tooltip>
      <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
        <span className="hidden sm:inline">Add Coupon</span>
      </Button>
    </Space>
  );

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {contextHolder}
      <BillingEntityList
        title="Coupons"
        data={filteredCoupons}
        loading={loadingTable}
        columnsMap={COLUMNS_MAP}
        storageKey="coupons.visibleCols.v2"
        defaultVisible={["id", "code", "type", "trial", "window", "limits", "status"]}
        actionsRender={actionsRender}
        onRefresh={resetFilters}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        selection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pageSize={20}
        scrollX={1000}
        onRowClick={(r) => openView(r.id)}
        tableProps={{
          size: isMdUp ? "middle" : "small",
          rowClassName: (_, idx) =>
            idx % 2 === 0
              ? "bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(24,144,255,0.06)]"
              : "hover:bg-[rgba(24,144,255,0.06)]",
        }}
      />

      {/* Modal: Add/Edit */}
      <Modal
        title={modalTitle}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        okText={editingId ? "Save" : "Create Coupon"}
        confirmLoading={saving}
        destroyOnClose
        width={isMdUp ? 720 : "100%"}
        style={isMdUp ? {} : { top: 8, padding: 0 }}
        bodyStyle={isMdUp ? {} : { paddingInline: 12 }}
      >
        {loadingForm ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              code: genCode(),
              description: "",
              trialDays: 14,
              scope: "general",
              emails: [],
              affiliate: false,
              active: true,
              maxRedemptions: null,
              range: [null, null],
            }}
          >
            <Row gutter={[16, 8]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Code"
                  name="code"
                  rules={[{ required: true, message: "Coupon code is required" }]}
                  tooltip="Shown to users; stored UPPERCASE"
                >
                  <Input
                    placeholder="e.g., TRIAL-ABCD"
                    onBlur={(e) => {
                      const v = (e.target.value || "").trim().toUpperCase();
                      form.setFieldsValue({ code: v });
                    }}
                    addonAfter={<Button onClick={() => form.setFieldsValue({ code: genCode() })}>Random</Button>}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Active" name="active" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item label="Description" name="description">
                  <Input.TextArea rows={isMdUp ? 3 : 2} placeholder="Optional description (internal)" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Free Trial Days"
                  name="trialDays"
                  rules={[
                    { required: true, message: "Trial days required" },
                    { type: "number", min: 1, max: 60, message: "1–60 days" },
                  ]}
                  tooltip="Discounts = trial days only"
                >
                  <InputNumber min={1} max={60} step={1} style={{ width: "100%" }} placeholder="e.g., 14" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Max Redemptions (optional)"
                  name="maxRedemptions"
                  tooltip="Leave blank for unlimited"
                  rules={[
                    () => ({
                      validator(_, value) {
                        if (value == null || value === "") return Promise.resolve();
                        const n = Number(value);
                        if (Number.isInteger(n) && n >= 1) return Promise.resolve();
                        return Promise.reject(new Error("Enter a positive integer"));
                      },
                    }),
                  ]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g., 100" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item label="Validity Window" name="range">
                  <DatePicker.RangePicker showTime style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Scope" name="scope" tooltip="General (any user) or per-email (allowed list)">
                  <Select
                    options={[
                      { label: "General", value: "general" },
                      { label: "Per Email", value: "email" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Affiliate (new users only)"
                  name="affiliate"
                  tooltip="If enabled, backend must enforce: can only be redeemed by brand-new users."
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item noStyle shouldUpdate={(p, c) => p.scope !== c.scope}>
                  {({ getFieldValue }) =>
                    getFieldValue("scope") === "email" ? (
                      <Form.Item
                        label="Allowed Emails"
                        name="emails"
                        tooltip="Only these email addresses can redeem the coupon"
                        rules={[
                          {
                            validator: (_, arr) => {
                              const list = arr || [];
                              const bad = list.find((e) => !validEmail(e));
                              return bad
                                ? Promise.reject(new Error(`Invalid email: ${bad}`))
                                : Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Select mode="tags" tokenSeparators={[",", " "]} placeholder="Type emails and press Enter" />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* View Drawer (offset under header) */}
      <Drawer
        title="Coupon"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        style={{ top: HEADER_OFFSET }}
        maskStyle={{ top: HEADER_OFFSET }}
        extra={
          viewRec ? (
            <Space>
              <Button onClick={() => openEdit(viewRec.id)} icon={<EditOutlined />}>
                Edit
              </Button>
              <Button danger onClick={() => askDelete(viewRec)} icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Space>
          ) : null
        }
      >
        {viewLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : viewRec ? (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="ID">{viewRec.id}</Descriptions.Item>
            <Descriptions.Item label="Code">{viewRec.code || "—"}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag value={viewRec.active ? "active" : "inactive"} />
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Space size="small" wrap>
                <Tag
                  color={
                    (viewRec.scope || (viewRec.emails?.length ? "email" : "general")) === "email"
                      ? "gold"
                      : "blue"
                  }
                  icon={
                    (viewRec.scope || (viewRec.emails?.length ? "email" : "general")) === "email"
                      ? <MailOutlined />
                      : undefined
                  }
                >
                  {(viewRec.scope || (viewRec.emails?.length ? "email" : "general")) === "email"
                    ? "Per Email"
                    : "General"}
                </Tag>
                {viewRec.affiliate ? <Tag color="purple" icon={<SafetyOutlined />}>Affiliate (new users only)</Tag> : null}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Trial Days">
              {viewRec.trialDays != null ? `${viewRec.trialDays} days` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Validity Window">
              <div className="leading-tight">
                <div>
                  <Text type="secondary">Start:</Text> {fmtDT(viewRec.startAt)}
                </div>
                <div>
                  <Text type="secondary">End:</Text> {fmtDT(viewRec.endAt)}
                </div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Limits / Usage">
              <Space size="small" wrap>
                <Tag>{viewRec.maxRedemptions != null ? `Max ${viewRec.maxRedemptions}` : "No limit"}</Tag>
                <Tag color="geekblue">Used {viewRec.redemptionsCount ?? 0}</Tag>
              </Space>
            </Descriptions.Item>
            {(viewRec.scope || (viewRec.emails?.length ? "email" : "general")) === "email" && (
              <Descriptions.Item label="Allowed Emails">
                {Array.isArray(viewRec.emails) && viewRec.emails.length ? viewRec.emails.join(", ") : "—"}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Description">
              <Paragraph className="!mb-0">{viewRec.description || "—"}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Created">{fmtDT(viewRec.createdAt)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">No data.</Text>
        )}
      </Drawer>

      {/* Confirm Drawer: Single delete (header Close; footer cancel hidden) */}
      <ConfirmDrawer
        open={confirmOpen}
        title="Delete coupon?"
        description={
          <>
            This will permanently delete coupon{" "}
            <Text strong>#{confirmTarget?.id ?? "—"}</Text>. This action cannot be undone.
          </>
        }
        loading={confirmLoading}
        confirmText="Delete"
        showCloseButton
        cancelText=""
        topOffset={HEADER_OFFSET}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
      />

      {/* Confirm Drawer: Bulk delete */}
      <ConfirmDrawer
        open={bulkOpen}
        title="Delete selected coupons?"
        description={
          <>
            You are about to delete <Text strong>{selectedRowKeys.length}</Text>{" "}
            coupon{selectedRowKeys.length === 1 ? "" : "s"}. This action cannot be undone.
          </>
        }
        loading={bulkLoading}
        confirmText="Delete all"
        showCloseButton
        cancelText=""
        topOffset={HEADER_OFFSET}
        onConfirm={handleConfirmBulk}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
