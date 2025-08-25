// src/pages/billing/Product.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  Table,
  Tag,
  Segmented,
  Button,
  Space,
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
  Checkbox,
  Divider,
  Drawer,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  SettingOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

/* ----------------------------- helpers ----------------------------- */
const CURRENCY_OPTIONS = [
  { label: "EUR (€)", value: "EUR" },
  { label: "USD ($)", value: "USD" },
  { label: "ZAR (R)", value: "ZAR" },
];
const CURRENCY_SYMBOL = { EUR: "€", USD: "$", ZAR: "R" };

const COUNTRY_VAT = {
  DE: 0.19, FR: 0.20, ES: 0.21, IT: 0.22, NL: 0.21, BE: 0.21, AT: 0.20,
  IE: 0.23, PT: 0.23, PL: 0.23, UK: 0.20, US: 0.0, ZA: 0.15,
};
const COUNTRY_OPTIONS = Object.entries(COUNTRY_VAT).map(([cc, rate]) => ({
  value: cc, label: `${cc} (${Math.round(rate * 100)}% VAT)`,
}));

const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  (typeof api.isCancel === "function" && api.isCancel(err));

const statusColor = (statusRaw) => {
  const s = String(statusRaw || "").toLowerCase();
  const map = {
    active: "green",
    inactive: "default",
    draft: "default",
    archived: "default",
    trialing: "blue",
    past_due: "orange",
    pastdue: "orange",
    canceled: "red",
    cancelled: "red",
    unpaid: "magenta",
    incomplete: "volcano",
    incomplete_expired: "volcano",
  };
  return map[s] || "default";
};

const titleCase = (s) =>
  String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const money = (n, currency = "EUR") => {
  if (n == null || Number.isNaN(n)) return "—";
  const sym = CURRENCY_SYMBOL[currency] || "";
  return `${n.toFixed(2)} ${sym || currency}`;
};

const inclVat = (base, vatRate) =>
  base == null ? null : base * (1 + (Number(vatRate) || 0));

/* ------------------------ adapters (API ↔ form) ------------------------ */
function toFormValues(apiProduct) {
  if (!apiProduct) return {};
  const monthlyCents =
    apiProduct.priceMonthlyCents ??
    (String(apiProduct.interval || "").toLowerCase() === "monthly"
      ? apiProduct.priceCents
      : undefined);
  const annualCents =
    apiProduct.priceYearlyCents ??
    (String(apiProduct.interval || "").toLowerCase() === "yearly"
      ? apiProduct.priceCents
      : undefined);

  return {
    name: apiProduct.name || apiProduct.nickname || "",
    description: apiProduct.description || "",
    active:
      typeof apiProduct.active === "boolean"
        ? apiProduct.active
        : String(apiProduct.status || "").toLowerCase() === "active",
    currency: apiProduct.currency || "EUR",
    country: apiProduct.country || apiProduct.marketCountry || "DE",
    vatPercent:
      apiProduct.vatPercent != null
        ? apiProduct.vatPercent
        : Math.round(((COUNTRY_VAT[apiProduct.country || "DE"] ?? 0) * 100)),
    price_monthly: monthlyCents != null ? monthlyCents / 100 : undefined,
    price_annual: annualCents != null ? annualCents / 100 : undefined,
    freeTrialDays: apiProduct.freeTrialDays ?? 0,
    trialOncePerUser:
      apiProduct.trialOncePerUser != null
        ? !!apiProduct.trialOncePerUser
        : true,
  };
}

function toApiPayload(form, id) {
  const vatPercent = form.vatPercent ?? Math.round((COUNTRY_VAT[form.country] ?? 0) * 100);
  const payload = {
    id,
    name: form.name?.trim(),
    nickname: form.name?.trim(),
    description: form.description || "",
    active: Boolean(form.active),
    currency: form.currency || "EUR",
    country: form.country || "DE",
    vatPercent,
    priceMonthlyCents:
      form.price_monthly != null ? Math.round(Number(form.price_monthly) * 100) : undefined,
    priceYearlyCents:
      form.price_annual != null ? Math.round(Number(form.price_annual) * 100) : undefined,
    freeTrialDays:
      form.freeTrialDays != null ? Number(form.freeTrialDays) : 0,
    trialOncePerUser:
      form.trialOncePerUser != null ? !!form.trialOncePerUser : true,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}

/* --------------------------------- page --------------------------------- */
export default function Product() {
  const screens = useBreakpoint();
  const isMdUp = screens.md;
  const isSmDown = !screens.sm;

  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);

  const [open, setOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Product");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form] = Form.useForm();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  /* -------- Show/Hide Columns (persisted) -------- */
  const COLS_LS_KEY = "products.visibleCols.v1";
  const DEFAULT_VISIBLE = ["id", "name", "description", "region", "pricing", "trial", "status"];
  const readCols = () => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      const parsed = JSON.parse(raw || "null");
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return DEFAULT_VISIBLE.slice();
  };
  const [visibleCols, setVisibleCols] = useState(readCols);
  const [colModalOpen, setColModalOpen] = useState(false);
  useEffect(() => {
    try {
      const uniq = Array.from(new Set(visibleCols));
      localStorage.setItem(COLS_LS_KEY, JSON.stringify(uniq));
    } catch {}
  }, [visibleCols]);

  /* -------- View drawer state -------- */
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoadingTable(true);
      const res = await api.get("/products");
      setProducts(res.data || []);
    } catch (err) {
      console.error("Failed to load products", err);
      message.error("Failed to load products.");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getStatusKey = (record) => {
    const raw =
      record?.status ??
      record?.active ??
      record?.is_active ??
      record?.product_status ??
      record?.state;
    if (typeof raw === "boolean") return raw ? "active" : "inactive";
    if (typeof raw === "number") return raw === 1 ? "active" : "inactive";
    if (typeof raw === "string") {
      const s = raw.trim().toLowerCase();
      if (["true", "1", "active"].includes(s)) return "active";
      if (["false", "0", "inactive"].includes(s)) return "inactive";
      return s;
    }
    return "";
  };

  const statusOptions = useMemo(() => {
    const setVals = new Set();
    (products || []).forEach((p) => {
      const k = getStatusKey(p);
      if (k) setVals.add(k);
    });
    const opts = [
      { label: "All", value: "all" },
      { label: <span><CheckCircleTwoTone twoToneColor="#52c41a" /> Active</span>, value: "active" },
      { label: <span><CloseCircleTwoTone twoToneColor="#bfbfbf" /> Inactive</span>, value: "inactive" },
    ];
    Array.from(setVals)
      .filter((s) => !opts.find((o) => o.value === s))
      .forEach((s) => opts.push({ label: titleCase(s), value: s }));
    return opts;
  }, [products]);

  const debouncedSetQ = useMemo(() => debounce(setQ, 250), []);
  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (statusFilter !== "all" && getStatusKey(p) !== statusFilter) return false;
      if (!query) return true;
      const hay = `${p?.name || ""} ${p?.description || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [products, statusFilter, q]);

  /* ------------------------------ View logic ------------------------------ */
  const openView = useCallback(async (idOrRecord) => {
    const id = typeof idOrRecord === "object" ? idOrRecord.id : idOrRecord;
    setViewOpen(true);
    setViewLoading(true);
    try {
      const { data } = await api.get(`/product/${id}`);
      setViewRec(data || null);
    } catch (err) {
      if (!isCanceled(err)) {
        // fallback to local row if exists
        const fallback = (products || []).find((p) => String(p.id) === String(id));
        setViewRec(fallback || null);
        if (!fallback) message.error("Failed to load product.");
      }
    } finally {
      setViewLoading(false);
    }
  }, [products]);

  const closeView = () => {
    setViewOpen(false);
    setViewRec(null);
  };

  /* ------------------------------- actions ------------------------------- */
  const openAdd = () => {
    setEditingId(null);
    setModalTitle("Add Product");
    setOpen(true);
    setLoadingForm(false);
    form.resetFields();
    form.setFieldsValue({
      active: true,
      currency: "EUR",
      country: "DE",
      vatPercent: Math.round((COUNTRY_VAT.DE || 0) * 100),
      price_monthly: undefined,
      price_annual: undefined,
      freeTrialDays: 0,
      trialOncePerUser: true,
    });
  };

  const openEdit = async (id) => {
    setEditingId(id);
    setModalTitle("Edit Product");
    setOpen(true);
    setLoadingForm(true);
    try {
      const { data } = await api.get(`/product/${id}`);
      form.setFieldsValue(toFormValues(data));
    } catch (err) {
      if (!isCanceled(err)) {
        console.error(err);
        message.error("Failed to load product.");
        setOpen(false);
      }
    } finally {
      setLoadingForm(false);
    }
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = toApiPayload(values, editingId || undefined);
      setSaving(true);
      await api.post("/addproduct", payload);
      message.success(editingId ? "Product saved." : "Product created.");
      setOpen(false);
      fetchProducts();
      // Refresh view if it's open on the same item
      if (viewOpen && viewRec?.id && viewRec?.id === editingId) {
        openView(viewRec.id);
      }
    } catch (err) {
      if (err?.errorFields) return;
      if (!isCanceled(err)) {
        console.error(err);
        message.error("Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/product/${id}`);
      message.success("Product deleted.");
      fetchProducts();
      if (viewOpen && viewRec?.id === id) closeView();
    } catch (err) {
      if (!isCanceled(err)) {
        console.error(err);
        message.error("Delete failed.");
      }
    }
  };

  const onBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    Modal.confirm({
      title: `Delete ${selectedRowKeys.length} product(s)?`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((id) => api.delete(`/product/${id}`)));
          message.success("Selected products deleted.");
          setSelectedRowKeys([]);
          fetchProducts();
        } catch (e) {
          console.error(e);
          message.error("Bulk delete failed.");
        }
      },
    });
  };

  const exportCsv = () => {
    const rows = [
      [
        "ID","Name","Description","Active","Currency","Country","VAT %",
        "Monthly (ex VAT)","Monthly (incl VAT)","Annual (ex VAT)","Annual (incl VAT)",
        "Free Trial Days","Trial Once/Usr",
      ],
      ...filteredProducts.map((p) => {
        const f = toFormValues(p);
        const vat = (f.vatPercent ?? 0) / 100;
        const mEx = f.price_monthly ?? null;
        const aEx = f.price_annual ?? null;
        const mIn = mEx != null ? inclVat(mEx, vat) : null;
        const aIn = aEx != null ? inclVat(aEx, vat) : null;
        return [
          p.id, p.name || "", (p.description || "").replace(/\n/g, " "),
          String(!!f.active), f.currency || "EUR", f.country || "DE",
          f.vatPercent ?? "", mEx ?? "", mIn ?? "", aEx ?? "", aIn ?? "",
          f.freeTrialDays ?? 0, String(!!f.trialOncePerUser),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const renderActions = (record) => {
    const items = [
      { key: "view", label: "View", icon: <EyeOutlined /> },
      { key: "edit", label: "Edit", icon: <EditOutlined /> },
      { key: "delete", label: <span className="text-red-600">Delete</span>, icon: <DeleteOutlined /> },
    ];
    const onMenuClick = ({ key }) => {
      if (key === "view") return openView(record.id);
      if (key === "edit") return openEdit(record.id);
      if (key === "delete") {
        Modal.confirm({
          title: "Delete product?",
          content: "This will permanently remove the product.",
          okText: "Delete",
          okButtonProps: { danger: true },
          onOk: () => onDelete(record.id),
        });
      }
    };
    return (
      <Dropdown menu={{ items, onClick: onMenuClick }} trigger={["click"]}>
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    );
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
    const nameCol = {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      sorter: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
      render: (val, record) =>
        val ? (
          <Button type="link" className="!px-0" onClick={() => openView(record.id)}>
            <Text strong>{val}</Text>
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    };
    const descCol = {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (val) => (
        <Paragraph className="!mb-0" ellipsis={{ rows: 2, tooltip: val || "—" }}>
          {val || "—"}
        </Paragraph>
      ),
    };
    const regionCol = {
      title: "Region",
      key: "region",
      width: 160,
      render: (_, record) => {
        const f = toFormValues(record);
        const vatP = f.vatPercent ?? Math.round((COUNTRY_VAT[f.country || "DE"] || 0) * 100);
        return (
          <Space size="small">
            <Tag>{f.country || "DE"}</Tag>
            <Tag color="blue">{vatP}% VAT</Tag>
          </Space>
        );
      },
      responsive: ["sm"],
    };
    const pricingCol = {
      title: "Pricing (ex / incl. VAT)",
      key: "pricing",
      width: 280,
      render: (_, record) => {
        const f = toFormValues(record);
        const vatRate = (f.vatPercent ?? 0) / 100;
        const mEx = f.price_monthly;
        const aEx = f.price_annual;
        const mIn = inclVat(mEx, vatRate);
        const aIn = inclVat(aEx, vatRate);
        return (
          <div className="leading-tight">
            <div>
              <Text type="secondary">Monthly:</Text>{" "}
              <Text>
                {mEx != null ? money(mEx, f.currency) : "—"}{" "}
                <span className="text-gray-500">/</span>{" "}
                <strong>{mIn != null ? money(mIn, f.currency) : "—"}</strong>
              </Text>
            </div>
            <div>
              <Text type="secondary">Annual:</Text>{" "}
              <Text>
                {aEx != null ? money(aEx, f.currency) : "—"}{" "}
                <span className="text-gray-500">/</span>{" "}
                <strong>{aIn != null ? money(aIn, f.currency) : "—"}</strong>
              </Text>
            </div>
          </div>
        );
      },
    };
    const trialCol = {
      title: "Free Trial",
      key: "trial",
      width: 160,
      render: (_, record) => {
        const f = toFormValues(record);
        const days = Number(f.freeTrialDays || 0);
        return days > 0 ? (
          <Space size="small">
            <Tag color="green">{days} day{days !== 1 ? "s" : ""}</Tag>
            {f.trialOncePerUser ? <Tag color="purple">1x/user</Tag> : null}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
      responsive: ["sm"],
    };
    const statusCol = {
      title: "Status",
      key: "status",
      width: 170,
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (val, r) => getStatusKey(r) === val,
      render: (_, record) => {
        const raw =
          record?.status ?? record?.active ?? record?.is_active ?? record?.product_status ?? record?.state;

        let isBool = null;
        if (typeof raw === "boolean") isBool = raw;
        else if (typeof raw === "number") isBool = raw === 1;
        else if (typeof raw === "string") {
          const s = raw.trim().toLowerCase();
          if (["true", "1", "active"].includes(s)) isBool = true;
          else if (["false", "0", "inactive"].includes(s)) isBool = false;
        }

        if (isBool !== null) {
          return (
            <Tag
              color={isBool ? "green" : "default"}
              icon={isBool ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CloseCircleTwoTone twoToneColor="#bfbfbf" />}
            >
              {isBool ? "Active" : "Inactive"}
            </Tag>
          );
        }
        if (typeof raw === "string" && raw.trim()) {
          return <Tag color={statusColor(raw)}>{titleCase(raw)}</Tag>;
        }
        return <Text type="secondary">—</Text>;
      },
    };

    return {
      id: idCol,
      name: nameCol,
      description: descCol,
      region: regionCol,
      pricing: pricingCol,
      trial: trialCol,
      status: statusCol,
    };
  }, [openView]);

  // Build visible columns + always-on Actions
  let columns = visibleCols.map((k) => COLUMNS_MAP[k]).filter(Boolean);
  columns.push({
    title: "Actions",
    key: "actions",
    fixed: isSmDown ? "right" : undefined,
    width: 100,
    render: (_, record) => renderActions(record),
  });

  const resetFilters = () => {
    setStatusFilter("all");
    setQ("");
    fetchProducts();
  };

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <Card
        bordered={false}
        style={{
          background:
            "linear-gradient(135deg, rgba(22,119,255,0.12) 0%, rgba(82,196,26,0.12) 100%)",
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={8}>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-semibold m-0">Products</h1>
            </div>
          </Col>
          <Col xs={24} md={16}>
            <Row gutter={[16, 16]} justify="end">
              <Col>
                <Space wrap>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search name or description…"
                    onChange={(e) => debouncedSetQ(e.target.value)}
                    style={{ width: 240 }}
                  />
                  <Tooltip title="Show / Hide columns">
                    <Button icon={<SettingOutlined />} onClick={() => setColModalOpen(true)} />
                  </Tooltip>
                  <Tooltip title="Export current view">
                    <Button icon={<DownloadOutlined />} onClick={exportCsv} />
                  </Tooltip>
                  <Tooltip title="Reset filters & refresh">
                    <Button icon={<ReloadOutlined />} onClick={resetFilters} />
                  </Tooltip>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    <span className="hidden sm:inline">Add Product</span>
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Status segmented */}
      <Segmented
        options={statusOptions}
        value={statusFilter}
        onChange={setStatusFilter}
        size={isMdUp ? "middle" : "small"}
        className="w-full sm:w-auto"
        block={isSmDown}
      />

      {/* Products table */}
      <Card>
        <Table
          loading={loadingTable}
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          size={isMdUp ? "middle" : "small"}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            size: isMdUp ? "default" : "small",
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          title={() => (
            <Space>
              <Button danger disabled={!selectedRowKeys.length} onClick={onBulkDelete} icon={<DeleteOutlined />}>
                Delete selected
              </Button>
              <Text type="secondary">
                {selectedRowKeys.length ? `${selectedRowKeys.length} selected` : ""}
              </Text>
            </Space>
          )}
          rowClassName={(_, idx) =>
            idx % 2 === 0 ? "bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(24,144,255,0.06)]" : "hover:bg-[rgba(24,144,255,0.06)]"
          }
        />
      </Card>

      {/* Modal: Add/Edit */}
      <Modal
        title={modalTitle}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        okText={editingId ? "Save" : "Create Product"}
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
              active: true,
              currency: "EUR",
              country: "DE",
              vatPercent: Math.round((COUNTRY_VAT.DE || 0) * 100),
              freeTrialDays: 0,
              trialOncePerUser: true,
            }}
          >
            <Row gutter={[16, 8]}>
              <Col xs={24} md={14}>
                <Form.Item
                  label="Product Name"
                  name="name"
                  rules={[{ required: true, message: "Product name is required" }]}
                >
                  <Input placeholder="Enter product name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item label="Active" name="active" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Currency"
                  name="currency"
                  rules={[{ required: true, message: "Currency is required" }]}
                >
                  <Select options={CURRENCY_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Country (VAT region)"
                  name="country"
                  rules={[{ required: true, message: "Country is required" }]}
                >
                  <Select
                    options={COUNTRY_OPTIONS}
                    onChange={(cc) => {
                      const rate = COUNTRY_VAT[cc] ?? 0;
                      const current = form.getFieldValue("vatPercent");
                      if (current == null || current === 0) {
                        form.setFieldsValue({ vatPercent: Math.round(rate * 100) });
                      }
                    }}
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="VAT %"
                  name="vatPercent"
                  tooltip="Used to compute displayed price incl. VAT"
                  rules={[
                    { required: true, message: "VAT % required" },
                    {
                      validator: (_, v) => {
                        const n = Number(v);
                        if (Number.isFinite(n) && n >= 0 && n <= 30) return Promise.resolve();
                        return Promise.reject(new Error("Enter a VAT % between 0 and 30"));
                      },
                    },
                  ]}
                >
                  <InputNumber min={0} max={30} step={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Monthly Price (ex VAT)" name="price_monthly">
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="e.g., 9.99" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Annual Price (ex VAT)" name="price_annual">
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="e.g., 99.00" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Free Trial (days)" name="freeTrialDays" tooltip="Length of the free trial period">
                  <InputNumber min={0} max={60} style={{ width: "100%" }} placeholder="e.g., 14" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Allow once per user"
                  name="trialOncePerUser"
                  tooltip="Enforce 1x free trial per user"
                  valuePropName="checked"
                >
                  <Switch defaultChecked />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item label="Description" name="description">
                  <Input.TextArea rows={isMdUp ? 4 : 3} placeholder="Optional description" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* Columns Modal */}
      <Modal
        title="Show / Hide columns"
        open={colModalOpen}
        onCancel={() => setColModalOpen(false)}
        onOk={() => setColModalOpen(false)}
        okText="Done"
      >
        <div className="mb-2">
          <Space wrap>
            <Button onClick={() => setVisibleCols(Object.keys(COLUMNS_MAP))}>Select all</Button>
            <Button onClick={() => setVisibleCols(DEFAULT_VISIBLE.slice())}>Reset</Button>
          </Space>
        </div>

        {(() => {
          const entries = Object.keys(COLUMNS_MAP).map((k) => ({
            value: k,
            label: COLUMNS_MAP[k]?.title || k,
          }));
          return (
            <Checkbox.Group
              value={Array.from(new Set(visibleCols))}
              onChange={(vals) => setVisibleCols(Array.from(new Set(vals)))}
              className="grid grid-cols-1 sm:grid-cols-2 gap-y-2"
              options={entries}
            />
          );
        })()}

        <Divider />
        <Text type="secondary" className="block">“Actions” is always visible.</Text>
      </Modal>

      {/* View Drawer */}
      <Drawer
        title="Product"
        open={viewOpen}
        onClose={closeView}
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 48 : 720)}
        extra={
          viewRec ? (
            <Space>
              <Button onClick={() => openEdit(viewRec.id)} icon={<EditOutlined />}>Edit</Button>
              <Button danger onClick={() => {
                Modal.confirm({
                  title: "Delete product?",
                  okText: "Delete",
                  okButtonProps: { danger: true },
                  onOk: () => onDelete(viewRec.id),
                });
              }} icon={<DeleteOutlined />}>Delete</Button>
            </Space>
          ) : null
        }
      >
        {viewLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : viewRec ? (
          (() => {
            const f = toFormValues(viewRec);
            const vatRate = (f.vatPercent ?? 0) / 100;
            const mEx = f.price_monthly;
            const aEx = f.price_annual;
            const mIn = inclVat(mEx, vatRate);
            const aIn = inclVat(aEx, vatRate);

            return (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="ID">{viewRec.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{viewRec.name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  {f.active ? (
                    <Tag color="green" icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}>Active</Tag>
                  ) : (
                    <Tag icon={<CloseCircleTwoTone twoToneColor="#bfbfbf" />}>Inactive</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Region / VAT">
                  <Space size="small">
                    <Tag>{f.country || "DE"}</Tag>
                    <Tag color="blue">{f.vatPercent ?? Math.round((COUNTRY_VAT[f.country || "DE"] || 0) * 100)}% VAT</Tag>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Currency">{f.currency || "EUR"}</Descriptions.Item>

                <Descriptions.Item label="Monthly (ex / incl. VAT)">
                  <Space split={<span>/</span>}>
                    <Text>{mEx != null ? money(mEx, f.currency) : "—"}</Text>
                    <Text strong>{mIn != null ? money(mIn, f.currency) : "—"}</Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Annual (ex / incl. VAT)">
                  <Space split={<span>/</span>}>
                    <Text>{aEx != null ? money(aEx, f.currency) : "—"}</Text>
                    <Text strong>{aIn != null ? money(aIn, f.currency) : "—"}</Text>
                  </Space>
                </Descriptions.Item>

                <Descriptions.Item label="Free Trial">
                  {Number(f.freeTrialDays || 0) > 0 ? (
                    <Space>
                      <Tag color="green">{f.freeTrialDays} day{f.freeTrialDays !== 1 ? "s" : ""}</Tag>
                      {f.trialOncePerUser ? <Tag color="purple">1x per user</Tag> : null}
                    </Space>
                  ) : "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Description">
                  <Paragraph className="!mb-0">{viewRec.description || "—"}</Paragraph>
                </Descriptions.Item>
              </Descriptions>
            );
          })()
        ) : (
          <Text type="secondary">No data.</Text>
        )}
      </Drawer>
    </div>
  );
}
