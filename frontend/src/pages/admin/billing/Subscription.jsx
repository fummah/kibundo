// src/pages/admin/billing/Subscriptions.jsx
import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Segmented,
  Button,
  Space,
  Form,
  Select,
  DatePicker,
  Typography,
  message,
  Skeleton,
  Dropdown,
  Drawer,
  Descriptions,
} from "antd";
import {
  MoreOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

import BillingEntityList from "@/components/billing/BillingEntityList";
import ConfirmDrawer from "@/components/common/ConfirmDrawer";
import StatusTag from "@/components/common/StatusTag";
import MoneyText from "@/components/common/MoneyText";
import useResponsiveDrawerWidth from "@/hooks/useResponsiveDrawerWidth";

const { Text } = Typography;

/* ======================= API ROUTES (FIXED) ======================= */
/** Use consistent RESTful endpoints:
 *  - GET    /subscriptions
 *  - GET    /subscriptions/:id
 *  - POST   /subscriptions
 *  - DELETE /subscriptions/:id
 *  Adjust if your backend differs, but keep plural + resource id.
 */
const API_ROUTES = {
  SUBSCRIPTIONS: "#",
  SUBSCRIPTION_ID: (id) => `#`,
  ADD_SUBSCRIPTION: "#",
  PARENTS: "#",
  PRODUCTS: "#",
};

/* ----------------------------- helpers ----------------------------- */
const read = (obj, path) => {
  if (!obj) return undefined;
  if (Array.isArray(path))
    return path.reduce((a, k) => (a == null ? a : a[k]), obj);
  if (typeof path === "string" && path.includes("."))
    return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
  return obj[path];
};

const toArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return (
    payload.rows ||
    payload.data ||
    payload.items ||
    payload.results ||
    payload.list ||
    payload.subscriptions ||
    []
  );
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

const parentFullName = (pLike) => {
  if (!pLike) return "";
  const p = pLike.raw || pLike;
  const u = p.user || {};
  return (
    u.name ||
    [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
    p.name ||
    ""
  );
};

const SUB_STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Trialing", value: "trialing" },
  { label: "Canceled", value: "canceled" },
];

/* --------------------------------- page --------------------------------- */
export default function Subscriptions() {
  const navigate = useNavigate();
  const drawerWidth = useResponsiveDrawerWidth();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRec, setDeleteRec] = useState(null);

  // Data queries
  const {
    data: subsData,
    isLoading: subsLoading,
    refetch: refetchSubs,
  } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.SUBSCRIPTIONS);
      return toArray(res.data);
    },
    onError: (err) => {
      messageApi.error(
        err?.response?.data?.message || "Failed to load subscriptions."
      );
    },
  });

  const { data: parentsData } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.PARENTS);
      return toArray(res.data);
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.PRODUCTS);
      return toArray(res.data);
    },
  });

  const {
    data: viewRec,
    isLoading: viewLoading,
  } = useQuery({
    queryKey: ["subscription", viewId],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.SUBSCRIPTION_ID(viewId));
      return res.data;
    },
    enabled: !!viewId,
    onError: (err) => {
      messageApi.error(
        err?.response?.data?.message || "Failed to load subscription."
      );
    },
  });

  // Derived data
  const parentMap = useMemo(
    () =>
      new Map(
        (parentsData || []).map((p) => [p.id ?? p.parent_id, { raw: p }])
      ),
    [parentsData]
  );

  const productMap = useMemo(
    () =>
      new Map(
        (productsData || []).map((p) => [
          p.id ?? p.product_id ?? p.stripe_product_id,
          p,
        ])
      ),
    [productsData]
  );

  const rows = useMemo(() => {
    return (subsData || []).map((s) => {
      const parent =
        s.parent ||
        parentMap.get(s.parent_id) ||
        parentMap.get(s.parent_ids) ||
        null;

      const product =
        s.product ||
        productMap.get(s.product_id) ||
        productMap.get(s.plan_id) ||
        null;

      const cents =
        read(s, "price.unit_amount_cents") ??
        read(s, "product.unit_amount_cents") ??
        read(s, "plan.priceCents");

      const currency =
        read(s, "price.currency") || read(s, "product.currency") || "EUR";

      return {
        ...s,
        parent,
        product,
        _parentName: parentFullName(parent),
        _amount: cents != null ? Number(cents) / 100 : null,
        _currency: currency,
      };
    });
  }, [subsData, parentMap, productMap]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => normalizeStatus(r.status) === statusFilter);
  }, [rows, statusFilter]);

  // Mutations
  const createMut = useMutation({
    mutationFn: (payload) => api.post(API_ROUTES.ADD_SUBSCRIPTION, payload),
    onSuccess: () => {
      messageApi.success("Subscription created.");
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setCreateOpen(false);
    },
    onError: (err) =>
      messageApi.error(err?.response?.data?.message || "Create failed."),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(API_ROUTES.SUBSCRIPTION_ID(id)),
    onSuccess: () => {
      messageApi.success("Subscription deleted.");
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setDeleteOpen(false);
      if (viewId === deleteRec?.id) setViewOpen(false);
    },
    onError: (err) =>
      messageApi.error(err?.response?.data?.message || "Delete failed."),
  });

  // Handlers (memoized to avoid re-renders in deps)
  const openView = useCallback((id) => {
    setViewId(id);
    setViewOpen(true);
  }, []);
  const closeView = useCallback(() => {
    setViewId(null);
    setViewOpen(false);
  }, []);
  const confirmDelete = useCallback((rec) => {
    setDeleteRec(rec);
    setDeleteOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        parent_id: values.parent_id,
        plan_id: values.plan_id,
        status: values.status,
        current_period_end: values.current_period_end
          ? values.current_period_end.startOf("day").toISOString()
          : null,
      };
      createMut.mutate(payload);
    } catch {
      /* Antd form validation errors fall through here – no toast needed */
    }
  }, [form, createMut]);

  const handleDelete = useCallback(() => {
    if (deleteRec?.id) {
      deleteMut.mutate(deleteRec.id);
    }
  }, [deleteRec, deleteMut]);

  /* ------------------------------- columns ------------------------------ */
  const COLUMNS_MAP = useMemo(() => {
    const id = {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      sorter: (a, b) => (a.id || 0) - (b.id || 0),
      render: (val, record) =>
        val ? (
          <Button
            type="link"
            className="!px-0"
            onClick={() => openView(record.id)}
          >
            <Text strong>{val}</Text>
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    };

    const plan = {
      title: "Plan / Product",
      key: "plan",
      render: (_, r) =>
        read(r, "price.nickname") ||
        read(r, "product.name") ||
        read(r, "plan.name") ||
        "—",
    };

    const parent = {
      title: "Parent",
      key: "parent",
      ellipsis: true,
      render: (_, r) => {
        const label = r._parentName || "—";
        const id = r.parent?.raw?.id ?? r.parent?.id ?? r.parent_id;
        return id ? (
          <a
            href={`/admin/parents/${id}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/admin/parents/${id}`, {
                state: { prefill: r.parent?.raw || r.parent || null },
              });
            }}
          >
            {label}
          </a>
        ) : (
          label
        );
      },
      sorter: (a, b) =>
        (a._parentName || "").localeCompare(b._parentName || ""),
    };

    const stripeId = {
      title: "Stripe Sub ID",
      key: "stripeId",
      render: (_, r) =>
        r.stripe_subscription_id || <Text type="secondary">—</Text>,
      responsive: ["lg"],
    };

    const interval = {
      title: "Interval",
      key: "interval",
      render: (_, r) =>
        read(r, "price.interval") ||
        read(r, "product.interval") ||
        read(r, "plan.interval") ||
        "—",
      width: 110,
    };

    const amount = {
      title: "Amount",
      key: "amount",
      render: (_, r) =>
        r._amount != null ? (
          <MoneyText amount={r._amount} currency={r._currency} />
        ) : (
          "—"
        ),
      width: 140,
    };

    const status = {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => <StatusTag value={s} />,
      width: 130,
    };

    const renews = {
      title: "Renews",
      dataIndex: "current_period_end",
      key: "renews",
      render: (v) =>
        v
          ? new Date(v).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })
          : "—",
      width: 150,
    };

    return { id, plan, parent, stripeId, interval, amount, status, renews };
  }, [navigate, openView]);

  const actionsRender = (r) => (
    <Dropdown
      menu={{
        items: [
          { key: "view", icon: <EyeOutlined />, label: "View" },
          { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true },
        ],
        onClick: ({ key }) => {
          if (key === "view") openView(r.id);
          if (key === "delete") confirmDelete(r);
        },
      }}
      trigger={["click"]}
    >
      <Button icon={<MoreOutlined />} />
    </Dropdown>
  );

  const toolbarLeft = (
    <Segmented
      options={SUB_STATUS_OPTIONS}
      value={statusFilter}
      onChange={setStatusFilter}
      className="w-full sm:w-auto"
    />
  );

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1700px] mx-auto">
      {contextHolder}
      <BillingEntityList
        title="Subscriptions"
        data={filtered}
        loading={subsLoading}
        columnsMap={COLUMNS_MAP}
        storageKey="subscriptions.visibleCols.v2"
        defaultVisible={["id", "plan", "parent", "interval", "amount", "status", "renews"]}
        actionsRender={actionsRender}
        onRefresh={refetchSubs}
        toolbarLeft={toolbarLeft}
        selection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pageSize={12}
        scrollX={1150}
        onRowClick={(r) => openView(r.id)}
        /* If your list supports a right-side toolbar, you can expose a Create button:
        toolbarRight={
          <Button type="primary" onClick={() => setCreateOpen(true)}>New</Button>
        }
        */
      />

      {/* Create Drawer */}
      <Drawer
        title="Create Subscription"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        width={drawerWidth}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleCreate} loading={createMut.isPending}>
              Create
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="plan_id"
            label="Plan / Product"
            rules={[{ required: true, message: "Please select a plan" }]}
          >
            <Select
              placeholder="Select plan/product"
              showSearch
              optionFilterProp="label"
              options={(productsData || []).map((p) => ({
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
              options={(parentsData || []).map((p) => {
                const label = parentFullName({ raw: p }) || `#${p.id}`;
                return { label, value: p.id };
              })}
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
                { label: "Canceled", value: "canceled" },
              ]}
            />
          </Form.Item>

          <Form.Item name="current_period_end" label="Current Period End">
            <DatePicker className="w-full" allowClear showTime={false} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* View Drawer */}
      <Drawer
        title="Subscription"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        destroyOnClose
      >
        {viewLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : viewRec ? (
          (() => {
            const p = viewRec;
            const parent =
              p.parent ||
              parentMap.get(p.parent_id) ||
              parentMap.get(p.parent_ids) ||
              null;
            const product =
              p.product ||
              productMap.get(p.product_id) ||
              productMap.get(p.plan_id) ||
              null;

            const amountCents =
              read(p, "price.unit_amount_cents") ??
              read(p, "product.unit_amount_cents") ??
              read(p, "plan.priceCents");
            const currency =
              read(p, "price.currency") || read(p, "product.currency") || "EUR";
            const amount =
              amountCents != null ? Number(amountCents) / 100 : null;

            const parentId = parent?.raw?.id ?? parent?.id ?? p.parent_id;
            const parentName = parentFullName(parent) || "—";

            return (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="ID">{p.id}</Descriptions.Item>
                <Descriptions.Item label="Parent">
                  {parentId ? (
                    <a
                      href={`/admin/parents/${parentId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/admin/parents/${parentId}`, {
                          state: { prefill: parent?.raw || parent || null },
                        });
                      }}
                    >
                      {parentName}
                    </a>
                  ) : (
                    parentName
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Plan / Product">
                  {read(p, "price.nickname") ||
                    read(product, "name") ||
                    read(p, "plan.name") ||
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <StatusTag value={p.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Interval">
                  {read(p, "price.interval") ||
                    read(product, "interval") ||
                    read(p, "plan.interval") ||
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                  {amount != null ? (
                    <MoneyText amount={amount} currency={currency} />
                  ) : (
                    "—"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Current period start">
                  {p.current_period_start
                    ? new Date(p.current_period_start).toLocaleString()
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Current period end">
                  {p.current_period_end
                    ? new Date(p.current_period_end).toLocaleString()
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Stripe Sub ID">
                  {p.stripe_subscription_id || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Created at">
                  {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                </Descriptions.Item>
              </Descriptions>
            );
          })()
        ) : (
          <Text type="secondary">No data.</Text>
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDrawer
        open={deleteOpen}
        title="Delete subscription?"
        description={
          <>
            This will permanently delete subscription{" "}
            <Text strong>#{deleteRec?.id ?? "—"}</Text>. This action cannot be
            undone.
          </>
        }
        loading={deleteMut.isPending}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteRec(null);
        }}
      />
    </div>
  );
}
