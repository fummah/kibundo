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
import ConfirmDrawer from "@/components/common/ConfirmDrawer";
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

  return {
    name: apiProduct.name || apiProduct.nickname || "",
    description: apiProduct.description || "",
    active:
      typeof apiProduct.active === "boolean"
        ? apiProduct.active
        : String(apiProduct.status || "").toLowerCase() === "active",
    currency: apiProduct.currency || "EUR",
    price,
    freeTrialDays: apiProduct.freeTrialDays ?? 0,
    trialOncePerUser:
      apiProduct.trialOncePerUser != null
        ? !!apiProduct.trialOncePerUser
        : true,
  };
}

function toApiPayload(form, id) {
  const payload = {
    id,
    name: form.name?.trim(),
    nickname: form.name?.trim(),
    description: form.description || "",
    active: Boolean(form.active),
    currency: form.currency || "EUR",
    priceCents:
      form.price != null ? Math.round(Number(form.price) * 100) : undefined,
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

  const drawerWidth = useResponsiveDrawerWidth();
  const [messageApi, contextHolder] = message.useMessage();

  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

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
        messageApi.error("Failed to load product.");
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
      messageApi.success(editingId ? "Product saved." : "Product created.");
      setOpen(false);
      fetchProducts();
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
      title: "Free Trial",
      key: "trial",
      width: 160,
      render: (_, record) => {
        const f = toFormValues(record);
        const days = Number(f.freeTrialDays || 0);
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

    return {
      id: idCol,
      name: nameCol,
      description: descCol,
      pricing: pricingCol,
      trial: trialCol,
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
    </Space>
  );

  const toolbarRight = (
    <Space wrap>
      {selectedRowKeys.length > 0 && (
        <Button
          danger
          onClick={() => setBulkOpen(true)}
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
              ["ID", "Name", "Description", "Active", "Currency", "Price", "Free Trial Days", "Trial Once/Usr"],
              ...filteredProducts.map((p) => {
                const f = toFormValues(p);
                return [
                  p.id,
                  p.name || "",
                  (p.description || "").replace(/\n/g, " "),
                  String(!!f.active),
                  f.currency || "EUR",
                  f.price != null ? f.price : "",
                  f.freeTrialDays ?? 0,
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
        defaultVisible={["id", "name", "description", "pricing", "trial", "status"]}
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
        destroyOnClose
        width={isMdUp ? 720 : "100%"}
        style={isMdUp ? {} : { top: 8, padding: 0 }}
        bodyStyle={isMdUp ? {} : { paddingInline: 12 }}
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
                  label="Price"
                  name="price"
                  rules={[{ required: true, message: "Price is required" }]}
                >
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

      {/* View Drawer (offset under header) */}
      <Drawer
        title="Product"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        style={{ top: HEADER_OFFSET }}
        maskStyle={{ top: HEADER_OFFSET }}
        extra={
          viewRec ? (
            <Space>
              <Button onClick={() => openEdit(viewRec.id)} icon={<EditOutlined />}>Edit</Button>
              <Button danger onClick={() => askDelete(viewRec)} icon={<DeleteOutlined />}>Delete</Button>
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
                <Descriptions.Item label="Free Trial">
                  {Number(f.freeTrialDays || 0) > 0 ? (
                    <Space>
                      <Text strong>{f.freeTrialDays}</Text>
                      <Text type="secondary">day{f.freeTrialDays !== 1 ? "s" : ""}</Text>
                      {f.trialOncePerUser ? <Text type="secondary">(1x per user)</Text> : null}
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

      {/* Confirm Drawer: Single delete (header Close; footer cancel hidden) */}
      <ConfirmDrawer
        open={confirmOpen}
        title="Delete product?"
        description={
          <>
            This will permanently delete product{" "}
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

      {/* Confirm Drawer: Bulk delete (header Close; footer cancel hidden) */}
      <ConfirmDrawer
        open={bulkOpen}
        title="Delete selected products?"
        description={
          <>
            You are about to delete{" "}
            <Text strong>{selectedRowKeys.length}</Text>{" "}
            product{selectedRowKeys.length === 1 ? "" : "s"}. This action cannot be undone.
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
