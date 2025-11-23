// src/pages/parent/billing/BillingOverview.jsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios";
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Divider,
  Tooltip,
  Empty,
  Drawer,
  Descriptions,
  Modal,
  Skeleton,
  message,
} from "antd";
import {
  FileDoneOutlined,
  CreditCardOutlined,
  ReconciliationOutlined,
  GiftOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { NUNITO_FONT_STACK } from "@/constants/fonts";
import PlainBackground from "@/components/layouts/PlainBackground";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";

// ParentShell is now handled at route level

const { Title, Text } = Typography;

/* ---------- helpers ---------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

const fmtDate = (v) => (v ? dayjs(v).format("DD MMM YYYY") : "—");

// Note: All data is now fetched from the backend via API

export default function BillingOverview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewSubscription, setViewSubscription] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Fetch real data from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user to find parent_id
      const userRes = await api.get("/current-user");
      const userId = userRes.data?.id;
      
      if (userId) {
        // Get parent record
        const parentRes = await api.get("/parents", { params: { user_id: userId } });
        const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
        const parent = parents.find(p => p.user_id === userId) || parents[0];
        
        if (parent?.id) {
          // Get parent details with subscriptions and invoices
          const parentDetailRes = await api.get(`/parent/${parent.id}`);
          const parentData = parentDetailRes.data?.data || parentDetailRes.data || parent;
          
          // Get subscriptions - try multiple ways
          let subs = Array.isArray(parentData.subscription) ? parentData.subscription : [];
          
          // If no subscriptions in parent data, try to fetch directly
          if (subs.length === 0) {
            try {
              const subsRes = await api.get("/subscriptions", { params: { parent_id: parent.id } });
              subs = Array.isArray(subsRes.data) ? subsRes.data : (subsRes.data?.data || []);
            } catch (err) {
              console.warn("Could not fetch subscriptions directly:", err);
            }
          }
          
          // Normalize status check (handle lowercase, uppercase, and null)
          const normalizeStatus = (status) => {
            if (!status) return null;
            const s = String(status).toLowerCase();
            return s === "active" || s === "trialing" ? "active" : s;
          };
          
          // Find active subscription (active or trialing status)
          let activeSub = subs.find(s => {
            const status = normalizeStatus(s.status);
            return status === "active" || status === "trialing";
          }) || subs.find(s => normalizeStatus(s.status) !== "canceled" && normalizeStatus(s.status) !== "past_due");
          
          // If found incomplete subscription, check if payment was successful
          if (activeSub && (activeSub.status === 'incomplete' || normalizeStatus(activeSub.status) === 'inactive')) {
            try {
              // Parse raw data to check payment status
              let rawData = {};
              try {
                rawData = typeof activeSub.raw === 'string' ? JSON.parse(activeSub.raw) : (activeSub.raw || {});
              } catch (e) {}
              
              const checkoutSession = rawData.checkout_session || {};
              const stripeSubscription = rawData.subscription || {};
              
              // If payment was successful, treat as active
              if (checkoutSession.payment_status === 'paid' || stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing') {
                // Update status in memory
                if (stripeSubscription.status === 'trialing' || stripeSubscription.trial_end) {
                  activeSub.status = 'trialing';
                } else {
                  activeSub.status = 'active';
                }
              }
            } catch (e) {
              console.warn("Could not check payment status:", e);
            }
          }
          
          if (activeSub) {
            // Fetch product details if not included
            let product = activeSub.product || {};
            const productId = activeSub.plan_id || activeSub.product_id;
            
            // First, try to extract product data from subscription raw data (Stripe metadata)
            if (activeSub.raw && (!product || !product.id)) {
              try {
                const rawData = typeof activeSub.raw === 'string' ? JSON.parse(activeSub.raw) : activeSub.raw;
                const stripeMetadata = rawData.subscription?.metadata || rawData.checkout_session?.metadata || {};
                
                // Build product object from Stripe metadata
                if (stripeMetadata.product_name || stripeMetadata.product_id) {
                  product = {
                    id: parseInt(stripeMetadata.product_id) || productId,
                    name: stripeMetadata.product_name || product.name || "Subscription Plan",
                    price: parseFloat(stripeMetadata.product_price || 0),
                    currency: "EUR", // Default, will be overridden from subscription data
                    metadata: {
                      billing_interval: stripeMetadata.billing_interval,
                      child_count: parseInt(stripeMetadata.child_count) || 1,
                    }
                  };
                }
              } catch (e) {
                console.warn("Could not extract product from raw data:", e);
              }
            }
            
            // If still no product, try to fetch from API
            if (!product || !product.id) {
              try {
                if (productId) {
                  // Try to fetch from products list (more reliable)
                  try {
                    const productsRes = await api.get("/products");
                    const allProducts = Array.isArray(productsRes.data) 
                      ? productsRes.data 
                      : (productsRes.data?.data || productsRes.data?.rows || []);
                    const foundProduct = allProducts.find(p => 
                      p.id === parseInt(productId) || 
                      p.id === productId || 
                      String(p.id) === String(productId)
                    );
                    if (foundProduct) {
                      product = foundProduct;
                    }
                  } catch (err) {
                    console.warn("Could not fetch products list:", err);
                    // Fallback: try direct endpoint (but this might 404)
                    try {
                      const productRes = await api.get(`/product/${productId}`);
                      product = productRes.data?.data || productRes.data || product;
                    } catch (err2) {
                      // Silently ignore - product might not exist or endpoint might be wrong
                      console.warn("Could not fetch product details:", err2.message);
                    }
                  }
                }
              } catch (err) {
                console.warn("Could not fetch product details:", err);
              }
            }
            
            // If still no product, create a minimal one from subscription data
            if (!product || !product.id) {
              product = {
                id: productId,
                name: "Subscription Plan",
                price: 0,
                currency: "EUR",
                metadata: {}
              };
            }
            
            // Extract metadata - handle both object and string formats
            let metadata = {};
            if (product.metadata) {
              if (typeof product.metadata === 'string') {
                try {
                  metadata = JSON.parse(product.metadata);
                } catch (e) {
                  metadata = {};
                }
              } else {
                metadata = product.metadata;
              }
            }
            
            // Also try to get metadata from subscription raw data (Stripe metadata)
            if (activeSub.raw) {
              try {
                const rawData = typeof activeSub.raw === 'string' ? JSON.parse(activeSub.raw) : activeSub.raw;
                const stripeMetadata = rawData.subscription?.metadata || rawData.checkout_session?.metadata || {};
                
                // Merge Stripe metadata (has priority as it's what was actually sent)
                if (stripeMetadata.billing_interval) {
                  metadata.billing_interval = stripeMetadata.billing_interval;
                }
                if (stripeMetadata.child_count) {
                  metadata.child_count = parseInt(stripeMetadata.child_count) || metadata.child_count;
                }
              } catch (e) {
                console.warn("Could not extract metadata from raw data:", e);
              }
            }
            
            // Normalize status - if payment was successful, prefer active/trialing
            let status = normalizeStatus(activeSub.status) || "active";
            
            // Aggressively check if payment was successful from raw data
            if (activeSub.raw) {
              try {
                const rawData = typeof activeSub.raw === 'string' ? JSON.parse(activeSub.raw) : activeSub.raw;
                const checkoutSession = rawData.checkout_session || {};
                const stripeSubscription = rawData.subscription || {};
                
                // Check multiple indicators of successful payment
                const paymentStatus = checkoutSession.payment_status;
                const stripeStatus = stripeSubscription.status;
                const latestInvoice = stripeSubscription.latest_invoice;
                const invoicePaid = typeof latestInvoice === 'object' ? latestInvoice.paid : false;
                
                // If ANY indicator shows payment was successful, force to active/trialing
                if (paymentStatus === 'paid' || 
                    stripeStatus === 'active' || 
                    stripeStatus === 'trialing' ||
                    invoicePaid === true ||
                    (stripeSubscription.items && stripeSubscription.items.data && stripeSubscription.items.data.length > 0)) {
                  
                  if (stripeStatus === 'trialing' || stripeSubscription.trial_end || (checkoutSession.subscription && checkoutSession.subscription.trial_end)) {
                    status = 'trialing';
                  } else {
                    status = 'active';
                  }
                } else if (status === 'incomplete' || status === 'inactive') {
                  // If status is still incomplete but we have subscription data, it might be active
                  if (stripeSubscription.id && stripeSubscription.current_period_end) {
                    status = 'active';
                  }
                }
              } catch (e) {
                console.warn("Could not check payment status for status normalization:", e);
              }
            }
            
            // Final check: if status is still incomplete but subscription exists and has data, assume active
            if ((status === 'incomplete' || status === 'inactive') && activeSub.id && activeSub.stripe_subscription_id) {
              status = 'active';
            }
            
            // Extract amount from raw data if product price is missing
            let amount = parseFloat(product.price || 0);
            let currency = product.currency || "EUR";
            
            if (amount === 0 && activeSub.raw) {
              try {
                const rawData = typeof activeSub.raw === 'string' ? JSON.parse(activeSub.raw) : activeSub.raw;
                if (rawData.subscription?.items?.data?.[0]?.price?.unit_amount) {
                  amount = rawData.subscription.items.data[0].price.unit_amount / 100;
                  currency = rawData.subscription.items.data[0].price.currency?.toUpperCase() || currency;
                } else if (rawData.checkout_session?.amount_total) {
                  amount = rawData.checkout_session.amount_total / 100;
                  currency = rawData.checkout_session.currency?.toUpperCase() || currency;
                }
              } catch (e) {
                console.warn("Could not extract amount from raw data:", e);
              }
            }
            
            // Format billing interval for display
            const billingInterval = metadata.billing_interval || product.billing_interval || "month";
            const intervalDisplay = billingInterval === 'month' ? 'Monthly' : 
                                   billingInterval === 'year' ? 'Yearly' : 
                                   billingInterval === 'week' ? 'Weekly' : 
                                   billingInterval.charAt(0).toUpperCase() + billingInterval.slice(1);
            
            // Calculate renewal date - prioritize multiple sources
            let nextRenewal = null;
            
            // Priority 1: Check database field
            if (activeSub.current_period_end) {
              nextRenewal = activeSub.current_period_end;
            }
            // Priority 2: Check Stripe subscription data in raw field
            else if (activeSub.raw) {
              try {
                const rawData = typeof activeSub.raw === 'string' ? JSON.parse(activeSub.raw) : activeSub.raw;
                const stripeSub = rawData.subscription || {};
                
                // Check current_period_end from Stripe (Unix timestamp)
                if (stripeSub.current_period_end) {
                  const timestamp = typeof stripeSub.current_period_end === 'number' 
                    ? stripeSub.current_period_end 
                    : parseInt(stripeSub.current_period_end);
                  if (!isNaN(timestamp)) {
                    nextRenewal = new Date(timestamp * 1000).toISOString().split('T')[0];
                  }
                }
              } catch (e) {
                console.warn('Error extracting renewal date from raw data:', e);
              }
            }
            
            // Priority 3: Calculate from created_at + billing interval
            if (!nextRenewal && activeSub.created_at && billingInterval) {
              try {
                const startDate = new Date(activeSub.created_at);
                if (!isNaN(startDate.getTime())) {
                  const calcDate = new Date(startDate);
                  if (billingInterval === 'month') {
                    calcDate.setMonth(calcDate.getMonth() + 1);
                  } else if (billingInterval === 'year') {
                    calcDate.setFullYear(calcDate.getFullYear() + 1);
                  } else if (billingInterval === 'week') {
                    calcDate.setDate(calcDate.getDate() + 7);
                  }
                  nextRenewal = calcDate.toISOString().split('T')[0];
                }
              } catch (e) {
                console.warn('Error calculating renewal date:', e);
              }
            }
            
            // Fallback: Default to 14 days from now
            if (!nextRenewal) {
              nextRenewal = dayjs().add(14, "day").format("YYYY-MM-DD");
            }
            
          setSubscription({
            id: activeSub.id,
            subscription_id: activeSub.subscription_id || activeSub.stripe_subscription_id,
            status: status.charAt(0).toUpperCase() + status.slice(1),
            plan: product.name || metadata.product_name || "Subscription Plan",
            interval: billingInterval,
            intervalDisplay,
            children: metadata.child_count || parseInt(metadata.child_count) || parentData.student?.length || 0,
            amount,
            currency,
            next_renewal: nextRenewal,
            started_at: activeSub.created_at || dayjs().subtract(3, "month").format("YYYY-MM-DD"),
            raw: activeSub.raw,
            product,
          });
          } else {
            // No active subscription
            setSubscription(null);
          }
          
          // Get invoices - try multiple sources
          let invs = [];
          
          // Try parent data (both singular and plural forms)
          if (Array.isArray(parentData.invoice)) {
            invs = parentData.invoice;
          } else if (Array.isArray(parentData.invoices)) {
            invs = parentData.invoices;
          } else if (parentData.invoice && !Array.isArray(parentData.invoice)) {
            invs = [parentData.invoice];
          } else if (parentData.invoices && !Array.isArray(parentData.invoices)) {
            invs = [parentData.invoices];
          }
          
          // Always fetch invoices directly to ensure we have the latest data
          try {
            const invsRes = await api.get("/invoices", { params: { parent_id: parent.id } });
            
            const fetchedInvs = Array.isArray(invsRes.data) 
              ? invsRes.data 
              : (invsRes.data?.data || invsRes.data?.invoices || []);
            
            // Use fetched invoices if we have them, otherwise use parent data
            if (fetchedInvs.length > 0) {
              invs = fetchedInvs;
            }
          } catch (err) {
            console.error("❌ Could not fetch invoices directly:", err);
            console.error("Error details:", err.response?.data || err.message);
            // Continue with parent data invoices if available
          }
          
          // Format invoices for display
          const formattedInvoices = invs
            .filter(inv => {
              const isValid = inv && (inv.id || inv.stripe_invoice_id);
              if (!isValid) {
                console.warn(`⚠️ Skipping invalid invoice:`, inv);
              }
              return isValid;
            })
            .map(inv => {
              const formatted = {
                id: inv.id || inv.stripe_invoice_id || `temp-${Date.now()}`,
                number: inv.stripe_invoice_id || inv.invoice_number || `INV-${inv.id}`,
                date: inv.created_at || inv.date || new Date().toISOString(),
                amount: (inv.total_cents ? inv.total_cents / 100 : inv.amount) || 0,
                currency: inv.currency || "EUR",
                status: inv.status || "paid",
                url: inv.pdf_url || inv.hosted_invoice_url || `#`,
              };
              return formatted;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setInvoices(formattedInvoices);
        } else {
          // No parent found - set empty invoices
          console.warn(`⚠️ No parent found, setting empty invoices`);
          setInvoices([]);
        }
      } else {
        // No user found - set empty invoices
        console.warn(`⚠️ No user ID found, setting empty invoices`);
        setInvoices([]);
      }
    } catch (err) {
      console.error("❌ Failed to load billing data:", err);
      console.error("Error stack:", err.stack);
      // Set empty invoices on error so UI still renders
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete subscription mutation
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/subscription/${id}`),
    onSuccess: () => {
      message.success("Subscription deleted successfully.");
      setSubscription(null);
      setViewOpen(false);
      setViewSubscription(null);
      fetchData(); // Refresh data
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Failed to delete subscription.");
    },
  });

  // Open view drawer
  const openView = useCallback(async (sub) => {
    setViewOpen(true);
    setViewLoading(true);
    try {
      // If subscription has an ID, fetch full details from API
      let subscriptionData = sub;
      if (sub.id) {
        try {
          const res = await api.get(`/subscription/${sub.id}`);
          subscriptionData = res.data?.data || res.data || sub;
          
          // If product is not included, try to fetch it
          if (subscriptionData.plan_id || subscriptionData.product_id) {
            try {
              const productId = subscriptionData.plan_id || subscriptionData.product_id;
              const productRes = await api.get(`/products`);
              const allProducts = Array.isArray(productRes.data) 
                ? productRes.data 
                : (productRes.data?.data || productRes.data?.rows || []);
              const foundProduct = allProducts.find(p => 
                p.id === parseInt(productId) || 
                p.id === productId || 
                String(p.id) === String(productId)
              );
              if (foundProduct) {
                subscriptionData.product = foundProduct;
              }
            } catch (err) {
              console.warn("Could not fetch product details:", err);
            }
          }
        } catch (err) {
          console.error("Failed to fetch subscription details:", err);
          subscriptionData = sub;
        }
      }
      
      setViewSubscription(subscriptionData);
    } catch (err) {
      console.error("Failed to load subscription:", err);
      // Use the subscription object we already have as fallback
      setViewSubscription(sub);
    } finally {
      setViewLoading(false);
    }
  }, []);

  // Close view drawer
  const closeView = useCallback(() => {
    setViewOpen(false);
    setViewSubscription(null);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback((sub) => {
    Modal.confirm({
      title: "Cancel subscription?",
      content: (
        <>
          This will cancel your subscription{" "}
          <Text strong>#{sub.id ?? "—"}</Text>. You will lose access at the end of your current billing period.
          This action cannot be undone.
        </>
      ),
      okText: "Cancel Subscription",
      okButtonProps: { danger: true },
      cancelText: "Keep Subscription",
      onOk: async () => {
        try {
          const subId = sub.id || sub.subscription_id;
          if (!subId) {
            message.error("Cannot delete: Subscription ID not found.");
            return;
          }
          await deleteMut.mutateAsync(subId);
        } catch (error) {
          // Error is already handled in deleteMut
        }
      },
    });
  }, [deleteMut]);

  // Check if refresh is needed (from success page or query param)
  useEffect(() => {
    const shouldRefresh = 
      searchParams.get("refresh") === "true" ||
      sessionStorage.getItem("billing_refresh_needed") === "true";
    
    if (shouldRefresh) {
      // Clear the refresh flag
      sessionStorage.removeItem("billing_refresh_needed");
      sessionStorage.removeItem("billing_refresh_time");
      
      // Remove refresh param from URL
      if (searchParams.get("refresh")) {
        navigate("/parent/billing/overview", { replace: true });
      }
    }
    
    // Always fetch data (will refresh if needed)
    fetchData();
  }, [searchParams, navigate, fetchData]);

  const outstanding = useMemo(
    () =>
      invoices.filter((i) => i.status.toLowerCase() !== "paid").reduce(
        (s, i) => s + Number(i.amount || 0),
        0
      ),
    [invoices]
  );

  const paid30 = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.status.toLowerCase() === "paid" &&
          dayjs(i.date).isAfter(dayjs().subtract(30, "day"))
      ).length,
    [invoices]
  );

  const invoiceColumns = [
    {
      title: "Invoice #",
      dataIndex: "number",
      key: "number",
      render: (v) => <Text strong>{v}</Text>,
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (v) => fmtDate(v),
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v, r) => <Text>{money(v, r.currency || "EUR")}</Text>,
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => {
        const lower = String(s).toLowerCase();
        const color = lower === "paid" ? "green" : lower === "open" ? "gold" : "red";
        return <Tag color={color}>{s}</Tag>;
      },
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, r) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          aria-label={`Download ${r.number} PDF`}
          onClick={(e) => {
            e.preventDefault();
            // hook your real download here
          }}
        >
          PDF
        </Button>
      ),
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
  ];

  return (
    <PlainBackground className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 w-full flex justify-center px-4 md:px-6 py-10 pb-24">
          <div className="w-full max-w-7xl">
            <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  className="!p-0 !h-auto text-neutral-600"
                  aria-label="Back"
                  onClick={() => navigate("/parent/settings")}
                />
                <div>
                  <Title level={3} className="!mb-0">
                    Billing Overview
                  </Title>
                  <Text type="secondary">
                    Your plan, invoices, and payment methods at a glance.
                  </Text>
                </div>
              </div>

              <Space wrap>
                <Button icon={<FileDoneOutlined />} onClick={() => navigate("/parent/billing/invoices")}>
                  View Invoices
                </Button>
                <Button icon={<ReconciliationOutlined />} onClick={() => navigate("/parent/billing/subscription")}>
                  Manage Subscription
                </Button>
                <Button icon={<GiftOutlined />} onClick={() => navigate("/parent/billing/coupons")}>
                  Coupons
                </Button>
              </Space>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic 
                      title="Current Plan" 
                      value={subscription?.plan || "No Plan"} 
                      loading={loading}
                    />
                    {subscription && (() => {
                      const statusLower = subscription.status?.toLowerCase() || "";
                      const color = statusLower === "active" ? "green" : 
                                   statusLower === "trialing" ? "blue" : 
                                   statusLower === "canceled" ? "red" : 
                                   statusLower === "past_due" ? "orange" : "default";
                      return (
                        <Tag color={color}>
                          {subscription.status === "Active" ? "Active" : 
                           subscription.status === "Trialing" ? "Trialing" :
                           subscription.status || "Inactive"}
                        </Tag>
                      );
                    })()}
                  </div>
                  {subscription && (
                    <div className="mt-2 text-sm text-gray-500">
                      {subscription.children} {subscription.children === 1 ? "child" : "children"} · Billed {subscription.intervalDisplay || subscription.interval}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic 
                      title="Next Charge" 
                      value={subscription ? money(subscription.amount, subscription.currency) : money(0)} 
                      loading={loading}
                    />
                    <ReconciliationOutlined className="text-gray-500 text-xl" />
                  </div>
                  {subscription && (
                    <div className="mt-2 text-sm text-gray-500">
                      On {fmtDate(subscription.next_renewal)}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title="Paid (30d)" value={paid30} />
                    <FileDoneOutlined className="text-gray-500 text-xl" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Invoices paid last 30 days</div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title="Outstanding" value={money(outstanding, "EUR")} />
                    <ExclamationCircleOutlined className="text-gray-500 text-xl" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Amount due</div>
                </Card>
              </Col>
            </Row>

            {/* Invoices table */}
            <Card
              title={
                <Space>
                  <FileDoneOutlined />
                  <span>Recent Invoices</span>
                </Space>
              }
              className="shadow-sm rounded-2xl"
              extra={
                <Button
                  type="link"
                  onClick={() => navigate("/parent/billing/invoices")}
                  icon={<ArrowRightOutlined />}
                  aria-label="See all invoices"
                >
                  All invoices
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <Table
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No invoices yet"
                      />
                    ),
                  }}
                  rowKey={(record) => record.id || record.number || `invoice-${record.date}`}
                  columns={invoiceColumns}
                  dataSource={invoices || []}
                  loading={loading}
                  pagination={{ pageSize: 5, hideOnSinglePage: true }}
                  size="middle"
                  scroll={{ x: 640 }}
                />
              </div>
            </Card>

            {/* Right column content becomes stacked cards on phone frame */}
            <div className="space-y-4">
              {/* Subscription summary */}
              <Card className="shadow-sm rounded-2xl" loading={loading}>
                <Space className="w-full justify-between">
                  <Space>
                    <ReconciliationOutlined />
                    <Text strong>Subscription</Text>
                  </Space>
                  {subscription ? (() => {
                    const statusLower = subscription.status?.toLowerCase() || "";
                    const color = statusLower === "active" ? "green" : 
                                 statusLower === "trialing" ? "blue" : 
                                 statusLower === "canceled" ? "red" : 
                                 statusLower === "past_due" ? "orange" : "default";
                    return (
                      <Tag color={color}>
                        {subscription.status === "Active" ? "Active" : 
                         subscription.status === "Trialing" ? "Trialing" :
                         subscription.status || "Inactive"}
                      </Tag>
                    );
                  })() : (
                    <Tag color="default">No Active Subscription</Tag>
                  )}
                </Space>

                <Divider className="my-3" />

                {subscription ? (
                  <>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <Text type="secondary">Plan</Text>
                        <Text strong>{subscription.plan}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text type="secondary">Billing Interval</Text>
                        <Text strong>{subscription.intervalDisplay || subscription.interval}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text type="secondary">Started</Text>
                        <Text>{fmtDate(subscription.started_at)}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text type="secondary">Next renewal</Text>
                        <Text>{fmtDate(subscription.next_renewal)}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text type="secondary">Amount</Text>
                        <Text strong>{money(subscription.amount, subscription.currency)}</Text>
                      </div>
                    </div>

                    <Space direction="vertical" className="w-full mt-4" size="small">
                      <Button
                        block
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => openView(subscription)}
                      >
                        View Details
                      </Button>
                      <Button
                        block
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(subscription)}
                      >
                        Cancel Subscription
                      </Button>
                    </Space>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Text type="secondary" className="block mb-4">
                      You don't have an active subscription.
                    </Text>
                    <Button
                      type="primary"
                      onClick={() => navigate("/parent/billing/subscription")}
                    >
                      View Plans
                    </Button>
                  </div>
                )}
              </Card>

              {/* Payment methods */}
              <Card className="shadow-sm rounded-2xl">
                <Space className="w-full justify-between">
                  <Space>
                    <CreditCardOutlined />
                    <Text strong>Payment Methods</Text>
                  </Space>
                </Space>

                <Divider className="my-3" />

                <List
                  itemLayout="horizontal"
                  dataSource={paymentMethods}
                  loading={loading}
                  locale={{ emptyText: "No payment methods. Add a card to subscribe." }}
                  renderItem={(m) => (
                    <List.Item
                      actions={[
                        <Tooltip
                          key="default"
                          title={m.default ? "Default method" : "Set as default"}
                        >
                          <Tag
                            onClick={() => {
                              // wire "set default" here
                            }}
                            className="cursor-pointer"
                            color={m.default ? "green" : "default"}
                            aria-label={m.default ? "Default payment method" : "Set as default"}
                          >
                            {m.default ? "Default" : "Set default"}
                          </Tag>
                        </Tooltip>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<CreditCardOutlined className="text-lg text-gray-500" />}
                        title={`${m.brand} •••• ${m.last4}`}
                        description={`Exp ${m.exp}`}
                      />
                    </List.Item>
                  )}
                />
                <Button
                  block
                  className="mt-2"
                  onClick={() => {
                    // Navigate to subscription page where they can add payment method during checkout
                    navigate("/parent/billing/subscription");
                  }}
                >
                  {paymentMethods.length === 0 ? "Add Payment Method" : "Add New Card"}
                </Button>
              </Card>

              {/* Coupons */}
              <Card className="shadow-sm rounded-2xl">
                <Space className="w-full justify-between">
                  <Space>
                    <GiftOutlined />
                    <Text strong>Coupons</Text>
                  </Space>
                  <Button
                    type="link"
                    onClick={() => navigate("/parent/billing/coupons")}
                    icon={<ArrowRightOutlined />}
                    aria-label="Manage coupons"
                  >
                    Manage
                  </Button>
                </Space>

                <Divider className="my-3" />

                <List
                  dataSource={[]}
                  locale={{ emptyText: "No coupons available" }}
                  renderItem={(c) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{c.code}</Text>
                            <Tag color={c.active ? "green" : "default"}>
                              {c.active ? "Active" : "Inactive"}
                            </Tag>
                          </Space>
                        }
                        description={
                          <span className="text-sm text-gray-600">
                            {c.desc} · Expires {fmtDate(c.expires)}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </div>

        {/* View Subscription Drawer */}
        <Drawer
          title="Subscription Details"
          open={viewOpen}
          onClose={closeView}
          width={Math.min(600, window.innerWidth * 0.9)}
          destroyOnClose
        >
          {viewLoading ? (
            <Skeleton active paragraph={{ rows: 10 }} />
          ) : viewSubscription ? (
            (() => {
              const sub = viewSubscription;
              
              // Parse raw data - handle both string and object
              let rawData = {};
              try {
                rawData = typeof sub.raw === 'string' ? JSON.parse(sub.raw) : (sub.raw || {});
              } catch (e) {
                console.warn("Failed to parse raw data:", e);
                rawData = sub.raw || {};
              }
              
              const stripeSubscription = rawData.subscription || {};
              const checkoutSession = rawData.checkout_session || {};
              
              // Extract metadata from multiple sources
              const metadata = stripeSubscription.metadata || checkoutSession.metadata || {};
              
              // Get product reference (if available from subscription object) - must be before use
              const product = sub.product || {};
              
              // Extract amount and currency - prioritize Stripe data
              let amount = sub.amount;
              let currency = sub.currency || "EUR";
              
              // Try to get from Stripe subscription items (most accurate)
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
                amount = parseFloat(metadata.product_price) || amount;
                currency = stripeSubscription.currency?.toUpperCase() || currency;
              }
              // Try from product price
              else if (product?.price) {
                amount = parseFloat(product.price) || amount;
                currency = product.currency?.toUpperCase() || currency;
              }
              // Use subscription amount if available
              else if (sub.amount) {
                amount = typeof sub.amount === 'number' ? sub.amount : parseFloat(sub.amount);
              }
              
              // Extract billing interval - check multiple sources
              let billingInterval = sub.intervalDisplay || sub.interval || metadata.billing_interval;
              
              // Try from product metadata
              if (!billingInterval && product?.metadata) {
                try {
                  const productMeta = typeof product.metadata === 'string' 
                    ? JSON.parse(product.metadata) 
                    : product.metadata;
                  if (productMeta && typeof productMeta === 'object') {
                    billingInterval = productMeta.billing_interval;
                  }
                } catch (e) {}
              }
              
              // Try from Stripe subscription
              if (!billingInterval) {
                billingInterval = stripeSubscription.items?.data?.[0]?.price?.recurring?.interval;
              }
              
              // Try from checkout session metadata
              if (!billingInterval) {
                billingInterval = checkoutSession.metadata?.billing_interval;
              }
              
              // Format interval for display
              const intervalDisplay = billingInterval === 'month' ? 'Monthly' :
                                     billingInterval === 'year' ? 'Yearly' :
                                     billingInterval === 'week' ? 'Weekly' :
                                     billingInterval ? billingInterval.charAt(0).toUpperCase() + billingInterval.slice(1) : null;
              
              // Extract child count
              let childCount = sub.children || metadata.child_count;
              if (!childCount && product?.metadata) {
                try {
                  const productMeta = typeof product.metadata === 'string' 
                    ? JSON.parse(product.metadata) 
                    : product.metadata;
                  if (productMeta && typeof productMeta === 'object') {
                    childCount = productMeta.child_count;
                  }
                } catch (e) {}
              }
              
              // Extract dates - prioritize database fields, then Stripe
              let startedAt = sub.started_at || sub.created_at;
              let nextRenewal = sub.next_renewal || sub.current_period_end;
              
              // Try from Stripe subscription if not found in database
              if (!startedAt && stripeSubscription.current_period_start) {
                startedAt = new Date(stripeSubscription.current_period_start * 1000).toISOString();
              }
              // Also try from created_at if still missing
              if (!startedAt && sub.created_at) {
                startedAt = sub.created_at;
              }
              
              if (!nextRenewal && stripeSubscription.current_period_end) {
                nextRenewal = new Date(stripeSubscription.current_period_end * 1000).toISOString();
              }
              
              // Calculate renewal date if missing (from creation date + interval)
              if (!nextRenewal && startedAt && billingInterval) {
                try {
                  const startDate = new Date(startedAt);
                  if (!isNaN(startDate.getTime())) {
                    const calcDate = new Date(startDate);
                    if (billingInterval === 'month') {
                      calcDate.setMonth(calcDate.getMonth() + 1);
                    } else if (billingInterval === 'year') {
                      calcDate.setFullYear(calcDate.getFullYear() + 1);
                    } else if (billingInterval === 'week') {
                      calcDate.setDate(calcDate.getDate() + 7);
                    }
                    nextRenewal = calcDate.toISOString();
                  }
                } catch (e) {
                  console.warn('Error calculating renewal date:', e);
                }
              }
              
              // Format currency
              const formatMoney = (amt, curr = "EUR") => {
                if (amt == null) return "—";
                return new Intl.NumberFormat("en-ZA", {
                  style: "currency",
                  currency: curr || "EUR",
                  maximumFractionDigits: 2,
                }).format(Number(amt));
              };

              // Get subscription items
              const subscriptionItems = stripeSubscription.items?.data || [];

              return (
                <div className="space-y-4">
                  {/* Basic Subscription Info */}
                  <Card title="Subscription Details" size="small">
                    <Descriptions bordered column={1} size="middle">
                      <Descriptions.Item label="Plan">
                        <Text strong>{metadata.product_name || sub.plan || sub.product?.name || product?.name || "—"}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        {(() => {
                          // Normalize status - if payment is successful, show active/trialing
                          let status = sub.status || stripeSubscription.status || "incomplete";
                          
                          // Aggressively check if payment was successful from multiple sources
                          const paymentStatus = checkoutSession.payment_status;
                          const stripeStatus = stripeSubscription.status;
                          const latestInvoice = stripeSubscription.latest_invoice;
                          const invoicePaid = typeof latestInvoice === 'object' ? latestInvoice.paid : false;
                          const hasSubscriptionItems = stripeSubscription.items && stripeSubscription.items.data && stripeSubscription.items.data.length > 0;
                          
                          // If ANY indicator shows payment was successful, force to active/trialing
                          if (paymentStatus === 'paid' || 
                              stripeStatus === 'active' || 
                              stripeStatus === 'trialing' ||
                              invoicePaid === true ||
                              hasSubscriptionItems) {
                            
                            if (stripeStatus === 'trialing' || stripeSubscription.trial_end || (checkoutSession.subscription && checkoutSession.subscription.trial_end)) {
                              status = 'trialing';
                            } else {
                              status = 'active';
                            }
                          } else if (status === 'incomplete' || status === 'inactive') {
                            // If status is still incomplete but we have subscription data, it might be active
                            if (stripeSubscription.id && stripeSubscription.current_period_end) {
                              status = 'active';
                            }
                          }
                          
                          // Final check: if status is still incomplete but subscription exists and has data, assume active
                          if ((status === 'incomplete' || status === 'inactive') && sub.id && sub.stripe_subscription_id) {
                            status = 'active';
                          }
                          
                          return (
                            <Tag color={
                              status.toLowerCase() === "active" ? "green" :
                              status.toLowerCase() === "trialing" ? "blue" :
                              status.toLowerCase() === "canceled" ? "red" :
                              "default"
                            }>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Tag>
                          );
                        })()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Billing Interval">
                        {intervalDisplay || billingInterval || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Amount">
                        {formatMoney(amount, currency)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Children">
                        {childCount ? `${childCount} ${childCount === 1 ? "child" : "children"}` : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Started">
                        {startedAt ? fmtDate(startedAt) : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Next Renewal">
                        {nextRenewal ? fmtDate(nextRenewal) : "—"}
                      </Descriptions.Item>
                      {sub.id && (
                        <Descriptions.Item label="Subscription ID">
                          <Text code>{sub.id}</Text>
                        </Descriptions.Item>
                      )}
                      {sub.subscription_id && (
                        <Descriptions.Item label="Stripe Subscription ID">
                          <Text code>{sub.subscription_id}</Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>

                  {/* Stripe Subscription Details */}
                  {stripeSubscription.id && (
                    <Card 
                      title={
                        <Space>
                          <CreditCardOutlined />
                          <span>Stripe Details</span>
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
                        <Descriptions.Item label="Currency">
                          {(stripeSubscription.currency || sub.currency || "EUR").toUpperCase()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Current Period Start">
                          {startedAt
                            ? new Date(startedAt).toLocaleString()
                            : stripeSubscription.current_period_start
                            ? new Date(stripeSubscription.current_period_start * 1000).toLocaleString()
                            : "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Current Period End">
                          {nextRenewal
                            ? new Date(nextRenewal).toLocaleString()
                            : stripeSubscription.current_period_end
                            ? new Date(stripeSubscription.current_period_end * 1000).toLocaleString()
                            : "—"}
                        </Descriptions.Item>
                        {stripeSubscription.trial_end && (
                          <Descriptions.Item label="Trial End">
                            {new Date(stripeSubscription.trial_end * 1000).toLocaleString()}
                          </Descriptions.Item>
                        )}
                      </Descriptions>

                      {/* Subscription Items */}
                      {subscriptionItems.length > 0 && (
                        <>
                          <Divider orientation="left">Subscription Items</Divider>
                          <div className="space-y-2">
                            {subscriptionItems.map((item, idx) => (
                              <Card key={idx} size="small" className="bg-gray-50">
                                <Descriptions column={1} size="small">
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
                </div>
              );
            })()
          ) : (
            <Empty description="No subscription data available" />
          )}
        </Drawer>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </PlainBackground>
);
}
