// src/pages/billing/Product.jsx (or wherever this page lives)
import { useEffect, useMemo, useState } from "react";
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
  Statistic,
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
} from "@ant-design/icons";
import api from "@/api/axios";

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

/* ----------------------------- helpers ----------------------------- */
const INTERVAL_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const CURRENCY_OPTIONS = [
  { label: "EUR (€)", value: "EUR" },
  { label: "USD ($)", value: "USD" },
  { label: "ZAR (R)", value: "ZAR" },
];

const SUBSCRIPTION_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const CHILDREN_OPTIONS = [
  { label: "2 Kids", value: 2 },
  { label: "3 Kids", value: 3 },
];

const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  (typeof api.isCancel === "function" && api.isCancel(err));

function toFormValues(apiProduct) {
  if (!apiProduct) return {};
  return {
    name: apiProduct.name || apiProduct.nickname || "",
    interval: (apiProduct.interval || "monthly").toLowerCase(),
    price: apiProduct.priceCents != null ? apiProduct.priceCents / 100 : undefined,
    currency: apiProduct.currency || "EUR",
    active:
      typeof apiProduct.active === "boolean"
        ? apiProduct.active
        : String(apiProduct.status || "").toLowerCase() === "active",
    num_children:
      apiProduct?.metadata?.num_children ??
      apiProduct?.number_of_children ??
      undefined,
    description: apiProduct.description || "",
  };
}

function toApiPayload(form, id) {
  const payload = {
    id,
    name: form.name?.trim(),
    nickname: form.name?.trim(),
    interval: form.interval,
    priceCents: form.price != null ? Math.round(form.price * 100) : undefined,
    currency: form.currency,
    active: Boolean(form.active),
    metadata: {
      num_children:
        form.num_children !== undefined && form.num_children !== null
          ? Number(form.num_children)
          : undefined,
    },
    description: form.description || "",
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  if (payload.metadata) {
    Object.keys(payload.metadata).forEach(
      (k) => payload.metadata[k] === undefined && delete payload.metadata[k]
    );
    if (!Object.keys(payload.metadata).length) delete payload.metadata;
  }
  return payload;
}

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

/* --------------------------------- page --------------------------------- */
export default function Product() {
  const screens = useBreakpoint();
  const isMdUp = screens.md;
  const isSmDown = !screens.sm;

  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [childrenFilter, setChildrenFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);

  const [open, setOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Product");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form] = Form.useForm();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const statusOptions = useMemo(() => {
    const setVals = new Set();
    (products || []).forEach((p) => {
      const raw =
        p?.status ?? p?.active ?? p?.is_active ?? p?.product_status ?? p?.state;
      if (typeof raw === "boolean") setVals.add(raw ? "active" : "inactive");
      else if (typeof raw === "number") setVals.add(raw === 1 ? "active" : "inactive");
      else if (typeof raw === "string" && raw.trim()) setVals.add(raw.trim().toLowerCase());
    });
    const opts = [
      { label: "All", value: "all" },
      { label: <span><CheckCircleTwoTone twoToneColor="#52c41a" /> Active</span>, value: "active" },
      { label: <span><CloseCircleTwoTone twoToneColor="#bfbfbf" /> Inactive</span>, value: "inactive" },
    ];
    Array.from(setVals).forEach((s) => {
      if (!opts.find((o) => o.value === s)) opts.push({ label: titleCase(s), value: s });
    });
    return opts;
  }, [products]);

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

  const debouncedSetQ = useMemo(() => debounce(setQ, 250), []);

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (statusFilter !== "all" && getStatusKey(p) !== statusFilter) return false;
      if (
        subscriptionFilter !== "all" &&
        String(p.subscription_type || "").toLowerCase() !== subscriptionFilter
      )
        return false;
      if (
        childrenFilter !== "all" &&
        Number(p.number_of_children) !== Number(childrenFilter)
      )
        return false;

      if (!query) return true;
      const hay = `${p?.name || ""} ${p?.description || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [products, statusFilter, subscriptionFilter, childrenFilter, q]);

  const openAdd = () => {
    setEditingId(null);
    setModalTitle("Add Product");
    setOpen(true);
    setLoadingForm(false);
    form.resetFields();
    form.setFieldsValue({
      interval: "monthly",
      currency: "EUR",
      active: true,
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
      ["ID", "Name", "Description", "Interval", "Price", "Currency", "Status", "Subscription Type", "Number of Children"],
      ...filteredProducts.map((p) => [
        p.id,
        p.name || "",
        (p.description || "").replace(/\n/g, " "),
        p.interval || "",
        p.priceCents != null ? (p.priceCents / 100).toFixed(2) : "",
        p.currency || "",
        getStatusKey(p) || "",
        p.subscription_type || "",
        p.number_of_children ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderActions = (record) => {
    const items = [
      { key: "edit", label: "Edit", icon: <EditOutlined /> },
      {
        key: "delete",
        label: <span className="text-red-600">Delete</span>,
        icon: <DeleteOutlined />,
      },
    ];
    const onMenuClick = ({ key }) => {
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

  const columns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 90,
        sorter: (a, b) => (a.id || 0) - (b.id || 0),
        render: (val) => <Text strong>{val}</Text>,
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        sorter: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
        render: (val) => (val ? <Text strong>{val}</Text> : <Text type="secondary">—</Text>),
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        ellipsis: true,
        render: (val) => (
          <Paragraph className="!mb-0" ellipsis={{ rows: 2, tooltip: val || "—" }}>
            {val || "—"}
          </Paragraph>
        ),
      },
      {
        title: "Subscription",
        dataIndex: "subscription_type",
        key: "subscription_type",
        sorter: (a, b) => String(a.subscription_type || "").localeCompare(String(b.subscription_type || "")),
        render: (val) => (val ? <Tag color="geekblue">{titleCase(val)}</Tag> : <Text type="secondary">—</Text>),
        responsive: ["md"],
      },
      {
        title: "Children",
        dataIndex: "number_of_children",
        key: "number_of_children",
        sorter: (a, b) => (a.number_of_children ?? 0) - (b.number_of_children ?? 0),
        render: (val) =>
          Number.isFinite(Number(val)) ? <Tag color="purple">{val} Kids</Tag> : <Text type="secondary">—</Text>,
        responsive: ["sm"],
      },
      {
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
            record?.status ??
            record?.active ??
            record?.is_active ??
            record?.product_status ??
            record?.state;

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
        responsive: ["sm"],
      },
      {
        title: "Actions",
        key: "actions",
        fixed: isSmDown ? "right" : undefined,
        width: 100,
        render: (_, record) => renderActions(record),
      },
    ],
    [isSmDown]
  );

  const SUBSCRIPTION_FILTER_OPTIONS = useMemo(
    () => [{ label: "All", value: "all" }, ...SUBSCRIPTION_OPTIONS],
    []
  );
  const CHILDREN_FILTER_OPTIONS = useMemo(
    () => [{ label: "All", value: "all" }, ...CHILDREN_OPTIONS],
    []
  );

  const resetFilters = () => {
    setStatusFilter("all");
    setSubscriptionFilter("all");
    setChildrenFilter("all");
    setQ("");
    fetchProducts();
  };

  // Quick stats
  const totalCount = products.length;
  const activeCount = products.filter((p) => getStatusKey(p) === "active").length;
  const avgPrice = useMemo(() => {
    const prices = products.map((p) => (p.priceCents != null ? p.priceCents / 100 : null)).filter((n) => n != null);
    if (!prices.length) return 0;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }, [products]);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header with stats and actions */}
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

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Space wrap size={isMdUp ? "middle" : "small"}>
            <span className="font-medium">Subscription Type:</span>
            <Segmented
              options={SUBSCRIPTION_FILTER_OPTIONS}
              value={subscriptionFilter}
              onChange={setSubscriptionFilter}
              size={isMdUp ? "middle" : "small"}
            />
          </Space>
          <Space wrap size={isMdUp ? "middle" : "small"}>
            <span className="font-medium">Number of Children:</span>
            <Segmented
              options={CHILDREN_FILTER_OPTIONS}
              value={childrenFilter}
              onChange={setChildrenFilter}
              size={isMdUp ? "middle" : "small"}
            />
          </Space>
        </div>
      </Card>

      {/* Products table */}
      <Card>
        <Table
          loading={loadingTable}
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          size={isMdUp ? "middle" : "small"}
          scroll={{ x: 900 }}
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
        width={isMdUp ? 640 : "100%"}
        style={isMdUp ? {} : { top: 8, padding: 0 }}
        bodyStyle={isMdUp ? {} : { paddingInline: 12 }}
      >
        {loadingForm ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{ interval: "monthly", currency: "EUR", active: true }}
          >
            <Row gutter={[16, 8]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Product Name"
                  name="name"
                  rules={[{ required: true, message: "Product name is required" }]}
                >
                  <Input placeholder="Enter product name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Active" name="active" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Subscription Interval"
                  name="interval"
                  rules={[{ required: true, message: "Interval is required" }]}
                >
                  <Select options={INTERVAL_OPTIONS} placeholder="Select interval" />
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
                  label="Price"
                  name="price"
                  rules={[{ required: true, message: "Price is required" }]}
                >
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="e.g., 19.99" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Number of Children"
                  name="num_children"
                  tooltip="Stored in metadata.num_children"
                  rules={[
                    () => ({
                      validator(_, value) {
                        if (value == null || value === "") return Promise.resolve();
                        if (Number.isInteger(value) && value >= 0 && value <= 10) return Promise.resolve();
                        return Promise.reject(new Error("Enter an integer between 0 and 10"));
                      },
                    }),
                  ]}
                >
                  <InputNumber min={0} max={10} style={{ width: "100%" }} placeholder="e.g., 2" />
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
    </div>
  );
}
