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
  Card,
  Divider,
  Tag,
  Collapse,
  Modal,
} from "antd";
import {
  MoreOutlined,
  DeleteOutlined,
  EyeOutlined,
  CreditCardOutlined,
  ShoppingCartOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

import BillingEntityList from "@/components/billing/BillingEntityList";
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
  SUBSCRIPTIONS: "/subscriptions",
  SUBSCRIPTION_ID: (id) => `/subscription/${id}`, // Backend uses singular /subscription/:id
  ADD_SUBSCRIPTION: "/subscriptions",
  PARENTS: "/parents",
  PRODUCTS: "/products",
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
      // Handle different response formats
      return res.data?.data || res.data || null;
    },
    enabled: !!viewId,
    onError: (err) => {
      console.error("Failed to load subscription:", err);
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
    () => {
      const map = new Map();
      (productsData || []).forEach((p) => {
        // Add multiple keys for each product to ensure we can find it by plan_id
        const id = p.id ?? p.product_id;
        if (id != null) {
          map.set(id, p);
          map.set(String(id), p); // String key (plan_id is often a string)
          map.set(Number(id), p); // Number key (plan_id might be a number)
        }
        // Also add by stripe_product_id if available
        if (p.stripe_product_id) {
          map.set(p.stripe_product_id, p);
        }
      });
      return map;
    },
    [productsData]
  );

  const rows = useMemo(() => {
    return (subsData || []).map((s) => {
      const parent =
        s.parent ||
        parentMap.get(s.parent_id) ||
        parentMap.get(s.parent_ids) ||
        null;

      // Try to get product from multiple sources
      // plan_id is the foreign key that links to product.id
      let product = null;
      
      // PRIORITY 1: Product already included in subscription response
      if (s.product) {
        product = s.product;
      }
      
      // PRIORITY 2: Look up by plan_id (tries both string and number)
      if (!product && s.plan_id) {
        product = productMap.get(s.plan_id) ||
                  productMap.get(String(s.plan_id)) ||
                  productMap.get(Number(s.plan_id)) ||
                  null;
      }
      
      // PRIORITY 3: Look up by product_id (alternative field name)
      if (!product && s.product_id) {
        product = productMap.get(s.product_id) ||
                  productMap.get(String(s.product_id)) ||
                  productMap.get(Number(s.product_id)) ||
                  null;
      }

      // Extract data from raw field (Stripe data)
      // Handle both JSONB (object) and string (JSON string) formats
      let rawData = {};
      if (s.raw) {
        if (typeof s.raw === 'string') {
          try {
            rawData = JSON.parse(s.raw);
          } catch (e) {
            console.warn('Failed to parse raw JSON:', e);
          }
        } else {
          rawData = s.raw;
        }
      }
      
      const checkoutSession = rawData.checkout_session || {};
      const stripeSubscription = rawData.subscription || {};
      
      // Expand line_items if it's an array of IDs (need to fetch from Stripe)
      // For now, assume line_items is already expanded in raw data
      let lineItemsData = checkoutSession.line_items;
      if (Array.isArray(checkoutSession.line_items)) {
        lineItemsData = checkoutSession.line_items;
      } else if (checkoutSession.line_items?.data) {
        lineItemsData = checkoutSession.line_items.data;
      }
      
      // Try to get amount from multiple sources
      let cents =
        read(s, "price.unit_amount_cents") ??
        read(s, "product.unit_amount_cents") ??
        read(s, "plan.priceCents") ??
        product?.price ? (Number(product.price) * 100) : null;
      
      // If not found, try from Stripe subscription items
      if (cents == null && stripeSubscription.items?.data?.[0]?.price?.unit_amount) {
        cents = stripeSubscription.items.data[0].price.unit_amount;
      }
      
      // If still not found, try from checkout session line items
      if (cents == null && checkoutSession.line_items?.[0]?.amount) {
        cents = checkoutSession.line_items[0].amount;
      }

      // Get currency from multiple sources
      let currency =
        read(s, "price.currency") || 
        read(s, "product.currency") || 
        product?.currency ||
        stripeSubscription.currency ||
        checkoutSession.currency ||
        "EUR";

      // Get interval from product metadata (billing_interval) - this is what the user selected
      let interval = null;
      
      // PRIORITY 1: Product metadata billing_interval (this is what the user selected when subscribing)
      if (product?.metadata) {
        let meta = product.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch (e) {
            console.warn('Failed to parse product metadata:', e);
          }
        }
        if (meta && typeof meta === 'object') {
          interval = meta.billing_interval;
        }
      }
      
      // PRIORITY 2: Checkout session metadata (for incomplete subscriptions)
      if (!interval && checkoutSession.metadata?.billing_interval) {
        interval = checkoutSession.metadata.billing_interval;
      }
      
      // PRIORITY 3: Checkout session subscription_data metadata
      if (!interval && checkoutSession.subscription_data?.metadata?.billing_interval) {
        interval = checkoutSession.subscription_data.metadata.billing_interval;
      }
      
      // PRIORITY 4: Stripe subscription recurring interval (if product metadata not available)
      if (!interval && stripeSubscription.items?.data?.[0]?.price?.recurring?.interval) {
        interval = stripeSubscription.items.data[0].price.recurring.interval;
      }
      
      // PRIORITY 5: Fallback - infer from product name (e.g., "Premium(month/1 child)" -> "month")
      if (!interval && product?.name) {
        const nameLower = product.name.toLowerCase();
        if (nameLower.includes('month') || nameLower.includes('/month')) {
          interval = 'month';
        } else if (nameLower.includes('year') || nameLower.includes('/year')) {
          interval = 'year';
        } else if (nameLower.includes('week') || nameLower.includes('/week')) {
          interval = 'week';
        }
      }
      
      // PRIORITY 6: Try to get from Stripe price recurring interval in checkout session line items
      if (!interval && lineItemsData && Array.isArray(lineItemsData) && lineItemsData.length > 0) {
        const firstItem = lineItemsData[0];
        if (firstItem?.price?.recurring?.interval) {
          interval = firstItem.price.recurring.interval;
        } else if (firstItem?.price?.recurring_interval) {
          interval = firstItem.price.recurring_interval;
        }
      }
      
      // PRIORITY 7: Try from checkout session line_items array (if not expanded)
      if (!interval && checkoutSession.line_items && Array.isArray(checkoutSession.line_items)) {
        const firstItem = checkoutSession.line_items[0];
        if (firstItem?.price?.recurring?.interval) {
          interval = firstItem.price.recurring.interval;
        }
      }

      // Get period end (renewal date) - prioritize database field, then Stripe, then calculate
      let periodEnd = s.current_period_end; // Database field (most reliable)
      
      // If database field is missing, try Stripe subscription
      if (!periodEnd && stripeSubscription.current_period_end) {
        // Handle both Unix timestamp (number) and ISO string
        const ts = stripeSubscription.current_period_end;
        if (typeof ts === 'number') {
          periodEnd = new Date(ts * 1000).toISOString();
        } else if (typeof ts === 'string') {
          periodEnd = ts;
        }
      }
      
      // For incomplete subscriptions, calculate renewal date from creation date + billing interval
      if (!periodEnd && interval && s.created_at) {
        try {
          const createdDate = new Date(s.created_at);
          if (!isNaN(createdDate.getTime())) {
            const calcDate = new Date(createdDate);
            if (interval === 'month') {
              calcDate.setMonth(calcDate.getMonth() + 1);
            } else if (interval === 'year') {
              calcDate.setFullYear(calcDate.getFullYear() + 1);
            } else if (interval === 'week') {
              calcDate.setDate(calcDate.getDate() + 7);
            }
            periodEnd = calcDate.toISOString();
          }
        } catch (e) {
          console.warn('Error calculating renewal date:', e);
        }
      }
      
      // Ensure periodEnd is in ISO string format if it's a Date object
      if (periodEnd && periodEnd instanceof Date) {
        periodEnd = periodEnd.toISOString();
      }

      // Debug logging for incomplete subscriptions
      if (s.status === 'incomplete' && (!interval || !cents)) {
        console.log('🔍 Incomplete subscription data:', {
          id: s.id,
          product: product?.name,
          productMetadata: product?.metadata,
          interval,
          cents,
          checkoutSession: checkoutSession?.line_items?.[0],
          stripeSubscription: stripeSubscription?.items?.data?.[0],
        });
      }

      return {
        ...s,
        parent,
        product,
        _parentName: parentFullName(parent),
        _amount: cents != null ? Number(cents) / 100 : null,
        _currency: currency,
        _interval: interval || null,
        _periodEnd: periodEnd,
        _rawData: rawData,
        _checkoutSession: checkoutSession,
        _stripeSubscription: stripeSubscription,
        _lineItemsData: lineItemsData, // Store expanded line items for easier access
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
      if (viewId) setViewOpen(false);
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
    Modal.confirm({
      title: "Delete subscription?",
      content: (
        <>
          This will permanently delete subscription{" "}
          <Text strong>#{rec.id ?? "—"}</Text>. This action cannot be undone.
        </>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const subId = rec.id || rec.subscription_id;
          if (!subId) {
            messageApi.error("Cannot delete: Subscription ID not found.");
            return;
          }
          await deleteMut.mutateAsync(subId);
        } catch (error) {
          // Error is already handled in deleteMut
          console.error("Delete error:", error);
        }
      },
    });
  }, [deleteMut]);

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
            onClick={() => {
              const subId = record.id || record.subscription_id;
              if (subId) {
                openView(subId);
              }
            }}
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
      render: (_, r) => {
        // Try to get product name from checkout session line items if available
        const productName = 
          r._checkoutSession?.line_items?.[0]?.product_name ||
          read(r, "price.nickname") ||
          read(r, "product.name") ||
          read(r, "plan.name") ||
          "—";
        return productName;
      },
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
      title: "Stripe IDs",
      key: "stripeId",
      render: (_, r) => {
        const raw = r.raw || {};
        const checkoutSession = raw.checkout_session || {};
        const subscription = raw.subscription || {};
        
        return (
          <div className="space-y-1">
            {r.stripe_subscription_id && (
              <div>
                <Text type="secondary" className="text-xs">Sub:</Text>{" "}
                <Text code className="text-xs">{r.stripe_subscription_id.substring(0, 20)}...</Text>
              </div>
            )}
            {checkoutSession.id && (
              <div>
                <Text type="secondary" className="text-xs">Session:</Text>{" "}
                <Text code className="text-xs">{checkoutSession.id.substring(0, 20)}...</Text>
              </div>
            )}
            {!r.stripe_subscription_id && !checkoutSession.id && (
              <Text type="secondary">—</Text>
            )}
          </div>
        );
      },
      responsive: ["xl"],
    };

    const interval = {
      title: "Interval",
      key: "interval",
      render: (_, r) => {
        // Use the pre-computed _interval (which prioritizes product metadata billing_interval)
        let interval = r._interval;
        
        // If not set, try to get from product metadata directly
        if (!interval && r.product?.metadata) {
          let meta = r.product.metadata;
          if (typeof meta === 'string') {
            try {
              meta = JSON.parse(meta);
            } catch (e) {
              // Ignore parse errors
            }
          }
          if (meta && typeof meta === 'object' && meta.billing_interval) {
            interval = meta.billing_interval;
          }
        }
        
        // Fallback: try Stripe subscription recurring interval
        if (!interval && r._stripeSubscription?.items?.data?.[0]?.price?.recurring?.interval) {
          interval = r._stripeSubscription.items.data[0].price.recurring.interval;
        }
        
        if (!interval) {
          return "—";
        }
        
        // Capitalize first letter and format
        const formatted = interval.charAt(0).toUpperCase() + interval.slice(1);
        return formatted;
      },
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
      render: (v, r) => {
        // PRIORITY 1: Use pre-computed _periodEnd (already extracted from database or Stripe)
        let periodEnd = r._periodEnd;
        
        // PRIORITY 2: Use database field directly (current_period_end)
        if (!periodEnd) {
          periodEnd = r.current_period_end || v;
        }
        
        // PRIORITY 3: Try from Stripe subscription
        if (!periodEnd && r._stripeSubscription?.current_period_end) {
          const ts = r._stripeSubscription.current_period_end;
          if (typeof ts === 'number') {
            periodEnd = new Date(ts * 1000).toISOString();
          } else if (typeof ts === 'string') {
            periodEnd = ts;
          }
        }
        
        // PRIORITY 4: Try from raw Stripe subscription data
        if (!periodEnd && r._rawData?.subscription?.current_period_end) {
          const ts = r._rawData.subscription.current_period_end;
          if (typeof ts === 'number') {
            periodEnd = new Date(ts * 1000).toISOString();
          } else if (typeof ts === 'string') {
            periodEnd = ts;
          }
        }
        
        // PRIORITY 5: For incomplete subscriptions, calculate from creation date + interval
        if (!periodEnd && r._interval && r.created_at) {
          try {
            const createdDate = new Date(r.created_at);
            if (!isNaN(createdDate.getTime())) {
              const calcDate = new Date(createdDate);
              if (r._interval === 'month') {
                calcDate.setMonth(calcDate.getMonth() + 1);
              } else if (r._interval === 'year') {
                calcDate.setFullYear(calcDate.getFullYear() + 1);
              } else if (r._interval === 'week') {
                calcDate.setDate(calcDate.getDate() + 7);
              }
              periodEnd = calcDate.toISOString();
            }
          } catch (e) {
            console.warn('Error calculating renewal date:', e);
          }
        }
        
        if (!periodEnd) return "—";
        
        try {
          // Handle Date objects, ISO strings, and Unix timestamps
          let date;
          if (periodEnd instanceof Date) {
            date = periodEnd;
          } else if (typeof periodEnd === 'string') {
            date = new Date(periodEnd);
          } else if (typeof periodEnd === 'number') {
            // Unix timestamp (seconds)
            date = new Date(periodEnd * 1000);
          } else {
            return "—";
          }
          
          if (isNaN(date.getTime())) return "—";
          
          // Format as "MMM DD, YYYY" (e.g., "Jan 15, 2024")
          return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (e) {
          console.warn('Error formatting renewal date:', periodEnd, e);
          return "—";
        }
      },
      width: 150,
    };

    const childCount = {
      title: "Child Count",
      key: "child_count",
      width: 120,
      render: (_, r) => {
        // Get from product metadata
        let childCount = null;
        if (r.product?.metadata) {
          let meta = r.product.metadata;
          if (typeof meta === 'string') {
            try {
              meta = JSON.parse(meta);
            } catch (e) {
              // Ignore
            }
          }
          if (meta && typeof meta === 'object') {
            childCount = meta.child_count;
          }
        }
        return childCount ? (
          <Text>{childCount} {childCount === 1 ? "child" : "children"}</Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
      responsive: ["xl"],
    };

    const createdAt = {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (v) => {
        if (!v) return "—";
        try {
          const date = new Date(v);
          if (isNaN(date.getTime())) return "—";
          return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (e) {
          return "—";
        }
      },
      responsive: ["xl"],
      sorter: (a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      },
    };

    return { id, plan, parent, stripeId, interval, amount, status, renews, childCount, createdAt };
  }, [navigate, openView]);

  const syncMut = useMutation({
    mutationFn: (id) => api.post(`/subscriptions/${id}/sync`), // Backend uses plural /subscriptions/:id/sync
    onSuccess: () => {
      messageApi.success("Subscription synced from Stripe.");
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (err) =>
      messageApi.error(err?.response?.data?.message || "Sync failed."),
  });

  const actionsRender = (r) => (
    <Dropdown
      menu={{
        items: [
          { key: "view", icon: <EyeOutlined />, label: "View" },
          ...(r.status === "incomplete" && r.stripe_subscription_id && r.stripe_subscription_id.startsWith('sub_')
            ? [{ key: "sync", icon: <ReloadOutlined />, label: "Sync from Stripe" }]
            : []),
          { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true },
        ],
        onClick: ({ key }) => {
          if (key === "view") {
            const subId = r.id || r.subscription_id;
            if (subId) {
              openView(subId);
            } else {
              messageApi.error("Cannot view: Subscription ID not found.");
            }
          }
          if (key === "sync") {
            const subId = r.id || r.subscription_id;
            if (subId) {
              syncMut.mutate(subId);
            } else {
              messageApi.error("Cannot sync: Subscription ID not found.");
            }
          }
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
        defaultVisible={["id", "plan", "parent", "stripeId", "interval", "amount", "status", "renews", "childCount", "createdAt"]}
        actionsRender={actionsRender}
        onRefresh={refetchSubs}
        toolbarLeft={toolbarLeft}
        selection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pageSize={12}
        scrollX={1150}
        onRowClick={(r) => {
          const subId = r.id || r.subscription_id;
          if (subId) {
            openView(subId);
          }
        }}
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
        destroyOnHidden
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
        title="Subscription Details"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={closeView}>Close</Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                if (viewRec) {
                  closeView();
                  confirmDelete(viewRec);
                }
              }}
            >
              Delete Subscription
            </Button>
          </Space>
        }
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

            // Extract Stripe data from raw field - handle both string and object
            let rawData = {};
            try {
              rawData = typeof p.raw === 'string' ? JSON.parse(p.raw) : (p.raw || {});
            } catch (e) {
              console.warn("Failed to parse raw data:", e);
              rawData = p.raw || {};
            }
            
            const checkoutSession = rawData.checkout_session || {};
            const stripeSubscription = rawData.subscription || {};
            
            // Extract metadata from multiple sources
            const metadata = stripeSubscription.metadata || checkoutSession.metadata || {};
            
            // Extract amount - prioritize Stripe data, then product, then fallback
            let amount = null;
            let currency = "EUR";
            
            // Try to get from Stripe subscription items
            if (stripeSubscription.items?.data?.[0]?.price?.unit_amount) {
              amount = stripeSubscription.items.data[0].price.unit_amount / 100;
              currency = stripeSubscription.items.data[0].price.currency?.toUpperCase() || currency;
            }
            // Try from checkout session
            else if (checkoutSession.amount_total) {
              amount = checkoutSession.amount_total / 100;
              currency = checkoutSession.currency?.toUpperCase() || currency;
            }
            // Try from product metadata
            else if (metadata.product_price) {
              amount = parseFloat(metadata.product_price) || null;
              currency = stripeSubscription.currency?.toUpperCase() || currency;
            }
            // Try from product
            else if (product) {
              amount = product.price ? parseFloat(product.price) : null;
              currency = product.currency?.toUpperCase() || currency;
            }
            // Fallback to old logic
            else {
              const amountCents =
                read(p, "price.unit_amount_cents") ??
                read(p, "product.unit_amount_cents") ??
                read(p, "plan.priceCents");
              currency = read(p, "price.currency") || read(p, "product.currency") || currency;
              amount = amountCents != null ? Number(amountCents) / 100 : null;
            }

            const parentId = parent?.raw?.id ?? parent?.id ?? p.parent_id;
            const parentName = parentFullName(parent) || "—";

            // Get subscription items from Stripe
            const subscriptionItems = stripeSubscription.items?.data || [];
            const checkoutLineItems = checkoutSession.line_items || [];

            // Format currency
            const formatMoney = (cents, curr = "EUR") => {
              if (cents == null) return "—";
              return new Intl.NumberFormat("en-ZA", {
                style: "currency",
                currency: curr || "EUR",
                maximumFractionDigits: 2,
              }).format(Number(cents) / 100);
            };

            return (
              <div className="space-y-4">
                {/* Basic Subscription Info */}
                <Card title="Subscription Details" size="small">
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
                      {metadata.product_name ||
                        read(product, "name") ||
                        read(p, "price.nickname") ||
                        read(p, "plan.name") ||
                        "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <StatusTag value={p.status} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Billing Interval">
                      {(() => {
                        // Priority 1: Product metadata
                        let interval = null;
                        if (product?.metadata) {
                          let meta = product.metadata;
                          if (typeof meta === 'string') {
                            try {
                              meta = JSON.parse(meta);
                            } catch (e) {}
                          }
                          if (meta && typeof meta === 'object') {
                            interval = meta.billing_interval;
                          }
                        }
                        
                        // Priority 2: Stripe subscription metadata
                        if (!interval && stripeSubscription.metadata?.billing_interval) {
                          interval = stripeSubscription.metadata.billing_interval;
                        }
                        
                        // Priority 3: Checkout session metadata
                        if (!interval && checkoutSession.metadata?.billing_interval) {
                          interval = checkoutSession.metadata.billing_interval;
                        }
                        
                        // Priority 4: Stripe subscription recurring interval
                        if (!interval) {
                          interval = stripeSubscription.items?.data?.[0]?.price?.recurring?.interval ||
                                    read(p, "price.interval") ||
                                    read(product, "interval") ||
                                    read(p, "plan.interval");
                        }
                        
                        if (!interval) return "—";
                        
                        // Format for display
                        const formatted = interval === 'month' ? 'Monthly' :
                                         interval === 'year' ? 'Yearly' :
                                         interval === 'week' ? 'Weekly' :
                                         interval.charAt(0).toUpperCase() + interval.slice(1);
                        return formatted;
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Child Count">
                      {(() => {
                        // Priority 1: Product metadata
                        let childCount = null;
                        if (product?.metadata) {
                          let meta = product.metadata;
                          if (typeof meta === 'string') {
                            try {
                              meta = JSON.parse(meta);
                            } catch (e) {}
                          }
                          if (meta && typeof meta === 'object') {
                            childCount = meta.child_count;
                          }
                        }
                        
                        // Priority 2: Stripe subscription metadata
                        if (!childCount && stripeSubscription.metadata?.child_count) {
                          childCount = stripeSubscription.metadata.child_count;
                        }
                        
                        // Priority 3: Checkout session metadata
                        if (!childCount && checkoutSession.metadata?.child_count) {
                          childCount = checkoutSession.metadata.child_count;
                        }
                        
                        return childCount ? (
                          <Text>{childCount} {childCount === 1 ? "child" : "children"}</Text>
                        ) : (
                          "—"
                        );
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Amount">
                      {amount != null ? (
                        <MoneyText amount={amount} currency={currency} />
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current period start">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleString()
                        : stripeSubscription.current_period_start
                        ? new Date(stripeSubscription.current_period_start * 1000).toLocaleString()
                        : "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current period end">
                      {(() => {
                        // PRIORITY 1: Use database field directly (current_period_end)
                        let periodEnd = p.current_period_end;
                        
                        // PRIORITY 2: Try from Stripe subscription
                        if (!periodEnd && stripeSubscription.current_period_end) {
                          const ts = stripeSubscription.current_period_end;
                          if (typeof ts === 'number') {
                            periodEnd = new Date(ts * 1000).toISOString();
                          } else if (typeof ts === 'string') {
                            periodEnd = ts;
                          }
                        }
                        
                        // PRIORITY 3: Try from raw Stripe subscription data (if different path)
                        if (!periodEnd && rawData.subscription?.current_period_end) {
                          const ts = rawData.subscription.current_period_end;
                          if (typeof ts === 'number') {
                            periodEnd = new Date(ts * 1000).toISOString();
                          } else if (typeof ts === 'string') {
                            periodEnd = ts;
                          }
                        }
                        
                        // PRIORITY 4: For incomplete subscriptions, calculate from creation date + interval
                        if (!periodEnd) {
                          // Get billing interval
                          let interval = null;
                          if (product?.metadata) {
                            let meta = product.metadata;
                            if (typeof meta === 'string') {
                              try {
                                meta = JSON.parse(meta);
                              } catch (e) {}
                            }
                            if (meta && typeof meta === 'object') {
                              interval = meta.billing_interval;
                            }
                          }
                          
                          if (!interval) {
                            interval = stripeSubscription.metadata?.billing_interval || 
                                     checkoutSession.metadata?.billing_interval;
                          }
                          
                          if (!interval) {
                            interval = stripeSubscription.items?.data?.[0]?.price?.recurring?.interval;
                          }
                          
                          if (interval && p.created_at) {
                            try {
                              const createdDate = new Date(p.created_at);
                              if (!isNaN(createdDate.getTime())) {
                                const calcDate = new Date(createdDate);
                                if (interval === 'month') {
                                  calcDate.setMonth(calcDate.getMonth() + 1);
                                } else if (interval === 'year') {
                                  calcDate.setFullYear(calcDate.getFullYear() + 1);
                                } else if (interval === 'week') {
                                  calcDate.setDate(calcDate.getDate() + 7);
                                }
                                periodEnd = calcDate.toISOString();
                              }
                            } catch (e) {
                              console.warn('Error calculating renewal date:', e);
                            }
                          }
                        }
                        
                        if (!periodEnd) return "—";
                        
                        try {
                          // Handle Date objects, ISO strings, and Unix timestamps
                          let date;
                          if (periodEnd instanceof Date) {
                            date = periodEnd;
                          } else if (typeof periodEnd === 'string') {
                            date = new Date(periodEnd);
                          } else if (typeof periodEnd === 'number') {
                            // Unix timestamp (seconds)
                            date = new Date(periodEnd * 1000);
                          } else {
                            return "—";
                          }
                          
                          if (isNaN(date.getTime())) return "—";
                          
                          return date.toLocaleString();
                        } catch (e) {
                          console.warn('Error formatting renewal date:', periodEnd, e);
                          return "—";
                        }
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Stripe Subscription ID">
                      {p.stripe_subscription_id || stripeSubscription.id || p.subscription_id || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created at">
                      {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Stripe Subscription Details */}
                {stripeSubscription.id && (
                  <Card 
                    title={
                      <Space>
                        <CreditCardOutlined />
                        <span>Stripe Subscription Details</span>
                      </Space>
                    }
                    size="small"
                  >
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Subscription ID">
                        <Text code>{stripeSubscription.id}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={
                          stripeSubscription.status === "active" ? "green" :
                          stripeSubscription.status === "trialing" ? "blue" :
                          stripeSubscription.status === "canceled" ? "red" :
                          "default"
                        }>
                          {stripeSubscription.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Customer ID">
                        {stripeSubscription.customer ? (
                          <Text code>{typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer.id}</Text>
                        ) : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Trial Start">
                        {stripeSubscription.trial_start
                          ? new Date(stripeSubscription.trial_start * 1000).toLocaleString()
                          : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Trial End">
                        {stripeSubscription.trial_end
                          ? new Date(stripeSubscription.trial_end * 1000).toLocaleString()
                          : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Cancel at Period End">
                        {stripeSubscription.cancel_at_period_end ? "Yes" : "No"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Currency">
                        {stripeSubscription.currency?.toUpperCase() || "—"}
                      </Descriptions.Item>
                    </Descriptions>

                    {/* Subscription Items */}
                    {subscriptionItems.length > 0 && (
                      <>
                        <Divider orientation="left">Subscription Items</Divider>
                        <div className="space-y-2">
                          {subscriptionItems.map((item, idx) => (
                            <Card key={idx} size="small" className="bg-gray-50">
                              <Descriptions column={1} size="small">
                                <Descriptions.Item label="Price ID">
                                  <Text code>{item.price?.id || "—"}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Product ID">
                                  {item.price?.product ? (
                                    <Text code>{typeof item.price.product === "string" ? item.price.product : item.price.product.id}</Text>
                                  ) : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Amount">
                                  {item.price?.unit_amount
                                    ? formatMoney(item.price.unit_amount, item.price.currency)
                                    : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Interval">
                                  {item.price?.recurring?.interval || "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Quantity">
                                  {item.quantity || 1}
                                </Descriptions.Item>
                              </Descriptions>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                )}

                {/* Checkout Session Details */}
                {checkoutSession.id && (
                  <Card
                    title={
                      <Space>
                        <ShoppingCartOutlined />
                        <span>Checkout Session Details</span>
                      </Space>
                    }
                    size="small"
                  >
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Session ID">
                        <Text code>{checkoutSession.id}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Status">
                        <Tag color={
                          checkoutSession.payment_status === "paid" ? "green" :
                          checkoutSession.payment_status === "unpaid" ? "orange" :
                          "default"
                        }>
                          {checkoutSession.payment_status || "—"}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Customer Email">
                        {checkoutSession.customer_email || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Created">
                        {checkoutSession.created
                          ? new Date(checkoutSession.created).toLocaleString()
                          : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Amount Total">
                        {checkoutSession.amount_total
                          ? formatMoney(checkoutSession.amount_total, checkoutSession.currency)
                          : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Currency">
                        {checkoutSession.currency?.toUpperCase() || "—"}
                      </Descriptions.Item>
                    </Descriptions>

                    {/* Checkout Line Items */}
                    {checkoutLineItems.length > 0 && (
                      <>
                        <Divider orientation="left">Checkout Line Items</Divider>
                        <div className="space-y-2">
                          {checkoutLineItems.map((item, idx) => (
                            <Card key={idx} size="small" className="bg-gray-50">
                              <Descriptions column={1} size="small">
                                <Descriptions.Item label="Product Name">
                                  <Text strong>{item.product_name || "—"}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Price ID">
                                  <Text code>{item.price_id || "—"}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Product ID">
                                  {item.product_id ? <Text code>{item.product_id}</Text> : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Amount">
                                  {item.amount ? formatMoney(item.amount, item.currency) : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Quantity">
                                  {item.quantity || 1}
                                </Descriptions.Item>
                                <Descriptions.Item label="Description">
                                  {item.description || "—"}
                                </Descriptions.Item>
                              </Descriptions>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                )}

              </div>
            );
          })()
        ) : (
          <Text type="secondary">No data.</Text>
        )}
      </Drawer>

    </div>
  );
}
