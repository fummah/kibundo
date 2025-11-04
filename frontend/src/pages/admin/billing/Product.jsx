// src/pages/billing/Product.jsx
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
 
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";

import BillingEntityList from "@/components/billing/BillingEntityList";
import StatusTag from "@/components/common/StatusTag";
import MoneyText from "@/components/common/MoneyText";
import useResponsiveDrawerWidth from "@/hooks/useResponsiveDrawerWidth";

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

/* Offset for fixed top nav/header so drawers sit below it */
const HEADER_OFFSET = 64;

/* ----------------------------- helpers ----------------------------- */
const CURRENCY_OPTIONS = [
  { label: "EUR (€)", value: "EUR" }, // Germany currency
  { label: "USD ($)", value: "USD" },
];

const CURRENCY_SYMBOL = { EUR: "€", USD: "$", ZAR: "R" };

const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  (typeof api.isCancel === "function" && api.isCancel(err));

const titleCase = (s) =>
  String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const debounce = (fn, ms = 250) => {
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

/* ------------------------ adapters (API ↔ form) ------------------------ */
function toFormValues(apiProduct) {
  if (!apiProduct) return {};
  const price =
    apiProduct.price != null
      ? Number(apiProduct.price)
      : apiProduct.priceCents != null
        ? Number(apiProduct.priceCents) / 100
        : apiProduct.amountCents != null
          ? Number(apiProduct.amountCents) / 100
          : undefined;

  const metadata = apiProduct.metadata || {};
  
  return {
    name: apiProduct.name || apiProduct.nickname || "",
    description: apiProduct.description || "",
    active:
      typeof apiProduct.active === "boolean"
        ? apiProduct.active
        : String(apiProduct.status || "").toLowerCase() === "active",
    currency: apiProduct.currency || "EUR",
    price,
    trial_period_days: apiProduct.trial_period_days ?? 0,
    trialOncePerUser:
      apiProduct.trialOncePerUser != null
        ? !!apiProduct.trialOncePerUser
        : true,
    // Metadata fields
    billing_interval: metadata.billing_interval || "month",
    child_count: metadata.child_count || 1,
    sort_order: metadata.sort_order || 999,
    is_best_value: metadata.is_best_value || false,
  };
}

function toApiPayload(form, id) {
  const metadata = {
    billing_interval: form.billing_interval || "month",
    child_count: form.child_count || 1,
    sort_order: form.sort_order || 999,
    is_best_value: form.is_best_value || false,
  };
  
  const payload = {
    id,
    name: form.name?.trim(),
    nickname: form.name?.trim(),
    description: form.description || "",
    active: Boolean(form.active),
    currency: form.currency || "EUR",
    price: form.price != null ? Number(form.price) : undefined,
    trial_period_days:
      form.trial_period_days != null ? Number(form.trial_period_days) : 0,
    trialOncePerUser:
      form.trialOncePerUser != null ? !!form.trialOncePerUser : true,
    metadata,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}

/* --------------------------------- page --------------------------------- */
export default function Product() {
  const screens = useBreakpoint();
  const isMdUp = screens.md;

  const drawerWidth = useResponsiveDrawerWidth();
  const [messageApi, contextHolder] = message.useMessage();

  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);
  const [showTestProducts, setShowTestProducts] = useState(false); // Filter out test/admin products by default

  // Add/Edit modal
  const [open, setOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Product");
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

  // Confirm drawers (single & bulk)


  const fetchProducts = async () => {
    try {
      setLoadingTable(true);
      const res = await api.get("/products");
      setProducts(res.data || []);
    } catch (err) {
      console.error("Failed to load products", err);
      messageApi.error("Failed to load products.");
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
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];
    Array.from(setVals)
      .filter((s) => !opts.find((o) => o.value === s))
      .forEach((s) => opts.push({ label: titleCase(s), value: s }));
    return opts;
  }, [products]);

  const debouncedSetQ = useMemo(() => debounce(setQ, 250), []);
  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = (products || []).filter((p) => {
      // Filter by status
      if (statusFilter !== "all" && getStatusKey(p) !== statusFilter) return false;
      
      // Filter out test/admin products unless explicitly shown
      if (!showTestProducts) {
        const name = (p?.name || "").toLowerCase().trim();
        if (name.includes("test") || name.includes("admin") || name === "admin") {
          return false;
        }
      }
      
      // Filter by search query
      if (!query) return true;
      const hay = `${p?.name || ""} ${p?.description || ""}`.toLowerCase();
      return hay.includes(query);
    });
    
    // Sort by ID ascending (oldest first)
    return filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [products, statusFilter, q, showTestProducts]);

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
        const fallback = (products || []).find((p) => String(p.id) === String(id));
        setViewRec(fallback || null);
        if (!fallback) messageApi.error("Failed to load product.");
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
      price: undefined,
      trial_period_days: 5,
      trialOncePerUser: true,
      billing_interval: "month",
      child_count: 1,
      sort_order: 999,
      is_best_value: false,
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
        messageApi.error("Failed to load product.");
        setOpen(false);
      }
    } finally {
      setLoadingForm(false);
    }
  };

// inside Product.jsx

const onSave = async () => {
  try {
    const values = await form.validateFields();
    setSaving(true);

    const payload = toApiPayload(values, editingId || undefined);

    if (editingId) {
      // Update existing product
      await api.put(`/products/${editingId}`, payload);
      messageApi.success("Product updated successfully.");
    } else {
      // Create new product
      const createPayload = {
        name: payload.name,
        description: payload.description || "",
        price: payload.price,
        trial_period_days: payload.trial_period_days || 0,
        metadata: payload.metadata,
      };
      await api.post("/addproduct", createPayload);
      messageApi.success("Product created successfully.");
    }

    setOpen(false);
    fetchProducts();

    if (viewOpen && viewRec?.id && viewRec?.id === editingId) {
      openView(viewRec.id);
    }
  } catch (err) {
    if (err?.errorFields) return; // form validation errors
    if (!isCanceled(err)) {
      // Surface backend error details, if any
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Save failed.";
      console.error("Save product error:", err);
      messageApi.error(backendMsg);
    }
  } finally {
    setSaving(false);
  }
};

  const onDelete = async (id) => {
    try {
      await api.delete(`/product/${id}`);
      messageApi.success("Product deleted.");
      fetchProducts();
      if (viewOpen && viewRec?.id === id) closeView();
      setSelectedRowKeys((ks) => ks.filter((k) => k !== id));
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
      await Promise.all(selectedRowKeys.map((id) => api.delete(`/product/${id}`)));
      messageApi.success("Selected products deleted.");
      setSelectedRowKeys([]);
      fetchProducts();
      if (viewOpen && viewRec && selectedRowKeys.includes(viewRec.id)) {
        closeView();
      }
    } catch (e) {
      console.error(e);
      messageApi.error("Bulk delete failed.");
    }
  };

  const askDelete = (record) => {
    Modal.confirm({
      title: "Delete product?",
      content: (
        <>
          This will permanently delete product{" "}
          <Text strong>#{record.id ?? "—"}</Text>. This action cannot be undone.
        </>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await onDelete(record.id);
        } catch (error) {
          // Error is already handled in onDelete
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) return;
    Modal.confirm({
      title: "Delete selected products?",
      content: (
        <>
          You are about to delete <Text strong>{selectedRowKeys.length}</Text>{" "}
          product{selectedRowKeys.length === 1 ? "" : "s"}. This action cannot be undone.
        </>
      ),
      okText: "Delete all",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await onBulkDelete();
        } catch (error) {
          // Error is already handled in onBulkDelete
        }
      },
    });
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setQ("");
    fetchProducts();
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
    const pricingCol = {
      title: "Price",
      key: "pricing",
      width: 200,
      render: (_, record) => {
        const f = toFormValues(record);
        return f.price != null ? (
          <MoneyText amount={f.price} currency={f.currency} />
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    };
    const trialCol = {
      title: "Trial Period",
      key: "trial",
      width: 160,
      render: (_, record) => {
        const f = toFormValues(record);
        const days = Number(f.trial_period_days || 0);
        return days > 0 ? (
          <Space size="small">
            <span className="inline-flex items-center">
              <Text strong>{days}</Text>&nbsp;<Text type="secondary">day{days !== 1 ? "s" : ""}</Text>
            </span>
            {f.trialOncePerUser ? <Text type="secondary">(1x/user)</Text> : null}
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
      render: (_, record) => <StatusTag value={getStatusKey(record)} />,
    };
    const currencyCol = {
      title: "Currency",
      key: "currency",
      width: 100,
      render: (_, record) => {
        const f = toFormValues(record);
        return <Text>{f.currency || "EUR"}</Text>;
      },
      responsive: ["lg"],
    };
    const billingIntervalCol = {
      title: "Billing Interval",
      key: "billing_interval",
      width: 140,
      render: (_, record) => {
        const f = toFormValues(record);
        return f.billing_interval ? (
          <Text strong>{f.billing_interval.charAt(0).toUpperCase() + f.billing_interval.slice(1)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
      responsive: ["lg"],
    };
    const childCountCol = {
      title: "Child Count",
      key: "child_count",
      width: 120,
      render: (_, record) => {
        const f = toFormValues(record);
        return f.child_count ? (
          <Text>{f.child_count} {f.child_count === 1 ? "child" : "children"}</Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
      responsive: ["xl"],
    };
    const bestValueCol = {
      title: "Best Value",
      key: "best_value",
      width: 120,
      render: (_, record) => {
        const f = toFormValues(record);
        return <StatusTag value={f.is_best_value ? "active" : "inactive"} />;
      },
      responsive: ["xl"],
    };

    return {
      id: idCol,
      name: nameCol,
      description: descCol,
      currency: currencyCol,
      pricing: pricingCol,
      trial: trialCol,
      billing_interval: billingIntervalCol,
      child_count: childCountCol,
      best_value: bestValueCol,
      status: statusCol,
    };
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
        placeholder="Search name or description…"
        onChange={(e) => debouncedSetQ(e.target.value)}
        style={{ width: 240 }}
      />
      <Segmented
        options={statusOptions}
        value={statusFilter}
        onChange={setStatusFilter}
        size={isMdUp ? "middle" : "small"}
      />
      <Tooltip title="Show test/admin products">
        <Switch
          checked={showTestProducts}
          onChange={setShowTestProducts}
          checkedChildren="Show test"
          unCheckedChildren="Hide test"
          size="small"
        />
      </Tooltip>
    </Space>
  );

  const toolbarRight = (
    <Space wrap>
      {selectedRowKeys.length > 0 && (
        <Button
          danger
          onClick={handleBulkDelete}
          icon={<DeleteOutlined />}
        >
          Delete selected
        </Button>
      )}
      <Tooltip title="Export current view">
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const rows = [
              ["ID", "Name", "Description", "Active", "Currency", "Price", "Trial Period Days", "Trial Once/Usr"],
              ...filteredProducts.map((p) => {
                const f = toFormValues(p);
                return [
                  p.id,
                  p.name || "",
                  (p.description || "").replace(/\n/g, " "),
                  String(!!f.active),
                  f.currency || "EUR",
                  f.price != null ? f.price : "",
                  f.trial_period_days ?? 0,
                  String(!!f.trialOncePerUser),
                ];
              }),
            ];
            const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "products.csv"; a.click();
            URL.revokeObjectURL(url);
          }}
        />
      </Tooltip>
      <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
        <span className="hidden sm:inline">Add Product</span>
      </Button>
    </Space>
  );

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {contextHolder}
      <BillingEntityList
        title="Products"
        data={filteredProducts}
        loading={loadingTable}
        columnsMap={COLUMNS_MAP}
        storageKey="products.visibleCols.v2"
        defaultVisible={["id", "name", "status", "currency", "pricing", "trial", "billing_interval", "child_count", "best_value", "description"]}
        actionsRender={actionsRender}
        onRefresh={resetFilters}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        selection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pageSize={20}
        scrollX={800}
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
        okText={editingId ? "Save" : "Create Product"}
        confirmLoading={saving}
        destroyOnHidden
        width={isMdUp ? 720 : "100%"}
        style={isMdUp ? {} : { top: 8, padding: 0 }}
        styles={{ body: { paddingInline: 12 } }}
      >
        {loadingForm ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              active: true,
              currency: "EUR",
              price: undefined,
              trial_period_days: 5,
              trialOncePerUser: true,
              billing_interval: "month",
              child_count: 1,
              sort_order: 999,
              is_best_value: false,
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
                  label="Price"
                  name="price"
                  rules={[{ required: true, message: "Price is required" }]}
                  tooltip="Set to 0 for free plans with trial periods"
                >
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="e.g., 0.00 or 99.00" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item 
                  label="Trial Period Days" 
                  name="trial_period_days" 
                  tooltip="Length of the trial period in days"
                  rules={[{ required: true, message: "Trial period is required" }]}
                >
                  <InputNumber min={0} max={60} style={{ width: "100%" }} placeholder="e.g., 5" />
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

              <Col xs={24} md={12}>
                <Form.Item
                  label="Billing Interval"
                  name="billing_interval"
                  rules={[{ required: true, message: "Billing interval is required" }]}
                  tooltip="How often the subscription is billed"
                >
                  <Select>
                    <Select.Option value="week">Weekly</Select.Option>
                    <Select.Option value="month">Monthly</Select.Option>
                    <Select.Option value="year">Yearly</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Child Count"
                  name="child_count"
                  rules={[{ required: true, message: "Child count is required" }]}
                  tooltip="Number of children this plan supports"
                >
                  <Select>
                    <Select.Option value={1}>1 child (Starter)</Select.Option>
                    <Select.Option value={2}>2 children (Family)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Sort Order"
                  name="sort_order"
                  tooltip="Lower numbers appear first (10 = best value, 20 = regular)"
                >
                  <InputNumber min={0} max={999} style={{ width: "100%" }} placeholder="e.g., 10" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Best Value"
                  name="is_best_value"
                  tooltip="Mark this plan as 'Best Value'"
                  valuePropName="checked"
                >
                  <Switch />
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

      {/* View Drawer (offset under header) */}
      <Drawer
        title="Product"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        style={{ top: HEADER_OFFSET }}
        styles={{ mask: { top: HEADER_OFFSET } }}
        extra={
          viewRec ? (
            <Space>
              <Button onClick={() => openEdit(viewRec.id)} icon={<EditOutlined />}>Edit</Button>
            </Space>
          ) : null
        }
        footer={
          viewRec ? (
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeView}>Cancel</Button>
              <Button 
                danger 
                onClick={() => askDelete(viewRec)} 
                icon={<DeleteOutlined />}
              >
                Delete Product
              </Button>
            </Space>
          ) : null
        }
      >
        {viewLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : viewRec ? (
          (() => {
            const f = toFormValues(viewRec);
            return (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="ID">{viewRec.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{viewRec.name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <StatusTag value={f.active ? "active" : "inactive"} />
                </Descriptions.Item>
                <Descriptions.Item label="Currency">{f.currency || "EUR"}</Descriptions.Item>
                <Descriptions.Item label="Price">
                  {f.price != null ? <MoneyText amount={f.price} currency={f.currency} /> : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Trial Period">
                  {Number(f.trial_period_days || 0) > 0 ? (
                    <Space>
                      <Text strong>{f.trial_period_days}</Text>
                      <Text type="secondary">day{f.trial_period_days !== 1 ? "s" : ""}</Text>
                      {f.trialOncePerUser ? <Text type="secondary">(1x per user)</Text> : null}
                    </Space>
                  ) : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Billing Interval">
                  {f.billing_interval ? (
                    <Text strong>{f.billing_interval.charAt(0).toUpperCase() + f.billing_interval.slice(1)}</Text>
                  ) : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Child Count">
                  {f.child_count ? (
                    <Text strong>{f.child_count} {f.child_count === 1 ? "child" : "children"}</Text>
                  ) : "—"}
                </Descriptions.Item>
                {f.sort_order !== undefined && (
                  <Descriptions.Item label="Sort Order">
                    <Text>{f.sort_order}</Text>
                  </Descriptions.Item>
                )}
                {f.is_best_value !== undefined && (
                  <Descriptions.Item label="Best Value">
                    <StatusTag value={f.is_best_value ? "active" : "inactive"} />
                  </Descriptions.Item>
                )}
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
