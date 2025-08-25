// src/pages/billing/Subscriptions.jsx
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
  Select,
  DatePicker,
  Dropdown,
  Menu,
  Typography,
  message,
  Skeleton,
  Empty,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

const { Text, Title } = Typography;

/* ----------------------------- helpers ---------------------------- */
const money = (n, currency = "EUR") =>
  n == null
    ? "-"
    : Number(n).toLocaleString(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const read = (obj, path) => {
  if (!obj) return undefined;
  if (Array.isArray(path))
    return path.reduce((a, k) => (a == null ? a : a[k]), obj);
  if (typeof path === "string" && path.includes("."))
    return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
  return obj[path];
};

const normalizeStatus = (raw) => {
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

const statusColorMap = {
  active: "green",
  trialing: "blue",
  past_due: "orange",
  unpaid: "volcano",
  canceled: "red",
  cancelled: "red",
  incomplete: "geekblue",
  incomplete_expired: "magenta",
  paused: "gold",
  inactive: "default",
};

const renderStatusTag = (raw) => {
  const val = normalizeStatus(raw);
  if (!val) return <Tag color="default">-</Tag>;
  const color = statusColorMap[val] || "default";
  const label = val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Tag color={color}>{label}</Tag>;
};

const SUB_STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Trialing", value: "trialing" },
  { label: "Past Due", value: "past_due" },
  { label: "Canceled", value: "canceled" },
  { label: "Incomplete", value: "incomplete" },
  { label: "Unpaid", value: "unpaid" },
];

/* ---------------------------------- page ---------------------------------- */
export default function Subscriptions() {
  const navigate = useNavigate();

  // ui & filters
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");

  // data
  const [subs, setSubs] = useState([]);
  const [parents, setParents] = useState([]);
  const [products, setProducts] = useState([]);

  // modal
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  /* ------------------------------- load data ------------------------------ */
  const loadAll = async (signal) => {
    try {
      setLoading(true);
      const [sRes, pRes, prRes] = await Promise.all([
        api.get("/subscriptions", { signal }),
        api.get("/parents", { signal }),
        api.get("/products", { signal }),
      ]);
      setSubs(sRes?.data || []);
      setParents(pRes?.data || []);
      setProducts(prRes?.data || []);
    } catch (err) {
      const canceled = err?.name === "AbortError" || err?.code === "ERR_CANCELED";
      if (!canceled) {
        console.error(err);
        message.error("Failed to load subscriptions.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    loadAll(ctrl.signal);
    return () => ctrl.abort();
  }, []);

  /* ----------------------------- derived maps ----------------------------- */
  const parentMap = useMemo(() => {
    const m = new Map();
    (parents || []).forEach((p) => m.set(p.id ?? p.parent_id, p));
    return m;
  }, [parents]);

  const productMap = useMemo(() => {
    const m = new Map();
    (products || []).forEach((p) => m.set(p.id ?? p.product_id ?? p.stripe_product_id, p));
    return m;
  }, [products]);

  // ensure parent is present in each row for display
  const rows = useMemo(() => {
    return (subs || []).map((s) => {
      const parent = s.parent || parentMap.get(s.parent_id) || null;
      const product =
        s.product ||
        productMap.get(s.product_id) ||
        productMap.get(s.plan_id) || // some payloads store plan_id referencing product
        null;
      return { ...s, parent, product };
    });
  }, [subs, parentMap, productMap]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => normalizeStatus(r.status) === statusFilter);
  }, [rows, statusFilter]);

  /* -------------------------------- columns ------------------------------- */
  const columns = [
    {
      title: "Plan ID",
      key: "plan_id",
      width: 160,
      render: (_, r) => r.plan_id || r.product_id || read(r, "product.id") || "-",
      sorter: (a, b) =>
        String(a.plan_id || a.product_id || "").localeCompare(String(b.plan_id || b.product_id || "")),
    },
    {
      title: "Plan / Product",
      key: "plan_name",
      render: (_, r) =>
        read(r, "price.nickname") ||
        read(r, "product.name") ||
        read(r, "plan.name") ||
        "-",
      ellipsis: true,
    },
    {
      title: "Parent",
      key: "parent",
      render: (_, r) => read(r, "parent.name") || `#${r.parent_id}`,
      sorter: (a, b) =>
        String(read(a, "parent.name") || "").localeCompare(String(read(b, "parent.name") || "")),
    },
    {
      title: "Interval",
      key: "interval",
      width: 110,
      render: (_, r) =>
        read(r, "price.interval") ||
        read(r, "product.interval") ||
        read(r, "plan.interval") ||
        "-",
    },
    {
      title: "Amount",
      key: "amount",
      width: 150,
      render: (_, r) => {
        const cents =
          read(r, "price.unit_amount_cents") ??
          read(r, "product.unit_amount_cents") ??
          read(r, "plan.priceCents") ??
          0;
        const currency =
          read(r, "price.currency") ||
          read(r, "product.currency") ||
          "EUR";
        return money((cents || 0) / 100, currency);
      },
      sorter: (a, b) => {
        const aC =
          read(a, "price.unit_amount_cents") ??
          read(a, "product.unit_amount_cents") ??
          read(a, "plan.priceCents") ??
          0;
        const bC =
          read(b, "price.unit_amount_cents") ??
          read(b, "product.unit_amount_cents") ??
          read(b, "plan.priceCents") ??
          0;
        return aC - bC;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s) => renderStatusTag(s),
      filters: SUB_STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
        text: o.label,
        value: o.value,
      })),
      onFilter: (val, r) => normalizeStatus(r.status) === val,
    },
    {
      title: "Renews",
      dataIndex: "current_period_end",
      key: "renews",
      width: 170,
      render: (v) =>
        v
          ? new Date(v).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })
          : "-",
      sorter: (a, b) =>
        new Date(a.current_period_end || 0) - new Date(b.current_period_end || 0),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 80,
      render: (_, r) => {
        const menu = (
          <Menu
            items={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: "View",
                onClick: () => navigate(`/billing/subscriptions/${r.id}`),
              },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                danger: true,
                label: "Delete",
                onClick: () => onDelete(r),
              },
            ]}
          />
        );
        return (
          <Dropdown overlay={menu} trigger={["click"]}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  /* --------------------------------- CRUD --------------------------------- */
  const onDelete = async (row) => {
    Modal.confirm({
      title: "Delete subscription?",
      content: `This will permanently delete subscription #${row?.id}.`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await api.delete(`/subscription/${row.id}`);
          message.success("Subscription deleted.");
          setSubs((prev) => prev.filter((s) => s.id !== row.id));
        } catch (err) {
          console.error(err);
          message.error("Delete failed.");
        }
      },
    });
  };

  const openCreate = () => {
    form.resetFields();
    setOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        parent_id: values.parent_id,
        plan_id: values.plan_id, // you asked for plan_id FIRST
        status: values.status,
        current_period_end: values.current_period_end
          ? values.current_period_end.toISOString()
          : null,
      };
      await api.post("/addsubscription", payload);
      message.success("Subscription created.");
      setOpen(false);
      // reload list (or optimistic append if your API returns the new record)
      const res = await api.get("/subscriptions");
      setSubs(res?.data || []);
    } catch (err) {
      if (err?.errorFields) return; // form error, already shown
      console.error(err);
      message.error("Create failed.");
    }
  };

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="p-4 md:p-6 max-w-[1700px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Title level={3} className="!mb-0">Billing / Subscriptions</Title>
        <Space wrap>
          <Segmented
            options={SUB_STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={() => loadAll()} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Subscription
          </Button>
        </Space>
      </div>

      <Card
        hoverable
        variant="outlined"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          locale={{ emptyText: loading ? <Skeleton active /> : <Empty /> }}
          rowKey={(r) => r.id}
          loading={loading}
          dataSource={filtered}
          columns={columns}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          onRow={(record) => ({
            onDoubleClick: () => {
              if (record?.id) navigate(`/billing/subscriptions/${record.id}`);
            },
          })}
        />
      </Card>

      {/* Create Subscription Modal */}
      <Modal
        title="Create Subscription"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCreate}
        okText="Create"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="plan_id"
            label="Plan ID"
            rules={[{ required: true, message: "Please select a plan" }]}
            tooltip="Stored as plan_id; shown before plan/product name"
          >
            <Select
              placeholder="Select plan/product"
              showSearch
              optionFilterProp="label"
              options={(products || []).map((p) => ({
                label: `${p.id ?? p.stripe_product_id} — ${p.name ?? p.nickname ?? "Unnamed"}`,
                value: String(p.id ?? p.stripe_product_id),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="parent_id"
            label="Parent"
            rules={[{ required: true, message: "Please select a parent" }]}
          >
            <Select
              placeholder="Select parent"
              showSearch
              optionFilterProp="label"
              options={(parents || []).map((p) => ({
                label: p.name ? `${p.name} (#${p.id})` : `#${p.id}`,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            initialValue="active"
            rules={[{ required: true, message: "Please choose a status" }]}
          >
            <Select
              options={[
                { label: "Active", value: "active" },
                { label: "Trialing", value: "trialing" },
                { label: "Past Due", value: "past_due" },
                { label: "Canceled", value: "canceled" },
                { label: "Incomplete", value: "incomplete" },
                { label: "Unpaid", value: "unpaid" },
              ]}
            />
          </Form.Item>

          <Form.Item name="current_period_end" label="Current Period End">
            <DatePicker
              className="w-full"
              allowClear
              showTime={false}
              disabledDate={(d) => d && d.isBefore(dayjs().startOf("day"))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
