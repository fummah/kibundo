// src/pages/admin/analytics/AnalyticsDashboard.jsx
import { useEffect, useRef, useMemo, useState } from "react";
import {
  Typography,
  Row,
  Col,
  Card,
  Select,
  Spin,
  Button,
  Space,
  message,
  Table,
  Tag,
  Empty,
} from "antd";
import dayjs from "dayjs";
import {
  ReloadOutlined,
  LineChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

const { Title, Text } = Typography;
const { Option } = Select;

const DEVICE_COLORS = ["#1677ff", "#52c41a", "#faad14"];

const clampNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const formatNumber = (num, options = {}) =>
  Number(clampNum(num)).toLocaleString("en-US", { maximumFractionDigits: 0, ...options });
const formatCurrency = (num, currency = "EUR", options = {}) =>
  Number(clampNum(num)).toLocaleString("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });

const toSnake = (value = "") =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

const getFieldValue = (item, field) => {
  if (!item || !field) return undefined;
  if (item[field] !== undefined) return item[field];
  const snakeField = toSnake(field);
  if (snakeField !== field && item[snakeField] !== undefined) {
    return item[snakeField];
  }
  return undefined;
};

const pickStatus = (sub) => {
  const status = String(getFieldValue(sub, "status") || "").toLowerCase();
  if (["active", "trialing"].includes(status)) return "active";
  if (["expired"].includes(status)) return "expired";
  if (["canceled", "cancelled"].includes(status)) return "canceled";
  if (["pending", "unpaid", "incomplete"].includes(status)) return "pending";
  return "unknown";
};

const extractSubscriptionAmount = (subscription) => {
  if (!subscription) {
    return { amount: 0, currency: "EUR" };
  }

  let raw = getFieldValue(subscription, "raw");
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  let currency =
    getFieldValue(subscription, "currency") ||
    getFieldValue(subscription, "product")?.currency ||
    raw?.subscription?.items?.data?.[0]?.price?.currency ||
    raw?.checkout_session?.currency ||
    "EUR";

  let amount =
    getFieldValue(subscription, "amount") ??
    getFieldValue(subscription, "total") ??
    getFieldValue(subscription, "total_amount") ??
    getFieldValue(subscription, "product")?.price ??
    0;

  if (raw?.subscription?.items?.data?.[0]?.price?.unit_amount) {
    amount = raw.subscription.items.data[0].price.unit_amount / 100;
    currency =
      raw.subscription.items.data[0].price.currency?.toUpperCase() || currency;
  } else if (raw?.checkout_session?.amount_total) {
    amount = raw.checkout_session.amount_total / 100;
    currency =
      raw.checkout_session.currency?.toUpperCase() || currency;
  } else if (raw?.latest_invoice?.amount_paid) {
    amount = raw.latest_invoice.amount_paid / 100;
    currency =
      raw.latest_invoice.currency?.toUpperCase() || currency;
  } else if (getFieldValue(subscription, "product")?.price) {
    amount = getFieldValue(subscription, "product").price;
  }

  return {
    amount: Number(clampNum(amount)),
    currency: currency ? String(currency).toUpperCase() : "EUR",
  };
};

const getDateRangeForFilter = (filter) => {
  const days = Number(filter) || 7;
  const end = dayjs().endOf("day");
  const start = end.clone().subtract(days, "day").startOf("day");
  return { start, end };
};

// Fetch dashboard data
async function fetchDashboardBundle(token) {
  try {
    const [overviewRes, parentsRes, studentsRes] = await Promise.all([
      api.get('/admin/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      }),
      api.get('/parents', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      }),
      api.get('/allstudents', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      })
    ]);

    return {
      overview: overviewRes?.data || {},
      counts: {
        parents: Array.isArray(parentsRes?.data) ? parentsRes.data.length : 0,
        students: Array.isArray(studentsRes?.data) ? studentsRes.data.length : 0,
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

function adaptAnalyticsPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return {
      stats: { totalUsers: 0, activeUsers: 0, newUsers: 0 },
      trials: { inTrial: 0, endingToday: 0, endingTomorrow: 0, usersInTrial: [], usersEndingToday: [] },
      customerInsights: { satisfaction: 0, sessionDuration: 0, retentionRate: 0 },
    revenue: {
      total: 0,
      subscriptions: 0,
      renewalRate: 0,
      currency: 'EUR',
      subscriptionCurrency: 'EUR',
      invoiceTotal: 0,
      activeSubscriptionTotal: 0,
    },
      lineData: [],
      barData: [],
      deviceUsage: []
    };
  }

  // Helper functions
  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  
  const pct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n > 1 ? Math.round(n) : Math.round(n * 100);
  };

  // Safely get nested properties
  const safeGet = (obj, path, defaultValue) => {
    return path.split('.').reduce((o, p) => (o && o[p] !== undefined ? o[p] : defaultValue), obj);
  };

  // Extract stats
  const stats = {
    totalUsers: num(safeGet(payload, 'stats.totalUsers', safeGet(payload, 'total_users', 0))),
    activeUsers: num(safeGet(payload, 'stats.activeUsers', safeGet(payload, 'active_users', 0))),
    newUsers: num(safeGet(payload, 'stats.newUsers', safeGet(payload, 'new_users', 0))),
  };

  // Extract trials data
  const trials = {
    inTrial: num(safeGet(payload, 'trials.inTrial', safeGet(payload, 'trials.count', 0))),
    endingToday: num(safeGet(payload, 'trials.endingToday', safeGet(payload, 'trials.ends_today', 0))),
    endingTomorrow: num(safeGet(payload, 'trials.endingTomorrow', safeGet(payload, 'trials.ends_tomorrow', 0))),
    usersInTrial: Array.isArray(safeGet(payload, 'trials.usersInTrial', safeGet(payload, 'trials.users', []))) 
      ? safeGet(payload, 'trials.usersInTrial', safeGet(payload, 'trials.users', [])) 
      : [],
    usersEndingToday: Array.isArray(safeGet(payload, 'trials.usersEndingToday', safeGet(payload, 'trials.ending_users', [])))
      ? safeGet(payload, 'trials.usersEndingToday', safeGet(payload, 'trials.ending_users', []))
      : []
  };

  // Extract customer insights
  const customerInsights = {
    satisfaction: pct(safeGet(payload, 'customerInsights.satisfaction', safeGet(payload, 'csat_score', 0))),
    sessionDuration: num(safeGet(payload, 'customerInsights.sessionDuration', safeGet(payload, 'avg_session_minutes', 0))),
    retentionRate: pct(safeGet(payload, 'customerInsights.retentionRate', safeGet(payload, 'retention_rate', 0))),
  };

  // Extract revenue data
  const revenue = {
    total: num(safeGet(payload, 'revenue.total', safeGet(payload, 'total_revenue', 0))),
    subscriptions: num(safeGet(payload, 'revenue.subscriptions', safeGet(payload, 'active_subscriptions', 0))),
    renewalRate: pct(safeGet(payload, 'revenue.renewalRate', safeGet(payload, 'renewal_rate', 0))),
    currency: safeGet(payload, 'revenue.currency', 'ZAR').toUpperCase(),
  };

  // Process time series data
  const lineData = (safeGet(payload, 'series.user_growth', safeGet(payload, 'user_growth', [])) || [])
    .map(item => ({
      date: String(item.date || item.day || ''),
      value: num(item.value || item.count || 0)
    }));

  const barData = (safeGet(payload, 'series.quarterly_revenue', safeGet(payload, 'quarterly_revenue', [])) || [])
    .map(item => ({
      label: String(item.label || item.quarter || ''),
      value: num(item.value || item.amount || 0)
    }));

  // Process device usage
  const deviceUsage = (() => {
    const devices = safeGet(payload, 'deviceUsage', safeGet(payload, 'devices', {}));
    const desktop = num(devices.desktop || devices.web || 0);
    const mobile = num(devices.mobile || devices.phone || 0);
    const tablet = num(devices.tablet || 0);
    const total = desktop + mobile + tablet;

    if (total === 0) return [];

    return [
      { name: 'Desktop', value: desktop / total },
      { name: 'Mobile', value: mobile / total },
      { name: 'Tablet', value: tablet / total }
    ];
  })();

  return {
    stats,
    trials,
    customerInsights,
    revenue,
    lineData,
    barData,
    deviceUsage
  };
}

export default function AnalyticsDashboard() {
  const { user } = useAuthContext();
  const token = user?.token;

  const [data, setData] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("7");
  const refreshRef = useRef(false);
  const dateRange = useMemo(() => getDateRangeForFilter(filter), [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setData(null);
      setOverviewData(null);

      const { start, end } = getDateRangeForFilter(filter);
      const dateParams = {
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
      };

      const [analyticsRes, overviewRes, subscriptionsRes, invoicesRes] = await Promise.allSettled([
        api.get("/analytics/dashboard", {
          params: { days: filter },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true,
        }),
        fetchDashboardBundle(token),
        api.get("/subscriptions", {
          params: dateParams,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true,
        }),
        api.get("/invoices", {
          params: dateParams,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true,
        }),
      ]);

      if (analyticsRes.status === "fulfilled") {
        const payload = analyticsRes.value?.data ?? {};
        const adapted = adaptAnalyticsPayload(payload);
        setData(adapted);
      } else {
        message.error("Failed to load analytics dashboard");
        console.error("Analytics error:", analyticsRes.reason);
      }

      if (overviewRes.status === "fulfilled") {
        setOverviewData(overviewRes.value);
      } else {
        console.error("Overview error:", overviewRes.reason);
        setOverviewData(null);
      }

      if (subscriptionsRes.status === "fulfilled" || invoicesRes.status === "fulfilled") {
        const subscriptionsData =
          subscriptionsRes.status === "fulfilled" && Array.isArray(subscriptionsRes.value?.data)
            ? subscriptionsRes.value.data
            : [];
        const invoicesData =
          invoicesRes.status === "fulfilled" && Array.isArray(invoicesRes.value?.data)
            ? invoicesRes.value.data
            : [];
        setRevenueBreakdown({
          subscriptions: subscriptionsData,
          invoices: invoicesData,
        });
      } else {
        setRevenueBreakdown(null);
      }
    } catch (e) {
      console.error("Fetch error:", e);
      message.error("Failed to load analytics/overview data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, token]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!refreshRef.current) fetchData();
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const handleExport = (type, rows, title = "Export") => {
    if (!rows?.length) {
      message.warning("No data to export");
      return;
    }

    const head = Object.keys(rows[0] ?? {});

    if (type === "pdf") {
      const doc = new jsPDF();
      doc.text(title, 10, 12);
      autoTable(doc, {
        startY: 18,
        head: [head],
        body: rows.map((d) => head.map((k) => String(d?.[k] ?? ""))),
      });
      doc.save(`${title}.pdf`);
      return;
    }

    const csvContent = [
      head.join(","),
      ...rows.map((r) => head.map((k) => `"${String(r?.[k] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { 
    stats = { totalUsers: 0, activeUsers: 0, newUsers: 0 },
    trials = { inTrial: 0, endingToday: 0, endingTomorrow: 0, usersInTrial: [], usersEndingToday: [] },
    customerInsights = { satisfaction: 0, sessionDuration: 0, retentionRate: 0 },
    revenue = { total: 0, subscriptions: 0, renewalRate: 0, currency: 'ZAR' },
    lineData = [],
    barData = [],
    deviceUsage = []
  } = data || {};

  const revenueTotals = useMemo(() => {
    if (!revenueBreakdown) {
      return {
        subscriptionRevenue: 0,
        activeSubscriptionRevenue: 0,
        invoiceRevenue: 0,
        totalRevenue: 0,
        currency: revenue.currency || "EUR",
        subscriptionCurrency: revenue.currency || "EUR",
        activeCount: 0,
      };
    }

    const { start, end } = dateRange;
    const subscriptions = Array.isArray(revenueBreakdown.subscriptions) ? revenueBreakdown.subscriptions : [];
    const invoices = Array.isArray(revenueBreakdown.invoices) ? revenueBreakdown.invoices : [];

    let subscriptionRevenue = 0;
    let activeSubscriptionRevenue = 0;
    let invoiceRevenue = 0;
    let activeCount = 0;
    const currencies = new Set();
    const subscriptionCurrencies = new Set();

    subscriptions.forEach((sub) => {
      const created =
        getFieldValue(sub, "createdAt") ?? getFieldValue(sub, "created_at");
      if (created) {
        const createdAt = dayjs(created);
        if (!createdAt.isValid() || createdAt.isBefore(start) || createdAt.isAfter(end)) {
          return;
        }
      }

      const { amount, currency } = extractSubscriptionAmount(sub);
      subscriptionRevenue += amount;
      if (currency) {
        currencies.add(currency);
        subscriptionCurrencies.add(currency);
      }
      if (pickStatus(sub) === "active") {
        activeSubscriptionRevenue += amount;
        activeCount += 1;
      }
    });

    invoices.forEach((invoice) => {
      const created =
        getFieldValue(invoice, "createdAt") ?? getFieldValue(invoice, "created_at");
      if (created) {
        const createdAt = dayjs(created);
        if (!createdAt.isValid() || createdAt.isBefore(start) || createdAt.isAfter(end)) {
          return;
        }
      }

      const cents =
        getFieldValue(invoice, "totalCents") ??
        getFieldValue(invoice, "total_cents") ??
        0;
      const currency =
        getFieldValue(invoice, "currency") ??
        getFieldValue(invoice, "currencyCode");
      invoiceRevenue += Number(clampNum(cents)) / 100;
      if (currency) {
        currencies.add(String(currency).toUpperCase());
      }
    });

    const currency = currencies.size === 1 ? currencies.values().next().value : (revenue.currency || "EUR");
    const subscriptionCurrency =
      subscriptionCurrencies.size === 1
        ? subscriptionCurrencies.values().next().value
        : currency;
    const totalRevenue = subscriptionRevenue + invoiceRevenue;

    return {
      subscriptionRevenue,
      activeSubscriptionRevenue,
      invoiceRevenue,
      totalRevenue,
      currency,
      subscriptionCurrency,
      activeCount,
    };
  }, [revenueBreakdown, dateRange, revenue.currency]);

  const trialCols = [
    { title: "User", dataIndex: "name", key: "name", render: (v, r) => v || r.email || "-" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "State", dataIndex: "state", key: "state", width: 90, render: v => v || "—" },
    { title: "Grade", dataIndex: "grade", key: "grade", width: 90, render: v => v ?? "—" },
    { title: "Ends", dataIndex: "ends_at", key: "ends_at", width: 180, render: v => (v ? new Date(v).toLocaleString() : "—") },
  ];

  const usersInTrial = Array.isArray(trials.usersInTrial) ? trials.usersInTrial : [];
  const usersEndingToday = Array.isArray(trials.usersEndingToday) ? trials.usersEndingToday : [];

  // Calculate derived values
  const totalUsersFromAdmin = (overviewData?.counts?.parents || 0) + (overviewData?.counts?.students || 0);
  const finalStats = {
    ...stats,
    totalUsers: totalUsersFromAdmin || stats.totalUsers
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 dark:bg-gray-900 min-h-screen max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <Title level={3} className="!mb-0">📊 Analytics Dashboard</Title>
        <div className="flex gap-2">
          <Select 
            value={filter} 
            onChange={setFilter} 
            style={{ width: 160 }}
            disabled={loading}
          >
            <Option value="7">Last 7 days</Option>
            <Option value="30">Last 30 days</Option>
            <Option value="90">Last 90 days</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        {[
          { title: "Total Users", value: finalStats.totalUsers }, 
          { title: "Active Users", value: finalStats.activeUsers }, 
          { title: "New Users", value: finalStats.newUsers }
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable className="transition-all shadow-sm" variant="outlined">
              <Text type="secondary">{item.title}</Text>
              <Title level={2} className="!mb-0">{formatNumber(item.value)}</Title>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Trial KPIs */}
      <Row gutter={[16, 16]} className="mt-2">
        {[
          { title: "Users in Free Trial", value: trials.inTrial, color: "blue" },
          { title: "Trials Ending Today", value: trials.endingToday, color: "gold" },
          { title: "Trials Ending Tomorrow", value: trials.endingTomorrow, color: "purple" },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Space direction="vertical" size={2}>
                <Text type="secondary">{item.title}</Text>
                <Title level={3} className="!mb-0">
                  <Tag color={item.color} style={{ fontSize: 16, padding: "2px 8px" }}>
                    {formatNumber(item.value)}
                  </Tag>
                </Title>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Customer Insights + Revenue */}
      <Row gutter={[16, 16]} className="mt-4">
        {[
          { title: "Satisfaction Rate", value: `${customerInsights.satisfaction}%` },
          { title: "Session Duration", value: `${customerInsights.sessionDuration} mins` },
          { title: "Retention Rate", value: `${customerInsights.retentionRate}%` },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Text type="secondary">{item.title}</Text>
              <Title level={3} className="!mb-0">{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="mt-2">
        {[
          { title: "Total Revenue", value: `${revenue.currency} ${formatNumber(revenue.total)}` },
          { title: "Subscriptions", value: formatNumber(revenue.subscriptions) },
          { title: "Renewal Rate", value: `${revenue.renewalRate}%` },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Text type="secondary">{item.title}</Text>
              <Title level={3} className="!mb-0">{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="mt-6">
        {/* Line: User Growth */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title={
              <Space>
                <LineChartOutlined /> User Growth
                <Button 
                  size="small" 
                  onClick={() => handleExport("csv", lineData, "User Growth")}
                  disabled={!lineData?.length}
                >
                  CSV
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleExport("pdf", lineData, "User Growth")}
                  disabled={!lineData?.length}
                >
                  PDF
                </Button>
              </Space>
            }
            className="transition-all shadow-sm"
          >
            {lineData?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1890ff" 
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                    activeDot={{ r: 5 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No data available" />
            )}
          </Card>
        </Col>

        {/* Bar: Quarterly Revenue */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title={
              <Space>
                <BarChartOutlined /> Quarterly Revenue
                <Button 
                  size="small" 
                  onClick={() => handleExport("csv", barData, "Quarterly Revenue")}
                  disabled={!barData?.length}
                >
                  CSV
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleExport("pdf", barData, "Quarterly Revenue")}
                  disabled={!barData?.length}
                >
                  PDF
                </Button>
              </Space>
            }
            className="transition-all shadow-sm"
          >
            {barData?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value) => [`${revenue.currency} ${formatNumber(value)}`, "Revenue"]}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#52c41a" 
                    barSize={40} 
                    radius={[4, 4, 0, 0]}
                  >
                    {barData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(${(index * 60) % 360}, 70%, 50%)`} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Device Usage & Trial Lists */}
      <Row gutter={[16, 16]} className="mt-6">
        {/* Device Usage */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title="Device Usage"
            extra={
              <Space>
                <Button
                  size="small"
                  onClick={() => handleExport(
                    "csv",
                    deviceUsage.map(d => ({ 
                      device: d.name, 
                      percentage: `${Math.round(d.value * 100)}%` 
                    })),
                    "Device Usage"
                  )}
                  disabled={!deviceUsage?.length}
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  onClick={() => handleExport(
                    "pdf",
                    deviceUsage.map(d => ({ 
                      device: d.name, 
                      percentage: `${Math.round(d.value * 100)}%` 
                    })),
                    "Device Usage"
                  )}
                  disabled={!deviceUsage?.length}
                >
                  PDF
                </Button>
              </Space>
            }
          >
            {deviceUsage?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={deviceUsage}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {deviceUsage.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip 
                    formatter={(value) => [`${(value * 100).toFixed(1)}%`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No device usage data available" />
            )}
          </Card>
        </Col>

        {/* Trial Lists */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title="Users in Free Trial"
            extra={
              <Space>
                <Button
                  size="small"
                  onClick={() => handleExport("csv", usersInTrial, "Users in Free Trial")}
                  disabled={!usersInTrial?.length}
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  onClick={() => handleExport("pdf", usersInTrial, "Users in Free Trial")}
                  disabled={!usersInTrial?.length}
                >
                  PDF
                </Button>
              </Space>
            }
            className="mb-4"
          >
            <Table
              rowKey={(r) => r.id || r.email || `trial-${Math.random()}`}
              columns={trialCols}
              dataSource={usersInTrial}
              size="small"
              pagination={{ pageSize: 5 }}
              scroll={{ x: true }}
              locale={{
                emptyText: <Empty description="No users in trial" />
              }}
            />
          </Card>

          <Card
            hoverable
            variant="outlined"
            title="Trials Ending Today"
            extra={
              <Space>
                <Button
                  size="small"
                  onClick={() => handleExport("csv", usersEndingToday, "Trials Ending Today")}
                  disabled={!usersEndingToday?.length}
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  onClick={() => handleExport("pdf", usersEndingToday, "Trials Ending Today")}
                  disabled={!usersEndingToday?.length}
                >
                  PDF
                </Button>
              </Space>
            }
          >
            <Table
              rowKey={(r) => r.id || r.email || `ending-${Math.random()}`}
              columns={trialCols}
              dataSource={usersEndingToday}
              size="small"
              pagination={{ pageSize: 5 }}
              scroll={{ x: true }}
              locale={{
                emptyText: <Empty description="No trials ending today" />
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
